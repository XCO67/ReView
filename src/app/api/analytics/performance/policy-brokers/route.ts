import { NextRequest, NextResponse } from 'next/server';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses, filterByRole } from '@/lib/role-filter';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const policyName = searchParams.get('policy');
    const classFilter = searchParams.get('class');
    const subClassFilter = searchParams.get('subClass');
    const extTypeFilter = searchParams.get('extType');
    const countryFilter = searchParams.get('country');
    const hubFilter = searchParams.get('hub');
    const regionFilter = searchParams.get('region');
    
    if (!policyName) {
      return NextResponse.json({ error: 'Policy name is required' }, { status: 400 });
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
    
    // Get unique brokers associated with this policy
    const brokers = new Set<string>();
    filteredData.forEach(record => {
      if (record.orgInsuredTrtyName && 
          record.orgInsuredTrtyName.trim().toLowerCase() === policyName.trim().toLowerCase() &&
          record.broker && record.broker.trim()) {
        brokers.add(record.broker.trim());
      }
    });

    return NextResponse.json({
      brokers: Array.from(brokers).sort(),
      policy: policyName,
    });
  } catch (error) {
    console.error('Policy brokers API error:', error);
    return NextResponse.json({ error: 'Failed to load brokers for policy' }, { status: 500 });
  }
}

