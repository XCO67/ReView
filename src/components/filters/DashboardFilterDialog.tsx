'use client';

import { useState, useMemo } from 'react';
import { FilterDialog } from './FilterDialog';
import { SearchableSelect } from './SearchableSelect';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Users, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { ReinsuranceData } from '@/lib/schema';
import { Button } from '@/components/ui/button';

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

interface DashboardFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReinsuranceData[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function DashboardFilterDialog({
  open,
  onOpenChange,
  data,
  filters,
  onFiltersChange,
  onClearFilters,
}: DashboardFilterDialogProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'location', 'partners'])
  );

  const filterOptions = useMemo(() => {
    const years = [...new Set(data.map(d => d.uy || (d.inceptionYear ? String(d.inceptionYear) : '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].sort();
    const countries = [...new Set(data.map(d => d.countryName).filter(Boolean))].sort();
    const brokers = [...new Set(data.map(d => d.broker).filter(Boolean))].sort();
    const cedants = [...new Set(data.map(d => d.cedant).filter(Boolean))].sort();
    const regions = [...new Set(data.map(d => d.region).filter(Boolean))].sort();
    const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))].sort();
    const classes = [...new Set(data.map(d => d.className).filter(Boolean))].sort();
    
    const allSubClasses = [...new Set(data.map(d => d.subClass).filter(Boolean))].sort() as string[];
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
    if (key === 'class') {
      newFilters.subClass = null;
    }
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
        <Button
          variant="ghost"
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            {title}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {isExpanded && (
          <div className="space-y-3 pl-6 border-l-2 border-muted">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <FilterDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dashboard Filters"
      activeFilterCount={activeFilterCount}
      onClearFilters={onClearFilters}
    >
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
    </FilterDialog>
  );
}

