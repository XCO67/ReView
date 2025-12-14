import { NextRequest, NextResponse } from 'next/server';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses, filterByRole } from '@/lib/role-filter';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'broker';
    const classFilter = searchParams.get('class');
    const subClassFilter = searchParams.get('subClass');
    const extTypeFilter = searchParams.get('extType');
    const countryFilter = searchParams.get('country');
    const hubFilter = searchParams.get('hub');
    const regionFilter = searchParams.get('region');
    
    if (type !== 'broker' && type !== 'cedant') {
      return NextResponse.json({ error: 'Invalid type. Must be broker or cedant' }, { status: 400 });
    }

    const data = await loadUWData();
    
    // Filter by role if needed
    let filteredData = filterByRole(data, allowedClasses);
    
    // Apply filters
    if (classFilter && classFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.className && record.className.toLowerCase() === classFilter.toLowerCase()
      );
    }

    if (subClassFilter && subClassFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.subClass && record.subClass.toLowerCase() === subClassFilter.toLowerCase()
      );
    }

    if (extTypeFilter && extTypeFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.extType && record.extType.toLowerCase() === extTypeFilter.toLowerCase()
      );
    }

    if (countryFilter && countryFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.countryName && record.countryName.toLowerCase() === countryFilter.toLowerCase()
      );
    }

    if (hubFilter && hubFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.hub && record.hub.toLowerCase() === hubFilter.toLowerCase()
      );
    }

    if (regionFilter && regionFilter !== 'all') {
      filteredData = filteredData.filter(record => 
        record.region && record.region.toLowerCase() === regionFilter.toLowerCase()
      );
    }
    
    // Get unique entities
    const entities = new Set<string>();
    filteredData.forEach(record => {
      const entity = type === 'broker' ? record.broker : record.cedant;
      if (entity && entity.trim()) {
        entities.add(entity.trim());
      }
    });

    return NextResponse.json({
      entities: Array.from(entities).sort(),
    });
  } catch (error) {
    console.error('Performance entities API error:', error);
    return NextResponse.json({ error: 'Failed to load entities' }, { status: 500 });
  }
}

