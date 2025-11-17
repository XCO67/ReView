'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2
} from 'lucide-react';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { ChatBot } from '@/components/chat/ChatBot';

interface QuarterlyData {
  quarter: string;
  policyCount: number;
  grossPremium: number;
  acquisitionCost: number;
  acquisitionCostPercent: number;
  incurredClaims: number;
  lossRatio: number;
  technicalResult: number;
  combinedRatio: number;
}

export default function QuarterlyOverviewPage() {
  const [quarterlyData, setQuarterlyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('2021');
  const [availableYears, setAvailableYears] = useState<string[]>(['2019', '2020', '2021']);
  const [filterOptions, setFilterOptions] = useState<any>({
    country: [],
    hub: [],
    region: [],
    cedant: [],
    insured: []
  });

  // Load dimensions for filter options
  useEffect(() => {
    const loadDimensions = async () => {
      try {
        const response = await fetch('/api/dimensions');
        const data = await response.json();
        setFilterOptions({
          country: data.countries || [],
          hub: data.hubs || [],
          region: data.regions || [],
          cedant: data.cedants || [],
          insured: data.insureds || []
        });
        setAvailableYears(data.years || []);
      } catch (error) {
        console.error('Failed to load dimensions:', error);
      }
    };
    loadDimensions();
  }, []);

  // Load quarterly data when year changes
  useEffect(() => {
    const loadQuarterlyData = async () => {
      if (!selectedYear) return;
      
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          year: selectedYear
        });

        const response = await fetch(`/api/quarterly?${params.toString()}`);
        const data = await response.json();
        setQuarterlyData(data);
      } catch (error) {
        console.error('Failed to load quarterly data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuarterlyData();
  }, [selectedYear]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  const handleRefresh = () => {
    if (selectedYear) {
      const loadQuarterlyData = async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams({
            year: selectedYear
          });

          const response = await fetch(`/api/quarterly?${params.toString()}`);
          const data = await response.json();
          setQuarterlyData(data);
        } catch (error) {
          console.error('Failed to load quarterly data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadQuarterlyData();
    }
  };

  const getQuarterLabel = (quarter: number) => {
    return `Q${quarter}`;
  };

  const getQuarterName = (quarter: number) => {
    const names = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
    return names[quarter] || `Q${quarter}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quarterly Overview</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive quarterly performance analysis and insights
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-gray-600">Loading quarterly data...</span>
            </div>
          </div>
        )}

        {/* Quarterly Data Table */}
        {quarterlyData && !isLoading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Policies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(quarterlyData.total?.policyCount || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
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
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Loss Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPct(quarterlyData.total?.lossRatioPct || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Combined Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPct(quarterlyData.total?.combinedRatioPct || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quarterly Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quarter</TableHead>
                      <TableHead className="text-right">Policies</TableHead>
                      <TableHead className="text-right">Gross Premium</TableHead>
                      <TableHead className="text-right">Acquisition Cost</TableHead>
                      <TableHead className="text-right">Acq. Cost %</TableHead>
                      <TableHead className="text-right">Incurred Claims</TableHead>
                      <TableHead className="text-right">Loss Ratio</TableHead>
                      <TableHead className="text-right">Technical Result</TableHead>
                      <TableHead className="text-right">Combined Ratio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4].map((quarter) => {
                      const data = quarterlyData.quarters?.[quarter];
                      if (!data) return null;
                      
                      return (
                        <TableRow key={quarter}>
                          <TableCell className="font-medium">
                            {getQuarterName(quarter)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(data.policyCount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKD(data.premium)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKD(data.acq)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPct(data.acqPct)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKD(data.incurred)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={data.lossRatioPct > 100 ? "destructive" : "secondary"}>
                              {formatPct(data.lossRatioPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={data.technicalResult >= 0 ? "text-green-600" : "text-red-600"}>
                              {formatKD(data.technicalResult)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={data.combinedRatioPct > 100 ? "destructive" : "secondary"}>
                              {formatPct(data.combinedRatioPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Data State */}
        {!quarterlyData && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              No quarterly data available for the selected year.
            </div>
          </div>
        )}

        {/* Chat Bot */}
        <div className="fixed bottom-4 right-4">
          <ChatBot />
        </div>
      </div>
    </div>
  );
}