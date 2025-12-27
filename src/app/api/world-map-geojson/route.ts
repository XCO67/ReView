export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { logger } from '@/lib/utils/logger';

// Proxy endpoint to fetch world map GeoJSON data
// This avoids CORS issues by fetching on the server side
export async function GET() {
  try {
    // List of reliable sources to try
    const sources = [
      'https://cdn.jsdelivr.net/npm/world-atlas@2/world/110m.json',
      'https://unpkg.com/world-atlas@2/world/110m.json',
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
      'https://raw.githubusercontent.com/d3/d3.github.io/master/world-110m.v1.json',
    ];

    for (const source of sources) {
      try {
        const response = await fetch(source, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Kuwait-Reinsurance-Dashboard/1.0',
          },
        });

        if (!response.ok) {
          continue; // Try next source
        }

        const data = await response.json();
        
        // Return the data with proper headers
        return NextResponse.json(data, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        });
      } catch (error) {
        // Continue to next source
        continue;
      }
    }

    // If all sources failed
    return NextResponse.json(
      { error: 'Failed to fetch world map data from all sources' },
      { status: 500 }
    );
  } catch (error) {
    logger.error('World Map GeoJSON API Error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

