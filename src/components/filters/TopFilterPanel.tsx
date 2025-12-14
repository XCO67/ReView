'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReinsuranceData } from '@/lib/schema';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelect } from './MultiSelect';
import { UniversalFilterState } from './UniversalFilterPanel';

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

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const offices = [...new Set(data.map(d => d.office).filter(Boolean))].sort();
    const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].sort();
    const policyNatures = [...new Set(data.map(d => d.arrangement).filter(Boolean))].sort();
    const classes = [...new Set(data.map(d => d.className).filter(Boolean))].sort();
    
    // Subclasses filtered by selected class(es)
    const allSubClasses = [...new Set(data.map(d => d.subClass).filter(Boolean))].sort() as string[];
    const subClasses = filters.class && filters.class.length > 0
      ? [...new Set(data.filter(d => filters.class!.includes(d.className || '')).map(d => d.subClass).filter(Boolean))].sort() as string[]
      : allSubClasses;
    
    const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))].sort();
    const regions = [...new Set(data.map(d => d.region).filter(Boolean))].sort();
    const countries = [...new Set(data.map(d => d.countryName).filter(Boolean))].sort();
    
    // Extract years from UY or inceptionYear
    const years = new Set<string>();
    data.forEach(d => {
      if (d.uy) {
        const uyYear = parseInt(String(d.uy));
        if (!isNaN(uyYear) && uyYear >= 1900 && uyYear <= 2100) {
          years.add(uyYear.toString());
        } else {
          const yearMatch = String(d.uy).match(/\b(19|20)\d{2}\b/);
          if (yearMatch) {
            years.add(yearMatch[0]);
          }
        }
      }
      if (d.inceptionYear && d.inceptionYear >= 1900 && d.inceptionYear <= 2100) {
        years.add(d.inceptionYear.toString());
      }
    });
    const sortedYears = Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));
    
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const quarters = [1, 2, 3, 4];
    
    const brokers = [...new Set(data.map(d => d.broker).filter(Boolean))].sort();
    const cedants = [...new Set(data.map(d => d.cedant).filter(Boolean))].sort();
    const policyNames = [...new Set(data.map(d => d.orgInsuredTrtyName).filter(Boolean))].sort();

    return {
      offices: offices.filter((o): o is string => o !== undefined),
      extTypes,
      policyNatures: policyNatures.filter((p): p is string => p !== undefined),
      classes: classes.filter((c): c is string => c !== undefined),
      subClasses: subClasses.filter((s): s is string => s !== undefined),
      hubs,
      regions,
      countries,
      years: sortedYears,
      months: months.map(m => m.toString()),
      quarters: quarters.map(q => q.toString()),
      brokers,
      cedants,
      policyNames,
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
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm" style={{ overflow: 'visible' }}>
      <div className="container mx-auto px-4 py-2" style={{ overflow: 'visible' }}>
        <div className="rounded-lg border bg-card" style={{ overflow: 'visible', position: 'relative' }}>
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
                ? "max-h-[600px] opacity-100 overflow-visible" 
                : "max-h-0 overflow-hidden opacity-0"
            )}
          >
            <div className="p-3 space-y-4 relative">
              {/* Business Details Filters - Compact Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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

              {/* Location Filters - Compact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

              {/* Time Period & Partners - Compact Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

              {/* Additional Content (e.g., Comparison Entities, Performance Entity Selection) */}
              {children && (
                <div className="space-y-4 pt-4 border-t">
                  {children}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

