export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { ReinsuranceData } from '@/lib/schema';
import { parseCSVLine, cleanNumeric, parseDate, deriveRegionAndHub } from '@/lib/csvParser';
import { aggregateKPIs } from '@/lib/kpi';

// Cache for CSV data
let csvDataCache: ReinsuranceData[] | null = null;
let lastModified: number | null = null;

// Load CSV data with caching
async function loadCSVData(): Promise<ReinsuranceData[]> {
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

  // Check if we need to reload data
  const stats = await fs.stat(csvPath);
  const currentModified = stats.mtime.getTime();
  
  if (csvDataCache && lastModified && currentModified <= lastModified) {
    return csvDataCache;
  }

  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const data = parseCSVData(csvContent);
  csvDataCache = data;
  lastModified = currentModified;
  
  return data;
}

// Parse CSV data using the csvParser utility
function parseCSVData(csvContent: string): ReinsuranceData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  const headers = parseCSVLine(lines[0]);
  const data: ReinsuranceData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      
      if (values.length < 30) continue;
      
      // Map columns from new CSV structure
      const uy = values[2]?.trim() || '';
      const extType = values[4]?.trim() || '';
      const broker = values[14]?.trim() || '';
      const cedant = values[16]?.trim() || '';
      const orgInsuredTrtyName = values[18]?.trim() || '';
      const countryName = values[12]?.trim() || '';
      const comDate = values[7]?.trim() || undefined;
      const bpScope = values[52]?.trim() || undefined;
      
      const dateInfo = parseDate(comDate);
      const { region, hub } = deriveRegionAndHub(bpScope, countryName);
      
      const maxLiabilityFC = cleanNumeric(values[28]);
      const grossUWPrem = cleanNumeric(values[29]);
      const grossBookPrem = cleanNumeric(values[30]);
      const grossActualAcq = cleanNumeric(values[31]);
      const grossPaidClaims = cleanNumeric(values[37]);
      const grossOsLoss = cleanNumeric(values[39]);
      
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
      
      if (record.uy && record.countryName) {
        data.push(record);
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 1}:`, error);
    }
  }
  
  return data;
}

export async function GET(req: Request) {
  try {
    const allData = await loadCSVData();

    // Group data by country
    const countryGroups: Record<string, ReinsuranceData[]> = {};

    allData.forEach(record => {
      if (record.countryName) {
        if (!countryGroups[record.countryName]) {
          countryGroups[record.countryName] = [];
        }
        countryGroups[record.countryName].push(record);
      }
    });

    // Calculate country metrics using aggregateKPIs
    const countries: Array<{
      country: string;
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
      brokers: string[];
      cedants: string[];
      regions: string[];
      hubs: string[];
    }> = [];

    let totalPolicyCount = 0;
    let totalPremium = 0;
    let totalAcquisition = 0;
    let totalPaidClaims = 0;
    let totalOsLoss = 0;

    // Process each country
    Object.entries(countryGroups).forEach(([countryName, countryData]) => {
      const kpis = aggregateKPIs(countryData);
      
      const policyCount = countryData.length;
      const premium = kpis.premium;
      const acquisition = kpis.expense;
      const paidClaims = kpis.paidClaims;
      const osLoss = kpis.outstandingClaims;
      const incurredClaims = kpis.incurredClaims;
      const technicalResult = premium - incurredClaims - acquisition;
      
      const lossRatioPct = kpis.lossRatio;
      const acquisitionPct = kpis.expenseRatio;
      const combinedRatioPct = kpis.combinedRatio;

      // Get unique brokers, cedants, regions, hubs
      const brokers = [...new Set(countryData.map(r => r.broker).filter(b => b && b.trim()))];
      const cedants = [...new Set(countryData.map(r => r.cedant).filter(c => c && c.trim()))];
      const regions = [...new Set(countryData.map(r => r.region).filter(r => r && r.trim()))];
      const hubs = [...new Set(countryData.map(r => r.hub).filter(h => h && h.trim()))];

      countries.push({
        country: countryName,
        policyCount,
        premium,
        acquisition,
        paidClaims,
        osLoss,
        incurredClaims,
        technicalResult,
        lossRatioPct,
        acquisitionPct,
        combinedRatioPct,
        brokers,
        cedants,
        regions,
        hubs
      });

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
      countries,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('World Map API - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch world map data' }, { status: 500 });
  }
}
