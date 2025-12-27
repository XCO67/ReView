'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReinsuranceData } from '@/lib/schema';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelect } from './MultiSelect';
import { UniversalFilterState } from './UniversalFilterPanel';
import { extractYear } from '@/lib/utils/date-helpers';

interface TopFilterPanelProps {
  data: ReinsuranceData[];
  filters: UniversalFilterState;
  onFiltersChange: (filters: UniversalFilterState) => void;
  onClearFilters: () => void;
  children?: React.ReactNode; // Optional additional content to include in the filter panel
}

export function TopFilterPanel({
  data,
  filters,
  onFiltersChange,
  onClearFilters,
  children,
}: TopFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['business', 'location', 'time', 'partners'])
  );

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  // Extract unique filter options from data - optimized with single pass and Sets
  const filterOptions = useMemo(() => {
    // Use Sets for O(1) lookups and avoid duplicate processing
    const officesSet = new Set<string>();
    const extTypesSet = new Set<string>();
    const policyNaturesSet = new Set<string>();
    const classesSet = new Set<string>();
    const subClassesSet = new Set<string>();
    const hubsSet = new Set<string>();
    const regionsSet = new Set<string>();
    const countriesSet = new Set<string>();
    const yearsSet = new Set<string>();
    const brokersSet = new Set<string>();
    const cedantsSet = new Set<string>();
    const policyNamesSet = new Set<string>();

    // Single pass through data - more efficient than multiple map operations
    for (const d of data) {
      if (d.office) officesSet.add(d.office);
      if (d.extType) extTypesSet.add(d.extType);
      if (d.arrangement) policyNaturesSet.add(d.arrangement);
      if (d.className) classesSet.add(d.className);
      if (d.subClass) subClassesSet.add(d.subClass);
      if (d.hub) hubsSet.add(d.hub);
      if (d.region) regionsSet.add(d.region);
      if (d.countryName) countriesSet.add(d.countryName);
      if (d.broker) brokersSet.add(d.broker);
      if (d.cedant) cedantsSet.add(d.cedant);
      if (d.orgInsuredTrtyName) policyNamesSet.add(d.orgInsuredTrtyName);

      // Extract years efficiently using shared utility (handles UY and inceptionYear)
      const year = extractYear(d);
      if (year !== null) {
        yearsSet.add(year.toString());
      }
    }

    // Filter subclasses by selected class(es) if needed
    let subClasses = Array.from(subClassesSet);
    if (filters.class && filters.class.length > 0) {
      const filteredSubClasses = new Set<string>();
      for (const d of data) {
        if (d.subClass && filters.class.includes(d.className || '')) {
          filteredSubClasses.add(d.subClass);
        }
      }
      subClasses = Array.from(filteredSubClasses);
    }

    // Convert Sets to sorted arrays
    const sortedYears = Array.from(yearsSet).sort((a, b) => parseInt(a) - parseInt(b));
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const quarters = ['1', '2', '3', '4'];

    return {
      offices: Array.from(officesSet).sort(),
      extTypes: Array.from(extTypesSet).sort(),
      policyNatures: Array.from(policyNaturesSet).sort(),
      classes: Array.from(classesSet).sort(),
      subClasses: subClasses.sort(),
      hubs: Array.from(hubsSet).sort(),
      regions: Array.from(regionsSet).sort(),
      countries: Array.from(countriesSet).sort(),
      years: sortedYears,
      months,
      quarters,
      brokers: Array.from(brokersSet).sort(),
      cedants: Array.from(cedantsSet).sort(),
      policyNames: Array.from(policyNamesSet).sort(),
    };
  }, [data, filters.class]);

  // Count active filters (including array lengths)
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => {
        if (value === null || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
      })
      .length;
  }, [filters]);

  const handleFilterChange = (key: keyof UniversalFilterState, value: string | number | string[] | null) => {
    const newFilters = { ...filters, [key]: value };
    // Clear subclass when class changes
    if (key === 'class') {
      newFilters.subClass = null;
    }
    onFiltersChange(newFilters);
  };

  const handleMultiSelectChange = (key: 'extType' | 'policyNature' | 'class' | 'subClass' | 'country', value: string[]) => {
    handleFilterChange(key, value.length > 0 ? value : null);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="w-full" style={{ overflow: 'visible' }}>
      <div className="container mx-auto px-4 py-2" style={{ overflow: 'visible' }}>
        <div className="rounded-lg border bg-card shadow-sm" style={{ overflow: 'visible', position: 'relative' }}>
          {/* Header with Collapse Button */}
          <div className="px-3 py-2 border-b">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity group"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isExpanded ? "rotate-180" : "rotate-0"
                  )}
                />
                <h2 className="text-sm font-semibold text-foreground">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {activeFilterCount} Active
                  </span>
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                onClick={onClearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Collapsible Content */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              isExpanded 
                ? "max-h-[800px] opacity-100 overflow-y-auto overflow-x-hidden" 
                : "max-h-0 overflow-hidden opacity-0"
            )}
          >
            <div className="p-3 space-y-5 relative">
              {/* Business Details Section */}
              <div className="space-y-0">
                <button
                  onClick={() => toggleSection('business')}
                  className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity group py-2"
                >
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap">Business Details</h3>
                  <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  {expandedSections.has('business') ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  )}
                </button>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    expandedSections.has('business')
                      ? "max-h-[500px] opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  )}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3">
                  <SearchableSelect
                    label="Office"
                    value={filters.office}
                    options={filterOptions.offices}
                    onChange={(val) => handleFilterChange('office', val)}
                  />
                  <MultiSelect
                    label="Extract Type"
                    value={filters.extType || []}
                    options={filterOptions.extTypes}
                    onChange={(val) => handleMultiSelectChange('extType', val)}
                  />
                  <MultiSelect
                    label="Policy Nature"
                    value={filters.policyNature || []}
                    options={filterOptions.policyNatures}
                    onChange={(val) => handleMultiSelectChange('policyNature', val)}
                  />
                  <MultiSelect
                    label="Class"
                    value={filters.class || []}
                    options={filterOptions.classes}
                    onChange={(val) => handleMultiSelectChange('class', val)}
                  />
                  {(filters.class && filters.class.length > 0) ? (
                    <MultiSelect
                      label="Subclass"
                      value={filters.subClass || []}
                      options={filterOptions.subClasses}
                      onChange={(val) => handleMultiSelectChange('subClass', val)}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Subclass</label>
                      <div className="h-9 flex items-center text-sm text-muted-foreground px-3 border border-border rounded-md bg-muted/50">
                        Select class first
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('location')}
                  className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity group py-2"
                >
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap">Location</h3>
                  <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  {expandedSections.has('location') ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  )}
                </button>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    expandedSections.has('location')
                      ? "max-h-[300px] opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  )}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                  <SearchableSelect
                    label="Hub"
                    value={filters.hub}
                    options={filterOptions.hubs}
                    onChange={(val) => handleFilterChange('hub', val)}
                  />
                  <SearchableSelect
                    label="Region"
                    value={filters.region}
                    options={filterOptions.regions}
                    onChange={(val) => handleFilterChange('region', val)}
                  />
                  <MultiSelect
                    label="Country"
                    value={filters.country || []}
                    options={filterOptions.countries}
                    onChange={(val) => handleMultiSelectChange('country', val)}
                  />
                  </div>
                </div>
              </div>

              {/* Time Period Section */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('time')}
                  className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity group py-2"
                >
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap">Time Period</h3>
                  <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  {expandedSections.has('time') ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  )}
                </button>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    expandedSections.has('time')
                      ? "max-h-[300px] opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  )}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  <SearchableSelect
                    label="Year"
                    value={filters.year}
                    options={filterOptions.years}
                    onChange={(val) => handleFilterChange('year', val)}
                  />
                  <SearchableSelect
                    label="Month"
                    value={filters.month ? filters.month.toString() : null}
                    options={filterOptions.months.map((m, i) => ({ value: m, label: monthNames[i] }))}
                    onChange={(val) => handleFilterChange('month', val ? parseInt(val) : null)}
                  />
                  <SearchableSelect
                    label="Quarter"
                    value={filters.quarter ? filters.quarter.toString() : null}
                    options={filterOptions.quarters.map(q => ({ value: q, label: `Q${q}` }))}
                    onChange={(val) => handleFilterChange('quarter', val ? parseInt(val) : null)}
                  />
                  </div>
                </div>
              </div>

              {/* Partners Section */}
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('partners')}
                  className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity group py-2"
                >
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap">Partners & Policy</h3>
                  <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  {expandedSections.has('partners') ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                  )}
                </button>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    expandedSections.has('partners')
                      ? "max-h-[300px] opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  )}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                  <SearchableSelect
                    label="Broker"
                    value={filters.broker}
                    options={filterOptions.brokers}
                    onChange={(val) => handleFilterChange('broker', val)}
                  />
                  <SearchableSelect
                    label="Cedant"
                    value={filters.cedant}
                    options={filterOptions.cedants}
                    onChange={(val) => handleFilterChange('cedant', val)}
                  />
                  <SearchableSelect
                    label="Policy Name"
                    value={filters.policyName}
                    options={filterOptions.policyNames}
                    onChange={(val) => handleFilterChange('policyName', val)}
                  />
                  </div>
                </div>
              </div>

              {/* Additional Content (e.g., Comparison Entities, Performance Entity Selection) */}
              {children && (
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="w-full">
                    {children}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

