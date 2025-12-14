import { NextRequest, NextResponse } from 'next/server';
import { getRenewalFilterOptions } from '@/lib/renewals';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses } from '@/lib/role-filter';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const selectedClass = searchParams.get('class') || null;
    
    const filterOptions = await getRenewalFilterOptions(allowedClasses, selectedClass);
    
    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error('Filter options API error:', error);
    return NextResponse.json({ error: 'Failed to load filter options' }, { status: 500 });
  }
}

