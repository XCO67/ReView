export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const loc = url.searchParams.get("loc");
    const extType = url.searchParams.get("extType");
    const classFilter = url.searchParams.get("class");
    const subClassFilter = url.searchParams.get("subClass");

    const allData = await loadUWData();
    
    // Apply role-based filtering
    let roleFilteredData = filterByRole(allData, session?.roles);

    // Apply additional filters (loc, extType, class)
    if (loc && loc !== 'all') {
      roleFilteredData = roleFilteredData.filter(record => record.loc === loc);
    }
    if (extType && extType !== 'all') {
      roleFilteredData = roleFilteredData.filter(record => record.extType === extType);
    }
    if (classFilter && classFilter !== 'all') {
      roleFilteredData = roleFilteredData.filter(record => record.className === classFilter);
    }
    if (subClassFilter && subClassFilter !== 'all') {
      roleFilteredData = roleFilteredData.filter(record => record.subClass === subClassFilter);
    }


    // Group data by year (UY - Underwriting Year)
    const yearlyGroups: Record<number, ReinsuranceData[]> = {};

    roleFilteredData.forEach(record => {
      // Get year from UY (Underwriting Year)
      let recordYear: number | undefined;
      
      if (record.uy) {
        const uyYear = parseInt(record.uy);
        if (!isNaN(uyYear) && uyYear >= 1900 && uyYear <= 2100) {
          recordYear = uyYear;
        }
      }
      
      // Fallback to inceptionYear if UY is not available
      if (!recordYear && record.inceptionYear) {
        recordYear = record.inceptionYear;
      }
      
      // Filter by selected year if specified
      if (year && year !== 'all') {
        const yearNum = parseInt(year, 10);
        if (recordYear !== yearNum) {
          return; // Skip this record if it doesn't match the selected year
        }
      }
      
      if (recordYear) {
        if (!yearlyGroups[recordYear]) {
          yearlyGroups[recordYear] = [];
        }
        yearlyGroups[recordYear].push(record);
      }
    });

    // Get all years and sort them
    const yearOrder = Object.keys(yearlyGroups)
      .map(y => parseInt(y))
      .sort((a, b) => a - b);

    // Calculate yearly metrics
    const years: Record<number, {
      year: number;
      policyCount: number;
      premium: number;
      acquisition: number;
      paidClaims: number;
      osLoss: number;
      incurredClaims: number;
      technicalResult: number;
      lossRatioPct: number;
      acquisitionPct: number;
      combinedRatioPct: number;
    }> = {};
    let totalPolicyCount = 0;
    let totalPremium = 0;
    let totalAcquisition = 0;
    let totalPaidClaims = 0;
    let totalOsLoss = 0;

    // Process each year dynamically
    yearOrder.forEach(year => {
      const yearData = yearlyGroups[year];
      
      // Core measures (using KD columns from specified columns only)
      const policyCount = yearData.length;
      const premium = yearData.reduce((sum, record) => sum + (record.grsPremKD || 0), 0);
      const acquisition = yearData.reduce((sum, record) => sum + (record.acqCostKD || 0), 0);
      const paidClaims = yearData.reduce((sum, record) => sum + (record.paidClaimsKD || 0), 0);
      const osLoss = yearData.reduce((sum, record) => sum + (record.osClaimKD || 0), 0);
      
      // Derived measures
      const incurredClaims = paidClaims + osLoss;
      const technicalResult = premium - incurredClaims - acquisition;
      
      // Ratio calculations with guard against division by zero
      const lossRatioPct = premium > 0 ? (incurredClaims / premium) * 100 : 0;
      const acquisitionPct = premium > 0 ? (acquisition / premium) * 100 : 0;
      const combinedRatioPct = lossRatioPct + acquisitionPct;

      years[year] = {
        year,
        policyCount,
        premium,
        acquisition,
        paidClaims,
        osLoss,
        incurredClaims,
        technicalResult,
        lossRatioPct,
        acquisitionPct,
        combinedRatioPct
      };

      // Accumulate totals
      totalPolicyCount += policyCount;
      totalPremium += premium;
      totalAcquisition += acquisition;
      totalPaidClaims += paidClaims;
      totalOsLoss += osLoss;
    });

    // Calculate totals
    const totalIncurredClaims = totalPaidClaims + totalOsLoss;
    const totalTechnicalResult = totalPremium - totalIncurredClaims - totalAcquisition;
    const totalLossRatioPct = totalPremium > 0 ? (totalIncurredClaims / totalPremium) * 100 : 0;
    const totalAcquisitionPct = totalPremium > 0 ? (totalAcquisition / totalPremium) * 100 : 0;
    const totalCombinedRatioPct = totalLossRatioPct + totalAcquisitionPct;

    const result = {
      years,
      yearOrder, // Include year order for frontend
      total: {
        policyCount: totalPolicyCount,
        premium: totalPremium,
        acquisition: totalAcquisition,
        paidClaims: totalPaidClaims,
        osLoss: totalOsLoss,
        incurredClaims: totalIncurredClaims,
        technicalResult: totalTechnicalResult,
        lossRatioPct: totalLossRatioPct,
        acquisitionPct: totalAcquisitionPct,
        combinedRatioPct: totalCombinedRatioPct
      }
    };

    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Yearly API - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch yearly data';
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}


