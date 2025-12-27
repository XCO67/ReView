export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from '@/lib/session';
import { loadUWData } from '@/lib/uw-data';
import { filterByRole } from '@/lib/role-filter';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    
    if (!year) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    // Load data and apply role-based filtering
    const allData = await loadUWData();
    const roleFilteredData = filterByRole(allData, session?.roles);

    // Return empty monthly data - ready for PostgreSQL implementation
    // But ensure role-based filtering is applied
    return NextResponse.json({ 
      year: parseInt(year), 
      months: {},
      total: {
        policyCount: 0,
        premium: 0,
        acq: 0,
        incurred: 0,
        acqPct: 0,
        lossRatioPct: 0,
        technicalResult: 0,
        combinedRatioPct: 0,
      },
      message: "Monthly data aggregation",
      filteredRecords: roleFilteredData.length
    });
  } catch (error) {
    logger.error('Failed to fetch monthly data', error);
    return NextResponse.json({ error: 'Failed to fetch monthly data' }, { status: 500 });
  }
}
