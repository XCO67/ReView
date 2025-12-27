export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';
import { applyFilters, extractFilterParams } from '@/lib/utils/data-filters';
import { MAX_DATA_LIMIT } from '@/lib/constants/filters';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering (don't fail if session fails)
    let session;
    try {
      session = await getSessionFromRequest(req);
    } catch (sessionError) {
      logger.warn('Session validation failed, continuing without role filtering', { error: sessionError });
      session = null;
    }
    
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Get limit parameter (clamp to max)
    const limitParam = params.get('limit');
    const limit = limitParam 
      ? Math.min(parseInt(limitParam, 10), MAX_DATA_LIMIT) 
      : MAX_DATA_LIMIT;
    
    // Check for force reload parameter
    const forceReload = params.get('forceReload') === 'true';
    
    // Load data with better error handling
    let allData: ReinsuranceData[];
    try {
      allData = await loadUWData({ forceReload });
    } catch (loadError) {
      logger.error('Failed to load underwriting data', loadError);
      return NextResponse.json({ 
        error: 'Failed to load data from database'
      }, { status: 500 });
    }
    
    // Ensure we have data
    if (!Array.isArray(allData)) {
      logger.error('Invalid data format received from loadUWData', { type: typeof allData });
      return NextResponse.json({ 
        error: 'Invalid data format received'
      }, { status: 500 });
    }
    
    // Apply role-based filtering first
    const roleFilteredData = filterByRole(allData, session?.roles);
    
    // Extract and apply filters using shared utility
    const filterParams = extractFilterParams(params);
    const filteredData = applyFilters(roleFilteredData, filterParams);
    
    // Apply limit
    const limitedData = filteredData.slice(0, limit);
    
    return NextResponse.json({
      data: limitedData,
      total: filteredData.length,
      returned: limitedData.length,
      filters: filterParams,
      message: `Loaded ${limitedData.length} records`
    });
  } catch (error) {
    logger.error('Data API request failed', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data'
    }, { status: 500 });
  }
}