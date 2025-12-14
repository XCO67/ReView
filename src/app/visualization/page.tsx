'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { ReinsuranceData } from '@/lib/schema';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { QuadrantChart } from '@/components/charts/QuadrantChart';
import { PremiumIncurredLineChart } from '@/components/charts/PremiumIncurredChart';
import { LossRatioBarChart } from '@/components/charts/LossRatioChart';
import { PremiumByExtTypeDonut } from '@/components/charts/PremiumByExtensionTypeChart';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';
import { TopFilterPanel } from '@/components/filters/TopFilterPanel';

type ChartType = 'quadrant' | 'premiumIncurred' | 'lossRatio' | 'premiumByExtType';

interface ChartConfig {
  id: ChartType;
  label: string;
  component: React.ComponentType<{ data: ReinsuranceData[] }>;
}

const AVAILABLE_CHARTS: ChartConfig[] = [
  { id: 'quadrant', label: 'Quadrant Chart', component: QuadrantChart },
  { id: 'premiumIncurred', label: 'Premium vs Incurred', component: PremiumIncurredLineChart },
  { id: 'lossRatio', label: 'Loss Ratio % by UY', component: LossRatioBarChart },
  { id: 'premiumByExtType', label: 'Premium by Ext Type', component: PremiumByExtTypeDonut },
];

export default function VisualizationPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currency, convertValue } = useCurrency();

  // Chart visibility state - all charts visible by default
  const [visibleCharts, setVisibleCharts] = useState<Set<ChartType>>(
    new Set(AVAILABLE_CHARTS.map(chart => chart.id))
  );

  // Global Filters using UniversalFilterState
  const [filters, setFilters] = useState<UniversalFilterState>({
    office: null,
    extType: null,
    policyNature: null,
    class: null,
    subClass: null,
    hub: null,
    region: null,
    country: null,
    year: null,
    month: null,
    quarter: null,
    broker: null,
    cedant: null,
    policyName: null,
  });

  // Clear filters function
  const clearFilters = () => {
    setFilters({
      office: null,
      extType: null,
      policyNature: null,
      class: null,
      subClass: null,
      hub: null,
      region: null,
      country: null,
      year: null,
      month: null,
      quarter: null,
      broker: null,
      cedant: null,
      policyName: null,
    });
  };


  // Load data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/data?limit=50000', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Global filtered data (applied to all charts)
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

  // Toggle chart visibility
  const toggleChart = (chartId: ChartType) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  };

  // Close chart
  const closeChart = (chartId: ChartType) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(chartId);
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading visualization data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Filter Panel */}
      <TopFilterPanel
        data={data}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Data Insights</h1>
            <div className="mt-2">
              <CurrencyLabel />
            </div>
          </div>

          {/* Chrome-like Chart Tabs */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="bg-muted/30 rounded-t-lg border-b border-border/50 p-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                  {AVAILABLE_CHARTS.map((chart) => {
                    const isVisible = visibleCharts.has(chart.id);
                    return (
                      <button
                        key={chart.id}
                        onClick={() => toggleChart(chart.id)}
                        className={cn(
                          "relative px-4 py-2 rounded-t-lg border border-b-0 transition-all duration-200 text-sm font-medium whitespace-nowrap",
                          "first:ml-0",
                          isVisible
                            ? "bg-background border-border shadow-[0_-2px_8px_rgba(0,0,0,0.05)] text-foreground z-10 -mb-px"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground/80"
                        )}
                      >
                        {chart.label}
                        {isVisible && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Display Area */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {AVAILABLE_CHARTS.map((chart) => {
                if (!visibleCharts.has(chart.id)) return null;
                
                const ChartComponent = chart.component;
                // All charts use the globally filtered data
                const chartData = filteredData;
                
                return (
                  <motion.div
                    key={chart.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    <div className="relative">
                      {/* Wrap chart in a container to add close button in header */}
                      <div className="relative">
                        {chart.id === 'quadrant' ? (
                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                              <div className="flex-1">
                                <CardTitle>Quadrant Chart</CardTitle>
                                <CardDescription className="mt-1">Max Liability vs Premium (colored by Loss Ratio)</CardDescription>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-all"
                                onClick={() => closeChart(chart.id)}
                                title="Close chart"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </CardHeader>
                            <CardContent>
                              {/* Render chart content without Card wrapper */}
                              <QuadrantChart data={chartData} noCard={true} />
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="relative">
                            <ChartComponent data={chartData} />
                            {/* Close button positioned at absolute top-right corner of the Card */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-background border shadow-md hover:bg-destructive hover:text-destructive-foreground transition-all z-[100]"
                              onClick={() => closeChart(chart.id)}
                              title="Close chart"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {visibleCharts.size === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg"
              >
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No charts selected</p>
                  <p className="text-sm">Select charts from the tabs above to start visualizing your data</p>
                </div>
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
