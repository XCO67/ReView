import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { filterRenewals, getRenewalFilterOptions } from '@/lib/renewals';
import { getAllowedClasses } from '@/lib/role-filter';
import { RenewalFiltersClient } from './pageClient';

export default async function RenewalsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // All business role users can access renewals - data filtering is handled by API
  // Middleware already handles route permissions

  // Get allowed classes for role-based filtering
  const allowedClasses = getAllowedClasses(session.roles);

  const initialYear = undefined; // No default year - show all years combined
  const initialQuarter = undefined;
  
  // Filter renewals with role-based class filtering
  const summary = await filterRenewals(
    initialYear, 
    initialQuarter, 
    undefined, // status
    undefined, // monthName
    undefined, // countryName
    undefined, // countrySearch
    undefined, // srlSearch
    undefined, // businessType
    undefined, // classFilter
    undefined, // subClassFilter
    undefined, // locFilter
    undefined, // extTypeFilter
    allowedClasses // Role-based class filtering
  );
  
  // Get filter options filtered by role
  const filterOptions = await getRenewalFilterOptions(allowedClasses, undefined);

  return (
    <div className="bg-[#050505] text-white min-h-screen">
      <div className="mx-auto max-w-[95%] xl:max-w-[1600px] px-4 py-10">
        <header className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Renewals Book</h1>
            </div>
          </div>
        </header>

        <RenewalFiltersClient
          initialYear={initialYear}
          initialQuarter={initialQuarter}
          initialStatus={undefined}
          initialSummary={summary}
          filterOptions={filterOptions}
        />
      </div>
    </div>
  );
}

