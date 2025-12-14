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
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ChatBot } from '@/components/chat/ChatBot';
import { ReinsuranceData } from '@/lib/schema';

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

export function YearlyOverviewContent({ hideChatBot = false }: { hideChatBot?: boolean } = {}) {
  const { isAdmin } = useUserRoles();
  const { formatCurrency, formatCurrencyNumeric } = useFormatCurrency();
  const [yearlyData, setYearlyData] = useState<YearlyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLoc, setSelectedLoc] = useState<string>('all');
  const [selectedExtType, setSelectedExtType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('all');

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(d => {
      // Use inceptionYear if available, otherwise UY
      return d.inceptionYear || d.uy;
    }).filter(Boolean))].sort((a, b) => {
      const aNum = typeof a === 'number' ? a : parseInt(String(a), 10);
      const bNum = typeof b === 'number' ? b : parseInt(String(b), 10);
      return aNum - bNum;
    });
    return ['all', ...years.map(String)];
  }, [data]);

  // Get available filter options from data
  const availableLocs = useMemo(() => {
    const locs = new Set<string>();
    data.forEach((record) => {
      if (record.loc) locs.add(record.loc);
    });
    return Array.from(locs).sort();
  }, [data]);

  const availableExtTypes = useMemo(() => {
    const extTypes = new Set<string>();
    data.forEach((record) => {
      if (record.extType) extTypes.add(record.extType);
    });
    return Array.from(extTypes).sort();
  }, [data]);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    data.forEach((record) => {
      if (record.className) classes.add(record.className);
    });
    return Array.from(classes).sort();
  }, [data]);

  // Available subclasses filtered by selected class
  const availableSubClasses = useMemo(() => {
    const subClasses = new Set<string>();
    data.forEach((record) => {
      if (record.subClass && (selectedClass === 'all' || record.className === selectedClass)) {
        subClasses.add(record.subClass);
      }
    });
    return Array.from(subClasses).sort();
  }, [data, selectedClass]);

  // Load data to get available filter options
  useEffect(() => {
    const loadData = async () => {
      try {
        const dataResponse = await fetch('/api/data?limit=100000');
        const dataResult = await dataResponse.json();
        setData(dataResult.data);
      } catch (error) {
        console.error('Yearly Overview - Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Load yearly data when filters change
  useEffect(() => {
    const loadYearlyData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        if (selectedYear !== 'all') {
          params.append('year', selectedYear);
        }
        if (selectedLoc !== 'all') {
          params.append('loc', selectedLoc);
        }
        if (selectedExtType !== 'all') {
          params.append('extType', selectedExtType);
        }
        if (selectedClass !== 'all') {
          params.append('class', selectedClass);
        }
        if (selectedSubClass !== 'all') {
          params.append('subClass', selectedSubClass);
        }

        const response = await fetch(`/api/yearly?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Yearly Overview - API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Yearly Overview - Non-JSON response:', text.substring(0, 200));
          throw new Error('Invalid response format: expected JSON');
        }

        const data = await response.json();
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
  }, [selectedYear, selectedLoc, selectedExtType, selectedClass, selectedSubClass]);

  const handleRefresh = () => {
    const loadYearlyData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        if (selectedYear !== 'all') {
          params.append('year', selectedYear);
        }
        if (selectedLoc !== 'all') {
          params.append('loc', selectedLoc);
        }
        if (selectedExtType !== 'all') {
          params.append('extType', selectedExtType);
        }
        if (selectedClass !== 'all') {
          params.append('class', selectedClass);
        }
        if (selectedSubClass !== 'all') {
          params.append('subClass', selectedSubClass);
        }

        const response = await fetch(`/api/yearly?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Yearly Overview - API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Yearly Overview - Non-JSON response:', text.substring(0, 200));
          throw new Error('Invalid response format: expected JSON');
        }

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
              <Badge variant="outline" className="text-xs">
                {selectedYear === 'all' ? 'All Years' : selectedYear}
              </Badge>
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

      {/* Filter Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.filter(y => y !== 'all').map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Loc</label>
              <Select value={selectedLoc} onValueChange={setSelectedLoc}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Loc" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Loc</SelectItem>
                  {availableLocs.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ext Type</label>
              <Select value={selectedExtType} onValueChange={setSelectedExtType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Ext Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ext Types</SelectItem>
                  {availableExtTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select value={selectedClass} onValueChange={(value) => {
                setSelectedClass(value);
                setSelectedSubClass('all'); // Clear subclass when class changes
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Subclass</label>
              <Select value={selectedSubClass} onValueChange={setSelectedSubClass} disabled={selectedClass === 'all'}>
                <SelectTrigger className="h-9 disabled:opacity-50">
                  <SelectValue placeholder={selectedClass === 'all' ? "Select class first" : "All Subclasses"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subclasses</SelectItem>
                  {availableSubClasses.map((subCls) => (
                    <SelectItem key={subCls} value={subCls}>
                      {subCls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    {formatCurrency(yearlyData.total?.premium || 0)}
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
                  {isAdmin && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  )}
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
                                {formatCurrencyNumeric(data.premium)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrencyNumeric(data.acquisition)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={getRatioColor(data.acquisitionPct)}>
                                {formatPct(data.acquisitionPct)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrencyNumeric(data.incurredClaims)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(data.lossRatioPct)}>
                                {formatPct(data.lossRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-mono text-sm ${data.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrencyNumeric(data.technicalResult)}
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
                            {formatCurrencyNumeric(yearlyData.total.premium)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNumeric(yearlyData.total.acquisition)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getRatioColor(yearlyData.total.acquisitionPct)}>
                              {formatPct(yearlyData.total.acquisitionPct)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNumeric(yearlyData.total.incurredClaims)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(yearlyData.total.lossRatioPct)}>
                              {formatPct(yearlyData.total.lossRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono ${yearlyData.total.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrencyNumeric(yearlyData.total.technicalResult)}
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
      {!hideChatBot && <ChatBot />}
    </div>
  );
}
export default function YearlyOverviewPage() {
  return <YearlyOverviewContent />;
}
