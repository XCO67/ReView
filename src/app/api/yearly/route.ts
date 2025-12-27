export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';
import { applyFilters, extractFilterParams } from '@/lib/utils/data-filters';
import { extractYear } from '@/lib/utils/date-helpers';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    
    const url = new URL(req.url);

    const allData = await loadUWData();
    
    // Apply role-based filtering
    const roleFilteredData = filterByRole(allData, session?.roles);

    // Apply filters using shared utility
    const filterParams = extractFilterParams(url.searchParams);
    const filteredData = applyFilters(roleFilteredData, filterParams);

    // Group data by year (UY - Underwriting Year)
    const yearlyGroups: Record<number, ReinsuranceData[]> = {};

    filteredData.forEach(record => {
      // Get year using shared utility
      const recordYear = extractYear(record);
      
      // Skip records without valid year
      if (!recordYear) {
        return;
      }
      
      // Filter by selected year if specified
      if (filterParams.year && filterParams.year !== 'all') {
        const yearNum = parseInt(filterParams.year, 10);
        if (recordYear !== yearNum) {
          return; // Skip this record if it doesn't match the selected year
        }
      }
      
      if (!yearlyGroups[recordYear]) {
        yearlyGroups[recordYear] = [];
      }
      yearlyGroups[recordYear].push(record);
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
    logger.error('Yearly data API request failed', error);
    return NextResponse.json(
      { error: 'Failed to fetch yearly data' },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}


