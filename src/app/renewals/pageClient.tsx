"use client";

import { useState } from "react";
import { RenewalFilters } from "./RenewalFilters";
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

  return (
    <div className="space-y-6">
      {/* Filters at the Top - Sticky */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 shadow-sm">
        <RenewalFilters
          initialYear={initialYear}
          initialQuarter={initialQuarter}
          initialStatus={initialStatus}
          initialMonthName={initialMonthName}
          initialCountry={initialCountry}
          initialBusinessType={initialBusinessType}
          initialClassName={initialClassName}
          initialCountrySearch={initialCountrySearch}
          initialSrlSearch={initialSrlSearch}
          initialLoc={initialLoc}
          filterOptions={filterOptions}
          onChange={fetchSummary}
        />
      </div>
      
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

