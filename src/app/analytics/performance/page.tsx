'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, ChevronDown, X, ArrowLeftRight } from 'lucide-react';
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';
import { TopFilterPanel } from '@/components/filters/TopFilterPanel';
import { ReinsuranceData } from '@/lib/schema';

interface PolicyPerformanceRecord {
  policyName: string;
  cedantName: string;
  srlNumber?: string;
  year: number;
  policyCount: number;
  retainedPrem: number;
  ucr: number;
  premium: number;
  incurredClaims: number;
  expense: number;
  lossRatio: number;
  expenseRatio: number;
}

interface PerformanceData {
  entity: string;
  entityType: 'broker' | 'cedant';
  policies: PolicyPerformanceRecord[];
  availableYears: number[];
  availablePolicies: string[];
}

export default function PerformancePage() {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const [entityType, setEntityType] = useState<'broker' | 'cedant'>('broker');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [policyFilter, setPolicyFilter] = useState<string>('all');
  const [policySearchTerm, setPolicySearchTerm] = useState('');
  const [availablePolicies, setAvailablePolicies] = useState<string[]>([]);
  const [brokersForSelectedPolicy, setBrokersForSelectedPolicy] = useState<string[]>([]);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [showPolicyDropdown, setShowPolicyDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState<'broker' | 'policy'>('broker');
  const [allData, setAllData] = useState<ReinsuranceData[]>([]);
  const [filters, setFilters] = useState<UniversalFilterState>({
    office: null,
    extType: null,
    policyNature: null,
    class: null,
    subClass: null,
    hub: null,
    region: null,
    country: null,
    year: null,
    month: null,
    quarter: null,
    broker: null,
    cedant: null,
    policyName: null,
  });

  // Load all data for filter options
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/data?limit=100000');
        if (response.ok) {
          const result = await response.json();
          setAllData(result.data || []);
        }
      } catch (error) {
        console.error('Failed to load data for filters:', error);
      }
    };
    loadData();
  }, []);

  // Load available entities and filter options - reload when filters change
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const params = new URLSearchParams();
        params.set('type', entityType);
        if (filters.class) {
          const classArray = Array.isArray(filters.class) ? filters.class : [filters.class];
          classArray.forEach(c => params.append('class', c));
        }
        if (filters.subClass) {
          const subClassArray = Array.isArray(filters.subClass) ? filters.subClass : [filters.subClass];
          subClassArray.forEach(s => params.append('subClass', s));
        }
        if (filters.extType) {
          const extTypeArray = Array.isArray(filters.extType) ? filters.extType : [filters.extType];
          extTypeArray.forEach(e => params.append('extType', e));
        }
        if (filters.country) {
          const countryArray = Array.isArray(filters.country) ? filters.country : [filters.country];
          countryArray.forEach(c => params.append('country', c));
        }
        if (filters.hub) {
          const hubArray = Array.isArray(filters.hub) ? filters.hub : [filters.hub];
          hubArray.forEach(h => params.append('hub', h));
        }
        if (filters.region) {
          const regionArray = Array.isArray(filters.region) ? filters.region : [filters.region];
          regionArray.forEach(r => params.append('region', r));
        }
        
        const response = await fetch(`/api/analytics/performance/entities?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableEntities(data.entities || []);
          // Clear selected entity if it's no longer in the filtered list
          if (selectedEntity && !data.entities.includes(selectedEntity)) {
            setSelectedEntity('');
            setSearchTerm('');
          }
        }
      } catch (error) {
        console.error('Failed to load entities:', error);
      }
    };

    const loadPolicies = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.class) {
          const classArray = Array.isArray(filters.class) ? filters.class : [filters.class];
          classArray.forEach(c => params.append('class', c));
        }
        if (filters.subClass) {
          const subClassArray = Array.isArray(filters.subClass) ? filters.subClass : [filters.subClass];
          subClassArray.forEach(s => params.append('subClass', s));
        }
        if (filters.extType) {
          const extTypeArray = Array.isArray(filters.extType) ? filters.extType : [filters.extType];
          extTypeArray.forEach(e => params.append('extType', e));
        }
        if (filters.country) {
          const countryArray = Array.isArray(filters.country) ? filters.country : [filters.country];
          countryArray.forEach(c => params.append('country', c));
        }
        if (filters.hub) {
          const hubArray = Array.isArray(filters.hub) ? filters.hub : [filters.hub];
          hubArray.forEach(h => params.append('hub', h));
        }
        if (filters.region) {
          const regionArray = Array.isArray(filters.region) ? filters.region : [filters.region];
          regionArray.forEach(r => params.append('region', r));
        }
        
        const response = await fetch(`/api/analytics/performance/policies?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setAvailablePolicies(data.policies || []);
          // Clear policy filter if it's no longer in the filtered list
          if (policyFilter !== 'all' && !data.policies.includes(policyFilter)) {
            setPolicyFilter('all');
            setPolicySearchTerm('');
          }
        }
      } catch (error) {
        console.error('Failed to load policies:', error);
      }
    };

    loadEntities();
    loadPolicies();
  }, [entityType, filters.class, filters.subClass, filters.extType, filters.country, filters.hub, filters.region, selectedEntity, policyFilter]);

  // Load performance data when entity is selected OR when policy is selected (to show data)
  useEffect(() => {
    // If policy is selected but no broker, we can still show some data
    // But for full performance data, we need a broker/cedant
    if (!selectedEntity && policyFilter === 'all') {
      setPerformanceData(null);
      return;
    }

    const loadPerformance = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        // If we have a selected entity, use it
        if (selectedEntity) {
          params.set('type', entityType);
          params.set('entity', selectedEntity);
        } else if (policyFilter !== 'all' && brokersForSelectedPolicy.length > 0) {
          // If policy is selected but no broker chosen yet, use first broker
          params.set('type', entityType);
          params.set('entity', brokersForSelectedPolicy[0]);
        } else {
          setIsLoading(false);
          return;
        }
        
        if (selectedYears.length > 0) {
          selectedYears.forEach(year => params.append('years', String(year)));
        }
        if (filters.class) {
          const classArray = Array.isArray(filters.class) ? filters.class : [filters.class];
          classArray.forEach(c => params.append('class', c));
        }
        if (filters.subClass) {
          const subClassArray = Array.isArray(filters.subClass) ? filters.subClass : [filters.subClass];
          subClassArray.forEach(s => params.append('subClass', s));
        }
        if (filters.extType) {
          const extTypeArray = Array.isArray(filters.extType) ? filters.extType : [filters.extType];
          extTypeArray.forEach(e => params.append('extType', e));
        }
        if (policyFilter !== 'all') params.set('policy', policyFilter);
        if (filters.country) {
          const countryArray = Array.isArray(filters.country) ? filters.country : [filters.country];
          countryArray.forEach(c => params.append('country', c));
        }
        if (filters.hub) {
          const hubArray = Array.isArray(filters.hub) ? filters.hub : [filters.hub];
          hubArray.forEach(h => params.append('hub', h));
        }
        if (filters.region) {
          const regionArray = Array.isArray(filters.region) ? filters.region : [filters.region];
          regionArray.forEach(r => params.append('region', r));
        }

        const response = await fetch(`/api/analytics/performance?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setPerformanceData(data);
          // Initialize selected years if empty and data is available
          if (selectedYears.length === 0 && data.availableYears.length > 0) {
            setSelectedYears([data.availableYears[0]]);
          }
        } else {
          setPerformanceData(null);
        }
      } catch (error) {
        console.error('Failed to load performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformance();
  }, [selectedEntity, entityType, selectedYears, filters.class, filters.subClass, filters.extType, policyFilter, brokersForSelectedPolicy, filters.country, filters.hub, filters.region]);

  // Load brokers for selected policy - also apply class/subclass/extType filters
  useEffect(() => {
    if (policyFilter !== 'all' && policyFilter) {
      const loadBrokersForPolicy = async () => {
        try {
          const params = new URLSearchParams();
          params.set('policy', policyFilter);
          if (filters.class) {
            const classArray = Array.isArray(filters.class) ? filters.class : [filters.class];
            classArray.forEach(c => params.append('class', c));
          }
          if (filters.subClass) {
            const subClassArray = Array.isArray(filters.subClass) ? filters.subClass : [filters.subClass];
            subClassArray.forEach(s => params.append('subClass', s));
          }
          if (filters.extType) {
            const extTypeArray = Array.isArray(filters.extType) ? filters.extType : [filters.extType];
            extTypeArray.forEach(e => params.append('extType', e));
          }
          if (filters.country) {
            const countryArray = Array.isArray(filters.country) ? filters.country : [filters.country];
            countryArray.forEach(c => params.append('country', c));
          }
          if (filters.hub) {
            const hubArray = Array.isArray(filters.hub) ? filters.hub : [filters.hub];
            hubArray.forEach(h => params.append('hub', h));
          }
          if (filters.region) {
            const regionArray = Array.isArray(filters.region) ? filters.region : [filters.region];
            regionArray.forEach(r => params.append('region', r));
          }
          
          const response = await fetch(`/api/analytics/performance/policy-brokers?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            setBrokersForSelectedPolicy(data.brokers || []);
            // If only one broker, auto-select it
            if (data.brokers && data.brokers.length === 1 && !selectedEntity) {
              setSelectedEntity(data.brokers[0]);
            }
            // Clear selected entity if it's no longer in the filtered brokers list
            if (selectedEntity && !data.brokers.includes(selectedEntity)) {
              setSelectedEntity('');
              setSearchTerm('');
            }
          }
        } catch (error) {
          console.error('Failed to load brokers for policy:', error);
          setBrokersForSelectedPolicy([]);
        }
      };
      loadBrokersForPolicy();
    } else {
      setBrokersForSelectedPolicy([]);
    }
  }, [policyFilter, selectedEntity, filters.class, filters.subClass, filters.extType, filters.country, filters.hub, filters.region]);

  // Filter entities by search term - prioritize brokers from selected policy
  const filteredEntities = useMemo(() => {
    // If a policy is selected, show brokers for that policy first, then all other brokers
    const entitiesToFilter = policyFilter !== 'all' && brokersForSelectedPolicy.length > 0
      ? [...brokersForSelectedPolicy, ...availableEntities.filter(e => !brokersForSelectedPolicy.includes(e))]
      : availableEntities;
    
    if (!searchTerm.trim()) return entitiesToFilter;
    return entitiesToFilter.filter(entity =>
      entity.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableEntities, searchTerm, policyFilter, brokersForSelectedPolicy]);

  // Filter policies by search term - use availablePolicies from API, fallback to performanceData if available
  const filteredPolicies = useMemo(() => {
    const policiesToFilter = availablePolicies.length > 0 
      ? availablePolicies 
      : (performanceData?.availablePolicies || []);
    
    if (!policySearchTerm.trim()) return policiesToFilter;
    return policiesToFilter.filter(policy =>
      policy.toLowerCase().includes(policySearchTerm.toLowerCase())
    );
  }, [availablePolicies, performanceData, policySearchTerm]);

  // Filter table data based on selected filters
  const filteredTableData = useMemo(() => {
    if (!performanceData) return [];
    
    let filtered = performanceData.policies;
    
    // Year filter - show only selected years, or all if none selected
    if (selectedYears.length > 0) {
      filtered = filtered.filter(p => selectedYears.includes(p.year));
    }

    // Policy filter is already applied in API, but we can filter client-side too
    if (policyFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.policyName.toLowerCase() === policyFilter.toLowerCase()
      );
    }

    // Apply additional filters from UniversalFilterPanel
    if (filters.policyName) {
      filtered = filtered.filter(p => 
        p.policyName.toLowerCase() === filters.policyName!.toLowerCase()
      );
    }
    
    return filtered;
  }, [performanceData, selectedYears, policyFilter]);

  // Group data by policy name and cedant for horizontal table
  const groupedByPolicy = useMemo(() => {
    if (!performanceData || selectedYears.length === 0) return [];
    
    const grouped = new Map<string, Map<number, typeof filteredTableData[0]>>();
    
    filteredTableData.forEach(record => {
      const key = `${record.policyName}|||${record.cedantName}`;
      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }
      grouped.get(key)!.set(record.year, record);
    });
    
    return Array.from(grouped.entries()).map(([key, yearMap]) => {
      const [policyName, cedantName] = key.split('|||');
      // Get SRL number from any record (should be same for all years)
      const firstRecord = Array.from(yearMap.values())[0];
      return {
        policyName,
        cedantName,
        srlNumber: firstRecord?.srlNumber,
        years: yearMap,
      };
    });
  }, [filteredTableData, selectedYears]);

  const getUcrColor = (ucr: number) => {
    if (ucr > 100) return 'text-red-600';
    if (ucr > 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUcrBadge = (ucr: number) => {
    if (ucr > 100) return 'destructive';
    if (ucr > 90) return 'secondary';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Filter Panel with Entity Selection */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm">
        <TopFilterPanel
          data={allData}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => {
          setFilters({
            office: null,
            extType: null,
            policyNature: null,
            class: null,
            subClass: null,
            hub: null,
            region: null,
            country: null,
            year: null,
            month: null,
            quarter: null,
            broker: null,
            cedant: null,
            policyName: null,
          });
          setSelectedEntity('');
          setSelectedYears([]);
          setPolicyFilter('all');
          setSearchTerm('');
          setPolicySearchTerm('');
          setBrokersForSelectedPolicy([]);
        }}
      >
        {/* Entity Selection Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Entity Selection</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Business Source */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Source</label>
              <Select
                value={entityType}
                onValueChange={(value: 'broker' | 'cedant') => {
                  setEntityType(value);
                  setSelectedEntity('');
                  setPerformanceData(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="cedant">Cedant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Broker/Cedant and Policy Filters Container - Side by side with arrow */}
            <div className="col-span-2">
              <div className="flex items-end gap-3">
                {/* Broker/Cedant Name Filter - Swaps position */}
                <div className="flex-1 space-y-2 transition-all duration-300" style={{ order: searchMode === 'policy' ? 3 : 1 }}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {entityType === 'broker' ? 'Broker' : 'Cedant'} Name
                      {policyFilter !== 'all' && brokersForSelectedPolicy.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({brokersForSelectedPolicy.length} for this policy)
                        </span>
                      )}
                    </label>
                    {selectedEntity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-xs"
                        onClick={() => {
                          setSelectedEntity('');
                          setSearchTerm('');
                          setShowEntityDropdown(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder={
                        policyFilter !== 'all' && brokersForSelectedPolicy.length > 0
                          ? `Type to search ${entityType} for "${policyFilter}"...`
                          : selectedEntity
                          ? selectedEntity
                          : `Type to search ${entityType}...`
                      }
                      value={selectedEntity ? selectedEntity : searchTerm}
                      onChange={(e) => {
                        if (!selectedEntity) {
                          setSearchTerm(e.target.value);
                          setShowEntityDropdown(true);
                        }
                      }}
                      onFocus={() => {
                        if (!selectedEntity) {
                          setShowEntityDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowEntityDropdown(false), 200);
                      }}
                      className="pr-8"
                      disabled={policyFilter !== 'all' && brokersForSelectedPolicy.length === 0}
                    />
                    {(searchTerm || selectedEntity) && (
                      <button
                        onClick={() => {
                          setSelectedEntity('');
                          setSearchTerm('');
                          setShowEntityDropdown(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {showEntityDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredEntities.length > 0 ? (
                          <>
                            {filteredEntities.slice(0, 100).map((entity) => {
                              const isPolicyBroker = policyFilter !== 'all' && brokersForSelectedPolicy.includes(entity);
                              return (
                                <button
                                  key={entity}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setSelectedEntity(entity);
                                    setSearchTerm('');
                                    setShowEntityDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                                    isPolicyBroker ? 'bg-primary/10 font-medium' : ''
                                  }`}
                                >
                                  {entity}
                                  {isPolicyBroker && (
                                    <span className="text-xs text-muted-foreground ml-2">(for {policyFilter})</span>
                                  )}
                                </button>
                              );
                            })}
                            {filteredEntities.length > 100 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                                Showing 100 of {filteredEntities.length} {entityType}s
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {policyFilter !== 'all' && brokersForSelectedPolicy.length === 0
                              ? `No ${entityType}s found for this policy`
                              : `No ${entityType}s found`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle Arrow Button - ALWAYS IN THE MIDDLE (order: 2) */}
                <div className="flex items-center justify-center flex-shrink-0" style={{ order: 2 }}>
                  <button
                    onClick={() => {
                      // Switch search mode
                      const newMode = searchMode === 'broker' ? 'policy' : 'broker';
                      setSearchMode(newMode);
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-md border-2 border-border bg-background hover:bg-accent hover:border-primary transition-all duration-200 group"
                    title={`Switch to search by ${searchMode === 'broker' ? 'Policy Name' : entityType === 'broker' ? 'Broker Name' : 'Cedant Name'}`}
                  >
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>

                {/* Policy Name Filter - Swaps position */}
                <div className="flex-1 space-y-2 transition-all duration-300" style={{ order: searchMode === 'policy' ? 1 : 3 }}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Policy Name</label>
                    {policyFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-xs"
                        onClick={() => {
                          setPolicyFilter('all');
                          setPolicySearchTerm('');
                          setShowPolicyDropdown(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder={policyFilter !== 'all' ? policyFilter : "Type to search policy..."}
                      value={policyFilter !== 'all' ? policyFilter : policySearchTerm}
                      onChange={(e) => {
                        if (policyFilter === 'all') {
                          setPolicySearchTerm(e.target.value);
                          setShowPolicyDropdown(true);
                        }
                      }}
                      onFocus={() => {
                        if (policyFilter === 'all') {
                          setShowPolicyDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowPolicyDropdown(false), 200);
                      }}
                      className="pr-8"
                    />
                    {(policySearchTerm || policyFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setPolicyFilter('all');
                          setPolicySearchTerm('');
                          setShowPolicyDropdown(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {showPolicyDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {(policySearchTerm ? filteredPolicies : availablePolicies.length > 0 ? availablePolicies : (performanceData?.availablePolicies || [])).length > 0 ? (
                          <>
                            {(policySearchTerm ? filteredPolicies : availablePolicies.length > 0 ? availablePolicies : (performanceData?.availablePolicies || [])).slice(0, 100).map((policy) => (
                              <button
                                key={policy}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setPolicyFilter(policy);
                                  setPolicySearchTerm('');
                                  setShowPolicyDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                              >
                                {policy}
                              </button>
                            ))}
                            {(policySearchTerm ? filteredPolicies : availablePolicies.length > 0 ? availablePolicies : (performanceData?.availablePolicies || [])).length > 100 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                                Showing 100 of {(policySearchTerm ? filteredPolicies : availablePolicies.length > 0 ? availablePolicies : (performanceData?.availablePolicies || [])).length} policies
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No policies found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Year Filter - Multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Years</label>
                {selectedYears.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs"
                    onClick={() => setSelectedYears([])}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={!performanceData}
                  >
                    <span className="truncate">
                      {selectedYears.length === 0
                        ? 'Select years...'
                        : selectedYears.length === 1
                        ? `${selectedYears[0]}`
                        : `${selectedYears.length} years selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Select Years</span>
                      {selectedYears.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSelectedYears([])}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="max-h-[240px] overflow-y-auto space-y-1">
                      {performanceData?.availableYears.map((year) => {
                        const isSelected = selectedYears.includes(year);
                        return (
                          <div
                            key={year}
                            className="flex items-center space-x-2 rounded-md px-2 py-2 hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedYears(selectedYears.filter(y => y !== year));
                              } else {
                                setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
                                } else {
                                  setSelectedYears(selectedYears.filter(y => y !== year));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <label className="text-sm cursor-pointer flex-1 font-medium">
                              {year}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {selectedYears.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedYears.map((year) => (
                    <Badge
                      key={year}
                      variant="secondary"
                      className="text-xs px-2 py-1 flex items-center gap-1"
                    >
                      {year}
                      <button
                        onClick={() => setSelectedYears(selectedYears.filter(y => y !== year))}
                        className="hover:bg-muted rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </TopFilterPanel>
      </div>

      <div className="container mx-auto px-4 py-8 pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Performance Analysis
            </h1>
            <div className="mt-2">
              <CurrencyLabel />
            </div>
          </div>

          {/* Performance Data - Horizontal Table with Year Sections */}
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : performanceData && filteredTableData.length > 0 && selectedYears.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Policy Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide bg-muted/50 border-r-2">
                          Policy Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide bg-muted/50 border-r-2">
                          Cedant Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide bg-muted/50 border-r-2">
                          SRL Number
                        </th>
                        {selectedYears.slice().sort((a, b) => a - b).map((year) => (
                          <th key={year} colSpan={3} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide bg-muted/50 border-r-2 border-primary/30">
                            {year}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <th className="px-4 py-2 bg-muted/30 border-r-2"></th>
                        <th className="px-4 py-2 bg-muted/30 border-r-2"></th>
                        <th className="px-4 py-2 bg-muted/30 border-r-2"></th>
                        {selectedYears.slice().sort((a, b) => a - b).map((year) => (
                          <React.Fragment key={year}>
                            <th className="px-4 py-2 text-right text-xs font-medium bg-muted/30 border-r">No.</th>
                            <th className="px-4 py-2 text-right text-xs font-medium bg-muted/30 border-r">Premium</th>
                            <th className="px-4 py-2 text-right text-xs font-medium bg-muted/30 border-r-2 border-primary/30">uCR%</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByPolicy.map((policy, index) => (
                        <tr key={`${policy.policyName}-${policy.cedantName}-${index}`} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium border-r-2">{policy.policyName}</td>
                          <td className="px-4 py-3 border-r-2">{policy.cedantName}</td>
                          <td className="px-4 py-3 border-r-2">{policy.srlNumber || '-'}</td>
                          {selectedYears.slice().sort((a, b) => a - b).map((year) => {
                            const record = policy.years.get(year);
                            return (
                              <React.Fragment key={year}>
                                <td className="px-4 py-3 text-right font-mono text-sm border-r">
                                  {record ? record.policyCount.toLocaleString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm border-r">
                                  {record ? formatCurrencyNumeric(record.retainedPrem) : '-'}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold text-sm border-r-2 border-primary/30 ${record ? getUcrColor(record.ucr) : ''}`}>
                                  {record ? formatPct(record.ucr) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : performanceData && filteredTableData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Policy Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy Name</TableHead>
                        <TableHead>Cedant Name</TableHead>
                        <TableHead>SRL Number</TableHead>
                        <TableHead className="text-right">No. of Policies</TableHead>
                        <TableHead className="text-right">Premium</TableHead>
                        <TableHead className="text-right">uCR%</TableHead>
                        <TableHead>Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTableData.map((record, index) => (
                        <TableRow key={`${record.policyName}-${record.year}-${index}`}>
                          <TableCell className="font-medium">{record.policyName}</TableCell>
                          <TableCell>{record.cedantName}</TableCell>
                          <TableCell>{record.srlNumber || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {record.policyCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrencyNumeric(record.retainedPrem)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${getUcrColor(record.ucr)}`}>
                            {formatPct(record.ucr)}
                          </TableCell>
                          <TableCell>{record.year}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && !performanceData && selectedEntity && (
            <Card>
              <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
                <p>No performance data available for the selected filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
