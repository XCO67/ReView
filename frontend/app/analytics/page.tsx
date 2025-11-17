'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, BarChart3, TrendingUp } from 'lucide-react';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs, filterRecords } from '@/lib/kpi';
// CSV data loading logic removed - new implementation will be added
import { SimpleSearchFilter } from '@/components/filters/SimpleSearchFilter';
import { ChatBot } from '@/components/chat/ChatBot';


export default function AnalyticsPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Partial<Record<string, string[]>>>({});
  const [groupBy, setGroupBy] = useState<string>('uy');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');

  // Initialize with empty state - new CSV logic will be implemented
  useEffect(() => {
    // Placeholder for new CSV implementation
    setData([]);
    setIsLoading(false);
  }, []);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return filterRecords(data, filters);
  }, [data, filters]);

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

    return [...new Set(filteredData.map(d => d[field] as string))].sort();
  }, [filteredData, groupBy]);

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
    const grouped = filteredData.reduce((acc, record) => {
      const key = record[field] as string;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {} as Record<string, ReinsuranceData[]>);

    // Calculate KPIs for each group
    return Object.entries(grouped).map(([groupValue, records]) => {
      const kpis = aggregateKPIs(records);
      return {
        groupBy: groupValue,
        value: kpis.premium,
        kpis,
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredData, groupBy]);

  // Get data for comparison
  const comparisonData = useMemo(() => {
    if (!compareMode || selectedEntities.length === 0) return [];

    return selectedEntities.map(entity => {
      const entityData = filteredData.filter(d => {
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
  }, [filteredData, groupBy, compareMode, selectedEntities]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Analytics Explorer
          </h1>
          <p className="text-muted-foreground">
            Deep dive into your reinsurance data with flexible grouping and comparison tools
          </p>
        </motion.div>

        {/* Enhanced Filters */}
        {!isLoading && data.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <SimpleSearchFilter
              data={data}
              onFiltersChange={setFilters}
            />
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Analysis Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Group by:</label>
                  <Select value={groupBy} onValueChange={handleGroupByChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uy">UY</SelectItem>
                      <SelectItem value="extType">Ext Type</SelectItem>
                      <SelectItem value="broker">Broker</SelectItem>
                      <SelectItem value="cedant">Cedant</SelectItem>
                      <SelectItem value="orgInsuredTrtyName">Org.Insured/Trty Name</SelectItem>
                      <SelectItem value="countryName">Country Name</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                      <SelectItem value="hub">Hub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={compareMode ? "default" : "outline"}
                  onClick={() => setCompareMode(!compareMode)}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Compare Mode
                </Button>

                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {compareMode && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select up to 3 entities to compare:</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`Search ${groupBy}...`}
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
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Showing {filteredGroupByOptions.length} of {groupByOptions.length} options
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {filteredGroupByOptions.map(option => (
                        <Button
                          key={option}
                          variant={selectedEntities.includes(option) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleEntityToggle(option)}
                          disabled={!selectedEntities.includes(option) && selectedEntities.length >= 3}
                        >
                          {option}
                        </Button>
                      ))}
                      {filteredGroupByOptions.length === 0 && entitySearchTerm && (
                        <div className="text-sm text-muted-foreground py-2">
                          No options found for &quot;{entitySearchTerm}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter Summary */}
        {!isLoading && data.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-4"
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} records
                    {filteredData.length !== data.length && (
                      <span className="text-primary font-medium">
                        {' '}({((filteredData.length / data.length) * 100).toFixed(1)}% of total data)
                      </span>
                    )}
                  </div>
                  {filteredData.length !== data.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({})}
                      className="text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Aggregated Table</TabsTrigger>
              {compareMode && (
                <TabsTrigger value="compare">Comparison</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>Aggregated Data by {groupBy}</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>No data available for the selected grouping</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Premium</TableHead>
                            <TableHead className="text-right">Paid Claims</TableHead>
                            <TableHead className="text-right">Outstanding Claims</TableHead>
                            <TableHead className="text-right">Incurred Claims</TableHead>
                            <TableHead className="text-right">Expense</TableHead>
                            <TableHead className="text-right">Loss Ratio</TableHead>
                            <TableHead className="text-right">Expense Ratio</TableHead>
                            <TableHead className="text-right">Combined Ratio</TableHead>
                            <TableHead className="text-right">Accounts</TableHead>
                            <TableHead className="text-right">Avg Max Liability</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyticsData.map((row, index) => (
                            <motion.tr
                              key={row.groupBy}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="font-medium">
                                {row.groupBy}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKD(row.kpis.premium)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKD(row.kpis.paidClaims)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKD(row.kpis.outstandingClaims)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKD(row.kpis.incurredClaims)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatKD(row.kpis.expense)}
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
                                {formatKD(row.kpis.avgMaxLiability)}
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
                    <CardTitle>Entity Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comparisonData.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <p>Select entities to compare</p>
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
                Processing your 2019-2021 reinsurance data for analytics...
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Preparing data for grouping and comparison</p>
                <p className="mt-2">This may take a few moments</p>
              </div>
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
                Upload your reinsurance data to start exploring analytics and insights.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Use the group-by selector to analyze data by different dimensions.</p>
                <p className="mt-2">Compare up to 3 entities side-by-side for detailed insights.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ChatBot */}
        <ChatBot />
      </div>
    </div>
  );
}
