import { NextRequest, NextResponse } from 'next/server';
import { loadRenewals } from '@/lib/data/renewals';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses } from '@/lib/role-filter';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const srl = searchParams.get('srl');
    
    if (!srl) {
      return NextResponse.json({ error: 'SRL parameter is required' }, { status: 400 });
    }

    // Get user session for role-based filtering
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    // Load all renewal data
    const allData = await loadRenewals();
    
    // Filter by role if needed
    let filteredData = allData;
    if (allowedClasses !== null && allowedClasses !== undefined) {
      if (allowedClasses.length === 0) {
        return NextResponse.json({ years: [], broker: null });
      }
      filteredData = allData.filter((record) => {
        const recordClass = (record.class || '').trim().toLowerCase();
        if (!recordClass) return false;
        return allowedClasses.some(allowedClass => {
          const allowedClassLower = allowedClass.toLowerCase();
          return recordClass === allowedClassLower || 
                 recordClass.includes(allowedClassLower) ||
                 allowedClassLower.includes(recordClass);
        });
      });
    }
    
    // Find all records with matching SRL
    const matchingRecords = filteredData.filter(record => 
      record.srl && record.srl.toLowerCase() === srl.toLowerCase()
    );
    
    if (matchingRecords.length === 0) {
      return NextResponse.json({ years: [], broker: null });
    }
    
    // Extract unique years (from normalizedYear or year field)
    const years = Array.from(new Set(
      matchingRecords
        .map(record => {
          // Try normalizedYear first, then year, then uy
          return record.normalizedYear || record.year || record.uy || null;
        })
        .filter((year): year is string => year !== null && year !== '')
    )).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
    
    // Get broker name (should be consistent across records, but get the first non-empty one)
    const broker = matchingRecords.find(r => r.broker)?.broker || null;
    const isDirect = matchingRecords[0]?.isDirect || false;
    
    return NextResponse.json({ 
      years,
      broker: isDirect ? 'Direct' : broker,
      isDirect
    });
  } catch (error) {
    logger.error('Error fetching policy years', error);
    return NextResponse.json({ error: 'Failed to fetch policy years' }, { status: 500 });
  }
}

