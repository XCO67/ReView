'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Map,
  RefreshCw,
  Loader2,
  Clock,
  BarChart3,
  Info,
  Globe
} from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { ChatBot } from '@/components/chat/ChatBot';
import WorldMap, { BaseCountryData } from '@/components/charts/WorldMap';
import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';
import { TopFilterPanel } from '@/components/filters/TopFilterPanel';
import { ReinsuranceData } from '@/lib/schema';

interface CountryData extends BaseCountryData {
  records?: CountryDetailRecord[];
  yearly?: CountryYearSummary[];
}

interface CountryDetailRecord {
  uy: string;
  srl?: string;
  extType: string;
  insuredName: string;
  broker: string;
  cedant: string;
  cedTerritory?: string;
  countryName?: string; // Country Name from CSV
  maxLiability: number;
  premium: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  lossRatioPct: number;
  isNearExpiry?: boolean;
}

interface CountryYearSummary {
  year: number;
  policyCount: number;
  premium: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  technicalResult: number;
  lossRatioPct: number;
  acquisitionPct: number;
  combinedRatioPct: number;
  nearExpiryCount: number;
  nearExpiryPct: number;
  records: CountryDetailRecord[];
}

interface WorldMapResponse {
  countries: CountryData[];
  total: {
    policyCount: number;
    premium: number;
    acquisition: number;
    paidClaims: number;
    osLoss: number;
    incurredClaims: number;
    technicalResult: number;
    lossRatioPct: number;
    acquisitionPct: number;
    combinedRatioPct: number;
  };
  availableYears: number[];
}

export default function WorldMapPage() {
  const { formatCurrency, formatCurrencyNumeric } = useFormatCurrency();
  const [worldData, setWorldData] = useState<WorldMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [recordDisplayCount, setRecordDisplayCount] = useState(15);
  const [recordSearch, setRecordSearch] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYearIndex, setSelectedYearIndex] = useState<number | null>(null);
  const [metricType, setMetricType] = useState<'premium' | 'maxLiability' | 'lossRatio' | 'count'>('premium');
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

  const selectedYear = useMemo(() => {
    if (selectedYearIndex === null) return null;
    return availableYears[selectedYearIndex] ?? null;
  }, [availableYears, selectedYearIndex]);

  useEffect(() => {
    setRecordDisplayCount(15);
    setRecordSearch('');
  }, [selectedCountry?.country, selectedYear]);

  useEffect(() => {
    if (!availableYears.length) {
      setSelectedYearIndex(null);
      return;
    }
    setSelectedYearIndex((prev) => {
      if (prev === null || prev >= availableYears.length) {
        return availableYears.length - 1;
      }
      return prev;
    });
  }, [availableYears]);

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

  const loadWorldData = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Update API to accept filter parameters
      const response = await fetch(`/api/world-map`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWorldData(data);
      setLastUpdated(new Date());

      if (Array.isArray(data.availableYears)) {
        const sortedYears = [...data.availableYears].sort((a, b) => a - b);
        setAvailableYears(sortedYears);
        setSelectedYearIndex((prev) => {
          if (prev !== null && sortedYears[prev] !== undefined) {
            return prev;
          }
          return sortedYears.length > 0 ? sortedYears.length - 1 : null;
        });
      }
    } catch (error) {
      console.error('World Map - Failed to load world data:', error);
      setWorldData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear filters function
  const clearFilters = () => {
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
  };

  // Load world map data
  useEffect(() => {
    loadWorldData();
  }, [loadWorldData]);

  const handleRefresh = () => {
    loadWorldData();
  };

  // Get badge variant for ratios
  const getRatioBadgeVariant = (value: number) => {
    if (value > 100) return 'destructive';
    if (value > 80) return 'secondary';
    return 'default';
  };

  const getNearExpiryBadgeVariant = (value: number) => {
    if (value > 50) return 'destructive';
    if (value > 25) return 'secondary';
    return 'default';
  };

  // Filter records by search term only (no state filtering)
  const filteredRecords = useMemo(() => {
    if (!selectedCountry?.records || !selectedCountry.records.length) return [];
    if (!recordSearch.trim()) return selectedCountry.records;
    const term = recordSearch.toLowerCase();
    return selectedCountry.records.filter((record) => {
      return (
        record.insuredName.toLowerCase().includes(term) ||
        record.broker.toLowerCase().includes(term) ||
        record.cedant.toLowerCase().includes(term) ||
        record.extType.toLowerCase().includes(term) ||
        (record.cedTerritory?.toLowerCase().includes(term) ?? false) ||
        (record.uy?.toLowerCase().includes(term) ?? false) ||
        (record.srl?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [selectedCountry?.records, recordSearch]);

  const visibleRecords = useMemo(() => {
    if (!filteredRecords.length) return [];
    return filteredRecords.slice(0, Math.min(recordDisplayCount, filteredRecords.length));
  }, [filteredRecords, recordDisplayCount]);

  const recordTotals = useMemo(() => {
    if (!filteredRecords.length) {
      return null;
    }

    return filteredRecords.reduce(
      (totals, record) => {
        return {
          policies: totals.policies + 1,
          maxLiability: totals.maxLiability + (record.maxLiability || 0),
          premium: totals.premium + (record.premium || 0),
          incurred: totals.incurred + (record.incurredClaims || 0),
          lossRatioSum: totals.lossRatioSum + (isFinite(record.lossRatioPct) ? record.lossRatioPct : 0),
          lossRatioCount: totals.lossRatioCount + (isFinite(record.lossRatioPct) ? 1 : 0),
        };
      },
      { policies: 0, maxLiability: 0, premium: 0, incurred: 0, lossRatioSum: 0, lossRatioCount: 0 }
    );
  }, [filteredRecords]);


const displayedCountries = useMemo(() => {
  if (!worldData?.countries) return [];
  if (!selectedYear) return worldData.countries;

  return worldData.countries.map((country) => {
    const yearSummary = country.yearly?.find((year) => year.year === selectedYear);
    if (!yearSummary) {
      return {
        ...country,
        policyCount: 0,
        premium: 0,
        acquisition: 0,
        paidClaims: 0,
        osLoss: 0,
        incurredClaims: 0,
        technicalResult: 0,
        lossRatioPct: 0,
        acquisitionPct: 0,
        combinedRatioPct: 0,
        nearExpiryCount: 0,
        nearExpiryPct: 0,
        states: [],
        records: [],
      };
    }

    return {
      ...country,
      policyCount: yearSummary.policyCount,
      premium: yearSummary.premium,
      acquisition: yearSummary.acquisition,
      paidClaims: yearSummary.paidClaims,
      osLoss: yearSummary.osLoss,
      incurredClaims: yearSummary.incurredClaims,
      technicalResult: yearSummary.technicalResult,
      lossRatioPct: yearSummary.lossRatioPct,
      acquisitionPct: yearSummary.acquisitionPct,
      combinedRatioPct: yearSummary.combinedRatioPct,
      nearExpiryCount: yearSummary.nearExpiryCount,
      nearExpiryPct: yearSummary.nearExpiryPct,
      records: yearSummary.records,
    };
  });
}, [worldData, selectedYear]);

  const displayTotals = useMemo(() => {
    if (!worldData) return null;
    if (!selectedYear || !displayedCountries.length) {
      return worldData.total;
    }

    const sums = displayedCountries.reduce(
      (totals, country) => {
        return {
          policyCount: totals.policyCount + (country.policyCount || 0),
          premium: totals.premium + (country.premium || 0),
          acquisition: totals.acquisition + (country.acquisition || 0),
          paidClaims: totals.paidClaims + (country.paidClaims || 0),
          osLoss: totals.osLoss + (country.osLoss || 0),
          incurredClaims: totals.incurredClaims + (country.incurredClaims || 0),
        };
      },
      {
        policyCount: 0,
        premium: 0,
        acquisition: 0,
        paidClaims: 0,
        osLoss: 0,
        incurredClaims: 0,
      }
    );

    const lossRatioPct = sums.premium > 0 ? (sums.incurredClaims / sums.premium) * 100 : 0;
    const acquisitionPct = sums.premium > 0 ? (sums.acquisition / sums.premium) * 100 : 0;
    const combinedRatioPct = lossRatioPct + acquisitionPct;
    const technicalResult = sums.premium - sums.incurredClaims - sums.acquisition;

    return {
      policyCount: sums.policyCount,
      premium: sums.premium,
      acquisition: sums.acquisition,
      paidClaims: sums.paidClaims,
      osLoss: sums.osLoss,
      incurredClaims: sums.incurredClaims,
      technicalResult,
      lossRatioPct,
      acquisitionPct,
      combinedRatioPct,
    };
  }, [worldData, displayedCountries, selectedYear]);

  const topCountries = useMemo(() => {
    if (!displayedCountries.length) return [];
    return [...displayedCountries]
      .sort((a, b) => (b.policyCount || 0) - (a.policyCount || 0))
      .slice(0, 10);
  }, [displayedCountries]);

  useEffect(() => {
    if (!selectedCountry) return;
    const updated = displayedCountries.find(
      (country) => country.country === selectedCountry.country
    );
    setSelectedCountry(updated || null);
  }, [displayedCountries, selectedCountry?.country]);

  const scopedCountryMetrics = useMemo(() => {
    if (!selectedCountry) return null;
    // No state filtering - use all records for the selected country
    if (!selectedCountry.records) {
      return selectedCountry;
    }

    const baseRecords = selectedCountry.records;
    if (!baseRecords.length) {
      return {
        ...selectedCountry,
        policyCount: 0,
        premium: 0,
        acquisition: 0,
        paidClaims: 0,
        osLoss: 0,
        incurredClaims: 0,
        technicalResult: 0,
        lossRatioPct: 0,
        acquisitionPct: 0,
        combinedRatioPct: 0,
        nearExpiryCount: 0,
        nearExpiryPct: 0,
      };
    }

    const summary = baseRecords.reduce(
      (totals, record) => {
        return {
          policyCount: totals.policyCount + 1,
          premium: totals.premium + (record.premium || 0),
          acquisition: totals.acquisition + (record.acquisition || 0),
          paidClaims: totals.paidClaims + (record.paidClaims || 0),
          osLoss: totals.osLoss + (record.osLoss || 0),
          incurredClaims: totals.incurredClaims + (record.incurredClaims || 0),
          nearExpiryCount: totals.nearExpiryCount + (record.isNearExpiry ? 1 : 0),
        };
      },
      {
        policyCount: 0,
        premium: 0,
        acquisition: 0,
        paidClaims: 0,
        osLoss: 0,
        incurredClaims: 0,
        nearExpiryCount: 0,
      }
    );

    const lossRatioPct = summary.premium > 0 ? (summary.incurredClaims / summary.premium) * 100 : 0;
    const acquisitionPct = summary.premium > 0 ? (summary.acquisition / summary.premium) * 100 : 0;
    const combinedRatioPct = lossRatioPct + acquisitionPct;
    const nearExpiryPct = summary.policyCount > 0 ? (summary.nearExpiryCount / summary.policyCount) * 100 : 0;

    return {
      ...selectedCountry,
      policyCount: summary.policyCount,
      premium: summary.premium,
      acquisition: summary.acquisition,
      paidClaims: summary.paidClaims,
      osLoss: summary.osLoss,
      incurredClaims: summary.incurredClaims,
      technicalResult: summary.premium - summary.incurredClaims - summary.acquisition,
      lossRatioPct,
      acquisitionPct,
      combinedRatioPct,
      nearExpiryCount: summary.nearExpiryCount,
      nearExpiryPct,
    };
  }, [selectedCountry]);

  const activeCountry = scopedCountryMetrics || selectedCountry;

  const scopedBrokersCount = useMemo(() => {
    if (!selectedCountry) return 0;
    return selectedCountry.brokers.length;
  }, [selectedCountry]);

  const scopedCedantsCount = useMemo(() => {
    if (!selectedCountry) return 0;
    return selectedCountry.cedants.length;
  }, [selectedCountry]);

  // Get max policy count for color scaling
  const maxPolicies = useMemo(() => {
    if (!worldData?.countries) return 1;
    return Math.max(...worldData.countries.map(c => c.policyCount), 1);
  }, [worldData]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background" style={{ scrollBehavior: 'smooth' }}>
        {/* Top Filter Panel */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm">
          <TopFilterPanel
            data={allData}
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Header */}
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Global Footprint</h1>
                  <div className="text-sm text-muted-foreground mt-1">
                    <CurrencyLabel />
                  </div>
                  <p className="text-sm text-muted-foreground">Global reinsurance coverage visualization</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reload world map data</p>
                  </TooltipContent>
                </Tooltip>

                {lastUpdated && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Loading world map data...</span>
              </div>
            </div>
          )}

          {/* World Map Data */}
          {worldData && !isLoading && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Countries</p>
                        <p className="text-2xl font-bold">{worldData.countries?.length || 0}</p>
                      </div>
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Policies</p>
                        <p className="text-2xl font-bold">{formatNumber(displayTotals?.policyCount || 0)}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Premium</p>
                        <p className="text-2xl font-bold">{formatCurrency(displayTotals?.premium || 0)}</p>
                      </div>
                      <Map className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Combined Ratio</p>
                        <p className={`text-2xl font-bold ${
                          (displayTotals?.combinedRatioPct || 0) > 100 ? 'text-red-600' :
                          (displayTotals?.combinedRatioPct || 0) > 80 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {formatPct(displayTotals?.combinedRatioPct || 0)}
                        </p>
                      </div>
                      <Info className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

      {availableYears.length > 1 && selectedYearIndex !== null && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Year Timeline</span>
              <span className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-primary">
                  {selectedYear ?? 'All Years'}
                </span>
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Drag the handle or tap a checkpoint to see how policies grow or contract year over year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full py-4">
              <div className="h-1 w-full bg-border rounded-full" />
              {availableYears.length > 1 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      availableYears.length === 1
                        ? 100
                        : ((selectedYearIndex ?? 0) / (availableYears.length - 1)) * 100
                    }%`,
                  }}
                />
              )}
              {availableYears.map((year, index) => {
                const position =
                  availableYears.length === 1 ? 0 : (index / (availableYears.length - 1)) * 100;
                const isActive = selectedYearIndex === index;
                const isPast = (selectedYearIndex ?? 0) >= index;
                return (
                  <button
                    type="button"
                    key={year}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${position}%` }}
                    onClick={() => setSelectedYearIndex(index)}
                  >
                    <span
                      className={`block h-3 w-3 rounded-full border transition-colors ${
                        isActive
                          ? 'bg-primary border-primary'
                          : isPast
                            ? 'bg-primary/70 border-primary/70'
                            : 'bg-background border-border'
                      }`}
                    />
                    <span
                      className={`mt-2 text-[10px] ${
                        isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {year}
                    </span>
                  </button>
                );
              })}
              <input
                type="range"
                min={0}
                max={availableYears.length - 1}
                step={1}
                value={selectedYearIndex}
                onChange={(event) => setSelectedYearIndex(Number(event.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      )}

              {/* Interactive World Map */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Map className="h-5 w-5" />
                        Global Policy Distribution
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Interactive world map showing policy distribution by country. Hover over countries to see details, click to select, and use zoom controls to explore.</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <CurrencyLabel />
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="metric-type" className="text-sm text-muted-foreground">
                          View by:
                        </label>
                        <Select value={metricType} onValueChange={(value: 'premium' | 'maxLiability' | 'lossRatio' | 'count') => setMetricType(value)}>
                          <SelectTrigger id="metric-type" className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="maxLiability">Max Liability</SelectItem>
                            <SelectItem value="lossRatio">Loss Ratio</SelectItem>
                            <SelectItem value="count">Policy Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedCountry && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCountry(null)}
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative" style={{ minHeight: '600px' }}>
                    <WorldMap
                      data={displayedCountries}
                      metricType={metricType}
                      onCountryHover={setHoveredCountry}
                      onCountryClick={setSelectedCountry}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Selected Country Details */}
              {selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <Map className="h-5 w-5" />
                        {selectedCountry.country} - Detailed Information
                        <span className="text-xs text-muted-foreground">
                          Year {selectedYear ?? 'All'}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <CurrencyLabel />
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Core Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Policies</span>
                              <span className="font-semibold">{formatNumber(activeCountry?.policyCount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Premium</span>
                              <span className="font-semibold">{formatCurrency(activeCountry?.premium || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Acquisition</span>
                              <span className="font-semibold">{formatCurrency(activeCountry?.acquisition || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Claims</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Paid Claims</span>
                              <span className="font-semibold">{formatCurrency(activeCountry?.paidClaims || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Outstanding</span>
                              <span className="font-semibold">{formatCurrency(activeCountry?.osLoss || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Incurred</span>
                              <span className="font-semibold">{formatCurrency(activeCountry?.incurredClaims || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Performance</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Loss Ratio</span>
                              <Badge variant={getRatioBadgeVariant(activeCountry?.lossRatioPct || 0)}>
                                {formatPct(activeCountry?.lossRatioPct || 0)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Combined Ratio</span>
                              <Badge variant={getRatioBadgeVariant(activeCountry?.combinedRatioPct || 0)}>
                                {formatPct(activeCountry?.combinedRatioPct || 0)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Near Expiry</span>
                              <Badge variant={getNearExpiryBadgeVariant(activeCountry?.nearExpiryPct || 0)}>
                                {formatPct(activeCountry?.nearExpiryPct || 0)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Technical Result</span>
                              <span className={`font-semibold ${
                                (activeCountry?.technicalResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(activeCountry?.technicalResult || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{scopedBrokersCount}</div>
                          <div className="text-sm text-muted-foreground">Brokers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{scopedCedantsCount}</div>
                          <div className="text-sm text-muted-foreground">Cedants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.regions.length}</div>
                          <div className="text-sm text-muted-foreground">Regions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.hubs.length}</div>
                          <div className="text-sm text-muted-foreground">Hubs</div>
                        </div>
                      </div>
                    {selectedCountry.records && selectedCountry.records.length > 0 && (
                      <div className="mt-8 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Country Records</h4>
                            <p className="text-xs text-muted-foreground/80">
                              Showing {Math.min(recordDisplayCount, filteredRecords.length)} of{' '}
                              {filteredRecords.length.toLocaleString()} entries
                            </p>
                          </div>
                          <div className="flex-1 md:flex-none">
                            <input
                              value={recordSearch}
                              onChange={(e) => {
                                setRecordSearch(e.target.value);
                                setRecordDisplayCount(15);
                              }}
                              placeholder="Search insured, broker, cedant…"
                              className="w-full rounded-2xl border border-border/60 bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                        {filteredRecords.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                            No records match “{recordSearch}”.
                          </div>
                        ) : (
                          <>
                            <div className="overflow-x-auto border rounded-3xl bg-card/60 shadow-inner">
                              <Table className="table-fixed w-full min-w-[1400px] text-sm">
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    <TableHead className="w-[120px] px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Year</TableHead>
                                    <TableHead className="w-[100px] px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Srl</TableHead>
                                    <TableHead className="w-[120px] px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Ext Type</TableHead>
                                    <TableHead className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Insured</TableHead>
                                    <TableHead className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Broker</TableHead>
                                    <TableHead className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Cedant</TableHead>
                                    <TableHead className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Country Name</TableHead>
                                    <TableHead className="w-[160px] px-4 py-3 text-right font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Max Liability</TableHead>
                                    <TableHead className="w-[140px] px-4 py-3 text-right font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Premium</TableHead>
                                    <TableHead className="w-[140px] px-4 py-3 text-right font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Incurred</TableHead>
                                    <TableHead className="w-[140px] px-4 py-3 text-right font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">Loss Ratio</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {visibleRecords.map((record, index) => (
                                    <TableRow
                                      key={`${record.uy}-${record.srl || record.broker}`}
                                      className={`border-b border-border/40 ${index % 2 === 0 ? 'bg-background/40' : 'bg-background/10'} hover:bg-muted/40 transition-colors`}
                                    >
                                      <TableCell className="px-4 py-3 font-semibold text-sm text-foreground">
                                        {record.uy || '—'}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                        {record.srl || '—'}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-sm">{record.extType}</TableCell>
                                      <TableCell className="px-4 py-3 max-w-[210px]">
                                        <p className="truncate font-medium text-foreground">{record.insuredName}</p>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 max-w-[180px]">
                                        <p className="truncate text-sm text-foreground/90">{record.broker}</p>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 max-w-[180px] text-sm text-foreground">
                                        <span className="truncate block">{record.cedant}</span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-sm text-foreground">
                                        {record.countryName || selectedCountry?.country || '—'}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm text-foreground">
                                        {formatCurrencyNumeric(record.maxLiability)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm text-foreground">
                                        {formatCurrencyNumeric(record.premium)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm text-foreground">
                                        {formatCurrencyNumeric(record.incurredClaims)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm">
                                        <span
                                          className={
                                            record.lossRatioPct > 100
                                              ? 'text-red-500 font-semibold'
                                              : record.lossRatioPct > 80
                                                ? 'text-yellow-500 font-semibold'
                                                : 'text-green-500 font-semibold'
                                          }
                                        >
                                          {formatPct(record.lossRatioPct)}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {recordTotals && (
                                    <TableRow className="bg-muted/60 font-semibold border-t-2 border-border/60">
                                      <TableCell className="px-4 py-3 text-primary" colSpan={3}>
                                        TOTAL ({recordTotals.policies.toLocaleString()} policies)
                                      </TableCell>
                                      <TableCell className="px-4 py-3" colSpan={3}></TableCell>
                                      <TableCell className="px-4 py-3"></TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm">
                                        {formatCurrencyNumeric(recordTotals.maxLiability)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm">
                                        {formatCurrencyNumeric(recordTotals.premium)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm">
                                        {formatCurrencyNumeric(recordTotals.incurred)}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-right font-mono text-sm">
                                        {formatPct(recordTotals.lossRatioCount ? recordTotals.lossRatioSum / recordTotals.lossRatioCount : 0)}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            {recordDisplayCount < filteredRecords.length && (
                              <div className="flex justify-center py-3">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setRecordDisplayCount((prev) => Math.min(prev + 15, filteredRecords.length))
                                  }
                                >
                                  See more
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Top Countries Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Countries by Policy Count
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Top 10 countries ranked by number of policies</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    <CurrencyLabel />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Policies</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead className="text-right">Loss Ratio</TableHead>
                          <TableHead className="text-right">Combined Ratio</TableHead>
                          <TableHead className="text-right">Brokers</TableHead>
                          <TableHead className="text-right">Cedants</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCountries.map((country, index) => (
                          <TableRow 
                            key={country.country} 
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => setSelectedCountry(country)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{country.country}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(country.policyCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrencyNumeric(country.premium)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(country.lossRatioPct)}>
                                {formatPct(country.lossRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(country.combinedRatioPct)}>
                                {formatPct(country.combinedRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {country.brokers.length}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {country.cedants.length}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Data State */}
          {!worldData && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Map className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No World Map Data Available</h3>
              <p className="text-sm mb-4">Unable to load world map data. Please try refreshing.</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* ChatBot */}
        <ChatBot />
      </div>
    </TooltipProvider>
  );
}
