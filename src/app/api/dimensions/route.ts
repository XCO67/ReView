export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

// Cache for dimensions data
let dimensionsCache: {
  years: string[];
  countries: string[];
  regions: string[];
  hubs: string[];
  brokers: string[];
  cedants: string[];
  extTypes: string[];
  insuredNames: string[];
} | null = null;
let lastModified: number | null = null;

/**
 * Parse CSV data and extract unique dimensions
 */
function extractDimensions(csvContent: string) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const dimensions: {
    years: Set<string>;
    countries: Set<string>;
    regions: Set<string>;
    hubs: Set<string>;
    brokers: Set<string>;
    cedants: Set<string>;
    extTypes: Set<string>;
    insuredNames: Set<string>;
  } = {
    years: new Set<string>(),
    countries: new Set<string>(),
    regions: new Set<string>(),
    hubs: new Set<string>(),
    brokers: new Set<string>(),
    cedants: new Set<string>(),
    extTypes: new Set<string>(),
    insuredNames: new Set<string>(),
  };
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    if (values.length < headers.length) continue;
    
    try {
      // Extract dimensions from each row
      const uy = values[2]?.trim();
      const country = values[10]?.trim();
      const broker = values[11]?.trim();
      const cedant = values[12]?.trim();
      const extType = values[4]?.trim();
      const region = values[44]?.trim();
      const hub = values[45]?.trim();
      const insuredName = values[13]?.trim();
      
      if (uy) dimensions.years.add(uy);
      if (country) dimensions.countries.add(country);
      if (broker) dimensions.brokers.add(broker);
      if (cedant) dimensions.cedants.add(cedant);
      if (extType) dimensions.extTypes.add(extType);
      if (region) dimensions.regions.add(region);
      if (hub) dimensions.hubs.add(hub);
      if (insuredName) dimensions.insuredNames.add(insuredName);
    } catch (error) {
      console.warn(`Error parsing dimensions from row ${i + 1}:`, error);
      continue;
    }
  }
  
  // Convert Sets to sorted arrays
  return {
    years: Array.from(dimensions.years).sort(),
    countries: Array.from(dimensions.countries).sort(),
    regions: Array.from(dimensions.regions).sort(),
    hubs: Array.from(dimensions.hubs).sort(),
    brokers: Array.from(dimensions.brokers).sort(),
    cedants: Array.from(dimensions.cedants).sort(),
    extTypes: Array.from(dimensions.extTypes).sort(),
    insuredNames: Array.from(dimensions.insuredNames).sort(),
  };
}

/**
 * Load dimensions with caching
 */
async function loadDimensions() {
  const csvPath = path.join(process.cwd(), 'Dataset_2019_2021_clean_for_code.csv');
  
  try {
    const stats = await fs.stat(csvPath);
    const currentModified = stats.mtime.getTime();
    
    // Return cached data if file hasn't changed
    if (dimensionsCache && lastModified && currentModified === lastModified) {
      return dimensionsCache;
    }
    
    // Read and parse CSV file
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const dimensions = extractDimensions(csvContent);
    
    // Cache the data
    dimensionsCache = dimensions;
    lastModified = currentModified;
    
    console.log(`Loaded dimensions:`, {
      years: dimensions.years.length,
      countries: dimensions.countries.length,
      regions: dimensions.regions.length,
      hubs: dimensions.hubs.length,
      brokers: dimensions.brokers.length,
      cedants: dimensions.cedants.length,
      extTypes: dimensions.extTypes.length,
      insuredNames: dimensions.insuredNames.length,
    });
    
    return dimensions;
  } catch (error) {
    console.error('Error loading dimensions:', error);
    return {
      years: [],
      countries: [],
      regions: [],
      hubs: [],
      brokers: [],
      cedants: [],
      extTypes: [],
      insuredNames: [],
    };
  }
}

export async function GET() {
  try {
    const dimensions = await loadDimensions();
    
    return NextResponse.json(dimensions);
  } catch (error) {
    console.error('Dimensions API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dimensions',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}