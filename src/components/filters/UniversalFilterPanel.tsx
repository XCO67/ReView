'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, SlidersHorizontal, Calendar, Building2, Globe, Users, 
  MapPin, Briefcase, FileText, ChevronDown, ChevronUp,
  Layers, Office, Tag, FolderTree, Clock, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ReinsuranceData } from '@/lib/schema';
import { SearchableSelect } from './SearchableSelect';

export interface UniversalFilterState {
  office: string | null;
  extType: string[] | null; // Multi-select
  policyNature: string[] | null; // Multi-select (arrangement)
  class: string[] | null; // Multi-select
  subClass: string[] | null; // Multi-select
  hub: string | null;
  region: string | null;
  country: string[] | null; // Multi-select
  year: string | null;
  month: number | null;
  quarter: number | null;
  broker: string | null;
  cedant: string | null;
  policyName: string | null; // orgInsuredTrtyName
}

interface UniversalFilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  data: ReinsuranceData[];
  filters: UniversalFilterState;
  onFiltersChange: (filters: UniversalFilterState) => void;
  onClearFilters: () => void;
  showTimeBreakdown?: boolean; // For dashboard only
  showMonthly?: boolean;
  showQuarterly?: boolean;
  onShowMonthlyChange?: (show: boolean) => void;
  onShowQuarterlyChange?: (show: boolean) => void;
}

export function UniversalFilterPanel({
  isOpen,
  onToggle,
  data,
  filters,
  onFiltersChange,
  onClearFilters,
  showTimeBreakdown = false,
  showMonthly = false,
  showQuarterly = false,
  onShowMonthlyChange,
  onShowQuarterlyChange,
}: UniversalFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['business', 'location', 'time', 'partners']));

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const offices = [...new Set(data.map(d => d.office).filter(Boolean))].sort();
    const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].sort();
    const policyNatures = [...new Set(data.map(d => d.arrangement).filter(Boolean))].sort();
    const classes = [...new Set(data.map(d => d.className).filter(Boolean))].sort();
    
    // Subclasses filtered by selected class
    const allSubClasses = [...new Set(data.map(d => d.subClass).filter(Boolean))].sort() as string[];
    const subClasses = filters.class
      ? [...new Set(data.filter(d => d.className === filters.class).map(d => d.subClass).filter(Boolean))].sort() as string[]
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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== null && value !== '')
      .length;
  }, [filters]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleFilterChange = (key: keyof UniversalFilterState, value: string | number | null) => {
    const newFilters = { ...filters, [key]: value };
    // Clear subclass when class changes
    if (key === 'class') {
      newFilters.subClass = null;
    }
    onFiltersChange(newFilters);
  };

  const FilterSection = ({ 
    title, 
    icon, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    sectionKey: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="space-y-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSection(sectionKey);
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div
            className="space-y-3 pl-6"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <>
      {/* Toggle Button - Fixed on the left side */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground rounded-r-lg p-3 shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        onClick={onToggle}
        aria-label="Toggle filters"
      >
        <div className="relative">
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <SlidersHorizontal className="h-5 w-5" />
          )}
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
      </motion.button>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={onToggle}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-[420px] max-w-[90vw] bg-background border-r border-border/40 shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="border-b border-border/40 bg-muted/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <SlidersHorizontal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Filters</CardTitle>
                      {activeFilterCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeFilterCount} active
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Active Filters Badges */}
                  {activeFilterCount > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Active Filters</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(filters).map(([key, value]) => {
                          if (value === null || value === '') return null;
                          let displayValue = String(value);
                          if (key === 'month') {
                            displayValue = monthNames[Number(value) - 1] || displayValue;
                          } else if (key === 'quarter') {
                            displayValue = `Q${value}`;
                          }
                          return (
                            <Badge key={key} variant="secondary" className="gap-1">
                              {key === 'policyNature' ? 'Nature' : key === 'policyName' ? 'Policy' : key.charAt(0).toUpperCase() + key.slice(1)}: {displayValue}
                              <button
                                onClick={() => handleFilterChange(key as keyof UniversalFilterState, null)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Business Details Filters - Order: office, ext type, policy nature, class, subclass */}
                  <FilterSection
                    title="Business Details"
                    icon={<Briefcase className="h-4 w-4" />}
                    sectionKey="business"
                  >
                    <SearchableSelect
                      label="Office"
                      value={filters.office}
                      options={filterOptions.offices}
                      onChange={(val) => handleFilterChange('office', val)}
                    />
                    <SearchableSelect
                      label="Extract Type"
                      value={filters.extType}
                      options={filterOptions.extTypes}
                      onChange={(val) => handleFilterChange('extType', val)}
                    />
                    <SearchableSelect
                      label="Policy Nature"
                      value={filters.policyNature}
                      options={filterOptions.policyNatures}
                      onChange={(val) => handleFilterChange('policyNature', val)}
                    />
                    <SearchableSelect
                      label="Class"
                      value={filters.class}
                      options={filterOptions.classes}
                      onChange={(val) => handleFilterChange('class', val)}
                    />
                    {filters.class ? (
                      <SearchableSelect
                        label="Subclass"
                        value={filters.subClass}
                        options={filterOptions.subClasses}
                        onChange={(val) => handleFilterChange('subClass', val)}
                      />
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Subclass</Label>
                        <div className="h-9 flex items-center text-sm text-muted-foreground px-3 border border-border rounded-md bg-muted/50">
                          Select a class first
                        </div>
                      </div>
                    )}
                  </FilterSection>

                  <Separator />

                  {/* Location Filters - Order: hub, region, country */}
                  <FilterSection
                    title="Location"
                    icon={<MapPin className="h-4 w-4" />}
                    sectionKey="location"
                  >
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
                    <SearchableSelect
                      label="Country"
                      value={filters.country}
                      options={filterOptions.countries}
                      onChange={(val) => handleFilterChange('country', val)}
                    />
                  </FilterSection>

                  <Separator />

                  {/* Time Filters - Order: year, month, quarter */}
                  <FilterSection
                    title="Time Period"
                    icon={<Calendar className="h-4 w-4" />}
                    sectionKey="time"
                  >
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
                    {showTimeBreakdown && onShowMonthlyChange && onShowQuarterlyChange && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Time Breakdown</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="show-monthly"
                              checked={showMonthly}
                              onChange={(e) => {
                                onShowMonthlyChange(e.target.checked);
                                if (e.target.checked && onShowQuarterlyChange) {
                                  onShowQuarterlyChange(false);
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="show-monthly" className="text-sm font-medium cursor-pointer">
                              Show Monthly Breakdown
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="show-quarterly"
                              checked={showQuarterly}
                              onChange={(e) => {
                                onShowQuarterlyChange(e.target.checked);
                                if (e.target.checked && onShowMonthlyChange) {
                                  onShowMonthlyChange(false);
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="show-quarterly" className="text-sm font-medium cursor-pointer">
                              Show Quarterly Breakdown
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </FilterSection>

                  <Separator />

                  {/* Partners Filters - Order: broker, cedant, policy name */}
                  <FilterSection
                    title="Business Partners"
                    icon={<Users className="h-4 w-4" />}
                    sectionKey="partners"
                  >
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
                  </FilterSection>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/40 bg-muted/30 p-4 space-y-2">
                <Button
                  onClick={onClearFilters}
                  variant="outline"
                  className="w-full"
                  disabled={activeFilterCount === 0}
                >
                  Clear All Filters
                </Button>
                <Button
                  onClick={onToggle}
                  className="w-full"
                >
                  Apply Filters
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

