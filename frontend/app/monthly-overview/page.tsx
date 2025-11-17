"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
  Download, 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  ChevronDown,
  Clock,
  BarChart3,
  AlertCircle
} from "lucide-react";
import { formatKD, formatPct, formatNumber } from "@/lib/format";

const monthLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface FilterState {
  country: string[];
  hub: string[];
  region: string[];
  cedant: string[];
  insured: string[];
  year: string[];
}

export default function MonthlyOverviewPage() {
  const [monthlyData, setMonthlyData] = useState<unknown>(null);
  const [availableYears] = useState<string[]>(['2019', '2020', '2021']);
  const [loading] = useState(false);
  const [insights] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    hub: [],
    region: [],
    cedant: [],
    insured: [],
    year: []
  });

  // Initialize with empty state - new CSV logic will be implemented
  useEffect(() => {
    // Placeholder for new CSV implementation
    setMonthlyData(null);
    setLastUpdated(new Date());
  }, []);

  // Placeholder for new filter logic
  const filteredData = useMemo(() => {
    // New CSV filter logic will be implemented here
    return [];
  }, [filters]);

  // Placeholder for new filter options logic
  const filterOptions = useMemo(() => {
    // New CSV filter options logic will be implemented here
    return {
      country: [],
      hub: [],
      region: [],
      cedant: [],
      insured: [],
      year: availableYears
    };
  }, [availableYears]);

  // Placeholder for new monthly data calculation logic
  useEffect(() => {
    // New CSV monthly data calculation logic will be implemented here
    console.log('Monthly data calculation - new logic to be implemented');
  }, [filteredData, filters.year, availableYears]);

  // Show notification when filters are applied but no data matches
  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);
  const showNoDataNotification = hasActiveFilters && filteredData.length === 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getValueColor = (metric: string, value: number) => {
    if (metric === "Loss Ratio %" || metric === "Combined Ratio %") {
      if (value > 100) return "text-red-600";
      if (value > 80) return "text-yellow-600";
      return "text-green-600";
    }
    return "text-gray-900 dark:text-gray-100";
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FilterState, values: string[]) => {
    const normalizedValues = values.map(v => v.toLowerCase().trim());
    
    setFilters(prev => ({
      ...prev,
      [filterType]: normalizedValues
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      country: [],
      hub: [],
      region: [],
      cedant: [],
      insured: [],
      year: []
    });
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
              {/* Left side - Title */}
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-foreground">
                  Monthly Overview {filters.year.length > 0 ? `- ${filters.year[0]}` : '- All Years'}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {filteredData.length.toLocaleString()} records
                </Badge>
              </div>

              {/* Right side - Timestamp */}
              <div className="flex items-center space-x-4">
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
            {/* Active Filters Display */}
            {Object.values(filters).some(arr => arr.length > 0) && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Filters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.country.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Country: {filters.country[0]}
                    </Badge>
                  )}
                  {filters.hub.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Hub: {filters.hub[0]}
                    </Badge>
                  )}
                  {filters.region.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Region: {filters.region[0]}
                    </Badge>
                  )}
                  {filters.cedant.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Cedant: {filters.cedant[0]}
                    </Badge>
                  )}
                  {filters.insured.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Insured: {filters.insured[0]}
                    </Badge>
                  )}
                  {filters.year.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Year: {filters.year[0]}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              {/* Country Filter */}
              <div className="min-w-[120px]">
                <Select
                  value={filters.country.length > 0 ? filters.country[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('country', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {filters.country.length > 0 && (
                      <>
                        <SelectItem value={filters.country[0]} className="bg-muted">
                          ✓ {filters.country[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.country.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hub Filter */}
              <div className="min-w-[100px]">
                <Select
                  value={filters.hub.length > 0 ? filters.hub[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('hub', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hubs</SelectItem>
                    {filters.hub.length > 0 && (
                      <>
                        <SelectItem value={filters.hub[0]} className="bg-muted">
                          ✓ {filters.hub[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.hub.map(hub => (
                      <SelectItem key={hub} value={hub}>
                        {hub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Filter */}
              <div className="min-w-[100px]">
                <Select
                  value={filters.region.length > 0 ? filters.region[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('region', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {filters.region.length > 0 && (
                      <>
                        <SelectItem value={filters.region[0]} className="bg-muted">
                          ✓ {filters.region[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.region.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cedant Filter */}
              <div className="min-w-[120px]">
                <Select
                  value={filters.cedant.length > 0 ? filters.cedant[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('cedant', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Cedant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cedants</SelectItem>
                    {filters.cedant.length > 0 && (
                      <>
                        <SelectItem value={filters.cedant[0]} className="bg-muted">
                          ✓ {filters.cedant[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.cedant.map(cedant => (
                      <SelectItem key={cedant} value={cedant}>
                        {cedant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Insured Filter */}
              <div className="min-w-[120px]">
                <Select
                  value={filters.insured.length > 0 ? filters.insured[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('insured', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Insured" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Insured</SelectItem>
                    {filters.insured.length > 0 && (
                      <>
                        <SelectItem value={filters.insured[0]} className="bg-muted">
                          ✓ {filters.insured[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.insured.map(insured => (
                      <SelectItem key={insured} value={insured}>
                        {insured}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="min-w-[100px]">
                <Select
                  value={filters.year.length > 0 ? filters.year[0] : 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('year', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {filters.year.length > 0 && (
                      <>
                        <SelectItem value={filters.year[0]} className="bg-muted">
                          ✓ {filters.year[0]} (Active)
                        </SelectItem>
                        <div className="border-t my-1" />
                      </>
                    )}
                    {filterOptions.year.map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset</span>
              </Button>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {Object.values(filters).some(arr => arr.length > 0) && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)} active
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isFilterDrawerOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              
              {/* Mobile Active Filters Display */}
              {Object.values(filters).some(arr => arr.length > 0) && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {filters.country.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Country: {filters.country[0]}
                      </Badge>
                    )}
                    {filters.hub.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Hub: {filters.hub[0]}
                      </Badge>
                    )}
                    {filters.region.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Region: {filters.region[0]}
                      </Badge>
                    )}
                    {filters.cedant.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Cedant: {filters.cedant[0]}
                      </Badge>
                    )}
                    {filters.insured.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Insured: {filters.insured[0]}
                      </Badge>
                    )}
                    {filters.year.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Year: {filters.year[0]}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Filter Drawer */}
          {isFilterDrawerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-muted/50 p-4 space-y-4"
            >
              <div className="text-sm text-muted-foreground">
                Mobile filter implementation would go here
              </div>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* No Data Notification */}
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Data Matches Your Filters
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filter criteria to see monthly performance data. 
                  You can reset all filters or modify individual selections.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={resetFilters} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset All Filters
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  <p>Current filters:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(filters).map(([key, values]) => {
                      if (values.length > 0) {
                        return values.map((value: string, index: number) => (
                          <Badge key={`${key}-${index}`} variant="secondary" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ));
                      }
                      return null;
                    })}
                  </div>
                </div>
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
            {/* Left side - Title */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-foreground">
                Monthly Overview {filters.year.length > 0 ? `- ${filters.year[0]}` : '- All Years'}
              </h1>
              <Badge variant="outline" className="text-xs">
                {filteredData.length.toLocaleString()} records
              </Badge>
            </div>

            {/* Right side - Timestamp */}
            <div className="flex items-center space-x-4">
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
          {/* Active Filters Display */}
          {Object.values(filters).some(arr => arr.length > 0) && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.country.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Country: {filters.country[0]}
                  </Badge>
                )}
                {filters.hub.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Hub: {filters.hub[0]}
                  </Badge>
                )}
                {filters.region.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Region: {filters.region[0]}
                  </Badge>
                )}
                {filters.cedant.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Cedant: {filters.cedant[0]}
                  </Badge>
                )}
                {filters.insured.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Insured: {filters.insured[0]}
                  </Badge>
                )}
                {filters.year.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Year: {filters.year[0]}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            {/* Country Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.country.length > 0 ? filters.country[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('country', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {filters.country.length > 0 && (
                    <>
                      <SelectItem value={filters.country[0]} className="bg-muted">
                        ✓ {filters.country[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.country.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hub Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.hub.length > 0 ? filters.hub[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('hub', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs</SelectItem>
                  {filters.hub.length > 0 && (
                    <>
                      <SelectItem value={filters.hub[0]} className="bg-muted">
                        ✓ {filters.hub[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.hub.map(hub => (
                    <SelectItem key={hub} value={hub}>
                      {hub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.region.length > 0 ? filters.region[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('region', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {filters.region.length > 0 && (
                    <>
                      <SelectItem value={filters.region[0]} className="bg-muted">
                        ✓ {filters.region[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.region.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cedant Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.cedant.length > 0 ? filters.cedant[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('cedant', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Cedant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cedants</SelectItem>
                  {filters.cedant.length > 0 && (
                    <>
                      <SelectItem value={filters.cedant[0]} className="bg-muted">
                        ✓ {filters.cedant[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.cedant.map(cedant => (
                    <SelectItem key={cedant} value={cedant}>
                      {cedant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Insured Filter */}
            <div className="min-w-[120px]">
              <Select
                value={filters.insured.length > 0 ? filters.insured[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('insured', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Insured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Insured</SelectItem>
                  {filters.insured.length > 0 && (
                    <>
                      <SelectItem value={filters.insured[0]} className="bg-muted">
                        ✓ {filters.insured[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.insured.map(insured => (
                    <SelectItem key={insured} value={insured}>
                      {insured}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="min-w-[100px]">
              <Select
                value={filters.year.length > 0 ? filters.year[0] : 'all'}
                onValueChange={(value) => 
                  handleFilterChange('year', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {filters.year.length > 0 && (
                    <>
                      <SelectItem value={filters.year[0]} className="bg-muted">
                        ✓ {filters.year[0]} (Active)
                      </SelectItem>
                      <div className="border-t my-1" />
                    </>
                  )}
                  {filterOptions.year.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
                {Object.values(filters).some(arr => arr.length > 0) && (
                  <Badge variant="secondary" className="text-xs">
                    {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)} active
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterDrawerOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>
            
            {/* Mobile Active Filters Display */}
            {Object.values(filters).some(arr => arr.length > 0) && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {filters.country.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Country: {filters.country[0]}
                    </Badge>
                  )}
                  {filters.hub.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Hub: {filters.hub[0]}
                    </Badge>
                  )}
                  {filters.region.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Region: {filters.region[0]}
                    </Badge>
                  )}
                  {filters.cedant.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Cedant: {filters.cedant[0]}
                    </Badge>
                  )}
                  {filters.insured.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Insured: {filters.insured[0]}
                    </Badge>
                  )}
                  {filters.year.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Year: {filters.year[0]}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isFilterDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t bg-muted/50 p-4 space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Mobile filter implementation would go here
            </div>
          </motion.div>
        )}
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
              {filters.year.length > 0 ? filters.year[0] : 'All Years'} data
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
              {filters.year.length > 0 ? filters.year[0] : 'All Years'} data
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
              {formatPercentage(monthlyData.totals.lossRatio)}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Minus className="w-3 h-3" />
              {filters.year.length > 0 ? filters.year[0] : 'All Years'} average
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
              {filters.year.length > 0 ? filters.year[0] : 'All Years'} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Monthly Performance Metrics - {filters.year.length > 0 ? filters.year[0] : 'All Years'}
          </CardTitle>
          <CardDescription>
            Detailed breakdown of key performance indicators by month
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
                {/* Policy Count Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-medium w-[180px] px-4 py-3">Policy Count</TableCell>
                  {monthlyData.monthlyData.map((month: any) => (
                    <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                      {formatNumber(month.policyCount)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                    {formatNumber(monthlyData.totals.policyCount)}
                  </TableCell>
                </TableRow>

                {/* Gross Premium Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-medium w-[180px] px-4 py-3">Gross Premium</TableCell>
                  {monthlyData.monthlyData.map((month: any) => (
                    <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                      {formatKD(month.grossPremium)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                    {formatKD(monthlyData.totals.grossPremium)}
                  </TableCell>
                </TableRow>

                {/* Acquisition Cost % Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-medium w-[180px] px-4 py-3">Acquisition Cost %</TableCell>
                  {monthlyData.monthlyData.map((month: any) => (
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
                  {monthlyData.monthlyData.map((month: any) => (
                    <TableCell key={month.month} className="text-center w-[120px] px-2 py-3">
                      {formatKD(month.incurredClaims)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold bg-muted w-[120px] px-2 py-3">
                    {formatKD(monthlyData.totals.incurredClaims)}
                  </TableCell>
                </TableRow>

                {/* Loss Ratio % Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-medium w-[180px] px-4 py-3">Loss Ratio %</TableCell>
                  {monthlyData.monthlyData.map((month: any) => (
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
                  {monthlyData.monthlyData.map((month: any) => (
                    <TableCell key={month.month} className={`text-center w-[120px] px-2 py-3 ${month.technicalResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatKD(month.technicalResult)}
                    </TableCell>
                  ))}
                  <TableCell className={`text-center font-semibold bg-muted w-[120px] px-2 py-3 ${monthlyData.totals.technicalResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatKD(monthlyData.totals.technicalResult)}
                  </TableCell>
                </TableRow>

                {/* Combined Ratio % Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-medium w-[180px] px-4 py-3">Combined Ratio %</TableCell>
                  {monthlyData.monthlyData.map((month: any) => (
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

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={`${insights?.growthTrend === 'positive' ? 'bg-green-50 text-green-700 border-green-200' : insights?.growthTrend === 'negative' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                {insights?.growthTrend === 'positive' ? <TrendingUp className="w-3 h-3 mr-1" /> : insights?.growthTrend === 'negative' ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                {insights?.growthTrend === 'positive' ? 'Growing' : insights?.growthTrend === 'negative' ? 'Declining' : 'Stable'}
              </Badge>
              <div>
                <p className="font-medium">Premium Trend</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {insights?.growthTrend === 'positive' ? 'Strong growth pattern observed throughout the year.' : 
                   insights?.growthTrend === 'negative' ? 'Declining trend in premium collection.' : 
                   'Stable premium collection with consistent performance.'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={`${monthlyData.totals.lossRatio > 80 ? 'bg-red-50 text-red-700 border-red-200' : monthlyData.totals.lossRatio > 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {monthlyData.totals.lossRatio > 80 ? <TrendingUp className="w-3 h-3 mr-1" /> : monthlyData.totals.lossRatio > 60 ? <Minus className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {monthlyData.totals.lossRatio > 80 ? 'High' : monthlyData.totals.lossRatio > 60 ? 'Moderate' : 'Low'}
              </Badge>
              <div>
                <p className="font-medium">Loss Ratio Performance</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Average loss ratio of {formatPercentage(monthlyData.totals.lossRatio)} indicates {monthlyData.totals.lossRatio > 80 ? 'concerning' : monthlyData.totals.lossRatio > 60 ? 'acceptable' : 'excellent'} underwriting performance.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={`${monthlyData.totals.technicalResult > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {monthlyData.totals.technicalResult > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {monthlyData.totals.technicalResult > 0 ? 'Profitable' : 'Loss'}
              </Badge>
              <div>
                <p className="font-medium">Technical Result</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {monthlyData.totals.technicalResult > 0 ? 'Positive technical result of ' + formatCurrency(monthlyData.totals.technicalResult) + ' shows strong profitability.' : 'Negative technical result indicates underwriting losses.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthlyData.totals.acquisitionCostPercent > 15 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Optimize Acquisition Costs
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Acquisition cost of {formatPercentage(monthlyData.totals.acquisitionCostPercent)} is high. Consider reviewing broker commissions.
                </p>
              </div>
            )}
            
            {monthlyData.totals.lossRatio <= 70 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Maintain Underwriting Standards
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Excellent loss ratio performance - continue current underwriting practices.
                </p>
              </div>
            )}
            
            {monthlyData.totals.combinedRatio > 90 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Monitor Combined Ratio
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Combined ratio of {formatPercentage(monthlyData.totals.combinedRatio)} needs attention.
                </p>
              </div>
            )}

            {insights && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Best Performance Month
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  {insights.bestMonth} showed the best loss ratio performance for the year.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
