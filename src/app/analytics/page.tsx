'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, BarChart3, TrendingUp, Info, X, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { ChatBot } from '@/components/chat/ChatBot';


export default function AnalyticsPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('uy');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('premium-desc'); // Default: highest premium first

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dataResponse = await fetch(`/api/data?limit=100000`);
        
        if (!dataResponse.ok) {
          throw new Error(`API request failed: ${dataResponse.status} ${dataResponse.statusText}`);
        }
        
        const dataResult = await dataResponse.json();
        
        if (!dataResult || !dataResult.data || !Array.isArray(dataResult.data)) {
          console.error('Invalid data structure received:', dataResult);
          throw new Error('Invalid data structure received from API');
        }
        
        console.log('Analytics - Loaded data:', dataResult.data.length, 'records');
        setData(dataResult.data);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);


  // Get unique values for the selected group-by field
  const groupByOptions = useMemo(() => {
    const fieldMap: Record<string, keyof ReinsuranceData> = {
      'uy': 'uy',
      'extType': 'extType',
      'broker': 'broker',
      'cedant': 'cedant',
      'orgInsuredTrtyName': 'orgInsuredTrtyName',
      'countryName': 'countryName',
      'region': 'region',
      'hub': 'hub',
    };

    const field = fieldMap[groupBy];
    if (!field) return [];

    return [...new Set(data.map(d => d[field] as string).filter(Boolean))].sort();
  }, [data, groupBy]);

  // Filter options based on search term
  const filteredGroupByOptions = useMemo(() => {
    if (!entitySearchTerm.trim()) return groupByOptions;
    
    return groupByOptions.filter(option => 
      option.toLowerCase().includes(entitySearchTerm.toLowerCase())
    );
  }, [groupByOptions, entitySearchTerm]);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const fieldMap: Record<string, keyof ReinsuranceData> = {
      'uy': 'uy',
      'extType': 'extType',
      'broker': 'broker',
      'cedant': 'cedant',
      'orgInsuredTrtyName': 'orgInsuredTrtyName',
      'countryName': 'countryName',
      'region': 'region',
      'hub': 'hub',
    };

    const field = fieldMap[groupBy];
    if (!field) return [];

    // Group data by selected field
    const grouped = data.reduce((acc, record) => {
      const key = record[field] as string;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {} as Record<string, ReinsuranceData[]>);

    // Calculate KPIs for each group
    const result = Object.entries(grouped).map(([groupValue, records]) => {
      const kpis = aggregateKPIs(records);
      return {
        groupBy: groupValue,
        value: kpis.premium,
        kpis,
      };
    }).sort((a, b) => b.value - a.value);

    return result;
  }, [data, groupBy]);

  // Filter and sort analytics data
  const filteredAndSortedAnalyticsData = useMemo(() => {
    // First filter by search term
    let filtered = analyticsData;
    if (tableSearchTerm.trim()) {
      filtered = analyticsData.filter(item => 
        item.groupBy.toLowerCase().includes(tableSearchTerm.toLowerCase())
      );
    }

    // Then sort based on selected option
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'premium-asc':
          return a.kpis.premium - b.kpis.premium;
        case 'premium-desc':
          return b.kpis.premium - a.kpis.premium;
        case 'lossRatio-asc':
          return a.kpis.lossRatio - b.kpis.lossRatio;
        case 'lossRatio-desc':
          return b.kpis.lossRatio - a.kpis.lossRatio;
        case 'combinedRatio-asc':
          return a.kpis.combinedRatio - b.kpis.combinedRatio;
        case 'combinedRatio-desc':
          return b.kpis.combinedRatio - a.kpis.combinedRatio;
        case 'accounts-asc':
          return a.kpis.numberOfAccounts - b.kpis.numberOfAccounts;
        case 'accounts-desc':
          return b.kpis.numberOfAccounts - a.kpis.numberOfAccounts;
        case 'name-asc':
          return a.groupBy.localeCompare(b.groupBy);
        case 'name-desc':
          return b.groupBy.localeCompare(a.groupBy);
        case 'oldest':
          // For UY, sort by year ascending (oldest first)
          if (groupBy === 'uy') {
            const yearA = parseInt(a.groupBy) || 0;
            const yearB = parseInt(b.groupBy) || 0;
            return yearA - yearB;
          }
          // For other fields, sort alphabetically ascending
          return a.groupBy.localeCompare(b.groupBy);
        case 'newest':
          // For UY, sort by year descending (newest first)
          if (groupBy === 'uy') {
            const yearA = parseInt(a.groupBy) || 0;
            const yearB = parseInt(b.groupBy) || 0;
            return yearB - yearA;
          }
          // For other fields, sort alphabetically descending
          return b.groupBy.localeCompare(a.groupBy);
        default:
          return 0;
      }
    });

    return sorted;
  }, [analyticsData, tableSearchTerm, sortBy, groupBy]);

  // Get data for comparison
  const comparisonData = useMemo(() => {
    if (!compareMode || selectedEntities.length === 0) return [];

    return selectedEntities.map(entity => {
      const entityData = data.filter(d => {
        const fieldMap: Record<string, keyof ReinsuranceData> = {
          'uy': 'uy',
          'extType': 'extType',
          'broker': 'broker',
          'cedant': 'cedant',
          'orgInsuredTrtyName': 'orgInsuredTrtyName',
          'countryName': 'countryName',
          'region': 'region',
          'hub': 'hub',
        };
        const field = fieldMap[groupBy];
        return field ? d[field] === entity : false;
      });

      return {
        entity,
        kpis: aggregateKPIs(entityData),
      };
    });
  }, [data, groupBy, compareMode, selectedEntities]);

  const handleEntityToggle = (entity: string) => {
    if (selectedEntities.includes(entity)) {
      setSelectedEntities(selectedEntities.filter(e => e !== entity));
    } else if (selectedEntities.length < 3) {
      setSelectedEntities([...selectedEntities, entity]);
    }
  };

  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
    setSelectedEntities([]);
    setEntitySearchTerm('');
  };


  const exportToCSV = () => {
    const csvContent = [
      ['Group By', 'Premium', 'Paid Claims', 'Outstanding Claims', 'Incurred Claims', 'Expense', 'Loss Ratio %', 'Expense Ratio %', 'Combined Ratio %', 'Accounts', 'Avg Max Liability'],
      ...analyticsData.map(row => [
        row.groupBy,
        row.kpis.premium.toString(),
        row.kpis.paidClaims.toString(),
        row.kpis.outstandingClaims.toString(),
        row.kpis.incurredClaims.toString(),
        row.kpis.expense.toString(),
        row.kpis.lossRatio.toString(),
        row.kpis.expenseRatio.toString(),
        row.kpis.combinedRatio.toString(),
        row.kpis.numberOfAccounts.toString(),
        row.kpis.avgMaxLiability.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const groupByLabels: Record<string, { label: string; description: string }> = {
    'uy': { label: 'Underwriting Year', description: 'Group data by the year the policy was underwritten' },
    'extType': { label: 'Extension Type', description: 'Group data by the type of policy extension' },
    'broker': { label: 'Broker', description: 'Group data by insurance broker' },
    'cedant': { label: 'Cedant', description: 'Group data by the cedant (company ceding the risk)' },
    'orgInsuredTrtyName': { label: 'Organization/Insured/Treaty', description: 'Group data by the organization, insured party, or treaty name' },
    'countryName': { label: 'Country', description: 'Group data by country' },
    'region': { label: 'Region', description: 'Group data by geographical region' },
    'hub': { label: 'Hub', description: 'Group data by business hub' },
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Analytics Explorer
                </h1>
                <p className="text-muted-foreground">
                  Deep dive into your reinsurance data with flexible grouping and comparison tools
                </p>
              </div>
            </div>
          </motion.div>

          {/* Analysis Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Analysis Controls
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Use these controls to group and analyze your data. Select a grouping dimension and optionally compare up to 3 entities side-by-side.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Group by:</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={groupBy} onValueChange={handleGroupByChange}>
                            <SelectTrigger className="w-56">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(groupByLabels).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{groupByLabels[groupBy]?.description || 'Select how to group the data'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={compareMode ? "default" : "outline"}
                        onClick={() => setCompareMode(!compareMode)}
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Compare Mode
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enable comparison mode to analyze up to 3 entities side-by-side. This helps identify differences in performance metrics.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={exportToCSV}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download the current analytics data as a CSV file for further analysis in Excel or other tools.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {compareMode && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Select up to 3 entities to compare:
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select entities from the list below to compare their key performance indicators side-by-side.</p>
                          </TooltipContent>
                        </Tooltip>
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={`Search ${groupByLabels[groupBy]?.label || groupBy}...`}
                          value={entitySearchTerm}
                          onChange={(e) => setEntitySearchTerm(e.target.value)}
                          className="max-w-sm"
                        />
                        {entitySearchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEntitySearchTerm('')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Showing {filteredGroupByOptions.length} of {groupByOptions.length} options
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {filteredGroupByOptions.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2 w-full text-center">
                            {entitySearchTerm ? `No options found for "${entitySearchTerm}"` : 'No options available'}
                          </div>
                        ) : (
                          filteredGroupByOptions.map(option => (
                            <Tooltip key={option}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={selectedEntities.includes(option) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleEntityToggle(option)}
                                  disabled={!selectedEntities.includes(option) && selectedEntities.length >= 3}
                                  className="relative"
                                >
                                  {option}
                                  {selectedEntities.includes(option) && (
                                    <span className="ml-1">✓</span>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {selectedEntities.includes(option) 
                                    ? 'Click to remove from comparison' 
                                    : selectedEntities.length >= 3 
                                    ? 'Maximum 3 entities can be compared at once' 
                                    : 'Click to add to comparison'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Tabs defaultValue="table" className="space-y-4">
              <TabsList>
                <TabsTrigger value="table">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Aggregated Table
                </TabsTrigger>
                {compareMode && (
                  <TabsTrigger value="compare">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Comparison
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="table">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          Aggregated Data by {groupByLabels[groupBy]?.label || groupBy}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>This table shows aggregated key performance indicators grouped by {groupByLabels[groupBy]?.label.toLowerCase() || groupBy}. Each row represents one group with calculated totals and ratios.</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder={`Search ${groupByLabels[groupBy]?.label || groupBy}...`}
                            value={tableSearchTerm}
                            onChange={(e) => setTableSearchTerm(e.target.value)}
                            className="max-w-sm"
                          />
                          {tableSearchTerm && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTableSearchTerm('')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground/80">
                        All monetary values shown in KWD.
                      </CardDescription>
                      
                      {/* Sort Controls */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Sort by:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="premium-desc">
                                    <div className="flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3" />
                                      Premium (High to Low)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="premium-asc">
                                    <div className="flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3" />
                                      Premium (Low to High)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="lossRatio-desc">
                                    <div className="flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3" />
                                      Loss Ratio (High to Low)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="lossRatio-asc">
                                    <div className="flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3" />
                                      Loss Ratio (Low to High)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="combinedRatio-desc">
                                    <div className="flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3" />
                                      Combined Ratio (High to Low)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="combinedRatio-asc">
                                    <div className="flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3" />
                                      Combined Ratio (Low to High)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="accounts-desc">
                                    <div className="flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3" />
                                      Accounts (High to Low)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="accounts-asc">
                                    <div className="flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3" />
                                      Accounts (Low to High)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="name-asc">
                                    <div className="flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3" />
                                      Name (A to Z)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="name-desc">
                                    <div className="flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3" />
                                      Name (Z to A)
                                    </div>
                                  </SelectItem>
                                  {groupBy === 'uy' && (
                                    <>
                                      <SelectItem value="oldest">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3" />
                                          Oldest Year First
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="newest">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3" />
                                          Newest Year First
                                        </div>
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Choose how to sort the table data. Options include sorting by premium, ratios, accounts, name, or date (for years).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-xs text-muted-foreground ml-auto">
                          Showing {filteredAndSortedAnalyticsData.length} of {analyticsData.length} {analyticsData.length === 1 ? 'result' : 'results'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredAndSortedAnalyticsData.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <p>{tableSearchTerm ? 'No results found for your search' : 'No data available for the selected grouping'}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  Group
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>The {groupByLabels[groupBy]?.label.toLowerCase() || 'grouping'} value for this row</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Premium
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total premium amount for this group</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Paid Claims
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total claims that have been paid out</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Outstanding Claims
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Claims that are reported but not yet paid</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Incurred Claims
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total of paid claims plus outstanding claims</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Expense
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total acquisition and operational expenses</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Loss Ratio
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Incurred claims divided by premium. Green: &lt;80%, Yellow: 80-100%, Red: &gt;100%</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Expense Ratio
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Expenses divided by premium. Green: &lt;20%, Yellow: 20-30%, Red: &gt;30%</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Combined Ratio
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Loss ratio plus expense ratio. Green: &lt;90%, Yellow: 90-100%, Red: &gt;100%</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Accounts
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Number of accounts/policies in this group</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  Avg Max Liability
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Average maximum liability across all accounts in this group</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAndSortedAnalyticsData.map((row, index) => (
                              <motion.tr
                                key={row.groupBy}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="w-12 text-center font-medium text-muted-foreground">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {row.groupBy}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.premium)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.paidClaims)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.outstandingClaims)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.incurredClaims)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.expense)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`${
                                    row.kpis.lossRatio > 100 ? 'text-red-600' : 
                                    row.kpis.lossRatio > 80 ? 'text-yellow-600' : 
                                    'text-green-600'
                                  }`}>
                                    {formatPct(row.kpis.lossRatio)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`${
                                    row.kpis.expenseRatio > 30 ? 'text-red-600' : 
                                    row.kpis.expenseRatio > 20 ? 'text-yellow-600' : 
                                    'text-green-600'
                                  }`}>
                                    {formatPct(row.kpis.expenseRatio)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`${
                                    row.kpis.combinedRatio > 100 ? 'text-red-600' : 
                                    row.kpis.combinedRatio > 90 ? 'text-yellow-600' : 
                                    'text-green-600'
                                  }`}>
                                    {formatPct(row.kpis.combinedRatio)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(row.kpis.numberOfAccounts)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatKDNumeric(row.kpis.avgMaxLiability)}
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {compareMode && (
                <TabsContent value="compare">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Entity Comparison
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Compare key performance indicators for up to 3 selected entities side-by-side to identify performance differences.</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comparisonData.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                          <p>Select entities above to compare</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {comparisonData.map((entity, index) => (
                            <motion.div
                              key={entity.entity}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">{entity.entity}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Premium:</span>
                                    <span className="font-medium">{formatKD(entity.kpis.premium)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Loss Ratio:</span>
                                    <span className={`font-medium ${
                                      entity.kpis.lossRatio > 100 ? 'text-red-600' : 
                                      entity.kpis.lossRatio > 80 ? 'text-yellow-600' : 
                                      'text-green-600'
                                    }`}>
                                      {formatPct(entity.kpis.lossRatio)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Combined Ratio:</span>
                                    <span className={`font-medium ${
                                      entity.kpis.combinedRatio > 100 ? 'text-red-600' : 
                                      entity.kpis.combinedRatio > 90 ? 'text-yellow-600' : 
                                      'text-green-600'
                                    }`}>
                                      {formatPct(entity.kpis.combinedRatio)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Accounts:</span>
                                    <span className="font-medium">{formatNumber(entity.kpis.numberOfAccounts)}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loading Analytics Data
                </h3>
                <p className="text-muted-foreground mb-4">
                  Processing your reinsurance data for analytics...
                </p>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && data.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Data Available
                </h3>
                <p className="text-muted-foreground mb-4">
                  Use the filters to select data, or check if data is loaded.
                </p>
              </div>
            </motion.div>
          )}

          {/* ChatBot */}
          <ChatBot />
        </div>
      </div>
    </TooltipProvider>
  );
}
