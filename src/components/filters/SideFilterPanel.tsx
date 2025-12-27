'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, SlidersHorizontal, Calendar, Building2, Globe, Users, 
  MapPin, Briefcase, FileText, ChevronDown, ChevronUp,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ReinsuranceData } from '@/lib/schema';
import { SearchableSelect } from './SearchableSelect';

interface FilterState {
  year: string | null;
  extType: string | null;
  country: string | null;
  broker: string | null;
  cedant: string | null;
  region: string | null;
  hub: string | null;
  class: string | null;
  subClass: string | null;
  showMonthly: boolean;
  showQuarterly: boolean;
}

interface SideFilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  data: ReinsuranceData[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function SideFilterPanel({
  isOpen,
  onToggle,
  data,
  filters,
  onFiltersChange,
  onClearFilters,
}: SideFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'location', 'partners']));

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const years = [...new Set(data.map(d => d.uy || (d.inceptionYear ? String(d.inceptionYear) : '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].sort();
    const countries = [...new Set(data.map(d => d.countryName).filter(Boolean))].sort();
    const brokers = [...new Set(data.map(d => d.broker).filter(Boolean))].sort();
    const cedants = [...new Set(data.map(d => d.cedant).filter(Boolean))].sort();
    const regions = [...new Set(data.map(d => d.region).filter(Boolean))].sort();
    const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))].sort();
    const classes = [...new Set(data.map(d => d.className).filter(Boolean))].sort();
    
    // Subclasses filtered by selected class
    const allSubClasses = [...new Set(data.map(d => d.subClass).filter(Boolean))].sort() as string[];
    // If a class is selected, only show subclasses for that class
    const subClasses = filters.class
      ? [...new Set(data.filter(d => d.className === filters.class).map(d => d.subClass).filter(Boolean))].sort() as string[]
      : allSubClasses;

    return {
      years,
      extTypes,
      countries,
      brokers,
      cedants,
      regions,
      hubs,
      classes,
      subClasses,
    };
  }, [data, filters.class]);

  // Count active filters (exclude boolean values)
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters)
      .filter(([key, value]) => 
        key !== 'showMonthly' && 
        key !== 'showQuarterly' && 
        value !== null && 
        value !== ''
      ).length;
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

  const handleFilterChange = (key: keyof FilterState, value: string | null | boolean) => {
    const newFilters = { ...filters, [key]: value };
    // Clear subclass when class changes
    if (key === 'class') {
      newFilters.subClass = null;
    }
    // Ensure only one of monthly/quarterly is selected
    if (key === 'showMonthly' && value === true) {
      newFilters.showQuarterly = false;
    }
    if (key === 'showQuarterly' && value === true) {
      newFilters.showMonthly = false;
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
                        {filters.year && (
                          <Badge variant="secondary" className="gap-1">
                            Year: {filters.year}
                            <button
                              onClick={() => handleFilterChange('year', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.extType && (
                          <Badge variant="secondary" className="gap-1">
                            Type: {filters.extType}
                            <button
                              onClick={() => handleFilterChange('extType', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.class && (
                          <Badge variant="secondary" className="gap-1">
                            Class: {filters.class}
                            <button
                              onClick={() => handleFilterChange('class', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.subClass && (
                          <Badge variant="secondary" className="gap-1">
                            Subclass: {filters.subClass}
                            <button
                              onClick={() => handleFilterChange('subClass', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.country && (
                          <Badge variant="secondary" className="gap-1">
                            {filters.country}
                            <button
                              onClick={() => handleFilterChange('country', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.region && (
                          <Badge variant="secondary" className="gap-1">
                            {filters.region}
                            <button
                              onClick={() => handleFilterChange('region', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.hub && (
                          <Badge variant="secondary" className="gap-1">
                            {filters.hub}
                            <button
                              onClick={() => handleFilterChange('hub', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.broker && (
                          <Badge variant="secondary" className="gap-1">
                            Broker
                            <button
                              onClick={() => handleFilterChange('broker', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {filters.cedant && (
                          <Badge variant="secondary" className="gap-1">
                            Cedant
                            <button
                              onClick={() => handleFilterChange('cedant', null)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Basic Filters */}
                  <FilterSection
                    title="Basic Filters"
                    icon={<Calendar className="h-4 w-4" />}
                    sectionKey="basic"
                  >
                    <SearchableSelect
                      label="Underwriting Year"
                      value={filters.year}
                      options={filterOptions.years}
                      onChange={(val) => handleFilterChange('year', val)}
                    />
                    
                    {/* Breakdown Options - Monthly/Quarterly */}
                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Time Breakdown</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="show-monthly"
                            checked={filters.showMonthly}
                            onCheckedChange={(checked) => handleFilterChange('showMonthly', checked === true)}
                          />
                          <Label htmlFor="show-monthly" className="text-sm font-medium cursor-pointer">
                            Show Monthly Breakdown
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="show-quarterly"
                            checked={filters.showQuarterly}
                            onCheckedChange={(checked) => handleFilterChange('showQuarterly', checked === true)}
                          />
                          <Label htmlFor="show-quarterly" className="text-sm font-medium cursor-pointer">
                            Show Quarterly Breakdown
                          </Label>
                        </div>
                      </div>
                    </div>

                    <SearchableSelect
                      label="Extract Type"
                      value={filters.extType}
                      options={filterOptions.extTypes}
                      onChange={(val) => handleFilterChange('extType', val)}
                    />
                    <SearchableSelect
                      label="Class"
                      value={filters.class}
                      options={filterOptions.classes.filter((c): c is string => c !== undefined)}
                      onChange={(val) => handleFilterChange('class', val)}
                    />
                    {filters.class ? (
                      <SearchableSelect
                        label="Subclass"
                        value={filters.subClass}
                        options={filterOptions.subClasses.filter((c): c is string => c !== undefined)}
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

                  {/* Location Filters */}
                  <FilterSection
                    title="Location"
                    icon={<MapPin className="h-4 w-4" />}
                    sectionKey="location"
                  >
                    <SearchableSelect
                      label="Country"
                      value={filters.country}
                      options={filterOptions.countries}
                      onChange={(val) => handleFilterChange('country', val)}
                    />
                    <SearchableSelect
                      label="Region"
                      value={filters.region}
                      options={filterOptions.regions}
                      onChange={(val) => handleFilterChange('region', val)}
                    />
                    <SearchableSelect
                      label="Hub"
                      value={filters.hub}
                      options={filterOptions.hubs}
                      onChange={(val) => handleFilterChange('hub', val)}
                    />
                  </FilterSection>

                  <Separator />

                  {/* Partners Filters */}
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
