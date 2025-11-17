'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Download
} from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { ChatBot } from '@/components/chat/ChatBot';
import { ReinsuranceData } from '@/lib/schema';

interface QuarterlyData {
  quarter: number;
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

interface QuarterlyResponse {
  year: number | 'all';
  quarters: Record<number, QuarterlyData>;
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

export default function QuarterlyOverviewPage() {
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(d => d.uy).filter(Boolean))].sort();
    return ['all', ...years];
  }, [data]);

  // Load data to get available years
  useEffect(() => {
    const loadData = async () => {
      try {
        const dataResponse = await fetch('/api/data?limit=100000');
        const dataResult = await dataResponse.json();
        console.log('Quarterly Overview - Loaded data:', dataResult.data.length, 'records');
        setData(dataResult.data);
      } catch (error) {
        console.error('Quarterly Overview - Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Load quarterly data when year changes
  useEffect(() => {
    const loadQuarterlyData = async () => {
      if (!selectedYear) return;
      
      setIsLoading(true);
      try {
        console.log('Quarterly Overview - Loading data for year:', selectedYear);
        const params = new URLSearchParams();
        
        // Only add year parameter if not "all"
        if (selectedYear !== 'all') {
          params.append('year', selectedYear);
        }

        const response = await fetch(`/api/quarterly?${params.toString()}`);
        console.log('Quarterly Overview - API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const quarterlyResponse = await response.json();
        console.log('Quarterly Overview - Data loaded:', {
          year: quarterlyResponse.year,
          totalPolicies: quarterlyResponse.total?.policyCount || 0,
          totalPremium: quarterlyResponse.total?.premium || 0,
          quartersWithData: Object.keys(quarterlyResponse.quarters || {}).length
        });
        
        setQuarterlyData(quarterlyResponse);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Quarterly Overview - Failed to load quarterly data:', error);
        setQuarterlyData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuarterlyData();
  }, [selectedYear]);

  const handleYearChange = (year: string) => {
    console.log('Quarterly Overview - Year changed to:', year);
    setSelectedYear(year);
  };

  const handleRefresh = () => {
    if (selectedYear) {
      const loadQuarterlyData = async () => {
        setIsLoading(true);
        try {
          console.log('Quarterly Overview - Refreshing data for year:', selectedYear);
          const params = new URLSearchParams();
          
          // Only add year parameter if not "all"
          if (selectedYear !== 'all') {
            params.append('year', selectedYear);
          }

          const response = await fetch(`/api/quarterly?${params.toString()}`);
          const quarterlyResponse = await response.json();
          setQuarterlyData(quarterlyResponse);
          setLastUpdated(new Date());
        } catch (error) {
          console.error('Quarterly Overview - Failed to refresh data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadQuarterlyData();
    }
  };


  const getQuarterName = (quarter: number) => {
    const names = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
    return names[quarter] || `Q${quarter}`;
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

  // Calculate trend indicators

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Title */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-foreground">Quarterly Overview</h1>
              <Badge variant="outline" className="text-xs">
                {selectedYear === 'all' ? 'All Years' : selectedYear}
              </Badge>
              {quarterlyData && (
                <Badge variant="secondary" className="text-xs">
                  {quarterlyData.total?.policyCount || 0} policies
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

      {/* Filter Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">Year:</span>
              {/* Year Filter */}
              <div className="min-w-[110px]">
                <Select
                  value={selectedYear}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year === 'all' ? 'All Years' : year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <span className="text-muted-foreground">Loading quarterly data for {selectedYear}...</span>
            </div>
          </div>
        )}

        {/* Quarterly Data Table */}
        {quarterlyData && !isLoading && (
          <div className="space-y-6">
            {/* Year Indicator */}
            <div className="mb-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-6 h-6 text-primary" />
                      <div>
                        <h2 className="text-2xl font-bold text-primary">
                          {selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Quarterly Performance Analysis
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Policies</div>
                      <div className="text-3xl font-bold text-primary">
                        {formatNumber(quarterlyData.total?.policyCount || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Gross Premium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatKD(quarterlyData.total?.premium || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Loss Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getRatioColor(quarterlyData.total?.lossRatioPct || 0)}>
                      {formatPct(quarterlyData.total?.lossRatioPct || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Combined Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getRatioColor(quarterlyData.total?.combinedRatioPct || 0)}>
                      {formatPct(quarterlyData.total?.combinedRatioPct || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Quarterly Performance Breakdown</span>
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
                        <TableHead className="font-semibold">Quarter</TableHead>
                        <TableHead className="text-right font-semibold">Policies</TableHead>
                        <TableHead className="text-right font-semibold">Gross Premium</TableHead>
                        <TableHead className="text-right font-semibold">Acquisition Cost</TableHead>
                        <TableHead className="text-right font-semibold">Acq. Cost %</TableHead>
                        <TableHead className="text-right font-semibold">Incurred Claims</TableHead>
                        <TableHead className="text-right font-semibold">Loss Ratio</TableHead>
                        <TableHead className="text-right font-semibold">Technical Result</TableHead>
                        <TableHead className="text-right font-semibold">Combined Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4].map((quarter) => {
                        const data = quarterlyData.quarters?.[quarter];
                        if (!data) return null;
                        
                        return (
                          <TableRow key={quarter} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                  {quarter}
                                </span>
                                <span>{getQuarterName(quarter)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(data.policyCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatKDNumeric(data.premium)}
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
                          </TableRow>
                        );
                      })}
                      
                      {/* Total Row */}
                      {quarterlyData.total && (
                        <TableRow className="bg-muted/50 font-semibold border-t-2">
                          <TableCell className="font-medium text-primary">
                            TOTAL
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(quarterlyData.total.policyCount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(quarterlyData.total.premium)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(quarterlyData.total.acquisition)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getRatioColor(quarterlyData.total.acquisitionPct)}>
                              {formatPct(quarterlyData.total.acquisitionPct)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKDNumeric(quarterlyData.total.incurredClaims)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(quarterlyData.total.lossRatioPct)}>
                              {formatPct(quarterlyData.total.lossRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono ${quarterlyData.total.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatKDNumeric(quarterlyData.total.technicalResult)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(quarterlyData.total.combinedRatioPct)}>
                              {formatPct(quarterlyData.total.combinedRatioPct)}
                            </Badge>
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
        {!quarterlyData && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Quarterly Data Available</h3>
            <p className="text-sm mb-4">No quarterly data available for the selected year</p>
            <div className="text-xs text-muted-foreground">
              <p>Selected year: {selectedYear === 'all' ? 'All Years' : selectedYear}</p>
              <p>Available years: {availableYears.filter(y => y !== 'all').join(', ') || 'Loading...'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}