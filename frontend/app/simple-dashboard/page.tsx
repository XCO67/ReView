'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
// CSV data loading logic removed - new implementation will be added
import { ReinsuranceData } from '@/lib/schema';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { filterRecords } from '@/lib/kpi';
import { SimpleSearchFilter } from '@/components/filters/SimpleSearchFilter';
import { ChatBot } from '@/components/chat/ChatBot';

export default function SimpleDashboardPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading] = useState(false);
  const [filters, setFilters] = useState<Partial<Record<string, string[]>>>({});

  // Initialize with empty state - new CSV logic will be implemented
  useEffect(() => {
    // Placeholder for new CSV implementation
    setData([]);
    setIsLoading(false);
  }, []);

  // Apply filters
  const filteredData = useMemo(() => {
    return filterRecords(data, filters);
  }, [data, filters]);

  // Calculate UY summary data
  const uySummary = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Group data by UY
    const uyGroups = filteredData.reduce((acc, record) => {
      const uy = record.uy;
      if (!acc[uy]) {
        acc[uy] = {
          uy,
          accountCount: 0,
          premium: 0,
          paidClaims: 0,
          outstandingClaims: 0,
          incurredClaims: 0,
          lossRatio: 0
        };
      }
      
      acc[uy].accountCount += 1;
      acc[uy].premium += record.grossUWPrem;
      acc[uy].paidClaims += record.grossPaidClaims;
      acc[uy].outstandingClaims += record.grossOsLoss;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate incurred claims and loss ratios
    Object.values(uyGroups).forEach((group: any) => {
      group.incurredClaims = group.paidClaims + group.outstandingClaims;
      group.lossRatio = group.premium > 0 ? (group.incurredClaims / group.premium) * 100 : 0;
    });

    // Sort by UY
    return Object.values(uyGroups).sort((a: any, b: any) => a.uy.localeCompare(b.uy));
  }, [filteredData]);

  // Calculate totals
  const totals = useMemo(() => {
    return uySummary.reduce((acc: any, row: any) => ({
      accountCount: acc.accountCount + row.accountCount,
      premium: acc.premium + row.premium,
      paidClaims: acc.paidClaims + row.paidClaims,
      outstandingClaims: acc.outstandingClaims + row.outstandingClaims,
      incurredClaims: acc.incurredClaims + row.incurredClaims,
      lossRatio: acc.premium > 0 ? (acc.incurredClaims / acc.premium) * 100 : 0
    }), {
      accountCount: 0,
      premium: 0,
      paidClaims: 0,
      outstandingClaims: 0,
      incurredClaims: 0,
      lossRatio: 0
    });
  }, [uySummary]);

  const getLossRatioStatus = (ratio: number) => {
    if (ratio <= 60) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (ratio <= 80) return { status: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (ratio <= 100) return { status: 'Warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'Critical', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const exportData = () => {
    const csvContent = [
      'UY,No. of Accounts,Premium,Paid Claims,Outstanding Claims,Incurred Claims,Loss Ratio %',
      ...uySummary.map((row: any) => 
        `${row.uy},${row.accountCount},"${row.premium}","${row.paidClaims}","${row.outstandingClaims}","${row.incurredClaims}",${row.lossRatio.toFixed(2)}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uy_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading UY Summary...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kuwait Re - UY Summary Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Simple table showing key metrics by Underwriting Year
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {Object.keys(filters).length > 0 && (
              <Button onClick={clearFilters} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.length)}</div>
              <p className="text-xs text-muted-foreground">Original dataset</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(filteredData.length)}</div>
              <p className="text-xs text-muted-foreground">
                {data.length - filteredData.length > 0 ? `${data.length - filteredData.length} filtered out` : 'No filters applied'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">UY Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uySummary.length}</div>
              <p className="text-xs text-muted-foreground">Underwriting years</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Loss Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPct(totals.lossRatio)}</div>
              <p className="text-xs text-muted-foreground">Total portfolio</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Filters */}
      {data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SimpleSearchFilter
            data={data}
            onFiltersChange={setFilters}
          />
        </motion.div>
      )}

      {/* UY Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                UY Summary Table
              </span>
              <Badge variant="outline" className="text-sm">
                {uySummary.length} UY periods
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uySummary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data matches your current filters</p>
                <p className="text-sm">Try adjusting your filter criteria</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">UY</TableHead>
                        <TableHead className="w-[120px] text-right">No. of Accounts</TableHead>
                        <TableHead className="w-[140px] text-right">Premium</TableHead>
                        <TableHead className="w-[140px] text-right">Paid Claims</TableHead>
                        <TableHead className="w-[160px] text-right">Outstanding Claims</TableHead>
                        <TableHead className="w-[160px] text-right">Incurred Claims</TableHead>
                        <TableHead className="w-[140px] text-right">Loss Ratio %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uySummary.map((row: any, index) => {
                        const lossStatus = getLossRatioStatus(row.lossRatio);
                        return (
                          <TableRow key={row.uy} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {row.uy}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(row.accountCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatKD(row.premium)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatKD(row.paidClaims)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatKD(row.outstandingClaims)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatKD(row.incurredClaims)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${lossStatus.bg} ${lossStatus.color}`}>
                                {formatPct(row.lossRatio)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Totals Row */}
                      <TableRow className="border-t-2 font-semibold bg-muted/30">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNumber(totals.accountCount)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatKD(totals.premium)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatKD(totals.paidClaims)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatKD(totals.outstandingClaims)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatKD(totals.incurredClaims)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getLossRatioStatus(totals.lossRatio).bg} ${getLossRatioStatus(totals.lossRatio).color}`}>
                            {formatPct(totals.lossRatio)}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                
                {/* Summary Stats */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{formatNumber(totals.accountCount)}</div>
                    <div className="text-sm text-muted-foreground">Total Accounts</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{formatKD(totals.premium)}</div>
                    <div className="text-sm text-muted-foreground">Total Premium</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{formatPct(totals.lossRatio)}</div>
                    <div className="text-sm text-muted-foreground">Overall Loss Ratio</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
