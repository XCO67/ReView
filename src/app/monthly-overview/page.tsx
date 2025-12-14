"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Minus,
  Loader2,
  Clock,
  AlertCircle,
  Download
} from "lucide-react";
import { formatKD, formatKDNumeric, formatPct, formatNumber } from "@/lib/format";
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ReinsuranceData } from "@/lib/schema";
import { aggregateKPIs } from "@/lib/kpi";

const monthLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface MonthlyData {
  month: number;
  policyCount: number;
  grossPremium: number;
  acquisitionCostPercent: number;
  incurredClaims: number;
  lossRatio: number;
  technicalResult: number;
  combinedRatio: number;
}

interface MonthlyOverviewData {
  monthlyData: MonthlyData[];
  totals: {
    policyCount: number;
    grossPremium: number;
    acquisitionCostPercent: number;
    incurredClaims: number;
    lossRatio: number;
    technicalResult: number;
    combinedRatio: number;
  };
}

export function MonthlyOverviewContent() {
  const { formatCurrency, formatCurrencyNumeric } = useFormatCurrency();
  const { isAdmin } = useUserRoles();
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyOverviewData | null>(null);
  const [selectedInceptionYear, setSelectedInceptionYear] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedLoc, setSelectedLoc] = useState<string>('all');
  const [selectedExtType, setSelectedExtType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('all');
  const [loading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const availableInceptionYears = useMemo(() => {
    const years = [...new Set(data.map(d => d.inceptionYear).filter(Boolean))] as number[];
    return years.sort((a, b) => a - b).map(String);
  }, [data]);

  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>();
    data.forEach((record) => {
      if (record.inceptionQuarter) {
        // inceptionQuarter is a number (1-4), convert to Q1, Q2, Q3, Q4
        const qNum = typeof record.inceptionQuarter === 'number' 
          ? record.inceptionQuarter 
          : parseInt(String(record.inceptionQuarter), 10);
        if (qNum >= 1 && qNum <= 4) {
          quarters.add(`Q${qNum}`);
        }
      }
    });
    return Array.from(quarters).sort();
  }, [data]);

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

  const FiltersBar = () => (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Inception Year</label>
            <Select value={selectedInceptionYear} onValueChange={setSelectedInceptionYear}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Inception Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inception Years</SelectItem>
                {availableInceptionYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Inception Quarter</label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {availableQuarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>
                    {quarter}
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
  );

  // Convert month name (JAN, FEB, etc.) to month number (1-12)
  const getMonthNumberFromName = (monthName: string | undefined): number => {
    if (!monthName) return 0;
    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    };
    return monthMap[monthName.toUpperCase()] || 0;
  };

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dataResponse = await fetch('/api/data?limit=100000');
        const dataResult = await dataResponse.json();
        setData(dataResult.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate monthly data based on selected year
  const calculatedMonthlyData = useMemo(() => {
    if (data.length === 0) return null;

    // Filter data by selected filters
    let filteredData = data;

    if (selectedInceptionYear !== 'all') {
      const yearNumber = parseInt(selectedInceptionYear, 10);
      filteredData = filteredData.filter(record => record.inceptionYear === yearNumber);
    }

    if (selectedQuarter !== 'all') {
      filteredData = filteredData.filter(record => {
        if (!record.inceptionQuarter) return false;
        // inceptionQuarter is a number (1-4), convert to Q1, Q2, Q3, Q4 for comparison
        const qNum = typeof record.inceptionQuarter === 'number' 
          ? record.inceptionQuarter 
          : parseInt(String(record.inceptionQuarter), 10);
        const quarterStr = qNum >= 1 && qNum <= 4 ? `Q${qNum}` : '';
        return quarterStr === selectedQuarter.toUpperCase();
      });
    }

    if (selectedLoc !== 'all') {
      filteredData = filteredData.filter(record => record.loc === selectedLoc);
    }

    if (selectedExtType !== 'all') {
      filteredData = filteredData.filter(record => record.extType === selectedExtType);
    }

    if (selectedClass !== 'all') {
      filteredData = filteredData.filter(record => record.className === selectedClass);
    }

    if (selectedSubClass !== 'all') {
      filteredData = filteredData.filter(record => record.subClass === selectedSubClass);
    }

    if (filteredData.length === 0) return null;

    // Group data by month using inceptionMonth (already parsed from comDate)
    const monthlyGroups: Record<number, ReinsuranceData[]> = {};
    
    filteredData.forEach(record => {
      // inceptionMonth is a number (1-12) in the new CSV
      let monthNumber = 0;
      if (record.inceptionMonth) {
        if (typeof record.inceptionMonth === 'number') {
          monthNumber = record.inceptionMonth;
        } else {
          // Fallback: try to parse as month name if it's a string
          monthNumber = getMonthNumberFromName(String(record.inceptionMonth));
        }
      }
      
      if (monthNumber >= 1 && monthNumber <= 12) {
        if (!monthlyGroups[monthNumber]) {
          monthlyGroups[monthNumber] = [];
        }
        monthlyGroups[monthNumber].push(record);
      }
    });

    // Calculate metrics for each month
    const monthlyData: MonthlyData[] = [];
    const totals = {
      policyCount: 0,
      grossPremium: 0,
      acquisitionCostPercent: 0,
      incurredClaims: 0,
      lossRatio: 0,
      technicalResult: 0,
      combinedRatio: 0
    };

    for (let month = 1; month <= 12; month++) {
      const monthRecords = monthlyGroups[month] || [];
      const kpis = aggregateKPIs(monthRecords);
      
      const monthData: MonthlyData = {
        month,
        policyCount: monthRecords.length,
        grossPremium: kpis.premium,
        acquisitionCostPercent: kpis.expenseRatio,
        incurredClaims: kpis.incurredClaims,
        lossRatio: kpis.lossRatio,
        technicalResult: kpis.premium - kpis.incurredClaims - (kpis.premium * kpis.expenseRatio / 100),
        combinedRatio: kpis.combinedRatio
      };

      monthlyData.push(monthData);

      // Add to totals
      totals.policyCount += monthData.policyCount;
      totals.grossPremium += monthData.grossPremium;
      totals.incurredClaims += monthData.incurredClaims;
      totals.technicalResult += monthData.technicalResult;

    }

    // Calculate totals using aggregateKPIs for accuracy
    const totalKPIs = aggregateKPIs(filteredData);
    
    totals.policyCount = filteredData.length;
    totals.grossPremium = totalKPIs.premium;
    totals.incurredClaims = totalKPIs.incurredClaims;
    totals.acquisitionCostPercent = totalKPIs.expenseRatio;
    totals.lossRatio = totalKPIs.lossRatio;
    totals.combinedRatio = totalKPIs.combinedRatio;
    totals.technicalResult = totalKPIs.premium - totalKPIs.incurredClaims - totalKPIs.expense;

    // Return monthly aggregated data
      recordsWithInceptionMonth: filteredData.filter(r => r.inceptionMonth).length,
      monthlyDataLength: monthlyData.length,
      monthsWithData: monthlyData.filter(m => m.policyCount > 0).length,
      totals: {
        policyCount: totals.policyCount,
        grossPremium: totals.grossPremium,
        lossRatio: totals.lossRatio,
        combinedRatio: totals.combinedRatio
      }
    });

    return {
      monthlyData,
      totals
    };
  }, [data, selectedInceptionYear, selectedQuarter, selectedLoc, selectedExtType, selectedClass, selectedSubClass]);

  // Update monthly data when calculated data changes
  useEffect(() => {
    setMonthlyData(calculatedMonthlyData);
  }, [calculatedMonthlyData]);

  const getValueColor = (metric: string, value: number) => {
    if (metric === "Loss Ratio %" || metric === "Combined Ratio %") {
      if (value > 100) return "text-red-600";
      if (value > 80) return "text-yellow-600";
      return "text-green-600";
    }
    return "text-gray-900 dark:text-gray-100";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading monthly data...</span>
        </div>
      </div>
    );
  }

  if (!monthlyData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-foreground">
                  Monthly Overview
                </h1>
                <Badge variant="outline" className="text-xs">
                  {data.length.toLocaleString()} records
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FiltersBar />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Data Available
                </h3>
                <p className="text-muted-foreground mb-4">
                  No monthly data found for the selected criteria. Try selecting a different year or check your data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-foreground">
                  Monthly Overview
              </h1>
              <Badge variant="outline" className="text-xs">
                {monthlyData ? 
                  `${monthlyData.totals.policyCount.toLocaleString()} policies` :
                  `${data.length.toLocaleString()} records`
                }
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FiltersBar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(monthlyData.totals.policyCount)}</div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                {monthlyData.monthlyData.filter(m => m.policyCount > 0).length} active months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Gross Premium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyData.totals.grossPremium)}</div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                Total premium
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Loss Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyData.totals.lossRatio > 80 ? 'text-red-600' : monthlyData.totals.lossRatio > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                {formatPct(monthlyData.totals.lossRatio)}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                Average across all months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Technical Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyData.totals.technicalResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyData.totals.technicalResult)}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                Total technical result
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Performance Breakdown</span>
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
            <div className="overflow-x-auto border rounded-3xl">
              <Table className="min-w-[1100px] text-sm">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Month</TableHead>
                    <TableHead className="text-right font-semibold">Policies</TableHead>
                    <TableHead className="text-right font-semibold">Gross Premium</TableHead>
                    <TableHead className="text-right font-semibold">Incurred Claims</TableHead>
                    <TableHead className="text-right font-semibold">Acquisition %</TableHead>
                    <TableHead className="text-right font-semibold">Loss Ratio</TableHead>
                    <TableHead className="text-right font-semibold">Technical Result</TableHead>
                    <TableHead className="text-right font-semibold">Combined Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.monthlyData.map((month) => (
                    <TableRow key={month.month} className="border-b hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                            {month.month}
                          </span>
                          <span>{monthLabels[month.month - 1]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(month.policyCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrencyNumeric(month.grossPremium)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrencyNumeric(month.incurredClaims)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getValueColor("Acquisition Costs %", month.acquisitionCostPercent)}>
                          {formatPct(month.acquisitionCostPercent)}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right ${getValueColor("Loss Ratio %", month.lossRatio)}`}>
                        {formatPct(month.lossRatio)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={month.technicalResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrencyNumeric(month.technicalResult)}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right ${getValueColor("Combined Ratio %", month.combinedRatio)}`}>
                        {formatPct(month.combinedRatio)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell className="font-medium text-primary">TOTAL</TableCell>
                    <TableCell className="text-right">{formatNumber(monthlyData.totals.policyCount)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyNumeric(monthlyData.totals.grossPremium)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyNumeric(monthlyData.totals.incurredClaims)}</TableCell>
                    <TableCell className="text-right">
                      <span className={getValueColor("Acquisition Costs %", monthlyData.totals.acquisitionCostPercent)}>
                        {formatPct(monthlyData.totals.acquisitionCostPercent)}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right ${getValueColor("Loss Ratio %", monthlyData.totals.lossRatio)}`}>
                      {formatPct(monthlyData.totals.lossRatio)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={monthlyData.totals.technicalResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrencyNumeric(monthlyData.totals.technicalResult)}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right ${getValueColor("Combined Ratio %", monthlyData.totals.combinedRatio)}`}>
                      {formatPct(monthlyData.totals.combinedRatio)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MonthlyOverviewPage() {
  return <MonthlyOverviewContent />;
}