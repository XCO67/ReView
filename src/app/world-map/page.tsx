'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Map,
  RefreshCw,
  Loader2,
  Clock,
  BarChart3,
  Info,
  Globe
} from 'lucide-react';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { ChatBot } from '@/components/chat/ChatBot';
import WorldMap from '@/components/charts/WorldMap';

interface CountryData {
  country: string;
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
  brokers: string[];
  cedants: string[];
  regions: string[];
  hubs: string[];
}

interface WorldMapResponse {
  countries: CountryData[];
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

export default function WorldMapPage() {
  const [worldData, setWorldData] = useState<WorldMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  // Load world map data
  useEffect(() => {
    loadWorldData();
  }, []);

  const loadWorldData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/world-map');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWorldData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('World Map - Failed to load world data:', error);
      setWorldData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWorldData();
  };

  // Get badge variant for ratios
  const getRatioBadgeVariant = (value: number) => {
    if (value > 100) return 'destructive';
    if (value > 80) return 'secondary';
    return 'default';
  };

  // Get top countries by policy count
  const topCountries = useMemo(() => {
    if (!worldData?.countries) return [];
    return worldData.countries
      .sort((a, b) => b.policyCount - a.policyCount)
      .slice(0, 10);
  }, [worldData]);

  // Get max policy count for color scaling
  const maxPolicies = useMemo(() => {
    if (!worldData?.countries) return 1;
    return Math.max(...worldData.countries.map(c => c.policyCount), 1);
  }, [worldData]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">World Map</h1>
                  <p className="text-sm text-muted-foreground">Global reinsurance coverage visualization</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reload world map data</p>
                  </TooltipContent>
                </Tooltip>

                {lastUpdated && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                )}
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
                <span className="text-muted-foreground">Loading world map data...</span>
              </div>
            </div>
          )}

          {/* World Map Data */}
          {worldData && !isLoading && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Countries</p>
                        <p className="text-2xl font-bold">{worldData.countries?.length || 0}</p>
                      </div>
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Policies</p>
                        <p className="text-2xl font-bold">{formatNumber(worldData.total?.policyCount || 0)}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Premium</p>
                        <p className="text-2xl font-bold">{formatKD(worldData.total?.premium || 0)}</p>
                      </div>
                      <Map className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Combined Ratio</p>
                        <p className={`text-2xl font-bold ${
                          (worldData.total?.combinedRatioPct || 0) > 100 ? 'text-red-600' :
                          (worldData.total?.combinedRatioPct || 0) > 80 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {formatPct(worldData.total?.combinedRatioPct || 0)}
                        </p>
                      </div>
                      <Info className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive World Map */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Map className="h-5 w-5" />
                      Global Policy Distribution
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Interactive world map showing policy distribution by country. Hover over countries to see details, click to select, and use zoom controls to explore.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    {selectedCountry && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCountry(null)}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative" style={{ minHeight: '600px' }}>
                    <WorldMap
                      data={worldData.countries || []}
                      onCountryHover={setHoveredCountry}
                      onCountryClick={setSelectedCountry}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Selected Country Details */}
              {selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Map className="h-5 w-5" />
                        {selectedCountry.country} - Detailed Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Core Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Policies</span>
                              <span className="font-semibold">{formatNumber(selectedCountry.policyCount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Premium</span>
                              <span className="font-semibold">{formatKD(selectedCountry.premium)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Acquisition</span>
                              <span className="font-semibold">{formatKD(selectedCountry.acquisition)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Claims</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Paid Claims</span>
                              <span className="font-semibold">{formatKD(selectedCountry.paidClaims)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Outstanding</span>
                              <span className="font-semibold">{formatKD(selectedCountry.osLoss)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Incurred</span>
                              <span className="font-semibold">{formatKD(selectedCountry.incurredClaims)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Performance</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Loss Ratio</span>
                              <Badge variant={getRatioBadgeVariant(selectedCountry.lossRatioPct)}>
                                {formatPct(selectedCountry.lossRatioPct)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Combined Ratio</span>
                              <Badge variant={getRatioBadgeVariant(selectedCountry.combinedRatioPct)}>
                                {formatPct(selectedCountry.combinedRatioPct)}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Technical Result</span>
                              <span className={`font-semibold ${
                                selectedCountry.technicalResult >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatKD(selectedCountry.technicalResult)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.brokers.length}</div>
                          <div className="text-sm text-muted-foreground">Brokers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.cedants.length}</div>
                          <div className="text-sm text-muted-foreground">Cedants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.regions.length}</div>
                          <div className="text-sm text-muted-foreground">Regions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedCountry.hubs.length}</div>
                          <div className="text-sm text-muted-foreground">Hubs</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Top Countries Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Countries by Policy Count
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Top 10 countries ranked by number of policies</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/80">
                    All monetary values shown in KWD.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Policies</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead className="text-right">Loss Ratio</TableHead>
                          <TableHead className="text-right">Combined Ratio</TableHead>
                          <TableHead className="text-right">Brokers</TableHead>
                          <TableHead className="text-right">Cedants</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCountries.map((country, index) => (
                          <TableRow 
                            key={country.country} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedCountry(country)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{country.country}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(country.policyCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatKDNumeric(country.premium)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(country.lossRatioPct)}>
                                {formatPct(country.lossRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getRatioBadgeVariant(country.combinedRatioPct)}>
                                {formatPct(country.combinedRatioPct)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {country.brokers.length}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {country.cedants.length}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Data State */}
          {!worldData && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Map className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No World Map Data Available</h3>
              <p className="text-sm mb-4">Unable to load world map data. Please try refreshing.</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* ChatBot */}
        <ChatBot />
      </div>
    </TooltipProvider>
  );
}
