import { NextRequest, NextResponse } from 'next/server';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses, filterByRole } from '@/lib/role-filter';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class');
    const subClassFilter = searchParams.get('subClass');
    const extTypeFilter = searchParams.get('extType');
    const countryFilter = searchParams.get('country');
    const hubFilter = searchParams.get('hub');
    const regionFilter = searchParams.get('region');
    
    const data = await loadUWData();
    
    // Filter by role if needed
    let filteredData = filterByRole(data, allowedClasses ?? undefined);
    
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
    
    // Get unique policy names (orgInsuredTrtyName)
    const policies = new Set<string>();
    filteredData.forEach(record => {
      const policyName = record.orgInsuredTrtyName;
      if (policyName && policyName.trim()) {
        policies.add(policyName.trim());
      }
    });

    return NextResponse.json({
      policies: Array.from(policies).sort(),
    });
  } catch (error) {
    console.error('Performance policies API error:', error);
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 });
  }
}

