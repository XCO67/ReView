'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { RotateCcw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface WorldMapProps {
  data: CountryData[];
  onCountryHover?: (country: CountryData | null) => void;
  onCountryClick?: (country: CountryData | null) => void;
}

export default function WorldMap({ data, onCountryHover, onCountryClick }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    country: CountryData;
  } | null>(null);

  // Create a map of country data for quick lookup
  const countryDataMap = useMemo(() => {
    const map = new Map<string, CountryData>();
    data.forEach(country => {
      map.set(country.country.toLowerCase(), country);
    });
    return map;
  }, [data]);

  // Get max policy count for color scaling
  const maxPolicies = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.policyCount), 1);
  }, [data]);

  // Color scale function - using bright, vibrant colors
  const getColor = useMemo(() => {
    return (policyCount: number) => {
      if (policyCount === 0) return '#9ca3af'; // Medium gray for no data
      
      const intensity = Math.min(policyCount / maxPolicies, 1);
      
      // Bright, vibrant color scale from cyan to red
      if (intensity < 0.1) return '#06b6d4'; // Bright cyan
      if (intensity < 0.2) return '#0891b2'; // Dark cyan
      if (intensity < 0.3) return '#0ea5e9'; // Sky blue
      if (intensity < 0.4) return '#3b82f6'; // Bright blue
      if (intensity < 0.5) return '#2563eb'; // Royal blue
      if (intensity < 0.6) return '#1d4ed8'; // Deep blue
      if (intensity < 0.7) return '#7c3aed'; // Bright purple
      if (intensity < 0.8) return '#a855f7'; // Vibrant purple
      if (intensity < 0.9) return '#e11d48'; // Bright red
      return '#dc2626'; // Deep red for highest
    };
  }, [maxPolicies]);


  // Handle mouse drag for panning
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    event.preventDefault();
  }, [pan]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newPanX = event.clientX - dragStart.x;
      const newPanY = event.clientY - dragStart.y;
      setPan({ x: newPanX, y: newPanY });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  // Load and render world map
  useEffect(() => {
    const loadWorldMap = async () => {
      if (!svgRef.current || loadingRef.current) return;
      
      loadingRef.current = true;
      setIsLoading(true);

      try {
        // Load world GeoJSON data
        let world;
        try {
          world = await d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        } catch {
          try {
            world = await d3.json('https://raw.githubusercontent.com/d3/d3.github.io/master/world-110m.v1.json');
          } catch {
            world = { type: "FeatureCollection", features: [] };
          }
        }
        
        if (!world || !(world as { features?: unknown[] }).features) {
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current);
        const width = 960;
        const height = 500;

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const projection = d3.geoNaturalEarth1()
          .scale(150)
          .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const mapGroup = svg.append('g').attr('class', 'map-group');

        // Add event listeners (no wheel zoom to avoid loading animations)
        svg.on('mousedown', handleMouseDown)
          .on('mousemove', handleMouseMove)
          .on('mouseup', handleMouseUp)
          .on('mouseleave', handleMouseUp)
          .style('cursor', isDragging ? 'grabbing' : 'grab');

        // Create country paths
        mapGroup.selectAll('path')
          .data((world as { features: unknown[] }).features)
          .enter()
          .append('path')
          .attr('d', (d: unknown) => path(d as any))
          .attr('fill', (d: unknown) => {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            const countryName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const countryData = countryDataMap.get(countryName?.toLowerCase() || '');
            return countryData ? getColor(countryData.policyCount) : '#9ca3af';
          })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .style('transition', 'fill 0.2s ease')
          .on('mouseover', function(event, d: unknown) {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            const countryName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const countryData = countryDataMap.get(countryName?.toLowerCase() || '');
            
            if (countryData) {
              d3.select(this)
                .attr('stroke', '#1d4ed8')
                .attr('stroke-width', 2)
                .style('filter', 'brightness(1.15)');

              const [x, y] = d3.pointer(event, svgRef.current);
              setTooltip({
                x: x + 15,
                y: y - 15,
                country: countryData
              });

              onCountryHover?.(countryData);
            }
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 0.5)
              .style('filter', 'none');

            setTooltip(null);
            onCountryHover?.(null);
          })
          .on('click', function(event, d: unknown) {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            event.stopPropagation();
            const countryName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const countryData = countryDataMap.get(countryName?.toLowerCase() || '');
            onCountryClick?.(countryData || null);
          })
          .on('mousedown', function(event) {
            event.stopPropagation();
            setIsDragging(false);
          });

        setIsLoading(false);
        loadingRef.current = false;
      } catch (error) {
        console.error('Error loading world map:', error);
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadWorldMap();
  }, [data, countryDataMap, getColor, handleMouseDown, handleMouseMove, handleMouseUp, isDragging, onCountryClick, onCountryHover]);

  // Apply pan transformations (no zoom)
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const mapGroup = svg.select('.map-group');
      
      if (mapGroup.node()) {
        mapGroup.attr('transform', `translate(${pan.x}, ${pan.y})`);
      }
    }
  }, [pan]);

  // Global mouse event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        const newPanX = event.clientX - dragStart.x;
        const newPanY = event.clientY - dragStart.y;
        setPan({ x: newPanX, y: newPanY });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);


  return (
    <TooltipProvider>
      <div ref={containerRef} className="relative w-full h-full">
        {/* Navigation Controls */}
        <div className="absolute top-4 right-4 z-20 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={resetView}
                className="h-9 w-9"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset View (Center map)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Color Legend */}
        <div className="absolute bottom-4 right-4 z-20 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Policy Count</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#9ca3af' }}></div>
              <span className="text-muted-foreground">No Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06b6d4' }}></div>
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
              <span className="text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7c3aed' }}></div>
              <span className="text-muted-foreground">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
              <span className="text-muted-foreground">Very High</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading world map...</span>
            </div>
          </div>
        )}

        {/* Enhanced Tooltip with opacity */}
        {tooltip && (
          <div
            className="absolute z-30 bg-background/70 backdrop-blur-sm border rounded-lg shadow-xl p-4 max-w-xs pointer-events-none"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 1000) - 350),
              top: Math.max(tooltip.y - 200, 10),
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(tooltip.country.policyCount) }}
                />
                <h4 className="font-bold text-base">{tooltip.country.country}</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground text-xs">Policies</div>
                  <div className="font-bold">{formatNumber(tooltip.country.policyCount)}</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground text-xs">Premium</div>
                  <div className="font-bold">{formatKD(tooltip.country.premium)}</div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loss Ratio</span>
                  <span className={`font-semibold ${
                    tooltip.country.lossRatioPct > 100 ? 'text-red-600' :
                    tooltip.country.lossRatioPct > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatPct(tooltip.country.lossRatioPct)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Combined Ratio</span>
                  <span className={`font-semibold ${
                    tooltip.country.combinedRatioPct > 100 ? 'text-red-600' :
                    tooltip.country.combinedRatioPct > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatPct(tooltip.country.combinedRatioPct)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                <div className="text-center">
                  <div className="font-semibold">{tooltip.country.brokers.length}</div>
                  <div className="text-muted-foreground">Brokers</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{tooltip.country.cedants.length}</div>
                  <div className="text-muted-foreground">Cedants</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{tooltip.country.regions.length}</div>
                  <div className="text-muted-foreground">Regions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* World Map SVG */}
        <svg
          ref={svgRef}
          className="w-full h-full border rounded-lg bg-muted/5"
          style={{ 
            minHeight: '600px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        />
      </div>
    </TooltipProvider>
  );
}
