export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';

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
  
  // Filter by class
  const classFilter = params.get('class');
  if (classFilter) {
    filteredData = filteredData.filter(record => 
      record.className === classFilter
    );
  }
  
  // Filter by subclass
  const subClassFilter = params.get('subClass');
  if (subClassFilter) {
    filteredData = filteredData.filter(record => 
      record.subClass === subClassFilter
    );
  }
  
  return filteredData;
}

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Get limit parameter (default to 100000 to handle large datasets)
    const limitParam = params.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100000;
    
    // Check for force reload parameter
    const forceReload = params.get('forceReload') === 'true';
    // Load CSV data
    const allData = await loadUWData({ forceReload });
    
    // Apply role-based filtering first
    const roleFilteredData = filterByRole(allData, session?.roles);
    
    // Apply other filters
    const filteredData = filterData(roleFilteredData, params);
    
    // Apply limit (no shuffling needed - return all filtered data up to limit)
    const limitedData = filteredData.slice(0, limit);
    
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
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'development') {
      console.error('API error:', error);
    }
    return NextResponse.json({ 
      error: 'Failed to fetch data',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}