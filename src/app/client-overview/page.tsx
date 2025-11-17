'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  Clock,
  Users,
  Building
} from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { ChatBot } from '@/components/chat/ChatBot';

type ClientType = 'broker' | 'cedant';

// Normalized row interface according to spec
interface NormalizedRow {
  // Display fields
  countryName: string;
  region: string;
  hub: string;
  broker: string | null;
  cedant: string | null;
  insured: string | null;
  year: number | undefined;
  
  // Key fields (lowercased for filtering)
  kCountry: string;
  kRegion: string;
  kHub: string;
  kBroker: string | null;
  kCedant: string | null;
  kInsured: string | null;
  
  // Numeric fields (guarded)
  grossUWPrem: number;
  grossActualAcq: number;
  grossPaidClaims: number;
  grossOsLoss: number;
}

interface FilterState {
  country: string[];
  hub: string[];
  region: string[];
  cedant: string[];
  broker: string[];
  insured: string[];
  year: number[];
}

interface ClientData {
  name: string;
  premium: number;
  lossRatio: number;
  policyCount: number;
  incurredClaims: number;
  acquisitionCosts: number;
  technicalResult: number;
  combinedRatio: number;
  percentageOfTotal: number;
}

interface FilterIndexes {
  byCountry: Map<string, number[]>;
  byRegion: Map<string, number[]>;
  byHub: Map<string, number[]>;
  byBroker: Map<string, number[]>;
  byCedant: Map<string, number[]>;
  byInsured: Map<string, number[]>;
  byYear: Map<number, number[]>;
}

export default function ClientOverviewPage() {
  const [rawData, setRawData] = useState<ReinsuranceData[]>([]);
  const [normalizedRows, setNormalizedRows] = useState<NormalizedRow[]>([]);
  const [indexes, setIndexes] = useState<FilterIndexes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientType, setClientType] = useState<ClientType>('broker');
  const [maxClients, setMaxClients] = useState<number>(5);
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    hub: [],
    region: [],
    cedant: [],
    broker: [],
    insured: [],
    year: []
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Normalization function according to spec
  const normalizeData = (records: ReinsuranceData[]): NormalizedRow[] => {
    return records.map(record => {
      // Normalize function: norm(v) = (v ?? '').trim()
      const norm = (v: string | undefined | null): string => (v ?? '').trim();
      
      // Key function: key(v) = norm(v).toLowerCase()
      const key = (v: string | undefined | null): string => norm(v).toLowerCase();
      
      // Year extraction: use inception year or UY
      const year = record.inceptionYear || (record.uy ? parseInt(record.uy) : undefined);
      
      // Broker/cedant/insured: if empty → null
      const broker = record.broker && record.broker.trim() !== '' ? record.broker : null;
      const cedant = record.cedant && record.cedant.trim() !== '' ? record.cedant : null;
      const insured = record.orgInsuredTrtyName && record.orgInsuredTrtyName.trim() !== '' ? record.orgInsuredTrtyName : null;
      
      // Numeric coercion: non-numeric → 0 (safe math)
      const safeNum = (v: number | undefined | null): number => {
        const num = Number(v);
        return isNaN(num) ? 0 : num;
      };
      
      return {
        // Display fields
        countryName: norm(record.countryName),
        region: norm(record.region),
        hub: norm(record.hub),
        broker,
        cedant,
        insured,
        year,
        
        // Key fields (lowercased for filtering)
        kCountry: key(record.countryName),
        kRegion: key(record.region),
        kHub: key(record.hub),
        kBroker: broker ? key(broker) : null,
        kCedant: cedant ? key(cedant) : null,
        kInsured: insured ? key(insured) : null,
        
        // Numeric fields (guarded)
        grossUWPrem: safeNum(record.grossUWPrem),
        grossActualAcq: safeNum(record.grossActualAcq),
        grossPaidClaims: safeNum(record.grossPaidClaims),
        grossOsLoss: safeNum(record.grossOsLoss)
      };
    });
  };

  // Build indexes for fast filtering according to spec
  const buildIndexes = (rows: NormalizedRow[]): FilterIndexes => {
    const byCountry = new Map<string, number[]>();
    const byRegion = new Map<string, number[]>();
    const byHub = new Map<string, number[]>();
    const byBroker = new Map<string, number[]>();
    const byCedant = new Map<string, number[]>();
    const byInsured = new Map<string, number[]>();
    const byYear = new Map<number, number[]>();
    
    rows.forEach((row, index) => {
      // Country index
      if (row.kCountry) {
        if (!byCountry.has(row.kCountry)) byCountry.set(row.kCountry, []);
        byCountry.get(row.kCountry)!.push(index);
      }
      
      // Region index
      if (row.kRegion) {
        if (!byRegion.has(row.kRegion)) byRegion.set(row.kRegion, []);
        byRegion.get(row.kRegion)!.push(index);
      }
      
      // Hub index
      if (row.kHub) {
        if (!byHub.has(row.kHub)) byHub.set(row.kHub, []);
        byHub.get(row.kHub)!.push(index);
      }
      
      // Broker index
      if (row.kBroker) {
        if (!byBroker.has(row.kBroker)) byBroker.set(row.kBroker, []);
        byBroker.get(row.kBroker)!.push(index);
      }
      
      // Cedant index
      if (row.kCedant) {
        if (!byCedant.has(row.kCedant)) byCedant.set(row.kCedant, []);
        byCedant.get(row.kCedant)!.push(index);
      }
      
      // Insured index
      if (row.kInsured) {
        if (!byInsured.has(row.kInsured)) byInsured.set(row.kInsured, []);
        byInsured.get(row.kInsured)!.push(index);
      }
      
      // Year index
      if (row.year !== undefined) {
        if (!byYear.has(row.year)) byYear.set(row.year, []);
        byYear.get(row.year)!.push(index);
      }
    });
    
    return { byCountry, byRegion, byHub, byBroker, byCedant, byInsured, byYear };
  };

  // Load data from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Client Overview - Loading data...');
      const response = await fetch('/api/data?limit=5000');
      console.log('Client Overview - API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Client Overview - API response:', {
        hasData: !!result.data,
        dataLength: result.data?.length || 0,
        sampleRecord: result.data?.[0],
        total: result.total,
        returned: result.returned
      });
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setRawData(result.data);
        
        // Normalize data according to spec
        const normalized = normalizeData(result.data);
        setNormalizedRows(normalized);
        
        // Build indexes for fast filtering
        const newIndexes = buildIndexes(normalized);
        setIndexes(newIndexes);
        
        setLastUpdated(new Date());
        console.log('Client Overview - Data processed successfully:', {
          rawRecords: result.data.length,
          normalizedRecords: normalized.length,
          indexesBuilt: true
        });
      } else {
        console.log('Client Overview - No data in response or invalid format');
        setRawData([]);
        setNormalizedRows([]);
        setIndexes(null);
      }
    } catch (error) {
      console.error('Client Overview - Error loading data:', error);
      setRawData([]);
      setNormalizedRows([]);
      setIndexes(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering algorithm according to spec: union-within, intersection-across
  const filteredData = useMemo(() => {
    if (!indexes || normalizedRows.length === 0) {
      console.log('Client Overview - No data or indexes available for filtering');
      return [];
    }

    // Start with pool = ALL indices
    let pool = new Set<number>(normalizedRows.map((_, index) => index));
    
    // For each facet with selections: UNION within facet, INTERSECT across facets
    Object.entries(filters).forEach(([facet, selections]) => {
      if (selections.length === 0) return; // Skip empty filters
      
      const facetIndices = new Set<number>();
      
      // UNION within facet (all selections for this facet)
      selections.forEach((selection: string) => {
        let indices: number[] = [];
        
        switch (facet) {
          case 'country':
            indices = indexes.byCountry.get(selection.toLowerCase()) || [];
            break;
          case 'region':
            indices = indexes.byRegion.get(selection.toLowerCase()) || [];
            break;
          case 'hub':
            indices = indexes.byHub.get(selection.toLowerCase()) || [];
            break;
          case 'broker':
            indices = indexes.byBroker.get(selection.toLowerCase()) || [];
            break;
          case 'cedant':
            indices = indexes.byCedant.get(selection.toLowerCase()) || [];
            break;
          case 'insured':
            indices = indexes.byInsured.get(selection.toLowerCase()) || [];
            break;
          case 'year':
            indices = indexes.byYear.get(Number(selection)) || [];
            break;
        }
        
        indices.forEach(index => facetIndices.add(index));
      });
      
      // INTERSECT with pool
      pool = new Set([...pool].filter(index => facetIndices.has(index)));
    });
    
    const filteredRows = Array.from(pool).map(index => normalizedRows[index]);
    
    console.log('Client Overview - Filtering results:', {
      totalRows: normalizedRows.length,
      filteredRows: filteredRows.length,
      activeFilters: Object.entries(filters).filter(([, values]) => values.length > 0)
    });
    
    return filteredRows;
  }, [normalizedRows, indexes, filters]);

  // Dependent filter options (computed from CURRENT filtered rows according to spec)
  const filterOptions = useMemo(() => {
    console.log('Client Overview - Building filter options from filtered data:', {
      totalRecords: normalizedRows.length,
      filteredRecords: filteredData.length,
      sampleRecord: filteredData[0]
    });

    if (filteredData.length === 0) {
      return {
        country: [],
        hub: [],
        region: [],
        cedant: [],
        broker: [],
        insured: [],
        year: []
      };
    }

    // Extract unique values from CURRENT filtered rows
    const countries = [...new Set(filteredData.map(d => d.countryName).filter(name => name && name.trim() !== ''))].sort();
    const hubs = [...new Set(filteredData.map(d => d.hub).filter(hub => hub && hub.trim() !== ''))].sort();
    const regions = [...new Set(filteredData.map(d => d.region).filter(region => region && region.trim() !== ''))].sort();
    const cedants = [...new Set(filteredData.map(d => d.cedant).filter(cedant => cedant && cedant.trim() !== ''))].sort();
    const brokers = [...new Set(filteredData.map(d => d.broker).filter(broker => broker && broker.trim() !== ''))].sort();
    const insured = [...new Set(filteredData.map(d => d.insured).filter(insured => insured && insured.trim() !== ''))].sort();
    const years = [...new Set(filteredData.map(d => d.year).filter(year => year !== null))].sort((a, b) => a! - b!);

    console.log('Client Overview - Filter options:', {
      countries: countries.length,
      hubs: hubs.length,
      regions: regions.length,
      cedants: cedants.length,
      brokers: brokers.length,
      insured: insured.length,
      years: years.length,
      sampleCountries: countries.slice(0, 5),
      sampleBrokers: brokers.slice(0, 5),
      sampleCedants: cedants.slice(0, 5)
    });

    return {
      country: countries,
      hub: hubs,
      region: regions,
      cedant: cedants.filter(c => c !== null),
      broker: brokers.filter(b => b !== null),
      insured: insured.filter(i => i !== null),
      year: years.map(y => y!.toString())
    };
  }, [filteredData, normalizedRows]);

  // Calculate client overview data according to spec
  const clientData = useMemo(() => {
    if (filteredData.length === 0) {
      console.log('Client Overview - No filtered data available');
      return { clients: [], totals: null, grandTotal: null };
    }

    console.log('Client Overview - Processing filtered data:', {
      totalRecords: filteredData.length,
      sampleRecord: filteredData[0],
      activeFilters: Object.entries(filters).filter(([, values]) => values.length > 0),
      clientType: clientType
    });

    // Group data by client (broker or cedant) according to spec
    const clientGroups: Record<string, NormalizedRow[]> = {};
    
    filteredData.forEach(record => {
      const clientName = clientType === 'broker' ? record.broker : record.cedant;
      if (clientName && clientName.trim() !== '') {
        if (!clientGroups[clientName]) {
          clientGroups[clientName] = [];
        }
        clientGroups[clientName].push(record);
      }
    });

    console.log('Client Overview - Client groups:', {
      totalGroups: Object.keys(clientGroups).length,
      groupNames: Object.keys(clientGroups).slice(0, 5)
    });

    // Calculate metrics for each client according to spec
    const calculateClientMetrics = (clientRecords: NormalizedRow[]): ClientData => {
      const premium = clientRecords.reduce((sum, d) => sum + d.grossUWPrem, 0);
      const acquisition = clientRecords.reduce((sum, d) => sum + d.grossActualAcq, 0);
      const claims = clientRecords.reduce((sum, d) => sum + (d.grossPaidClaims + d.grossOsLoss), 0);
      const policyCount = clientRecords.length;
      const lossRatio = premium > 0 ? (claims / premium) * 100 : 0;
      const acquisitionCostsPct = premium > 0 ? (acquisition / premium) * 100 : 0;
      const technicalResult = premium - claims - acquisition;
      const combinedRatio = lossRatio + acquisitionCostsPct;

      return {
        name: clientRecords[0]?.broker || clientRecords[0]?.cedant || '',
        premium,
        lossRatio,
        policyCount,
        incurredClaims: claims,
        acquisitionCosts: acquisition,
        technicalResult,
        combinedRatio,
        percentageOfTotal: 0 // Will be calculated later
      };
    };

    // Process all clients and sort by premium (descending)
    const clients = Object.keys(clientGroups).sort();
    const clientMetrics = clients.map(client => calculateClientMetrics(clientGroups[client]));
    
    // Sort by premium descending and take top N clients
    const topClients = clientMetrics
      .sort((a, b) => b.premium - a.premium)
      .slice(0, maxClients);

    console.log('Client Overview - Top clients:', {
      topClients: topClients.map(c => ({ name: c.name, premium: c.premium }))
    });

    // Calculate grand total (all clients)
    const grandTotal = clientMetrics.reduce((sum, client) => sum + client.premium, 0);
    const grandTotalClaims = clientMetrics.reduce((sum, client) => sum + client.incurredClaims, 0);
    const grandTotalLossRatio = grandTotal > 0 ? (grandTotalClaims / grandTotal) * 100 : 0;

    // Calculate totals for top N clients only
    const topNTotal = topClients.reduce((sum, client) => sum + client.premium, 0);
    const topNClaims = topClients.reduce((sum, client) => sum + client.incurredClaims, 0);
    const topNLossRatio = topNTotal > 0 ? (topNClaims / topNTotal) * 100 : 0;

    // Add percentage of grand total for each client
    const clientsWithPercentages = topClients.map(client => ({
      ...client,
      percentageOfTotal: grandTotal > 0 ? (client.premium / grandTotal) * 100 : 0
    }));

    // Add totals row (sum of top N only)
    const totalsRow: ClientData = {
      name: `TOTAL (Top ${maxClients})`,
      premium: topNTotal,
      lossRatio: topNLossRatio,
      policyCount: topClients.reduce((sum, client) => sum + client.policyCount, 0),
      incurredClaims: topNClaims,
      acquisitionCosts: topClients.reduce((sum, client) => sum + client.acquisitionCosts, 0),
      technicalResult: topClients.reduce((sum, client) => sum + client.technicalResult, 0),
      combinedRatio: topClients.length > 0 ? topClients.reduce((sum, client) => sum + client.combinedRatio, 0) / topClients.length : 0,
      percentageOfTotal: grandTotal > 0 ? (topNTotal / grandTotal) * 100 : 0
    };

    // Add grand total row (all clients)
    const grandTotalRow: ClientData = {
      name: 'Grand Total',
      premium: grandTotal,
      lossRatio: grandTotalLossRatio,
      policyCount: clientMetrics.reduce((sum, client) => sum + client.policyCount, 0),
      incurredClaims: grandTotalClaims,
      acquisitionCosts: clientMetrics.reduce((sum, client) => sum + client.acquisitionCosts, 0),
      technicalResult: clientMetrics.reduce((sum, client) => sum + client.technicalResult, 0),
      combinedRatio: clientMetrics.length > 0 ? clientMetrics.reduce((sum, client) => sum + client.combinedRatio, 0) / clientMetrics.length : 0,
      percentageOfTotal: 100
    };

    console.log('Client Overview - Final results:', {
      clientsCount: clientsWithPercentages.length,
      totalsPremium: totalsRow.premium,
      grandTotalPremium: grandTotalRow.premium
    });

    return {
      clients: clientsWithPercentages,
      totals: totalsRow,
      grandTotal: grandTotalRow
    };
  }, [filteredData, clientType, maxClients, filters]);

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FilterState, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: filterType === 'year' ? values.map(v => Number(v)) : values
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      country: [],
      hub: [],
      region: [],
      cedant: [],
      broker: [],
      insured: [],
      year: []
    });
  };


  // Get color class for ratio metrics
  const getRatioColor = (value: number) => {
    if (value > 100) return 'text-red-600';
    if (value > 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Title */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-foreground">Client Overview</h1>
              <Badge variant="outline" className="text-xs">
                {filteredData.length.toLocaleString()} records
              </Badge>
              {Object.values(filters).flat().length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Object.values(filters).flat().length} filters active
                </Badge>
              )}
            </div>

            {/* Right side - Mode Toggle & Timestamp */}
            <div className="flex items-center space-x-4">
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              {/* Last Updated */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          {/* Desktop Filters */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            {/* Country Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.country.length > 0 ? filters.country[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('country', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {filterOptions.country.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hub Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.hub.length > 0 ? filters.hub[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('hub', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs</SelectItem>
                  {filterOptions.hub.map(hub => (
                    <SelectItem key={hub} value={hub}>
                      {hub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.region.length > 0 ? filters.region[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('region', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {filterOptions.region.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cedant Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.cedant.length > 0 ? filters.cedant[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('cedant', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Cedant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cedants</SelectItem>
                  {filterOptions.cedant.map(cedant => (
                    <SelectItem key={cedant} value={cedant}>
                      {cedant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Insured Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.insured.length > 0 ? filters.insured[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('insured', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Insured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Insured</SelectItem>
                  {filterOptions.insured.map(insured => (
                    <SelectItem key={insured} value={insured}>
                      {insured}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.year.length > 0 ? filters.year[0].toString() : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('year', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {filterOptions.year.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {Object.values(filters).some(arr => arr.length > 0) && (
                <Badge variant="secondary" className="text-xs">
                  {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)} active
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterDrawerOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Drawer */}
        {isFilterDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t bg-muted/50 p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Country Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Country</Label>
                <Select
                  value={filters.country.length > 0 ? filters.country[0] : ""}
                  onValueChange={(value) => handleFilterChange('country', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Countries</SelectItem>
                    {filterOptions.country.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hub Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hub</Label>
                <Select
                  value={filters.hub.length > 0 ? filters.hub[0] : ""}
                  onValueChange={(value) => handleFilterChange('hub', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Hubs</SelectItem>
                    {filterOptions.hub.map(hub => (
                      <SelectItem key={hub} value={hub}>
                        {hub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Region</Label>
                <Select
                  value={filters.region.length > 0 ? filters.region[0] : ""}
                  onValueChange={(value) => handleFilterChange('region', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Regions</SelectItem>
                    {filterOptions.region.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Broker Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Broker</Label>
                <Select
                  value={filters.broker.length > 0 ? filters.broker[0] : ""}
                  onValueChange={(value) => handleFilterChange('broker', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Brokers</SelectItem>
                    {filterOptions.broker.slice(0, 50).map(broker => (
                      <SelectItem key={broker} value={broker}>
                        {broker}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cedant Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cedant</Label>
                <Select
                  value={filters.cedant.length > 0 ? filters.cedant[0] : ""}
                  onValueChange={(value) => handleFilterChange('cedant', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cedant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cedants</SelectItem>
                    {filterOptions.cedant.slice(0, 50).map(cedant => (
                      <SelectItem key={cedant} value={cedant}>
                        {cedant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Year</Label>
                <Select
                  value={filters.year.length > 0 ? filters.year[0].toString() : ""}
                  onValueChange={(value) => handleFilterChange('year', value ? [value] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Years</SelectItem>
                    {filterOptions.year.map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {Object.values(filters).flat().length} active filters • {filteredData.length.toLocaleString()} records
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsFilterDrawerOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Client Overview Table</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select value={maxClients.toString()} onValueChange={(value) => setMaxClients(Number(value))}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline">
                  {clientData.clients?.length || 0} of {maxClients} clients
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              All monetary values shown in KWD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={clientType} onValueChange={(value) => setClientType(value as ClientType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="broker" className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Broker Overview</span>
                </TabsTrigger>
                <TabsTrigger value="cedant" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Cedant Overview</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="broker" className="mt-6">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : clientData.clients?.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <Building className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Broker Data Available</h3>
                    <p className="text-sm mb-4">No broker data matches your current filters</p>
                    <div className="text-xs text-muted-foreground">
                      <p>Total records: {rawData.length.toLocaleString()}</p>
                      <p>Filtered records: {filteredData.length.toLocaleString()}</p>
                      <p>Active filters: {Object.values(filters).flat().length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[250px] font-semibold">Broker List</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">Premium</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold">Loss Ratio %</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">% of Grand Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.clients?.map((client, index) => (
                          <TableRow key={client.name} className="hover:bg-muted/30 border-b">
                            <TableCell className="font-medium py-3">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                  {index + 1}
                                </span>
                                <span className="truncate">{client.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatKDNumeric(client.premium)}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRatioColor(client.lossRatio)}`}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatPct(client.percentageOfTotal || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {clientData.totals && (
                          <>
                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                              <TableCell className="font-medium text-primary">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKDNumeric(clientData.totals.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPct(clientData.grandTotal.premium > 0 ? (clientData.totals.premium / clientData.grandTotal.premium) * 100 : 0)}
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell className="font-medium text-primary">
                                Grand Total
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKDNumeric(clientData.grandTotal.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPct(clientData.grandTotal.premium > 0 ? (clientData.totals.premium / clientData.grandTotal.premium) * 100 : 0)}
                              </TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cedant" className="mt-6">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : clientData.clients?.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Cedant Data Available</h3>
                    <p className="text-sm mb-4">No cedant data matches your current filters</p>
                    <div className="text-xs text-muted-foreground">
                      <p>Total records: {rawData.length.toLocaleString()}</p>
                      <p>Filtered records: {filteredData.length.toLocaleString()}</p>
                      <p>Active filters: {Object.values(filters).flat().length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[250px] font-semibold">Cedant List</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">Premium</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold">Loss Ratio %</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">% of Grand Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.clients?.map((client, index) => (
                          <TableRow key={client.name} className="hover:bg-muted/30 border-b">
                            <TableCell className="font-medium py-3">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                  {index + 1}
                                </span>
                                <span className="truncate">{client.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatKDNumeric(client.premium)}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRatioColor(client.lossRatio)}`}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatPct(client.percentageOfTotal || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {clientData.totals && (
                          <>
                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                              <TableCell className="font-medium text-primary">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKDNumeric(clientData.totals.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPct(clientData.grandTotal.premium > 0 ? (clientData.totals.premium / clientData.grandTotal.premium) * 100 : 0)}
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell className="font-medium text-primary">
                                Grand Total
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKDNumeric(clientData.grandTotal.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPct(clientData.grandTotal.premium > 0 ? (clientData.totals.premium / clientData.grandTotal.premium) * 100 : 0)}
                              </TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
