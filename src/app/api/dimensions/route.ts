export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { loadUWData } from '@/lib/uw-data';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    const dataset = await loadUWData();
    
    // Get optional class filter for subclass filtering
    const { searchParams } = new URL(req.url);
    const classFilter = searchParams.get('class');
    
    // Apply role-based filtering
    let roleFilteredData = filterByRole(dataset, session?.roles);
    
    // If class filter is provided, filter by class for subclass options
    if (classFilter && classFilter !== 'all') {
      roleFilteredData = roleFilteredData.filter(record => 
        record.className && record.className.toLowerCase() === classFilter.toLowerCase()
      );
    }
    
    const dimensions = roleFilteredData.reduce(
      (acc, record) => {
        if (record.uy) acc.years.add(record.uy);
        if (record.countryName) acc.countries.add(record.countryName);
        if (record.region) acc.regions.add(record.region);
        if (record.hub) acc.hubs.add(record.hub);
        if (record.broker) acc.brokers.add(record.broker);
        if (record.cedant) acc.cedants.add(record.cedant);
        if (record.extType) acc.extTypes.add(record.extType);
        if (record.orgInsuredTrtyName) acc.insuredNames.add(record.orgInsuredTrtyName);
        if (record.className) acc.classes.add(record.className);
        if (record.subClass) acc.subClasses.add(record.subClass);
        return acc;
      },
      {
        years: new Set<string>(),
        countries: new Set<string>(),
        regions: new Set<string>(),
        hubs: new Set<string>(),
        brokers: new Set<string>(),
        cedants: new Set<string>(),
        extTypes: new Set<string>(),
        insuredNames: new Set<string>(),
        classes: new Set<string>(),
        subClasses: new Set<string>(),
      }
    );

    return NextResponse.json({
      years: Array.from(dimensions.years).sort(),
      countries: Array.from(dimensions.countries).sort(),
      regions: Array.from(dimensions.regions).sort(),
      hubs: Array.from(dimensions.hubs).sort(),
      brokers: Array.from(dimensions.brokers).sort(),
      cedants: Array.from(dimensions.cedants).sort(),
      extTypes: Array.from(dimensions.extTypes).sort(),
      insuredNames: Array.from(dimensions.insuredNames).sort(),
      classes: Array.from(dimensions.classes).sort(),
      subClasses: Array.from(dimensions.subClasses).sort(),
    });
  } catch (error) {
    console.error('Dimensions API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dimensions',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}