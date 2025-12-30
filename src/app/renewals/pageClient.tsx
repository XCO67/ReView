"use client";

import { useState, useMemo } from "react";
import { RenewalFilters } from "./RenewalFilters";
import { FilterDialog, FilterButton } from "@/components/filters/FilterDialog";
import type { RenewalSummary, RenewalFilterOptions } from "@/lib/renewals";
import { RenewalSummaryGrid } from "./renewal-summary-grid";
import { RenewalTable } from "./RenewalTable";
import { Loader2 } from "lucide-react";
import { logger } from '@/lib/utils/logger';interface RenewalFiltersClientProps {
  initialYear: string | undefined;
  initialQuarter: string | undefined;
  initialSummary: RenewalSummary;
  initialStatus?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
  initialMonthName?: string;
  initialCountry?: string;
  initialBusinessType?: string;
  initialClassName?: string;
  initialCountrySearch?: string;
  initialSrlSearch?: string;
  initialLoc?: string;
  filterOptions: RenewalFilterOptions;
}

export function RenewalFiltersClient({
  initialYear,
  initialQuarter,
  initialSummary,
  initialStatus,
  initialMonthName,
  initialCountry,
  initialBusinessType,
  initialClassName,
  initialCountrySearch,
  initialSrlSearch,
  initialLoc,
  filterOptions,
}: RenewalFiltersClientProps) {
  const [summary, setSummary] = useState<RenewalSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<{
    year?: string;
    quarter?: string;
    status?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
    monthName?: string;
    country?: string[];
    countrySearch?: string;
    srlSearch?: string;
    businessType?: string[];
    className?: string[];
    subClass?: string[];
    loc?: string;
    extType?: string[];
  }>({
    year: initialYear,
    quarter: initialQuarter,
    status: initialStatus,
    monthName: initialMonthName,
    country: initialCountry ? [initialCountry] : undefined,
    countrySearch: initialCountrySearch,
    srlSearch: initialSrlSearch,
    businessType: initialBusinessType ? [initialBusinessType] : undefined,
    className: initialClassName ? [initialClassName] : undefined,
    loc: initialLoc,
  });
  const [pendingFilters, setPendingFilters] = useState<{
    year?: string;
    quarter?: string;
    status?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
    monthName?: string;
    country?: string[];
    countrySearch?: string;
    srlSearch?: string;
    businessType?: string[];
    className?: string[];
    subClass?: string[];
    loc?: string;
    extType?: string[];
  }>(currentFilters);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.year) count++;
    if (currentFilters.quarter) count++;
    if (currentFilters.status) count++;
    if (currentFilters.monthName) count++;
    if (currentFilters.country && currentFilters.country.length > 0) count++;
    if (currentFilters.countrySearch && currentFilters.countrySearch.trim()) count++;
    if (currentFilters.srlSearch && currentFilters.srlSearch.trim()) count++;
    if (currentFilters.businessType && currentFilters.businessType.length > 0) count++;
    if (currentFilters.className && currentFilters.className.length > 0) count++;
    if (currentFilters.subClass && currentFilters.subClass.length > 0) count++;
    if (currentFilters.loc) count++;
    if (currentFilters.extType && currentFilters.extType.length > 0) count++;
    return count;
  }, [currentFilters]);

  const fetchSummary = async (filters: { 
    year?: string; 
    quarter?: string; 
    status?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
    monthName?: string;
    country?: string[];
    countrySearch?: string;
    srlSearch?: string;
    businessType?: string[];
    className?: string[];
    subClass?: string[];
    loc?: string;
    extType?: string[];
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.set("year", filters.year);
      if (filters.quarter) params.set("quarter", filters.quarter);
      if (filters.status) params.set("status", filters.status);
      if (filters.monthName) params.set("monthName", filters.monthName);
      if (filters.country && filters.country.length > 0) {
        filters.country.forEach(c => params.append("country", c));
      }
      // Only add countrySearch if it has a value (not empty or undefined)
      if (filters.countrySearch && filters.countrySearch.trim()) {
        params.set("countrySearch", filters.countrySearch.trim());
      }
      // Only add srlSearch if it has a value (not empty or undefined)
      if (filters.srlSearch && filters.srlSearch.trim()) {
        params.set("srlSearch", filters.srlSearch.trim());
      }
      if (filters.businessType && filters.businessType.length > 0) {
        filters.businessType.forEach(b => params.append("businessType", b));
      }
      if (filters.className && filters.className.length > 0) {
        filters.className.forEach(c => params.append("className", c));
      }
      if (filters.subClass && filters.subClass.length > 0) {
        filters.subClass.forEach(s => params.append("subClass", s));
      }
      if (filters.loc) params.set("loc", filters.loc);
      if (filters.extType && filters.extType.length > 0) {
        filters.extType.forEach(e => params.append("extType", e));
      }
      
      const response = await fetch(`/api/renewals?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch renewals: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      setSummary(data);
      setCurrentFilters(filters);
    } catch (error) {
      logger.error('Error fetching renewals', error);
      // Set empty summary on error to prevent crashes
      setSummary({
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
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const emptyFilters = {
      year: undefined,
      quarter: undefined,
      status: undefined,
      monthName: undefined,
      country: undefined,
      countrySearch: undefined,
      srlSearch: undefined,
      businessType: undefined,
      className: undefined,
      subClass: undefined,
      loc: undefined,
      extType: undefined,
    };
    fetchSummary(emptyFilters);
  };

  return (
    <div className="space-y-6">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Renewals Book</h1>
        <FilterButton
          onClick={() => setIsFilterDialogOpen(true)}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Filter Dialog */}
      <FilterDialog
        open={isFilterDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            // Initialize pending filters with current filters when opening
            setPendingFilters(currentFilters);
          }
          setIsFilterDialogOpen(open);
          if (!open) {
            // Reset pending filters when dialog closes without applying
            setPendingFilters(currentFilters);
          }
        }}
        title="Renewals Filters"
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          const emptyFilters = {
            year: undefined,
            quarter: undefined,
            status: undefined,
            monthName: undefined,
            country: undefined,
            countrySearch: undefined,
            srlSearch: undefined,
            businessType: undefined,
            className: undefined,
            subClass: undefined,
            loc: undefined,
            extType: undefined,
          };
          setPendingFilters(emptyFilters);
          fetchSummary(emptyFilters);
          setIsFilterDialogOpen(false);
        }}
        onApply={() => {
          fetchSummary(pendingFilters);
          setCurrentFilters(pendingFilters);
          setIsFilterDialogOpen(false);
        }}
        className="max-w-6xl w-[95vw] sm:w-full"
      >
        <RenewalFilters
          initialYear={pendingFilters.year}
          initialQuarter={pendingFilters.quarter}
          initialStatus={pendingFilters.status}
          initialMonthName={pendingFilters.monthName}
          initialCountry={pendingFilters.country?.[0]}
          initialBusinessType={pendingFilters.businessType?.[0]}
          initialClassName={pendingFilters.className?.[0]}
          initialCountrySearch={pendingFilters.countrySearch}
          initialSrlSearch={pendingFilters.srlSearch}
          initialLoc={pendingFilters.loc}
          filterOptions={filterOptions}
          onChange={(filters) => {
            // Only update pending filters, don't apply yet
            setPendingFilters(filters);
          }}
          inDialog={true}
        />
      </FilterDialog>
      
      {/* Main Content with padding to prevent overlap */}
      <div className="pt-6 space-y-6">
        {/* Summary Grid */}
        <div className="w-full">
          <RenewalSummaryGrid summary={summary} />
        </div>
        
        {/* Table */}
        <div className="w-full">
          {loading ? (
            <div className="flex justify-center py-20 text-white/60">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <RenewalTable summary={summary} />
          )}
        </div>
      </div>
    </div>
  );
}

