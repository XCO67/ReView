'use client';

import { useState, useMemo } from 'react';
import { FilterDialog } from './FilterDialog';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelect } from './MultiSelect';
import { Separator } from '@/components/ui/separator';
import { Building2, MapPin, Calendar, Users, FileText, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { ReinsuranceData } from '@/lib/schema';
import { UniversalFilterState } from './UniversalFilterPanel';
import { Button } from '@/components/ui/button';
import { extractYear } from '@/lib/utils/date-helpers';

interface VisualizationFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReinsuranceData[];
  filters: UniversalFilterState;
  onFiltersChange: (filters: UniversalFilterState) => void;
  onClearFilters: () => void;
}

export function VisualizationFilterDialog({
  open,
  onOpenChange,
  data,
  filters,
  onFiltersChange,
  onClearFilters,
}: VisualizationFilterDialogProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['business', 'location', 'time', 'partners'])
  );

  const filterOptions = useMemo(() => {
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

      const year = extractYear(d);
      if (year !== null) {
        yearsSet.add(year.toString());
      }
    }

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

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => {
        if (value === null || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
      })
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

  const handleFilterChange = (key: keyof UniversalFilterState, value: string | number | string[] | null) => {
    const newFilters = { ...filters, [key]: value };
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
      title="Visualization Filters"
      activeFilterCount={activeFilterCount}
      onClearFilters={onClearFilters}
    >
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
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Subclass</label>
            <div className="h-9 flex items-center text-sm text-muted-foreground px-3 border border-border rounded-md bg-muted/50">
              Select class first
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
      </FilterSection>

      <Separator />

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
        <SearchableSelect
          label="Policy Name"
          value={filters.policyName}
          options={filterOptions.policyNames}
          onChange={(val) => handleFilterChange('policyName', val)}
        />
      </FilterSection>
    </FilterDialog>
  );
}

