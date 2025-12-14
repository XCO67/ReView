'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SideFilterPanel } from '@/components/filters/SideFilterPanel';
import { ChatBot } from '@/components/chat/ChatBot';
import { KpiStrip } from '@/components/kpi/KPICard';
import { UyPerformanceTable } from '@/components/tables/UnderwritingYearPerformanceTable';
import { TopCedantsList } from '@/components/charts/TopCedantsChart';
import { TopBrokersList } from '@/components/charts/TopBrokersChart';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs, calculateUYPerformance, calculateUYPerformanceTotals } from '@/lib/kpi';

interface FilterState {
  year: string | null;
  extType: string | null;
  country: string | null;
  broker: string | null;
  cedant: string | null;
  region: string | null;
  hub: string | null;
  class: string | null;
  subClass: string | null;
  showMonthly: boolean;
  showQuarterly: boolean;
}

export default function DashboardPage() {
  const [allData, setAllData] = useState<ReinsuranceData[]>([]); // All data for filter options
  const [data, setData] = useState<ReinsuranceData[]>([]); // Filtered data for display
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    year: null,
    extType: null,
    country: null,
    broker: null,
    cedant: null,
    region: null,
    hub: null,
    class: null,
    subClass: null,
    showMonthly: false,
    showQuarterly: false,
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Load all data initially for filter options
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const dataResponse = await fetch(`/api/data?limit=100000`);
        
        if (!dataResponse.ok) {
          throw new Error(`API request failed: ${dataResponse.status} ${dataResponse.statusText}`);
        }
        
        const dataResult = await dataResponse.json();
        
        if (!dataResult || !dataResult.data || !Array.isArray(dataResult.data)) {
          console.error('Invalid data structure received:', dataResult);
          throw new Error('Invalid data structure received from API');
        }
        
        setAllData(dataResult.data);
        setData(dataResult.data); // Initially show all data
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Load filtered data when filters change
  useEffect(() => {
    const loadFilteredData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        
        if (filters.year) params.append('year', filters.year);
        if (filters.country) params.append('country', filters.country);
        if (filters.region) params.append('region', filters.region);
        if (filters.hub) params.append('hub', filters.hub);
        if (filters.cedant) params.append('cedant', filters.cedant);
        
        params.append('limit', '100000');
        
        const dataResponse = await fetch(`/api/data?${params.toString()}`);
        
        if (!dataResponse.ok) {
          throw new Error(`API request failed: ${dataResponse.status} ${dataResponse.statusText}`);
        }
        
        const dataResult = await dataResponse.json();
        
        if (!dataResult || !dataResult.data || !Array.isArray(dataResult.data)) {
          console.error('Invalid data structure received:', dataResult);
          throw new Error('Invalid data structure received from API');
        }
        
        let filtered = dataResult.data;
        
        // Apply client-side filters for extType, broker, class, and subClass (not in API yet)
        if (filters.extType && Array.isArray(filters.extType) && filters.extType.length > 0) {
          filtered = filtered.filter((d: ReinsuranceData) => d.extType && filters.extType!.includes(d.extType));
        }
        if (filters.broker) {
          filtered = filtered.filter((d: ReinsuranceData) => d.broker === filters.broker);
        }
        if (filters.class && Array.isArray(filters.class) && filters.class.length > 0) {
          filtered = filtered.filter((d: ReinsuranceData) => d.className && filters.class!.includes(d.className));
        }
        if (filters.subClass && Array.isArray(filters.subClass) && filters.subClass.length > 0) {
          filtered = filtered.filter((d: ReinsuranceData) => d.subClass && filters.subClass!.includes(d.subClass));
        }
        
        setData(filtered);
      } catch (error) {
        console.error('Failed to load filtered data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (allData.length > 0) {
      loadFilteredData();
    }
  }, [filters, allData.length]);

  // Function to clear filters
  const clearFilters = () => {
    setFilters({
      year: null,
      extType: null,
      country: null,
      broker: null,
      cedant: null,
      region: null,
      hub: null,
      class: null,
      subClass: null,
      showMonthly: false,
      showQuarterly: false,
    });
  };

  // Filtered data (already filtered by API, but keeping for consistency)
  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  // Calculate KPIs
  const kpiData = useMemo(() => {
    const kpis = aggregateKPIs(filteredData);
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
      {/* Side Filter Panel */}
      <SideFilterPanel
        isOpen={isFilterPanelOpen}
        onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
        data={allData}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                General Overview
              </h1>
            </div>
            {Object.entries(filters).some(([key, value]) => 
              key !== 'showMonthly' && 
              key !== 'showQuarterly' && 
              value !== null && 
              value !== ''
            ) && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active Filters</p>
                <p className="text-lg font-semibold text-foreground">
                  {Object.entries(filters).filter(([key, value]) => 
                    key !== 'showMonthly' && 
                    key !== 'showQuarterly' && 
                    value !== null && 
                    value !== ''
                  ).length} applied
                </p>
              </div>
            )}
          </div>
        </motion.div>

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
            showMonthly={filters.showMonthly}
            showQuarterly={filters.showQuarterly}
            rawData={filteredData}
          />
        </motion.div>

        {/* Top 10 Lists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <TopCedantsList data={filteredData} />
          <TopBrokersList data={filteredData} />
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
                Processing reinsurance data...
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Loading records and calculating KPIs</p>
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
                No data available. Please check if the CSV file is properly loaded.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Expected CSV: ULTIMATE DATA .csv</p>
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
