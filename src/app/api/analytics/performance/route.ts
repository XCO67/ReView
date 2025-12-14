import { NextRequest, NextResponse } from 'next/server';
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses, filterByRole } from '@/lib/role-filter';
import { aggregateKPIs } from '@/lib/kpi';

interface PolicyPerformanceRecord {
  policyName: string;
  cedantName: string;
  srlNumber?: string;
  year: number;
  policyCount: number;
  retainedPrem: number; // GROSS PREM net of Built-in Retrocession (using grsPremKD for now)
  ucr: number; // Underwriting Combined Ratio (Loss Ratio + Expense Ratio)
  premium: number;
  incurredClaims: number;
  expense: number;
  lossRatio: number;
  expenseRatio: number;
}

interface PerformanceData {
  entity: string;
  entityType: 'broker' | 'cedant';
  policies: PolicyPerformanceRecord[];
  availableYears: number[];
  availablePolicies: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'broker';
    const entity = searchParams.get('entity');
    const yearsParam = searchParams.getAll('years'); // Support multiple years
    const classFilter = searchParams.get('class');
    const subClassFilter = searchParams.get('subClass');
    const extTypeFilter = searchParams.get('extType');
    const policyFilter = searchParams.get('policy');
    const countryFilter = searchParams.get('country');
    const hubFilter = searchParams.get('hub');
    const regionFilter = searchParams.get('region');
    
    // Convert years to numbers, filtering out invalid values
    const selectedYears = yearsParam.length > 0 
      ? yearsParam.map(y => parseInt(y, 10)).filter(y => !isNaN(y))
      : [];

    if (!entity) {
      return NextResponse.json({ error: 'Entity name is required' }, { status: 400 });
    }

    if (type !== 'broker' && type !== 'cedant') {
      return NextResponse.json({ error: 'Invalid type. Must be broker or cedant' }, { status: 400 });
    }

    const data = await loadUWData();
    
    // Filter by role if needed
    let filteredData = filterByRole(data, allowedClasses ?? undefined);
    
    // Filter by entity
    filteredData = filteredData.filter(record => {
      const recordEntity = type === 'broker' ? record.broker : record.cedant;
      return recordEntity && recordEntity.trim().toLowerCase() === entity.trim().toLowerCase();
    });

    // Apply additional filters
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

    // Get unique policy names and years
    const policyNames = new Set<string>();
    const years = new Set<number>();
    
    filteredData.forEach(record => {
      if (record.orgInsuredTrtyName) {
        policyNames.add(record.orgInsuredTrtyName);
      }
      const year = record.inceptionYear || (record.uy ? parseInt(String(record.uy), 10) : null);
      if (year) {
        years.add(year);
      }
    });

    // Group by policy name and year
    const policyYearGroups = new Map<string, Map<number, typeof filteredData>>();
    
    filteredData.forEach(record => {
      const policyName = record.orgInsuredTrtyName || 'Unknown';
      const year = record.inceptionYear || (record.uy ? parseInt(String(record.uy), 10) : null);
      
      if (!year) return;
      
      if (!policyYearGroups.has(policyName)) {
        policyYearGroups.set(policyName, new Map());
      }
      
      const yearMap = policyYearGroups.get(policyName)!;
      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }
      
      yearMap.get(year)!.push(record);
    });

    // Build performance records
    const policies: PolicyPerformanceRecord[] = [];
    
    policyYearGroups.forEach((yearMap, policyName) => {
      // Apply policy filter if specified
      if (policyFilter && policyFilter !== 'all') {
        if (policyName.toLowerCase() !== policyFilter.toLowerCase()) {
          return;
        }
      }

      yearMap.forEach((records, year) => {
        // Apply year filter if specified (multiple years supported)
        if (selectedYears.length > 0 && !selectedYears.includes(year)) {
          return;
        }

        const kpis = aggregateKPIs(records);
        const cedantName = records[0]?.cedant || 'Unknown';
        const srlNumber = records[0]?.srl || undefined;
        
        // RETAINED PREM = GROSS PREM (using grsPremKD for now, as we don't have built-in retrocession data)
        // In a real scenario, this would be: grsPremKD - builtInRetrocession
        const retainedPrem = kpis.premium;
        
        // uCR% = Underwriting Combined Ratio = Loss Ratio + Expense Ratio
        const ucr = kpis.combinedRatio;

        policies.push({
          policyName,
          cedantName,
          srlNumber,
          year,
          policyCount: kpis.numberOfAccounts,
          retainedPrem,
          ucr,
          premium: kpis.premium,
          incurredClaims: kpis.incurredClaims,
          expense: kpis.expense,
          lossRatio: kpis.lossRatio,
          expenseRatio: kpis.expenseRatio,
        });
      });
    });

    const result: PerformanceData = {
      entity,
      entityType: type as 'broker' | 'cedant',
      policies: policies.sort((a, b) => {
        // Sort by policy name, then by year (descending)
        if (a.policyName !== b.policyName) {
          return a.policyName.localeCompare(b.policyName);
        }
        return b.year - a.year;
      }),
      availableYears: Array.from(years).sort((a, b) => a - b), // Sort oldest to newest
      availablePolicies: Array.from(policyNames).sort(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Failed to load performance data' }, { status: 500 });
  }
}
