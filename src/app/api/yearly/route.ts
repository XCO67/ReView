export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { ReinsuranceData } from '@/lib/schema';
import { parseCSVLine, cleanNumeric, parseDate, deriveRegionAndHub } from '@/lib/csvParser';

// Cache for CSV data
let csvDataCache: ReinsuranceData[] | null = null;
let lastModified: number | null = null;

/**
 * Parse CSV data and convert to ReinsuranceData format
 * New CSV structure: Ultimate Gross and Net Data(HO in KWD & FERO in USD).csv
 */
function parseCSVData(csvContent: string): ReinsuranceData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.warn('Yearly API - CSV file is empty');
    return [];
  }
  
  // Parse header line
  const headers = parseCSVLine(lines[0]);
  
  console.log('Yearly API - CSV parsing:', {
    totalLines: lines.length,
    headers: headers.length,
    sampleHeaders: headers.slice(0, 10)
  });
  
  const data: ReinsuranceData[] = [];
  const yearCounts: Record<string, number> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const values = parseCSVLine(line);
      
      // Skip if not enough values
      if (values.length < 30) {
        console.log(`Yearly API - Skipping row ${i + 1}: insufficient values (${values.length})`);
        continue;
      }
      
      // Map columns from new CSV structure
      // Column indices based on: View Extract,Loc,UY,Srl,Ext Type,Class,Sub br,Com date,Exp date,...
      const uy = values[2]?.trim() || ''; // UY (column 2)
      const extType = values[4]?.trim() || ''; // Ext Type (column 4)
      const broker = values[14]?.trim() || ''; // Brk Name (column 14)
      const cedant = values[16]?.trim() || ''; // Ced Name (column 16)
      const orgInsuredTrtyName = values[18]?.trim() || ''; // Org.Insured/Trty Name (column 18)
      const countryName = values[12]?.trim() || ''; // Country (column 12)
      const comDate = values[7]?.trim() || undefined; // Com date (column 7)
      const bpScope = values[52]?.trim() || undefined; // Bp Scope (column 52)
      
      // Parse date to get year, quarter, month
      const dateInfo = parseDate(comDate);
      
      // Derive region and hub from Bp Scope or Country
      const { region, hub } = deriveRegionAndHub(bpScope, countryName);
      
      // Parse numeric values (remove commas and quotes)
      const maxLiabilityFC = cleanNumeric(values[28]); // Max Liability (FC) (column 28)
      const grossUWPrem = cleanNumeric(values[29]); // Gross UW Prem (column 29)
      const grossBookPrem = cleanNumeric(values[30]); // Gross Book Prem (column 30)
      const grossActualAcq = cleanNumeric(values[31]); // Gross Actual Acq. (column 31)
      const grossPaidClaims = cleanNumeric(values[37]); // Gross paid claims (column 37)
      const grossOsLoss = cleanNumeric(values[39]); // Gross os loss (column 39)
      
      const record: ReinsuranceData = {
        uy,
        extType,
        broker,
        cedant,
        orgInsuredTrtyName,
        maxLiabilityFC,
        grossUWPrem,
        grossBookPrem,
        grossActualAcq,
        grossPaidClaims,
        grossOsLoss,
        countryName,
        region,
        hub,
        inceptionYear: dateInfo.year,
        inceptionQuarter: dateInfo.quarter,
        inceptionMonth: dateInfo.month,
        comDate,
      };
      
      // Only add valid records (must have UY)
      if (record.uy) {
        data.push(record);
        yearCounts[record.uy] = (yearCounts[record.uy] || 0) + 1;
      } else {
        console.log(`Yearly API - Skipping row ${i + 1}: no UY value`);
      }
    } catch (error) {
      console.warn(`Yearly API - Error parsing CSV row ${i + 1}:`, error);
      continue;
    }
  }
  
  console.log('Yearly API - CSV parsing complete:', {
    totalRecords: data.length,
    yearCounts: yearCounts,
    sampleRecord: data[0]
  });
  
  return data;
}

/**
 * Load CSV data with caching
 */
async function loadCSVData(): Promise<ReinsuranceData[]> {
  // Try multiple possible paths for the new CSV file
  const csvFileName = 'Ultimate Gross and Net Data(HO in KWD & FERO in USD).csv';
  const possiblePaths = [
    path.join(process.cwd(), csvFileName),
    path.join(process.cwd(), '..', csvFileName),
    path.join(process.cwd(), '..', '..', csvFileName),
    path.join(process.cwd(), 'src', csvFileName),
    path.join(process.cwd(), 'frontend', csvFileName)
  ];
  
  let csvPath = '';
  for (const testPath of possiblePaths) {
    try {
      await fs.stat(testPath);
      csvPath = testPath;
      break;
    } catch {
      // Continue to next path
    }
  }
  
  if (!csvPath) {
    throw new Error(`CSV file not found. Tried paths: ${possiblePaths.join(', ')}`);
  }

  try {
    console.log('Yearly API - Loading CSV from path:', csvPath);
    console.log('Yearly API - Current working directory:', process.cwd());
    const stats = await fs.stat(csvPath);
    const currentModified = stats.mtime.getTime();
    
    // Check if we need to reload data
    if (csvDataCache && lastModified && currentModified <= lastModified) {
      console.log('Yearly API - Returning cached data:', csvDataCache.length, 'records');
      return csvDataCache;
    }

    console.log('Yearly API - Reading CSV file...');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    console.log('Yearly API - CSV content length:', csvContent.length);

    const data = parseCSVData(csvContent);
    csvDataCache = data;
    lastModified = currentModified;
    
    console.log('Yearly API - Parsed data:', data.length, 'records');
    return data;
  } catch (error) {
    console.error('Yearly API - Error loading CSV:', error);
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    console.log('Yearly API - GET request:', req.url);

    const allData = await loadCSVData();
    console.log('Yearly API - Loaded data:', allData.length, 'records');

    // Group data by year (UY - Underwriting Year)
    const yearlyGroups: Record<number, ReinsuranceData[]> = {};

    allData.forEach(record => {
      // Get year from UY (Underwriting Year)
      let year: number | undefined;
      
      if (record.uy) {
        const uyYear = parseInt(record.uy);
        if (!isNaN(uyYear) && uyYear >= 2019) {
          year = uyYear;
        }
      }
      
      // Fallback to inceptionYear if UY is not available
      if (!year && record.inceptionYear) {
        year = record.inceptionYear;
      }
      
      if (year) {
        if (!yearlyGroups[year]) {
          yearlyGroups[year] = [];
        }
        yearlyGroups[year].push(record);
      }
    });

    // Get all years and sort them
    const yearOrder = Object.keys(yearlyGroups)
      .map(y => parseInt(y))
      .sort((a, b) => a - b);

    console.log('Yearly API - Yearly groups:', yearOrder.reduce((acc, year) => {
      acc[year] = yearlyGroups[year].length;
      return acc;
    }, {} as Record<number, number>));

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
      
      // Core measures (numeric; coerce to number)
      const policyCount = yearData.length;
      const premium = yearData.reduce((sum, record) => sum + (record.grossUWPrem || 0), 0);
      const acquisition = yearData.reduce((sum, record) => sum + (record.grossActualAcq || 0), 0);
      const paidClaims = yearData.reduce((sum, record) => sum + (record.grossPaidClaims || 0), 0);
      const osLoss = yearData.reduce((sum, record) => sum + (record.grossOsLoss || 0), 0);
      
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

    console.log('Yearly API - Final result:', {
      totalYears: Object.keys(years).length,
      yearOrder: yearOrder,
      totalPolicies: result.total.policyCount,
      totalPremium: result.total.premium,
      yearsWithData: Object.keys(years).filter(y => years[parseInt(y)].policyCount > 0).length
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Yearly API - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch yearly data' }, { status: 500 });
  }
}


