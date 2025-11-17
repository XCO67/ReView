export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    
    if (!year) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    // Return empty quarterly data - ready for PostgreSQL implementation
    return NextResponse.json({ 
      year: parseInt(year), 
      quarters: {},
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
      message: "Database implementation removed - ready for PostgreSQL"
    });
  } catch (error) {
    console.error('Failed to fetch quarterly data:', error);
    return NextResponse.json({ error: 'Failed to fetch quarterly data' }, { status: 500 });
  }
}
