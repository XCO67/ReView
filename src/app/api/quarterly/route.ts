export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { parseDate } from '@/lib/csvParser';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';

// Time normalization according to spec
// Uses UY for year and inceptionQuarter for quarter
function normalizeTimeData(record: ReinsuranceData): { year: number; quarter: string } | null {
  // 1. Get year from UY (Underwriting Year)
  let year: number | undefined;
  
  if (record.uy) {
    const uyYear = parseInt(record.uy);
    if (!isNaN(uyYear) && uyYear >= 1900 && uyYear <= 2100) {
      year = uyYear;
    }
  }
  
  // Fallback to inceptionYear if UY is not available
  if (!year && record.inceptionYear) {
    year = record.inceptionYear;
  }
  
  // Ensure year is valid
  if (!year) {
    return null;
  }

  // 2. Get quarter from inceptionQuarter (number: 1, 2, 3, or 4)
  let quarter: string | null = null;
  
  if (record.inceptionQuarter !== undefined && record.inceptionQuarter !== null) {
    const qNum = typeof record.inceptionQuarter === 'number' 
      ? record.inceptionQuarter 
      : parseInt(String(record.inceptionQuarter));
    
    if (qNum >= 1 && qNum <= 4) {
      quarter = `Q${qNum}`;
    }
  }
  
  // If quarter is missing, derive from inceptionMonth (number: 1-12)
  if (!quarter && record.inceptionMonth !== undefined && record.inceptionMonth !== null) {
    const month = typeof record.inceptionMonth === 'number'
      ? record.inceptionMonth
      : parseInt(String(record.inceptionMonth));
    
    if (month >= 1 && month <= 12) {
      if (month >= 1 && month <= 3) {
        quarter = 'Q1';
      } else if (month >= 4 && month <= 6) {
        quarter = 'Q2';
      } else if (month >= 7 && month <= 9) {
        quarter = 'Q3';
      } else if (month >= 10 && month <= 12) {
        quarter = 'Q4';
      }
    }
  }
  
  // Validate quarter is Q1-Q4
  if (!quarter || !/^Q[1-4]$/.test(quarter)) {
    return null;
  }
  
  return { year, quarter };
}


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

    // Apply time normalization
    const normalizedData = roleFilteredData
      .map(record => {
        const timeData = normalizeTimeData(record);
        if (!timeData) return null;
        
        return {
          ...record,
          normalizedYear: timeData.year,
          normalizedQuarter: timeData.quarter
        };
      })
      .filter(record => {
        if (record === null) return false;
        // Filter by year if specified
        if (year && year !== 'all') {
          const yearNum = parseInt(year, 10);
          return record.normalizedYear === yearNum;
        }
        return true;
      });


    // Group data by quarter according to spec
    const quarterlyGroups: Record<string, ReinsuranceData[]> = {
      'Q1': [],
      'Q2': [],
      'Q3': [],
      'Q4': []
    };

    normalizedData.forEach(record => {
      if (record) {
        const quarter = record.normalizedQuarter;
        if (quarterlyGroups[quarter]) {
          quarterlyGroups[quarter].push(record);
        }
      }
    });

    // Calculate quarterly metrics according to spec
    const quarters: Record<number, {
      quarter: number;
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

    // Process each quarter (Q1-Q4)
    const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
    quarterOrder.forEach((quarterKey, index) => {
      const quarterNum = index + 1;
      const quarterData = quarterlyGroups[quarterKey];
      
      // Core measures (numeric; coerce to number)
      const policyCount = quarterData.length;
      // Use KD columns from specified columns only
      const premium = quarterData.reduce((sum, record) => sum + (record.grsPremKD || 0), 0);
      const acquisition = quarterData.reduce((sum, record) => sum + (record.acqCostKD || 0), 0);
      const paidClaims = quarterData.reduce((sum, record) => sum + (record.paidClaimsKD || 0), 0);
      const osLoss = quarterData.reduce((sum, record) => sum + (record.osClaimKD || 0), 0);
      
      // Derived measures
      const incurredClaims = paidClaims + osLoss;
      const technicalResult = premium - incurredClaims - acquisition;
      
      // Ratio calculations with guard against division by zero
      const lossRatioPct = premium > 0 ? (incurredClaims / premium) * 100 : 0;
      const acquisitionPct = premium > 0 ? (acquisition / premium) * 100 : 0;
      const combinedRatioPct = lossRatioPct + acquisitionPct;

      quarters[quarterNum] = {
        quarter: quarterNum,
        year: year && year !== 'all' ? parseInt(year, 10) : 0,
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
      year: year && year !== 'all' ? parseInt(year, 10) : ('all' as const),
      quarters,
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
    console.error('Quarterly API - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quarterly data';
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
