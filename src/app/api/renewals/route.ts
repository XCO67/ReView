import { NextRequest, NextResponse } from 'next/server';
import { filterRenewals } from '@/lib/renewals';
import { getSessionFromRequest } from '@/lib/session';
import { getAllowedClasses } from '@/lib/role-filter';

export async function GET(request: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(request);
    const allowedClasses = getAllowedClasses(session?.roles);
    
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || undefined;
    const quarter = searchParams.get('quarter') || undefined;
    const status = searchParams.get('status') as 'renewed' | 'not-renewed' | 'upcoming-renewal' | null;
    const monthName = searchParams.get('monthName') || undefined;
    // Handle array parameters
    const countryParams = searchParams.getAll('country');
    const countryName = countryParams.length > 0 ? (countryParams.length === 1 ? countryParams[0] : countryParams) : undefined;
    const countrySearch = searchParams.get('countrySearch')?.trim() || undefined;
    // SRL search - validate and sanitize
    const srlSearchRaw = searchParams.get('srlSearch');
    const srlSearch = srlSearchRaw && srlSearchRaw.trim() ? srlSearchRaw.trim() : undefined;
    const businessTypeParams = searchParams.getAll('businessType');
    const businessType = businessTypeParams.length > 0 ? (businessTypeParams.length === 1 ? businessTypeParams[0] : businessTypeParams) : undefined;
    const classFilterParams = searchParams.getAll('className');
    const classFilter = classFilterParams.length > 0 ? (classFilterParams.length === 1 ? classFilterParams[0] : classFilterParams) : undefined;
    const subClassFilterParams = searchParams.getAll('subClass');
    const subClassFilter = subClassFilterParams.length > 0 ? (subClassFilterParams.length === 1 ? subClassFilterParams[0] : subClassFilterParams) : undefined;
    const locFilter = searchParams.get('loc') || undefined;
    const extTypeFilterParams = searchParams.getAll('extType');
    const extTypeFilter = extTypeFilterParams.length > 0 ? (extTypeFilterParams.length === 1 ? extTypeFilterParams[0] : extTypeFilterParams) : undefined;

    // If user has role-based class restrictions, apply them
    // If allowedClasses is null (admin), no additional filtering needed
    // If allowedClasses is empty array, return empty results
    // Otherwise, filter by allowed classes
    const effectiveClassFilter: string | null = classFilter;
    if (allowedClasses !== null && allowedClasses !== undefined) {
      if (allowedClasses.length === 0) {
        // User has no allowed classes - return empty results
        return NextResponse.json({
          totalCount: 0,
          totalPremium: 0,
          totalPaidClaims: 0,
          totalOsLoss: 0,
          totalIncurred: 0,
          totalLossRatio: 0,
          records: [],
          renewedCount: 0,
          renewedPremium: 0,
          notRenewedCount: 0,
          notRenewedPremium: 0,
          upcomingRenewalCount: 0,
          upcomingRenewalPremium: 0,
          renewedPercentage: 0,
          notRenewedPercentage: 0,
          upcomingRenewalPercentage: 0,
        });
      }
      
      // User has business role - must filter by their allowed classes
      // If they specified a class filter, it must be one of their allowed classes
      if (classFilter) {
        const classFilters = Array.isArray(classFilter) ? classFilter : [classFilter];
        // Check if all selected classes are allowed
        const allAllowed = classFilters.every(cf => {
          const classFilterLower = String(cf).toLowerCase();
          return allowedClasses.some(allowedClass => {
            const allowedClassLower = allowedClass.toLowerCase();
            return classFilterLower === allowedClassLower || 
                   classFilterLower.includes(allowedClassLower) ||
                   allowedClassLower.includes(classFilterLower);
          });
        });
        if (!allAllowed) {
          // Requested class is not allowed for this user - return empty
          return NextResponse.json({
            totalCount: 0,
            totalPremium: 0,
            totalPaidClaims: 0,
            totalOsLoss: 0,
            totalIncurred: 0,
            totalLossRatio: 0,
            records: [],
            renewedCount: 0,
            renewedPremium: 0,
            notRenewedCount: 0,
            notRenewedPremium: 0,
            upcomingRenewalCount: 0,
            upcomingRenewalPremium: 0,
            renewedPercentage: 0,
            notRenewedPercentage: 0,
            upcomingRenewalPercentage: 0,
          });
        }
      }
      // If no class filter specified, filterRenewals will handle role-based filtering
    }

    const summary = await filterRenewals(
      year, 
      quarter, 
      status || undefined,
      monthName,
      countryName,
      countrySearch,
      srlSearch,
      businessType,
      effectiveClassFilter,
      subClassFilter,
      locFilter,
      extTypeFilter,
      allowedClasses // Pass allowed classes for role-based filtering
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Renewals API error:', error);
    return NextResponse.json({ error: 'Failed to load renewals' }, { status: 500 });
  }
}

