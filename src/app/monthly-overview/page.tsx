"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Calendar,
  Minus,
  Loader2,
  Clock,
  AlertCircle
} from "lucide-react";
import { formatKD, formatKDNumeric, formatPct, formatNumber } from "@/lib/format";
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

export default function MonthlyOverviewPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyOverviewData | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(d => d.uy).filter(Boolean))].sort();
    return years;
  }, [data]);

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
        console.log('Monthly Overview - Loaded data:', dataResult.data.length, 'records');
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

    // Filter data by selected year
    const filteredData = selectedYear === 'all' 
      ? data 
      : data.filter(record => record.uy === selectedYear);

    console.log('Monthly Overview - Filtered data:', {
      selectedYear,
      totalRecords: data.length,
      filteredRecords: filteredData.length
    });

    if (filteredData.length === 0) return null;

    // Group data by month using inceptionMonth (already parsed from comDate)
    const monthlyGroups: Record<number, ReinsuranceData[]> = {};
    
    filteredData.forEach(record => {
      // Use inceptionMonth if available (already parsed from comDate)
      const monthNumber = record.inceptionMonth 
        ? getMonthNumberFromName(record.inceptionMonth)
        : 0;
      
      if (monthNumber > 0) {
        if (!monthlyGroups[monthNumber]) {
          monthlyGroups[monthNumber] = [];
        }
        monthlyGroups[monthNumber].push(record);
      }
    });

    console.log('Monthly Overview - Monthly groups:', {
      selectedYear,
      totalFilteredRecords: filteredData.length,
      recordsWithInceptionMonth: filteredData.filter(r => r.inceptionMonth).length,
      availableMonths: Object.keys(monthlyGroups).map(Number).sort(),
      monthCounts: Object.entries(monthlyGroups).map(([month, records]) => ({
        month: Number(month),
        monthName: monthLabels[Number(month) - 1],
        count: records.length
      }))
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

      // Debug logging for months with data
      if (monthRecords.length > 0) {
        console.log(`${selectedYear} - Month ${month} (${monthLabels[month-1]}):`, {
          records: monthRecords.length,
          premium: kpis.premium,
          claims: kpis.incurredClaims,
          lossRatio: kpis.lossRatio,
          sampleMonths: monthRecords.slice(0, 3).map(r => r.inceptionMonth)
        });
      }
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

    console.log('Monthly Overview - Final result:', {
      selectedYear,
      totalRecords: filteredData.length,
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
  }, [data, selectedYear]);

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
                  Monthly Overview {selectedYear !== 'all' ? `- ${selectedYear}` : '- All Years'}
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

        {/* Year Filter */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Year:</span>
              </div>
              <div className="min-w-[120px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

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
                Monthly Overview {selectedYear !== 'all' ? `- ${selectedYear}` : '- All Years'}
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

      {/* Year Filter */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Year:</span>
            </div>
            <div className="min-w-[120px]">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

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
                {selectedYear !== 'all' ? selectedYear : 'All Years'} • {monthlyData.monthlyData.filter(m => m.policyCount > 0).length} active months
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
              <div className="text-2xl font-bold">{formatKD(monthlyData.totals.grossPremium)}</div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                {selectedYear !== 'all' ? selectedYear : 'All Years'} data
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
                {selectedYear !== 'all' ? selectedYear : 'All Years'} average
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
                {formatKD(monthlyData.totals.technicalResult)}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Minus className="w-3 h-3" />
                {selectedYear !== 'all' ? selectedYear : 'All Years'} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Performance Table */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Monthly Performance Metrics - {selectedYear !== 'all' ? selectedYear : 'All Years'}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div>Detailed breakdown of key performance indicators by month</div>
              <div className="text-xs text-muted-foreground/80">All monetary values shown in KWD.</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="table-fixed w-full min-w-[1400px] border-collapse text-sm border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] font-semibold text-left px-4 py-3 bg-muted/50">Metric</TableHead>
                    {monthLabels.map((month) => (
                      <TableHead key={month} className="text-center font-semibold w-[120px] px-2 py-3 bg-muted/30">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold w-[120px] bg-muted px-2 py-3">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Policy Premium Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Policy Premium</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                        {formatKDNumeric(month.grossPremium)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                      {formatKDNumeric(monthlyData.totals.grossPremium)}
                    </TableCell>
                  </TableRow>

                  {/* Gross Premium Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Gross Premium</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                        {formatKDNumeric(month.grossPremium)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                      {formatKDNumeric(monthlyData.totals.grossPremium)}
                    </TableCell>
                  </TableRow>

                  {/* Acquisition Costs % Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Acquisition Costs %</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                        {formatPct(month.acquisitionCostPercent)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                      {formatPct(monthlyData.totals.acquisitionCostPercent)}
                    </TableCell>
                  </TableRow>

                  {/* Incurred Claims Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Incurred Claims</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                        {formatKDNumeric(month.incurredClaims)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                      {formatKDNumeric(monthlyData.totals.incurredClaims)}
                    </TableCell>
                  </TableRow>

                  {/* Loss Ratio % Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Loss Ratio %</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className={`text-center w-[120px] px-2 py-3 ${getValueColor("Loss Ratio %", month.lossRatio)}`}>
                        {formatPct(month.lossRatio)}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center font-semibold bg-muted w-[120px] px-2 py-3 ${getValueColor("Loss Ratio %", monthlyData.totals.lossRatio)}`}>
                      {formatPct(monthlyData.totals.lossRatio)}
                    </TableCell>
                  </TableRow>

                  {/* Technical Result Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Technical Result</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className={`text-center w-[120px] px-2 py-3 ${month.technicalResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatKDNumeric(month.technicalResult)}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center font-semibold bg-muted w-[120px] px-2 py-3 ${monthlyData.totals.technicalResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatKDNumeric(monthlyData.totals.technicalResult)}
                    </TableCell>
                  </TableRow>

                  {/* Combined Ratio % Row */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium w-[180px] px-4 py-3">Combined Ratio %</TableCell>
                    {monthlyData.monthlyData.map((month) => (
                      <TableCell key={month.month} className={`text-center w-[120px] px-2 py-3 ${getValueColor("Combined Ratio %", month.combinedRatio)}`}>
                        {formatPct(month.combinedRatio)}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center font-semibold bg-muted w-[120px] px-2 py-3 ${getValueColor("Combined Ratio %", monthlyData.totals.combinedRatio)}`}>
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