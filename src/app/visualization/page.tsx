'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { VisualizationFilterDialog } from '@/components/filters/VisualizationFilterDialog';
import { FilterButton } from '@/components/filters/FilterDialog';
import { useReinsuranceData } from '@/hooks/useReinsuranceData';
import { DEFAULT_FILTER_STATE } from '@/lib/constants/filters';
import { extractYear } from '@/lib/utils/date-helpers';

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
  const { currency, convertValue } = useCurrency();

  // Chart visibility state - all charts visible by default
  const [visibleCharts, setVisibleCharts] = useState<Set<ChartType>>(
    new Set(AVAILABLE_CHARTS.map(chart => chart.id))
  );

  // Global Filters using UniversalFilterState
  const [filters, setFilters] = useState<UniversalFilterState>(DEFAULT_FILTER_STATE);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Clear filters function
  const clearFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
  };

  // Load data using shared hook - increased limit to get all years
  const { data, isLoading, error: dataError } = useReinsuranceData({
    limit: 100000,
    autoFetch: true,
  });

  const error = dataError;

  // Global filtered data (applied to all charts) - optimized with early returns
  const filteredData = useMemo(() => {
    // Early return if no filters applied
    const hasFilters = Object.values(filters).some(value => {
      if (value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });

    if (!hasFilters) {
      return data;
    }

    // Apply filters efficiently with early returns
    return data.filter(record => {
      if (filters.office && record.office !== filters.office) return false;
      
      if (filters.extType && filters.extType.length > 0) {
        if (!record.extType || !filters.extType.includes(record.extType)) return false;
      }

      if (filters.policyNature && filters.policyNature.length > 0) {
        if (!record.arrangement || !filters.policyNature.includes(record.arrangement)) return false;
      }

      if (filters.class && filters.class.length > 0) {
        if (!record.className || !filters.class.includes(record.className)) return false;
      }

      if (filters.subClass && filters.subClass.length > 0) {
        if (!record.subClass || !filters.subClass.includes(record.subClass)) return false;
      }

      if (filters.hub && record.hub !== filters.hub) return false;
      if (filters.region && record.region !== filters.region) return false;

      if (filters.country && filters.country.length > 0) {
        if (!record.countryName || !filters.country.includes(record.countryName)) return false;
      }

      if (filters.year) {
        const yearNum = parseInt(filters.year, 10);
        const recordYear = extractYear(record);
        if (recordYear !== yearNum) return false;
      }

      if (filters.broker && record.broker !== filters.broker) return false;
      if (filters.cedant && record.cedant !== filters.cedant) return false;
      if (filters.policyName && record.orgInsuredTrtyName !== filters.policyName) return false;

      return true;
    });
  }, [data, filters]);

  // Active filter count - must be called before any conditional returns
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => {
        if (value === null || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
      })
      .length;
  }, [filters]);

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
      <div className="container mx-auto px-4 py-8 pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Data Insights</h1>
              <div className="mt-2">
                <CurrencyLabel />
              </div>
            </div>
            <FilterButton
              onClick={() => setIsFilterDialogOpen(true)}
              activeFilterCount={activeFilterCount}
            />
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

      {/* Filter Dialog */}
      <VisualizationFilterDialog
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        data={data}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
