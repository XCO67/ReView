export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { ReinsuranceData } from '@/lib/schema';
import { parseCSVLine, cleanNumeric, parseDate, deriveRegionAndHub } from '@/lib/csvParser';

// Cache for CSV data to avoid re-reading on every request
let csvDataCache: ReinsuranceData[] | null = null;
let lastModified: number | null = null;

/**
 * Parse CSV data and convert to ReinsuranceData format
 * New CSV structure: Ultimate Gross and Net Data(HO in KWD & FERO in USD).csv
 */
function parseCSVData(csvContent: string): ReinsuranceData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.warn('API - CSV file is empty');
    return [];
  }
  
  // Parse header line
  const headers = parseCSVLine(lines[0]);
  
  console.log('API - CSV parsing:', {
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
        console.log(`API - Skipping row ${i + 1}: insufficient values (${values.length})`);
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
        console.log(`API - Skipping row ${i + 1}: no UY value`);
      }
    } catch (error) {
      console.warn(`API - Error parsing CSV row ${i + 1}:`, error);
      continue;
    }
  }
  
  console.log('API - CSV parsing complete:', {
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
    console.log('API - Loading CSV from path:', csvPath);
    console.log('API - Current working directory:', process.cwd());
    const stats = await fs.stat(csvPath);
    const currentModified = stats.mtime.getTime();
    
    // Return cached data if file hasn't changed
    if (csvDataCache && lastModified && currentModified === lastModified) {
      console.log('API - Returning cached data:', csvDataCache.length, 'records');
      return csvDataCache;
    }
    
    // Read and parse CSV file
    console.log('API - Reading CSV file...');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    console.log('API - CSV content length:', csvContent.length);
    
    const data = parseCSVData(csvContent);
    console.log('API - Parsed data:', data.length, 'records');
    
    // Cache the data
    csvDataCache = data;
    lastModified = currentModified;
    
    return data;
  } catch (error) {
    console.error('API - Error loading CSV data:', error);
    return [];
  }
}

/**
 * Filter data based on query parameters
 */
function filterData(data: ReinsuranceData[], params: URLSearchParams): ReinsuranceData[] {
  let filteredData = [...data];
  
  // Filter by year (UY)
  const year = params.get('year');
  if (year) {
    filteredData = filteredData.filter(record => record.uy === year);
  }
  
  // Filter by country
  const country = params.get('country');
  if (country) {
    filteredData = filteredData.filter(record => 
      record.countryName.toLowerCase().includes(country.toLowerCase())
    );
  }
  
  // Filter by hub
  const hub = params.get('hub');
  if (hub) {
    filteredData = filteredData.filter(record => 
      record.hub.toLowerCase().includes(hub.toLowerCase())
    );
  }
  
  // Filter by region
  const region = params.get('region');
  if (region) {
    filteredData = filteredData.filter(record => 
      record.region.toLowerCase().includes(region.toLowerCase())
    );
  }
  
  // Filter by cedant
  const cedant = params.get('cedant');
  if (cedant) {
    filteredData = filteredData.filter(record => 
      record.cedant.toLowerCase().includes(cedant.toLowerCase())
    );
  }
  
  // Filter by insured
  const insured = params.get('insured');
  if (insured) {
    filteredData = filteredData.filter(record => 
      record.orgInsuredTrtyName.toLowerCase().includes(insured.toLowerCase())
    );
  }
  
  return filteredData;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    
    console.log('API - GET request:', req.url);
    
    // Get limit parameter (default to 100000 to handle large datasets)
    const limitParam = params.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100000;
    
    // Check for force reload parameter
    const forceReload = params.get('forceReload') === 'true';
    if (forceReload) {
      csvDataCache = null;
      lastModified = null;
    }
    
    // Load CSV data
    const allData = await loadCSVData();
    console.log('API - Loaded data:', allData.length, 'records');
    
    // Apply filters
    const filteredData = filterData(allData, params);
    console.log('API - Filtered data:', filteredData.length, 'records');
    
    // Apply limit (no shuffling needed - return all filtered data up to limit)
    const limitedData = filteredData.slice(0, limit);
    console.log('API - Returning data:', limitedData.length, 'records');
    
    return NextResponse.json({
      data: limitedData,
      total: filteredData.length,
      returned: limitedData.length,
      filters: {
        year: params.get('year'),
        country: params.get('country'),
        hub: params.get('hub'),
        region: params.get('region'),
        cedant: params.get('cedant'),
        insured: params.get('insured')
      },
      message: `Loaded ${limitedData.length} records from CSV dataset`
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}