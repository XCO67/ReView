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
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { useUserRoles } from '@/hooks/useUserRoles';
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

export function QuarterlyOverviewContent({ hideChatBot = false }: { hideChatBot?: boolean } = {}) {
  const { isAdmin } = useUserRoles();
  const { formatCurrency, formatCurrencyNumeric } = useFormatCurrency();
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

  // Load data to get available years
  useEffect(() => {
    const loadData = async () => {
      try {
        const dataResponse = await fetch('/api/data?limit=100000');
        const dataResult = await dataResponse.json();
        setData(dataResult.data);
      } catch (error) {
        console.error('Quarterly Overview - Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Load quarterly data when filters change
  useEffect(() => {
    const loadQuarterlyData = async () => {
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

        const response = await fetch(`/api/quarterly?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Quarterly Overview - API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Quarterly Overview - Non-JSON response:', text.substring(0, 200));
          throw new Error('Invalid response format: expected JSON');
        }

        const quarterlyResponse = await response.json();
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
  }, [selectedYear, selectedLoc, selectedExtType, selectedClass, selectedSubClass]);

  const handleRefresh = () => {
    const loadQuarterlyData = async () => {
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

        const response = await fetch(`/api/quarterly?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Quarterly Overview - API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Quarterly Overview - Non-JSON response:', text.substring(0, 200));
          throw new Error('Invalid response format: expected JSON');
        }

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
              <span className="text-muted-foreground">Loading quarterly data...</span>
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
                          Quarterly Performance Analysis
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}
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
                    {formatCurrency(quarterlyData.total?.premium || 0)}
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
                              {formatCurrencyNumeric(data.premium)}
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
                            {formatCurrencyNumeric(quarterlyData.total.premium)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNumeric(quarterlyData.total.acquisition)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getRatioColor(quarterlyData.total.acquisitionPct)}>
                              {formatPct(quarterlyData.total.acquisitionPct)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNumeric(quarterlyData.total.incurredClaims)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getRatioBadgeVariant(quarterlyData.total.lossRatioPct)}>
                              {formatPct(quarterlyData.total.lossRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono ${quarterlyData.total.technicalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrencyNumeric(quarterlyData.total.technicalResult)}
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
              <p className="text-sm mb-4">No quarterly data available for the selected filters</p>
            </div>
        )}
      </div>

      {/* ChatBot */}
      {!hideChatBot && <ChatBot />}
    </div>
  );
}

export default function QuarterlyOverviewPage() {
  return <QuarterlyOverviewContent />;
}