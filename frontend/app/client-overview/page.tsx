'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  Clock,
  TrendingUp,
  BarChart3,
  Users,
  Building
} from 'lucide-react';
import { formatKD, formatPct } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { filterRecords } from '@/lib/kpi';
// CSV data loading logic removed - new implementation will be added
import { ChatBot } from '@/components/chat/ChatBot';

type AggregationMode = 'year' | 'quarter' | 'month' | 'client';
type ClientType = 'broker' | 'cedant';

interface FilterState {
  country: string[];
  hub: string[];
  region: string[];
  cedant: string[];
  insured: string[];
  year: string[];
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
}

export default function ClientOverviewPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregationMode, setAggregationMode] = useState<AggregationMode>('client');
  const [clientType, setClientType] = useState<ClientType>('broker');
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    hub: [],
    region: [],
    cedant: [],
    insured: [],
    year: []
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Initialize with empty state - new CSV logic will be implemented
  useEffect(() => {
    // Placeholder for new CSV implementation
    setData([]);
    setIsLoading(false);
    setLastUpdated(new Date());
  }, []);

  // Apply filters
  const filteredData = useMemo(() => {
    const filterMap: Record<string, string[]> = {};
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        filterMap[key] = values;
      }
    });
    return filterRecords(data, filterMap);
  }, [data, filters]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    return {
      country: [...new Set(data.map(d => d.countryName))].sort(),
      hub: [...new Set(data.map(d => d.hub))].sort(),
      region: [...new Set(data.map(d => d.region))].sort(),
      cedant: [...new Set(data.map(d => d.cedant))].sort(),
      insured: [...new Set(data.map(d => d.orgInsuredTrtyName))].sort(),
      year: ['2019', '2020', '2021']
    };
  }, [data]);

  // Calculate client overview data
  const clientData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Group data by client (broker or cedant)
    const clientGroups: Record<string, ReinsuranceData[]> = {};
    
    filteredData.forEach(record => {
      const clientName = clientType === 'broker' ? record.broker : record.cedant;
      if (clientName) {
        if (!clientGroups[clientName]) {
          clientGroups[clientName] = [];
        }
        clientGroups[clientName].push(record);
      }
    });

    // Calculate metrics for each client
    const calculateClientMetrics = (clientRecords: ReinsuranceData[]): ClientData => {
      const totalPremium = clientRecords.reduce((sum, d) => sum + d.grossUWPrem, 0);
      const totalAcquisition = clientRecords.reduce((sum, d) => sum + d.grossActualAcq, 0);
      const totalClaims = clientRecords.reduce((sum, d) => sum + (d.grossPaidClaims + d.grossOsLoss), 0);
      const policyCount = clientRecords.length;
      const lossRatio = totalPremium > 0 ? (totalClaims / totalPremium) * 100 : 0;
      const acquisitionCostsPct = totalPremium > 0 ? (totalAcquisition / totalPremium) * 100 : 0;
      const technicalResult = totalPremium - totalClaims - totalAcquisition;
      const combinedRatio = lossRatio + acquisitionCostsPct;

      return {
        name: clientRecords[0]?.broker || clientRecords[0]?.cedant || '',
        premium: totalPremium,
        lossRatio,
        policyCount,
        incurredClaims: totalClaims,
        acquisitionCosts: totalAcquisition,
        technicalResult,
        combinedRatio
      };
    };

    // Process all clients and sort by premium (descending)
    const clients = Object.keys(clientGroups).sort();
    const clientMetrics = clients.map(client => calculateClientMetrics(clientGroups[client]));
    
    // Sort by premium descending and take top 5
    const topClients = clientMetrics
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 5);

    // Calculate totals for top 5 clients only
    const top5Total = topClients.reduce((sum, client) => sum + client.premium, 0);
    const top5Claims = topClients.reduce((sum, client) => sum + client.incurredClaims, 0);
    const top5LossRatio = top5Total > 0 ? (top5Claims / top5Total) * 100 : 0;

    // Calculate grand total (all clients)
    const grandTotal = clientMetrics.reduce((sum, client) => sum + client.premium, 0);
    const grandTotalClaims = clientMetrics.reduce((sum, client) => sum + client.incurredClaims, 0);
    const grandTotalLossRatio = grandTotal > 0 ? (grandTotalClaims / grandTotal) * 100 : 0;

    // Add totals row (sum of top 5 only)
    const totalsRow: ClientData = {
      name: 'TOTAL',
      premium: top5Total,
      lossRatio: top5LossRatio,
      policyCount: topClients.reduce((sum, client) => sum + client.policyCount, 0),
      incurredClaims: top5Claims,
      acquisitionCosts: topClients.reduce((sum, client) => sum + client.acquisitionCosts, 0),
      technicalResult: topClients.reduce((sum, client) => sum + client.technicalResult, 0),
      combinedRatio: topClients.reduce((sum, client) => sum + client.combinedRatio, 0) / topClients.length
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
      combinedRatio: clientMetrics.reduce((sum, client) => sum + client.combinedRatio, 0) / clientMetrics.length
    };

    // Add percentage of grand total for each client
    const clientsWithPercentages = topClients.map(client => ({
      ...client,
      percentageOfTotal: grandTotal > 0 ? (client.premium / grandTotal) * 100 : 0
    }));

    return {
      clients: clientsWithPercentages,
      totals: totalsRow,
      grandTotal: grandTotalRow
    };
  }, [filteredData, clientType]);

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FilterState, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      country: [],
      hub: [],
      region: [],
      cedant: [],
      insured: [],
      year: []
    });
  };

  // Get aggregation label
  const getAggregationLabel = (mode: AggregationMode) => {
    switch (mode) {
      case 'year': return 'Year';
      case 'quarter': return 'Quarter';
      case 'month': return 'Month';
      case 'client': return 'Client';
      default: return 'Client';
    }
  };

  // Get aggregation icon
  const getAggregationIcon = (mode: AggregationMode) => {
    switch (mode) {
      case 'year': return <Calendar className="w-4 h-4" />;
      case 'quarter': return <BarChart3 className="w-4 h-4" />;
      case 'month': return <TrendingUp className="w-4 h-4" />;
      case 'client': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
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
            </div>

            {/* Right side - Mode Toggle & Timestamp */}
            <div className="flex items-center space-x-4">
              {/* Last Updated */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}</span>
              </div>

              {/* Aggregation Mode Toggle */}
              <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                {(['year', 'quarter', 'month', 'client'] as AggregationMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={aggregationMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center space-x-1"
                    onClick={() => {
                      if (mode === 'year') {
                        window.location.href = '/yearly-overview';
                      } else if (mode === 'quarter') {
                        window.location.href = '/quarterly-overview';
                      } else if (mode === 'month') {
                        window.location.href = '/monthly-overview';
                      } else {
                        setAggregationMode(mode);
                      }
                    }}
                  >
                    {getAggregationIcon(mode)}
                    <span className="hidden sm:inline">{getAggregationLabel(mode)}</span>
                  </Button>
                ))}
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
                value={filters.year.length > 0 ? filters.year[0] : 'all'}
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

        {/* Mobile Filter Drawer */}
        {isFilterDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t bg-muted/50 p-4 space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Mobile filter implementation would go here
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
                <Badge variant="outline">
                  {clientData.clients?.length || 0} clients
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
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
                    <p className="text-sm">No broker data matches your current filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Broker List</TableHead>
                          <TableHead className="text-right w-[120px]">Premium</TableHead>
                          <TableHead className="text-right w-[100px]">LR %</TableHead>
                          <TableHead className="text-right w-[120px]">% of Grand Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.clients?.map((client) => (
                          <TableRow key={client.name} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {client.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatKD(client.premium)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={getRatioColor(client.lossRatio)}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
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
                                {formatKD(clientData.totals.premium)}
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
                                {formatKD(clientData.grandTotal.premium)}
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
                    <p className="text-sm">No cedant data matches your current filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Cedant List</TableHead>
                          <TableHead className="text-right w-[120px]">Premium</TableHead>
                          <TableHead className="text-right w-[100px]">LR %</TableHead>
                          <TableHead className="text-right w-[120px]">% of Grand Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.clients?.map((client) => (
                          <TableRow key={client.name} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {client.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatKD(client.premium)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={getRatioColor(client.lossRatio)}>
                                {formatPct(client.lossRatio)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
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
                                {formatKD(clientData.totals.premium)}
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
                                {formatKD(clientData.grandTotal.premium)}
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
