'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, BarChart3, TrendingUp, Info, X, Plus, Trash2, Filter, GitCompare } from 'lucide-react';
import { formatPct, formatNumber } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { ChatBot } from '@/components/chat/ChatBot';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';
import { TopFilterPanel } from '@/components/filters/TopFilterPanel';
import { useReinsuranceData } from '@/hooks/useReinsuranceData';
import { DEFAULT_FILTER_STATE } from '@/lib/constants/filters';

interface ComparisonEntity {
  id: string;
  groupBy: string;
  entityValue: string;
  label: string;
}

export default function AnalyticsPage() {
  const { isAdmin } = useUserRoles();
  const { formatCurrency, formatCurrencyNumeric } = useFormatCurrency();

  // Global Filters using UniversalFilterState
  const [filters, setFilters] = useState<UniversalFilterState>(DEFAULT_FILTER_STATE);

  // Comparison entities (max 8)
  const [comparisonEntities, setComparisonEntities] = useState<ComparisonEntity[]>([]);
  const [groupBy, setGroupBy] = useState<string>('uy');
  const [entitySearchTerm, setEntitySearchTerm] = useState('');

  // Load data using shared hook
  const { data, isLoading } = useReinsuranceData({
    limit: 100000,
    autoFetch: true,
  });

  // Clear filters function
  const clearFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
  };

  // Apply global filters to data
  const filteredData = useMemo(() => {
    let filtered = data;

    if (filters.office) {
      filtered = filtered.filter(record => record.office === filters.office);
    }

    if (filters.extType && filters.extType.length > 0) {
      filtered = filtered.filter(record => record.extType && filters.extType!.includes(record.extType));
    }

    if (filters.policyNature && filters.policyNature.length > 0) {
      filtered = filtered.filter(record => record.arrangement && filters.policyNature!.includes(record.arrangement));
    }

    if (filters.class && filters.class.length > 0) {
      filtered = filtered.filter(record => record.className && filters.class!.includes(record.className));
    }

    if (filters.subClass && filters.subClass.length > 0) {
      filtered = filtered.filter(record => record.subClass && filters.subClass!.includes(record.subClass));
    }

    if (filters.hub) {
      filtered = filtered.filter(record => record.hub === filters.hub);
    }

    if (filters.region) {
      filtered = filtered.filter(record => record.region === filters.region);
    }

    if (filters.country && filters.country.length > 0) {
      filtered = filtered.filter(record => record.countryName && filters.country!.includes(record.countryName));
    }

    if (filters.year) {
      const yearNum = parseInt(filters.year, 10);
      filtered = filtered.filter(record => {
        const recordYear = record.inceptionYear || (record.uy ? parseInt(String(record.uy), 10) : null);
        return recordYear === yearNum;
      });
    }

    if (filters.month) {
      // Filter by month if month field exists
      filtered = filtered.filter(record => {
        // Add month filtering logic if month field exists in data
        return true; // Placeholder - adjust based on your data structure
      });
    }

    if (filters.quarter) {
      // Filter by quarter if quarter field exists
      filtered = filtered.filter(record => {
        // Add quarter filtering logic if quarter field exists in data
        return true; // Placeholder - adjust based on your data structure
      });
    }

    if (filters.broker) {
      filtered = filtered.filter(record => record.broker === filters.broker);
    }

    if (filters.cedant) {
      filtered = filtered.filter(record => record.cedant === filters.cedant);
    }

    if (filters.policyName) {
      filtered = filtered.filter(record => record.orgInsuredTrtyName === filters.policyName);
    }

    return filtered;
  }, [data, filters]);

  // Get available entities for comparison based on groupBy
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
      'className': 'className',
      'subClass': 'subClass',
      'office': 'office',
    };

    const field = fieldMap[groupBy];
    if (!field) return [];

    return [...new Set(filteredData.map(d => d[field] as string).filter(Boolean))].sort();
  }, [filteredData, groupBy]);

  const filteredGroupByOptions = useMemo(() => {
    if (!entitySearchTerm.trim()) return groupByOptions;
    
    return groupByOptions.filter(option => 
      option.toLowerCase().includes(entitySearchTerm.toLowerCase())
    );
  }, [groupByOptions, entitySearchTerm]);

  const groupByLabels: Record<string, { label: string; description: string }> = {
    'uy': { label: 'Underwriting Year', description: 'Compare by year' },
    'extType': { label: 'Extract Type', description: 'Compare by extract type' },
    'broker': { label: 'Broker', description: 'Compare by broker' },
    'cedant': { label: 'Cedant', description: 'Compare by cedant' },
    'orgInsuredTrtyName': { label: 'Organization/Insured/Treaty', description: 'Compare by organization or treaty' },
    'countryName': { label: 'Country', description: 'Compare by country' },
    'region': { label: 'Region', description: 'Compare by region' },
    'hub': { label: 'Hub', description: 'Compare by hub' },
    'className': { label: 'Class', description: 'Compare by class' },
    'subClass': { label: 'Subclass', description: 'Compare by subclass' },
    'office': { label: 'Office', description: 'Compare by office (HO/FERO)' },
  };

  // Calculate comparison data for selected entities
  const comparisonData = useMemo(() => {
    if (comparisonEntities.length === 0) return [];

    const fieldMap: Record<string, keyof ReinsuranceData> = {
      'uy': 'uy',
      'extType': 'extType',
      'broker': 'broker',
      'cedant': 'cedant',
      'orgInsuredTrtyName': 'orgInsuredTrtyName',
      'countryName': 'countryName',
      'region': 'region',
      'hub': 'hub',
      'className': 'className',
      'subClass': 'subClass',
      'office': 'office',
    };

    return comparisonEntities.map(entity => {
      const field = fieldMap[entity.groupBy];
      if (!field) return null;

      const entityData = filteredData.filter(d => d[field] === entity.entityValue);
      const kpis = aggregateKPIs(entityData);

      return {
        ...entity,
        kpis,
        recordCount: entityData.length,
      };
    }).filter(Boolean) as Array<ComparisonEntity & { kpis: ReturnType<typeof aggregateKPIs>; recordCount: number }>;
  }, [filteredData, comparisonEntities]);

  const handleAddEntity = (entityValue: string) => {
    if (comparisonEntities.length >= 8) return;
    
    const newEntity: ComparisonEntity = {
      id: `${groupBy}-${entityValue}-${Date.now()}`,
      groupBy,
      entityValue,
      label: entityValue,
    };

    // Check if already exists
    const exists = comparisonEntities.some(
      e => e.groupBy === groupBy && e.entityValue === entityValue
    );
    
    if (!exists) {
      setComparisonEntities([...comparisonEntities, newEntity]);
      setEntitySearchTerm('');
    }
  };

  const handleRemoveEntity = (id: string) => {
    setComparisonEntities(comparisonEntities.filter(e => e.id !== id));
  };

  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
    setEntitySearchTerm('');
  };

  const exportToCSV = () => {
    if (comparisonData.length === 0) return;

    const csvContent = [
      ['Entity', 'Label', 'Premium', 'Paid Claims', 'Outstanding Claims', 'Incurred Claims', 'Expense', 'Loss Ratio %', 'Expense Ratio %', 'Combined Ratio %', 'Accounts', 'Avg Max Liability'],
      ...comparisonData.map(entity => [
        entity.label,
        entity.label,
        entity.kpis.numberOfAccounts.toString(),
        entity.kpis.premium.toString(),
        entity.kpis.paidClaims.toString(),
        entity.kpis.outstandingClaims.toString(),
        entity.kpis.incurredClaims.toString(),
        entity.kpis.expense.toString(),
        entity.kpis.lossRatio.toString(),
        entity.kpis.expenseRatio.toString(),
        entity.kpis.combinedRatio.toString(),
        entity.kpis.avgMaxLiability.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Find max values for normalization in visualizations
  const maxValues = useMemo(() => {
    if (comparisonData.length === 0) return null;

    return {
      premium: Math.max(...comparisonData.map(d => d.kpis.premium)),
      lossRatio: Math.max(...comparisonData.map(d => d.kpis.lossRatio)),
      combinedRatio: Math.max(...comparisonData.map(d => d.kpis.combinedRatio)),
      accounts: Math.max(...comparisonData.map(d => d.kpis.numberOfAccounts)),
      incurredClaims: Math.max(...comparisonData.map(d => d.kpis.incurredClaims)),
    };
  }, [comparisonData]);

  // Calculate total across all years for percentage calculation
  const totalAllYears = useMemo(() => {
    if (groupBy !== 'uy') return null;
    
    // Get all UY values from filtered data
    const allUYs = [...new Set(filteredData.map(d => d.uy).filter(Boolean))];
    const totalPremium = filteredData.reduce((sum, d) => sum + (d.grsPremKD || 0), 0);
    
    return {
      allUYs,
      totalPremium,
    };
  }, [filteredData, groupBy]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Top Filter Panel with Comparison Entities */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm">
          <TopFilterPanel
            data={data}
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          >
            {/* Select Entities to Compare Section */}
            <div className="space-y-4 w-full">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select Entities to Compare</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm font-medium whitespace-nowrap">Group by:</label>
                  <Select value={groupBy} onValueChange={handleGroupByChange}>
                    <SelectTrigger className="w-64">
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

                <div className="flex items-center gap-2 flex-1">
                  <Input
                    placeholder={`Search ${groupByLabels[groupBy]?.label || 'entities'}...`}
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
                  Available: {filteredGroupByOptions.length} entities • Selected: {comparisonEntities.length}/8
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-muted/20">
                  {filteredGroupByOptions.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2 w-full text-center">
                      {entitySearchTerm ? `No entities found for "${entitySearchTerm}"` : 'No entities available'}
                    </div>
                  ) : (
                    filteredGroupByOptions.map(option => {
                      const isSelected = comparisonEntities.some(
                        e => e.groupBy === groupBy && e.entityValue === option
                      );
                      return (
                        <Button
                          key={option}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              setComparisonEntities(comparisonEntities.filter(
                                e => !(e.groupBy === groupBy && e.entityValue === option)
                              ));
                            } else {
                              handleAddEntity(option);
                            }
                          }}
                          disabled={!isSelected && comparisonEntities.length >= 8}
                          className="relative"
                        >
                          {option}
                          {isSelected && (
                            <span className="ml-1">✓</span>
                          )}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Entities */}
              {comparisonEntities.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="text-sm font-medium">Selected for Comparison:</div>
                  <div className="flex flex-wrap gap-2">
                    {comparisonEntities.map((entity) => (
                      <Badge
                        key={entity.id}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm flex items-center gap-2"
                      >
                        <span className="font-medium">{groupByLabels[entity.groupBy]?.label}:</span>
                        <span>{entity.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemoveEntity(entity.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </TopFilterPanel>
        </div>

        <div className="container mx-auto px-4 py-8 pt-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                  <GitCompare className="h-8 w-8 text-primary" />
                  Comparative Analytics
                </h1>
              </div>
              {isAdmin && comparisonData.length > 0 && (
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </motion.div>

          {/* Comparison Results */}
          {comparisonData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Comparison Results</h2>
                  <div className="text-muted-foreground text-sm mt-1">
                    <CurrencyLabel />
                  </div>
                </div>
              </div>

              {/* Component 1: KPI Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {comparisonData.map((entity, index) => (
                    <motion.div
                      key={entity.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg truncate">{entity.label}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleRemoveEntity(entity.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {groupByLabels[entity.groupBy]?.label} • {formatNumber(entity.recordCount)} records
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Premium</span>
                              <span className="font-semibold text-sm">{formatCurrencyNumeric(entity.kpis.premium)}</span>
                            </div>
                            {maxValues && (
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-primary h-1.5 rounded-full transition-all"
                                  style={{ width: `${(entity.kpis.premium / maxValues.premium) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Loss Ratio</span>
                              <span className={`font-semibold text-sm ${
                                entity.kpis.lossRatio > 100 ? 'text-red-600' : 
                                entity.kpis.lossRatio > 80 ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {formatPct(entity.kpis.lossRatio)}
                              </span>
                            </div>
                            {maxValues && (
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    entity.kpis.lossRatio > 100 ? 'bg-red-600' : 
                                    entity.kpis.lossRatio > 80 ? 'bg-yellow-600' : 
                                    'bg-green-600'
                                  }`}
                                  style={{ width: `${Math.min((entity.kpis.lossRatio / Math.max(maxValues.lossRatio, 100)) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Combined Ratio</span>
                              <span className={`font-semibold text-sm ${
                                entity.kpis.combinedRatio > 100 ? 'text-red-600' : 
                                entity.kpis.combinedRatio > 90 ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {formatPct(entity.kpis.combinedRatio)}
                              </span>
                            </div>
                            {maxValues && (
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    entity.kpis.combinedRatio > 100 ? 'bg-red-600' : 
                                    entity.kpis.combinedRatio > 90 ? 'bg-yellow-600' : 
                                    'bg-green-600'
                                  }`}
                                  style={{ width: `${Math.min((entity.kpis.combinedRatio / Math.max(maxValues.combinedRatio, 100)) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Accounts:</span>
                              <span className="font-medium">{formatNumber(entity.kpis.numberOfAccounts)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Incurred Claims:</span>
                              <span className="font-medium">{formatCurrencyNumeric(entity.kpis.incurredClaims)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Expense:</span>
                              <span className="font-medium">{formatCurrencyNumeric(entity.kpis.expense)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Component 2: Detailed Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparative Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Item</TableHead>
                          {comparisonData.map((entity) => (
                            <TableHead key={entity.id} className="text-center min-w-[150px]">
                              {entity.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Number of Accounts</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatNumber(entity.kpis.numberOfAccounts)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Premium</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.premium)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Paid Claims</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.paidClaims)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Outstanding Claims</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.outstandingClaims)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Incurred Claims</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.incurredClaims)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Acquisition Cost</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.expense)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Loss Ratio</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className={`text-center font-semibold ${
                              entity.kpis.lossRatio > 100 ? 'text-red-600' : 
                              entity.kpis.lossRatio > 80 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {formatPct(entity.kpis.lossRatio)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Acquisition Ratio</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className={`text-center font-semibold ${
                              entity.kpis.expenseRatio > 30 ? 'text-red-600' : 
                              entity.kpis.expenseRatio > 20 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {formatPct(entity.kpis.expenseRatio)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Combined Ratio</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className={`text-center font-semibold ${
                              entity.kpis.combinedRatio > 100 ? 'text-red-600' : 
                              entity.kpis.combinedRatio > 90 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {formatPct(entity.kpis.combinedRatio)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Avg Max Liability</TableCell>
                          {comparisonData.map((entity) => (
                            <TableCell key={entity.id} className="text-center font-mono text-sm">
                              {formatCurrencyNumeric(entity.kpis.avgMaxLiability)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Component 3: Visual Bar Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Visual Comparison</CardTitle>
                  <CardDescription>Premium bars with stacked claims and loss ratio line</CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonData.length > 0 ? (
                    <ComparisonBarChart data={comparisonData} />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                      Add entities to compare to see the visualization
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Component 4: Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {comparisonData.map((entity) => (
                  <Card key={entity.id} className="bg-gradient-to-br from-background to-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{entity.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {groupByLabels[entity.groupBy]?.label}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Premium</div>
                          <div className="font-semibold">{formatCurrencyNumeric(entity.kpis.premium)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Accounts</div>
                          <div className="font-semibold">{formatNumber(entity.kpis.numberOfAccounts)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Loss Ratio</div>
                          <div className={`font-semibold ${
                            entity.kpis.lossRatio > 100 ? 'text-red-600' : 
                            entity.kpis.lossRatio > 80 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {formatPct(entity.kpis.lossRatio)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Combined</div>
                          <div className={`font-semibold ${
                            entity.kpis.combinedRatio > 100 ? 'text-red-600' : 
                            entity.kpis.combinedRatio > 90 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {formatPct(entity.kpis.combinedRatio)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && comparisonData.length === 0 && (
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
                  No Comparisons Selected
                </h3>
                <p className="text-muted-foreground mb-4">
                  Select entities above to start comparing their performance metrics side-by-side.
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loading Comparison Data
                </h3>
                <p className="text-muted-foreground">
                  Processing your reinsurance data...
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
