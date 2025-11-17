'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ReinsuranceData } from '@/lib/schema';

const FOCUSED_COLUMNS = [
  { key: 'uy', label: 'UY', type: 'string' },
  { key: 'extType', label: 'Ext Type', type: 'string' },
  { key: 'broker', label: 'Broker', type: 'string' },
  { key: 'cedant', label: 'Cedant', type: 'string' },
  { key: 'orgInsuredTrtyName', label: 'Org.Insured/Trty Name', type: 'string' },
  { key: 'maxLiabilityFC', label: 'Max Liability', type: 'number' },
  { key: 'grossUWPrem', label: 'Gross UW Prem', type: 'number' },
  { key: 'grossActualAcq', label: 'Gross Actual Acq', type: 'number' },
  { key: 'grossOsLoss', label: 'Gross Os Loss', type: 'number' },
  { key: 'countryName', label: 'Country Name', type: 'string' },
  { key: 'region', label: 'Region', type: 'string' },
  { key: 'hub', label: 'Hub', type: 'string' },
] as const;

interface SimpleSearchFilterProps {
  data: ReinsuranceData[];
  onFiltersChange: (filters: Partial<Record<string, string[]>>) => void;
  filterOptions?: any;
  className?: string;
}

export function SimpleSearchFilter({ data, onFiltersChange, filterOptions, className }: SimpleSearchFilterProps) {
  const [filters, setFilters] = useState<Partial<Record<string, string[]>>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  // Get unique values for each focused column
  const getColumnOptions = (columnKey: string) => {
    // Use filterOptions if available, otherwise fall back to data
    if (filterOptions) {
      switch (columnKey) {
        case 'uy':
          return filterOptions.years || [];
        case 'countryName':
          return filterOptions.countries?.map((c: any) => c.label) || [];
        case 'hub':
          return filterOptions.hubs?.map((h: any) => h.label) || [];
        case 'region':
          return filterOptions.regions?.map((r: any) => r.label) || [];
        case 'cedant':
          return filterOptions.cedants?.map((c: any) => c.label) || [];
        case 'orgInsuredTrtyName':
          return filterOptions.insureds?.map((i: any) => i.label) || [];
        default:
          break;
      }
    }
    
    // Fallback to extracting from data
    const values = [...new Set(data.map(d => d[columnKey as keyof ReinsuranceData]).filter(v => v !== null && v !== undefined))];
    return values.sort();
  };

  const handleFilterChange = (column: string, values: string[]) => {
    const newFilters = { ...filters, [column]: values };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchChange = (column: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [column]: value }));
  };

  const clearFilter = (column: string) => {
    const newFilters = { ...filters };
    delete newFilters[column];
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchTerms({});
    onFiltersChange({});
  };

  const toggleColumn = (columnKey: string) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnKey)) {
      newExpanded.delete(columnKey);
    } else {
      newExpanded.add(columnKey);
    }
    setExpandedColumns(newExpanded);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(values => values && values.length > 0).length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Focused Filters</CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-6"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FOCUSED_COLUMNS.map((column) => {
            const columnKey = column.key;
            const options = getColumnOptions(columnKey);
            const searchTerm = searchTerms[columnKey] || '';
            const filteredOptions = searchTerm ? 
              options.filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase())) : 
              options;
            const currentFilter = filters[columnKey] || [];
            const isFiltered = currentFilter.length > 0;
            const isExpanded = expandedColumns.has(columnKey);

            return (
              <div key={columnKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {column.label}
                    <span className="text-xs text-muted-foreground ml-1">({column.type})</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    {isFiltered && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilter.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleColumn(columnKey)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${column.label.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(columnKey, e.target.value)}
                        className="pl-8 pr-8 h-8 text-xs"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => handleSearchChange(columnKey, '')}
                          className="absolute right-2 top-2.5 h-3 w-3 text-muted-foreground hover:text-foreground"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Filter Options */}
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredOptions.slice(0, 20).map((option) => {
                        const isSelected = currentFilter.includes(String(option));

                        return (
                          <div key={String(option)} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${columnKey}-${option}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newValues = checked ? 
                                  [...currentFilter, String(option)] : 
                                  currentFilter.filter(v => v !== String(option));
                                handleFilterChange(columnKey, newValues);
                              }}
                              className="h-3 w-3"
                            />
                            <Label
                              htmlFor={`${columnKey}-${option}`}
                              className="text-xs cursor-pointer flex-1 truncate"
                              title={String(option)}
                            >
                              {String(option)}
                            </Label>
                          </div>
                        );
                      })}
                      {filteredOptions.length > 20 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          ... and {filteredOptions.length - 20} more
                        </div>
                      )}
                    </div>

                    {/* Clear Selection */}
                    {isFiltered && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFilter(columnKey)}
                        className="w-full h-6 text-xs"
                      >
                        Clear {column.label}
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



















