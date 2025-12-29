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
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ReinsuranceData } from '@/lib/schema';
import { ChatBot } from '@/components/chat/ChatBot';
import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';
import { VisualizationFilterDialog } from '@/components/filters/VisualizationFilterDialog';
import { FilterButton } from '@/components/filters/FilterDialog';
import { logger } from '@/lib/utils/logger';type ClientType = 'broker' | 'cedant';

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
  extType: string | null;
  className: string | null;
  subClass: string | null;
  
  // Key fields (lowercased for filtering)
  kCountry: string;
  kRegion: string;
  kHub: string;
  kBroker: string | null;
  kCedant: string | null;
  kInsured: string | null;
  kExtType: string | null;
  kClass: string | null;
  kSubClass: string | null;
  
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
  extType: string[];
  class: string[];
  subClass: string[];
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
  byExtType: Map<string, number[]>;
  byClass: Map<string, number[]>;
  bySubClass: Map<string, number[]>;
}

export default function ClientOverviewPage() {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const { isAdmin } = useUserRoles();
  const [rawData, setRawData] = useState<ReinsuranceData[]>([]);
  const [normalizedRows, setNormalizedRows] = useState<NormalizedRow[]>([]);
  const [indexes, setIndexes] = useState<FilterIndexes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientType, setClientType] = useState<ClientType>('broker');
  const [maxClients, setMaxClients] = useState<number>(5);
  const [universalFilters, setUniversalFilters] = useState<UniversalFilterState>({
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
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    hub: [],
    region: [],
    cedant: [],
    broker: [],
    insured: [],
    year: [],
    extType: [],
    class: [],
    subClass: []
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Normalization function according to spec
  const normalizeData = (records: ReinsuranceData[]): NormalizedRow[] => {
    return records.map(record => {
      // Normalize function: norm(v) = (v ?? '').trim()
      const norm = (v: string | undefined | null): string => (v ?? '').trim();
      
      // Key function: key(v) = norm(v).toLowerCase()
      const key = (v: string | undefined | null): string => norm(v).toLowerCase();
      
      // Year extraction: try UY first, then inceptionYear, with proper parsing
      let year: number | undefined = undefined;
      
      // Try to extract year from UY (Underwriting Year)
      if (record.uy) {
        // First try direct parsing if UY is a number string
        const uyYear = parseInt(record.uy);
        if (!isNaN(uyYear) && uyYear >= 1900 && uyYear <= 2100) {
          year = uyYear;
        } else {
          // Try to extract year from UY string using regex (e.g., "UY 2020", "2020-2021")
          const yearMatch = record.uy.match(/\b(19|20)\d{2}\b/);
          if (yearMatch) {
            const extractedYear = parseInt(yearMatch[0], 10);
            if (extractedYear >= 1900 && extractedYear <= 2100) {
              year = extractedYear;
            }
          }
        }
      }
      
      // Fallback to inceptionYear if UY extraction failed
      if (!year && record.inceptionYear) {
        if (record.inceptionYear >= 1900 && record.inceptionYear <= 2100) {
          year = record.inceptionYear;
        }
      }
      
      // Broker/cedant/insured: if empty → null
      const broker = record.broker && record.broker.trim() !== '' ? record.broker : null;
      const cedant = record.cedant && record.cedant.trim() !== '' ? record.cedant : null;
      const insured = record.orgInsuredTrtyName && record.orgInsuredTrtyName.trim() !== '' ? record.orgInsuredTrtyName : null;
      const extType = record.extType && record.extType.trim() !== '' ? record.extType : null;
      const className = record.className && record.className.trim() !== '' ? record.className : null;
      const subClass = record.subClass && record.subClass.trim() !== '' ? record.subClass : null;
      
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
        extType,
        className,
        subClass,
        
        // Key fields (lowercased for filtering)
        kCountry: key(record.countryName),
        kRegion: key(record.region),
        kHub: key(record.hub),
        kBroker: broker ? key(broker) : null,
        kCedant: cedant ? key(cedant) : null,
        kInsured: insured ? key(insured) : null,
        kExtType: extType ? key(extType) : null,
        kClass: className ? key(className) : null,
        kSubClass: subClass ? key(subClass) : null,
        
        // Numeric fields (guarded) - use KD fields, fallback to deprecated fields for backward compatibility
        grossUWPrem: safeNum(record.grsPremKD ?? record.grossUWPrem),
        grossActualAcq: safeNum(record.acqCostKD ?? record.grossActualAcq),
        grossPaidClaims: safeNum(record.paidClaimsKD ?? record.grossPaidClaims),
        grossOsLoss: safeNum(record.osClaimKD ?? record.grossOsLoss)
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
    const byExtType = new Map<string, number[]>();
    const byClass = new Map<string, number[]>();
    const bySubClass = new Map<string, number[]>();
    
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
      
      // ExtType index
      if (row.kExtType) {
        if (!byExtType.has(row.kExtType)) byExtType.set(row.kExtType, []);
        byExtType.get(row.kExtType)!.push(index);
      }
      
      // Class index
      if (row.kClass) {
        if (!byClass.has(row.kClass)) byClass.set(row.kClass, []);
        byClass.get(row.kClass)!.push(index);
      }
      
      // SubClass index
      if (row.kSubClass) {
        if (!bySubClass.has(row.kSubClass)) bySubClass.set(row.kSubClass, []);
        bySubClass.get(row.kSubClass)!.push(index);
      }
    });
    
    return { byCountry, byRegion, byHub, byBroker, byCedant, byInsured, byYear, byExtType, byClass, bySubClass };
  };

  // Load data from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data?limit=100000');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setRawData(result.data);
        
        // Normalize data according to spec
        const normalized = normalizeData(result.data);
        setNormalizedRows(normalized);
        
        // Build indexes for fast filtering
        const newIndexes = buildIndexes(normalized);
        setIndexes(newIndexes);
        
        setLastUpdated(new Date());
      } else {
        setRawData([]);
        setNormalizedRows([]);
        setIndexes(null);
      }
    } catch (error) {
      logger.error('Client Overview - Error loading data', error);
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
      return [];
    }

    // Start with pool = ALL indices
    let pool = new Set<number>(normalizedRows.map((_, index) => index));
    
    // For each facet with selections: UNION within facet, INTERSECT across facets
    Object.entries(filters).forEach(([facet, selections]) => {
      if (selections.length === 0) return; // Skip empty filters
      
      const facetIndices = new Set<number>();
      
      // UNION within facet (all selections for this facet)
      selections.forEach((selection: string | number) => {
        let indices: number[] = [];
        
        switch (facet) {
          case 'country':
            indices = indexes.byCountry.get(String(selection).toLowerCase()) || [];
            break;
          case 'region':
            indices = indexes.byRegion.get(String(selection).toLowerCase()) || [];
            break;
          case 'hub':
            indices = indexes.byHub.get(String(selection).toLowerCase()) || [];
            break;
          case 'broker':
            indices = indexes.byBroker.get(String(selection).toLowerCase()) || [];
            break;
          case 'cedant':
            indices = indexes.byCedant.get(String(selection).toLowerCase()) || [];
            break;
          case 'insured':
            indices = indexes.byInsured.get(String(selection).toLowerCase()) || [];
            break;
          case 'year':
            const yearNum = typeof selection === 'number' ? selection : Number(selection);
            if (!isNaN(yearNum)) {
              indices = indexes.byYear.get(yearNum) || [];
            }
            break;
          case 'extType':
            indices = indexes.byExtType.get(String(selection).toLowerCase()) || [];
            break;
          case 'class':
            indices = indexes.byClass.get(String(selection).toLowerCase()) || [];
            break;
          case 'subClass':
            indices = indexes.bySubClass.get(String(selection).toLowerCase()) || [];
            break;
        }
        
        indices.forEach(index => facetIndices.add(index));
      });
      
      // INTERSECT with pool
      pool = new Set([...pool].filter(index => facetIndices.has(index)));
    });
    
    const filteredRows = Array.from(pool).map(index => normalizedRows[index]);
    
    return filteredRows;
  }, [normalizedRows, indexes, filters]);

  // Dependent filter options (computed from all normalized rows for initial load, then from filtered data)
  const filterOptions = useMemo(() => {
    if (normalizedRows.length === 0) {
      return {
        country: [],
        hub: [],
        region: [],
        cedant: [],
        broker: [],
        insured: [],
        year: [],
        extType: [],
        class: [],
        subClass: []
      };
    }

    // Use filtered data to show only relevant options (cascading filters)
    const sourceData = filteredData.length > 0 ? filteredData : normalizedRows;

    // Extract unique values from source data
    const countries = [...new Set(sourceData.map(d => d.countryName).filter(name => name && name.trim() !== ''))].sort();
    const hubs = [...new Set(sourceData.map(d => d.hub).filter(hub => hub && hub.trim() !== ''))].sort();
    const regions = [...new Set(sourceData.map(d => d.region).filter(region => region && region.trim() !== ''))].sort();
    const cedants = [...new Set(sourceData.map(d => d.cedant).filter(cedant => cedant && cedant !== null))].sort();
    const brokers = [...new Set(sourceData.map(d => d.broker).filter(broker => broker && broker !== null))].sort();
    const insured = [...new Set(sourceData.map(d => d.insured).filter(insured => insured && insured !== null))].sort();
    const years = [...new Set(sourceData.map(d => d.year).filter(year => year !== undefined && year !== null))].sort((a, b) => (a ?? 0) - (b ?? 0));
    const extTypes = [...new Set(sourceData.map(d => d.extType).filter(extType => extType && extType !== null))].sort();
    
    // For class and subclass, use filtered data to show cascading options
    const classes = [...new Set(sourceData.map(d => d.className).filter(className => className && className !== null))].sort();
    
    // Subclass options should only show subclasses for selected classes (or all if no class selected)
    const selectedClasses = filters.class.length > 0 ? filters.class : classes;
    const subClasses = [...new Set(
      sourceData
        .filter(d => selectedClasses.length === 0 || (d.className && selectedClasses.includes(d.className.toLowerCase())))
        .map(d => d.subClass)
        .filter(subClass => subClass && subClass !== null)
    )].sort();

    return {
      country: countries,
      hub: hubs,
      region: regions,
      cedant: cedants.filter((c): c is string => c !== null),
      broker: brokers.filter((b): b is string => b !== null),
      insured: insured.filter((i): i is string => i !== null),
      year: years.map(y => y!.toString()),
      extType: extTypes.filter((e): e is string => e !== null),
      class: classes.filter((c): c is string => c !== null),
      subClass: subClasses.filter((s): s is string => s !== null)
    };
  }, [normalizedRows, filteredData, filters.class]);

  // Calculate client overview data according to spec
  const clientData = useMemo(() => {
    if (filteredData.length === 0) {
      return { clients: [], totals: null, grandTotal: null };
    }

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

    return {
      clients: clientsWithPercentages,
      totals: totalsRow,
      grandTotal: grandTotalRow
    };
  }, [filteredData, clientType, maxClients, filters]);

  // Sync universal filters to internal filter state
  useEffect(() => {
    setFilters({
      country: Array.isArray(universalFilters.country) ? universalFilters.country : (universalFilters.country ? [universalFilters.country] : []),
      hub: universalFilters.hub ? [universalFilters.hub] : [],
      region: universalFilters.region ? [universalFilters.region] : [],
      cedant: universalFilters.cedant ? [universalFilters.cedant] : [],
      broker: universalFilters.broker ? [universalFilters.broker] : [],
      insured: universalFilters.policyName ? [universalFilters.policyName] : [],
      year: universalFilters.year ? [parseInt(universalFilters.year)] : [],
      extType: Array.isArray(universalFilters.extType) ? universalFilters.extType : (universalFilters.extType ? [universalFilters.extType] : []),
      class: Array.isArray(universalFilters.class) ? universalFilters.class : (universalFilters.class ? [universalFilters.class] : []),
      subClass: Array.isArray(universalFilters.subClass) ? universalFilters.subClass : (universalFilters.subClass ? [universalFilters.subClass] : [])
    });
  }, [universalFilters]);

  // Clear all filters
  const clearFilters = () => {
    setUniversalFilters({
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

  // Active filter count - must be called before any conditional returns
  const activeFilterCount = useMemo(() => {
    return Object.entries(universalFilters)
      .filter(([_, value]) => {
        if (value === null || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
      })
      .length;
  }, [universalFilters]);


  // Get color class for ratio metrics
  const getRatioColor = (value: number) => {
    if (value > 100) return 'text-red-600';
    if (value > 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
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

            {/* Right side - Filter Button, Mode Toggle & Timestamp */}
            <div className="flex items-center space-x-4">
              <FilterButton
                onClick={() => setIsFilterDialogOpen(true)}
                activeFilterCount={activeFilterCount}
              />
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
                {isAdmin && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              <CurrencyLabel />
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
                          <TableHead className="text-right w-[120px] font-semibold">Number of Accounts</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">Grand Total Premium</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold">Loss Ratio %</TableHead>
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
                              {formatNumber(client.policyCount || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatCurrencyNumeric(client.premium)}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRatioColor(client.lossRatio)}`}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {clientData.totals && (
                          <>
                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                              <TableCell className="font-medium text-primary">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(clientData.totals.policyCount || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrencyNumeric(clientData.totals.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.totals.lossRatio)}>
                                  {formatPct(clientData.totals.lossRatio)}
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell className="font-medium text-primary">
                                Grand Total
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(clientData.grandTotal.policyCount || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrencyNumeric(clientData.grandTotal.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
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
                          <TableHead className="text-right w-[120px] font-semibold">Number of Accounts</TableHead>
                          <TableHead className="text-right w-[140px] font-semibold">Grand Total Premium</TableHead>
                          <TableHead className="text-right w-[120px] font-semibold">Loss Ratio %</TableHead>
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
                              {formatNumber(client.policyCount || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm py-3">
                              {formatCurrencyNumeric(client.premium)}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRatioColor(client.lossRatio)}`}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {clientData.totals && (
                          <>
                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                              <TableCell className="font-medium text-primary">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(clientData.totals.policyCount || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrencyNumeric(clientData.totals.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.totals.lossRatio)}>
                                  {formatPct(clientData.totals.lossRatio)}
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell className="font-medium text-primary">
                                Grand Total
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(clientData.grandTotal.policyCount || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrencyNumeric(clientData.grandTotal.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={getRatioColor(clientData.grandTotal.lossRatio)}>
                                  {formatPct(clientData.grandTotal.lossRatio)}
                                </span>
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

      {/* Filter Dialog */}
      <VisualizationFilterDialog
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        data={rawData}
        filters={universalFilters}
        onFiltersChange={setUniversalFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
