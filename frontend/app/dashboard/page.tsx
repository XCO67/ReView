'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SimpleSearchFilter } from '@/components/filters/SimpleSearchFilter';
import { ChatBot } from '@/components/chat/ChatBot';
import { KpiStrip } from '@/components/kpi/KPICard';
import { UyPerformanceTable } from '@/components/tables/UnderwritingYearPerformanceTable';
import { PremiumIncurredLineChart } from '@/components/charts/PremiumIncurredChart';
import { LossRatioBarChart } from '@/components/charts/LossRatioChart';
import { PremiumByExtTypeDonut } from '@/components/charts/PremiumByExtensionTypeChart';
import { TopCedantsList } from '@/components/charts/TopCedantsChart';
import { TopBrokersList } from '@/components/charts/TopBrokersChart';
import { FilterSummary } from '@/components/filters/FilterSummary';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs, calculateUYPerformance, calculateUYPerformanceTotals, filterRecords } from '@/lib/kpi';
// CSV data loading logic removed - new implementation will be added

export default function DashboardPage() {
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Partial<Record<string, string[]>>>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<any>({});

  // Function to clear filters and reload all data
  const clearFiltersAndReload = async () => {
    setFilters({});
    setIsLoading(true);
    try {
      const dataResponse = await fetch(`/api/data?limit=2000`);
      const dataResult = await dataResponse.json();
      console.log('Dashboard - Reloaded all data:', dataResult.data.length, 'records');
      setData(dataResult.data);
    } catch (error) {
      console.error('Failed to reload data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load dimensions and initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load dimensions for filter options
        const dimensionsResponse = await fetch('/api/dimensions');
        const dimensionsData = await dimensionsResponse.json();
        setAvailableYears(dimensionsData.years || []);
        setFilterOptions(dimensionsData);
        
        // Load data for all years (no year filter) - increase limit to get more data
        const dataResponse = await fetch(`/api/data?limit=2000`);
        
        if (!dataResponse.ok) {
          throw new Error(`API request failed: ${dataResponse.status} ${dataResponse.statusText}`);
        }
        
        const dataResult = await dataResponse.json();
        
        // Check if data is properly structured
        if (!dataResult || !dataResult.data || !Array.isArray(dataResult.data)) {
          console.error('Invalid data structure received:', dataResult);
          throw new Error('Invalid data structure received from API');
        }
        
        console.log('Dashboard - Loaded data:', dataResult.data.length, 'records');
        
        // Debug: Show years in the data
        const yearsInData = [...new Set(dataResult.data.map((record: any) => record.uy))].sort();
        console.log('Dashboard - Years in data:', yearsInData);
        
        setData(dataResult.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    const loadFilteredData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        // Add filter parameters
        if (filters.uy && filters.uy.length > 0) {
          params.append('year', filters.uy[0]);
        }
        if (filters.countryName && filters.countryName.length > 0) {
          params.append('country', filters.countryName[0]);
        }
        if (filters.hub && filters.hub.length > 0) {
          params.append('hub', filters.hub[0]);
        }
        if (filters.region && filters.region.length > 0) {
          params.append('region', filters.region[0]);
        }
        if (filters.cedant && filters.cedant.length > 0) {
          params.append('cedant', filters.cedant[0]);
        }
        
        params.append('limit', '2000');
        
        const dataResponse = await fetch(`/api/data?${params.toString()}`);
        
        if (!dataResponse.ok) {
          throw new Error(`API request failed: ${dataResponse.status} ${dataResponse.statusText}`);
        }
        
        const dataResult = await dataResponse.json();
        
        // Check if data is properly structured
        if (!dataResult || !dataResult.data || !Array.isArray(dataResult.data)) {
          console.error('Invalid data structure received:', dataResult);
          throw new Error('Invalid data structure received from API');
        }
        
        console.log('Dashboard - Filtered data:', dataResult.data.length, 'records');
        setData(dataResult.data);
      } catch (error) {
        console.error('Failed to load filtered data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load filtered data if filters are applied
    if (Object.keys(filters).length > 0) {
      loadFilteredData();
    }
  }, [filters]);

  // Use data directly since filtering is done at API level
  const filteredData = useMemo(() => {
    console.log('Dashboard - Displaying data:', data.length, 'records');
    console.log('Dashboard - Active filters:', filters);
    return data;
  }, [data, filters]);

  // Calculate KPIs
  const kpiData = useMemo(() => {
    const kpis = aggregateKPIs(filteredData);
    console.log('Dashboard - KPI Data:', {
      premium: kpis.premium,
      paidClaims: kpis.paidClaims,
      outstandingClaims: kpis.outstandingClaims,
      incurredClaims: kpis.incurredClaims,
      expense: kpis.expense,
      lossRatio: kpis.lossRatio,
      expenseRatio: kpis.expenseRatio,
      combinedRatio: kpis.combinedRatio,
      numberOfAccounts: kpis.numberOfAccounts
    });
    return kpis;
  }, [filteredData]);

  // Calculate UY performance
  const uyPerformance = useMemo(() => {
    return calculateUYPerformance(filteredData);
  }, [filteredData]);

  const uyPerformanceTotals = useMemo(() => {
    return calculateUYPerformanceTotals(uyPerformance);
  }, [uyPerformance]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Reinsurance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance metrics for reinsurance operations
          </p>
        </motion.div>


        {/* Global Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <SimpleSearchFilter
            data={filteredData}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
          />
        </motion.div>

        {/* Filter Summary */}
        {!isLoading && data.length > 0 && (
          <FilterSummary
            totalRecords={data.length}
            filteredRecords={filteredData.length}
            onClearFilters={clearFiltersAndReload}
            className="mb-4"
          />
        )}

        {/* KPI Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <KpiStrip data={kpiData} />
        </motion.div>

        {/* UY Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <UyPerformanceTable
            data={uyPerformance}
            totals={uyPerformanceTotals}
          />
        </motion.div>

        {/* Main Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-8"
        >
          {/* Line Chart: Premium vs Incurred by UY */}
          <PremiumIncurredLineChart data={filteredData} />

          {/* Bar Chart: Loss Ratio % by UY */}
          <LossRatioBarChart data={filteredData} />

          {/* Donut Chart: Premium by Ext Type */}
          <PremiumByExtTypeDonut data={filteredData} />

          {/* Top 10 Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopCedantsList data={filteredData} />
            <TopBrokersList data={filteredData} />
          </div>



        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Loading Your Data
              </h3>
              <p className="text-muted-foreground mb-4">
                Processing your 2019-2021 reinsurance data...
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Loading 3,290+ records and calculating KPIs</p>
                <p className="mt-2">This may take a few moments</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && data.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Data Available
              </h3>
              <p className="text-muted-foreground mb-4">
                The dashboard is ready to display your reinsurance data. 
                Upload your data file to see analytics and insights.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Expected data format: CSV with columns for UY, Ext Type, Broker, Cedant, etc.</p>
                <p className="mt-2">All KPIs will be calculated automatically from your data.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ChatBot */}
        <ChatBot />
      </div>
    </div>
  );
}
