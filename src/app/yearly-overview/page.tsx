'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  RefreshCw,
  Loader2,
  Clock,
  DollarSign,
  AlertTriangle,
  Target,
  Users
} from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { ChatBot } from '@/components/chat/ChatBot';

interface YearlyData {
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
}

interface YearlyResponse {
  years: Record<number, YearlyData>;
  yearOrder?: number[]; // Array of years in order
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
}

export default function YearlyOverviewPage() {
  const [yearlyData, setYearlyData] = useState<YearlyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load yearly data
  useEffect(() => {
    const loadYearlyData = async () => {
      setIsLoading(true);
      try {
        console.log('Yearly Overview - Loading yearly data...');
        const response = await fetch('/api/yearly');
        console.log('Yearly Overview - API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Yearly Overview - Data loaded:', {
          totalYears: Object.keys(data.years || {}).length,
          totalPolicies: data.total?.policyCount || 0,
          totalPremium: data.total?.premium || 0
        });
        
        setYearlyData(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Yearly Overview - Failed to load yearly data:', error);
        setYearlyData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadYearlyData();
  }, []);

  const handleRefresh = () => {
    const loadYearlyData = async () => {
      setIsLoading(true);
      try {
        console.log('Yearly Overview - Refreshing data...');
        const response = await fetch('/api/yearly');
        const data = await response.json();
        setYearlyData(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Yearly Overview - Failed to refresh data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadYearlyData();
  };

  // Get color class for ratio metrics
  const getRatioColor = (value: number) => {
    if (value > 100) return 'text-red-600';
    if (value > 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get badge variant for ratios
  const getRatioBadgeVariant = (value: number) => {
    if (value > 100) return 'destructive';
    if (value > 80) return 'secondary';
    return 'default';
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Title */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-foreground">Yearly Overview</h1>
              {yearlyData && yearlyData.yearOrder && yearlyData.yearOrder.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {yearlyData.yearOrder[0]}-{yearlyData.yearOrder[yearlyData.yearOrder.length - 1]}
                </Badge>
              )}
              {yearlyData && (
                <Badge variant="secondary" className="text-xs">
                  {yearlyData.total?.policyCount || 0} policies
                </Badge>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center space-x-4">
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
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
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading yearly data...</span>
            </div>
          </div>
        )}

        {/* Yearly Data */}
        {yearlyData && !isLoading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total Policies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(yearlyData.total?.policyCount || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total Premium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatKD(yearlyData.total?.premium || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Avg Loss Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getRatioColor(yearlyData.total?.lossRatioPct || 0)}>
                      {formatPct(yearlyData.total?.lossRatioPct || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Avg Combined Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getRatioColor(yearlyData.total?.combinedRatioPct || 0)}>
                      {formatPct(yearlyData.total?.combinedRatioPct || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Yearly Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Yearly Performance Breakdown</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/80">
                  All monetary values shown in KWD.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Year</TableHead>
                        <TableHead className="text-right font-semibold">Policies</TableHead>
                        <TableHead className="text-right font-semibold">Gross Premium</TableHead>
                        <TableHead className="text-right font-semibold">Acquisition Cost</TableHead>
                        <TableHead className="text-right font-semibold">Acq. Cost %</TableHead>
                        <TableHead className="text-right font-semibold">Incurred Claims</TableHead>
                        <TableHead className="text-right font-semibold">Loss Ratio</TableHead>
                        <TableHead className="text-right font-semibold">Technical Result</TableHead>
                        <TableHead className="text-right font-semibold">Combined Ratio</TableHead>
                        <TableHead className="text-right font-semibold">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(yearlyData.yearOrder || Object.keys(yearlyData.years || {}).map(y => parseInt(y)).sort()).map((year) => {
                        const data = yearlyData.years?.[year];
                        if (!data) return null;
                        
                        
                        return (
                          <TableRow key={year} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <span className="font-semibold">{year}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm">
                                {formatNumber(data.policyCount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm">
                                {formatKDNumeric(data.premium)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatKDNumeric(data.acquisition)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={getRatioColor(data.acquisitionPct)}>
                                {formatPct(data.acquisitionPct)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatKDNumeric(data.incurredClaims)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(data.lossRatioPct)}>
                                {formatPct(data.lossRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-mono text-sm ${data.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatKDNumeric(data.technicalResult)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(data.combinedRatioPct)}>
                                {formatPct(data.combinedRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs text-muted-foreground">-</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Total Row */}
                      {yearlyData.total && (
                        <TableRow className="bg-muted/50 font-semibold border-t-2">
                          <TableCell className="font-medium text-primary">
                            TOTAL
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(yearlyData.total.policyCount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(yearlyData.total.premium)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(yearlyData.total.acquisition)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getRatioColor(yearlyData.total.acquisitionPct)}>
                              {formatPct(yearlyData.total.acquisitionPct)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(yearlyData.total.incurredClaims)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(yearlyData.total.lossRatioPct)}>
                              {formatPct(yearlyData.total.lossRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono ${yearlyData.total.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatKDNumeric(yearlyData.total.technicalResult)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(yearlyData.total.combinedRatioPct)}>
                              {formatPct(yearlyData.total.combinedRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-muted-foreground">
                              {yearlyData.yearOrder?.length || Object.keys(yearlyData.years || {}).length} {yearlyData.yearOrder?.length === 1 ? 'Year' : 'Years'}
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Data State */}
        {!yearlyData && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Yearly Data Available</h3>
            <p className="text-sm mb-4">No yearly data available for analysis</p>
          </div>
        )}
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}


