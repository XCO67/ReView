'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { RotateCcw, Info, Settings, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { normalizeCountryName } from '@/lib/country-normalization';
import { logger } from '@/lib/utils/logger';interface WindowWithReload extends Window {
  __reloadWorldMap?: () => void;
}

export interface BaseCountryData {
  country: string;
  policyCount: number;
  premium: number;
  maxLiability?: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  technicalResult: number;
  lossRatioPct: number;
  acquisitionPct: number;
  combinedRatioPct: number;
  nearExpiryCount?: number;
  nearExpiryPct?: number;
  brokers: string[];
  cedants: string[];
  regions: string[];
  hubs: string[];
  states?: string[];
}

type MetricType = 'premium' | 'maxLiability' | 'lossRatio' | 'count';

interface WorldMapProps {
  data: BaseCountryData[];
  metricType?: MetricType;
  onCountryHover?: (country: BaseCountryData | null) => void;
  onCountryClick?: (country: BaseCountryData | null) => void;
}

export default function WorldMap({ data, metricType = 'premium', onCountryHover, onCountryClick }: WorldMapProps) {
  const { formatCurrency } = useFormatCurrency();
  const { convertValue } = useCurrency();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    country: BaseCountryData;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Create a map of country data for quick lookup
  const countryDataMap = useMemo(() => {
    const map = new Map<string, BaseCountryData>();
    data.forEach(country => {
      const normalized = normalizeCountryName(country.country).toLowerCase();
      map.set(normalized, { ...country, country: normalizeCountryName(country.country) });
    });
    return map;
  }, [data]);

  // Get metric value for a country based on metricType
  const getMetricValue = useCallback((country: BaseCountryData): number => {
    switch (metricType) {
      case 'premium':
        return country.premium || 0;
      case 'maxLiability':
        return country.maxLiability || 0;
      case 'lossRatio':
        return country.lossRatioPct || 0;
      case 'count':
        return country.policyCount || 0;
      default:
        return country.premium || 0;
    }
  }, [metricType]);

  // Get max value for color scaling based on metricType
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => getMetricValue(d)), 1);
  }, [data, getMetricValue]);

  // Color scale function - supports both normal and color-blind friendly modes
  const getColor = useMemo(() => {
    return (value: number) => {
      if (value === 0) return '#9ca3af'; // Medium gray for no data
      
      const intensity = Math.min(value / maxValue, 1);
      
      if (colorBlindMode) {
        // Color-blind friendly palette (using distinct hues and patterns)
        // Using a sequential scale that works for most color vision deficiencies
        if (intensity < 0.1) return '#f7f7f7'; // Very light gray
        if (intensity < 0.2) return '#d9d9d9'; // Light gray
        if (intensity < 0.3) return '#bdbdbd'; // Medium gray
        if (intensity < 0.4) return '#969696'; // Dark gray
        if (intensity < 0.5) return '#737373'; // Darker gray
        if (intensity < 0.6) return '#525252'; // Very dark gray
        if (intensity < 0.7) return '#252525'; // Almost black
        if (intensity < 0.8) return '#000000'; // Black
        if (intensity < 0.9) return '#1a1a1a'; // Near black
        return '#0a0a0a'; // Deepest black for highest
      } else {
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
      }
    };
  }, [maxValue, colorBlindMode]);

  const getNearExpiryColor = useCallback((pct?: number) => {
    if (!pct || pct <= 0) return 'text-green-600';
    if (pct >= 50) return 'text-red-600';
    if (pct >= 25) return 'text-yellow-600';
    return 'text-green-600';
  }, []);


  // Handle mouse drag for panning - use refs to avoid re-renders
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    // Check if clicking on a country path (don't drag in that case)
    const target = event.target as HTMLElement;
    if (target.tagName === 'path') {
      return; // Let country click/hover handle it
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.preventDefault();
    event.stopPropagation();
  }, [pan]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDraggingRef.current) {
      const newPanX = event.clientX - dragStartRef.current.x;
      const newPanY = event.clientY - dragStartRef.current.y;
      setPan({ x: newPanX, y: newPanY });
      event.preventDefault();
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  // Load and render world map
  useEffect(() => {
    let cleanupFn: (() => void) | null = null;
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadWorldMap = async () => {
      if (!svgRef.current || loadingRef.current) {
        // If already loading, don't start again
        return;
      }
      
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Set a timeout to prevent infinite loading (30 seconds)
      timeoutId = setTimeout(() => {
        if (isMounted && loadingRef.current) {
          logger.error('World map loading timeout');
          setError('Loading timeout - please refresh the page');
          setIsLoading(false);
          loadingRef.current = false;
        }
      }, 30000);

      try {
        // Load world GeoJSON data through our API proxy to avoid CORS issues
        let world: GeoJSON.FeatureCollection | { type: 'Topology'; objects: Record<string, unknown> } | null = null;
        
        try {
          // First, try our API proxy endpoint (server-side fetch avoids CORS)
          const response = await fetch('/api/world-map-geojson');
          if (response.ok) {
            world = await response.json();
          } else {
            throw new Error(`API returned ${response.status}`);
          }
        } catch (apiError) {
          // Fallback: try direct sources with d3.json
          const sources = [
            'https://cdn.jsdelivr.net/npm/world-atlas@2/world/110m.json',
            'https://unpkg.com/world-atlas@2/world/110m.json',
            'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
          ];
          
          for (const source of sources) {
            try {
              const loaded = await d3.json(source);
              if (loaded) {
                world = loaded as GeoJSON.FeatureCollection | { type: 'Topology'; objects: Record<string, unknown> };
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }
        
        if (!isMounted || !svgRef.current) {
          // Component unmounted during async operation
          loadingRef.current = false;
          setIsLoading(false);
          return;
        }
        
        if (!world) {
          throw new Error('Failed to load world map data from all sources');
        }
        
        // Validate and convert the structure
        if (world && typeof world === 'object' && 'type' in world) {
          // Handle TopoJSON format (common in world-atlas)
          if (world.type === 'Topology' && 'objects' in world && world.objects) {
            // Convert TopoJSON to GeoJSON using topojson-client
            const objectKey = Object.keys(world.objects)[0];
            if (objectKey) {
              const geoJson = topojson.feature(world as unknown as Parameters<typeof topojson.feature>[0], world.objects[objectKey] as Parameters<typeof topojson.feature>[1]);
              if (geoJson) {
                // topojson.feature returns a Feature or FeatureCollection
                // If it's a single Feature, wrap it in a FeatureCollection
                if ('features' in geoJson && geoJson.features && geoJson.features.length > 0) {
                  world = geoJson as GeoJSON.FeatureCollection;
                } else if ('geometry' in geoJson) {
                  // Single feature, wrap it
                  world = {
                    type: 'FeatureCollection',
                    features: [geoJson as GeoJSON.Feature]
                  };
                } else {
                  throw new Error('TopoJSON conversion failed');
                }
              } else {
                throw new Error('TopoJSON conversion failed');
              }
            }
          } else if (world.type === 'FeatureCollection' && 'features' in world && world.features) {
            // Already GeoJSON format - validate it has features
            if (!Array.isArray(world.features) || world.features.length === 0) {
              throw new Error('GeoJSON has no features');
            }
            // Ensure world is typed as FeatureCollection
            world = world as GeoJSON.FeatureCollection;
          } else {
            throw new Error('Invalid data structure');
          }
        } else {
          throw new Error('Invalid world data');
        }
        
        // Final validation - at this point world should be FeatureCollection
        // After processing, world is guaranteed to be FeatureCollection
        if (!world || world.type !== 'FeatureCollection' || !('features' in world) || !world.features || world.features.length === 0) {
          throw new Error('World map data is empty');
        }
        const finalWorld = world as GeoJSON.FeatureCollection;

        if (!isMounted || !svgRef.current) return;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current);
        
        // Get container dimensions for responsive sizing
        const container = containerRef.current;
        const width = container ? container.clientWidth : 960;
        // Use a horizontal aspect ratio (16:9 or 2:1) for better horizontal fit
        const height = container ? Math.round(width * 0.5) : 480; // 2:1 aspect ratio

        svg.attr('viewBox', `0 0 ${width} ${height}`)
           .attr('preserveAspectRatio', 'xMidYMid meet')
           .attr('width', '100%')
           .attr('height', '100%');

        // Calculate appropriate scale based on container width
        const scale = Math.max(150, Math.min(250, width / 4.5));
        
        const projection = d3.geoNaturalEarth1()
          .scale(scale)
          .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const mapGroup = svg.append('g').attr('class', 'map-group');

        // Add background rect for drag detection (only on empty space)
        const bgRect = svg.append('rect')
          .attr('width', width)
          .attr('height', height)
          .attr('fill', 'transparent')
          .attr('pointer-events', 'all')
          .style('cursor', 'grab')
          .on('mousedown', function(this: SVGRectElement, event: MouseEvent) {
            // Only drag if not clicking on a path
            const target = event.target as HTMLElement;
            if (target.tagName !== 'path') {
              handleMouseDown(event);
            }
          })
          .lower(); // Put behind everything

        // Add global mouse move/up listeners for dragging
        const handleGlobalMouseMove = (event: MouseEvent) => {
          if (isDraggingRef.current) {
            handleMouseMove(event);
          }
        };
        
        const handleGlobalMouseUp = () => {
          handleMouseUp();
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        // Store cleanup function
        cleanupFn = () => {
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
        };

        // Ensure we have features array
        const features = finalWorld.features || [];
        
        if (!features || features.length === 0) {
          console.error('No features found in world map data', finalWorld);
          throw new Error('World map data is empty - no features found');
        }

        // Create country paths
        mapGroup.selectAll('path')
          .data(features)
          .enter()
          .append('path')
          .attr('d', (d: GeoJSON.Feature) => path(d))
          .attr('fill', (d: GeoJSON.Feature) => {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            const rawName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const normalizedGeoName = normalizeCountryName(rawName).toLowerCase();
            const countryData = countryDataMap.get(normalizedGeoName);
            return countryData ? getColor(getMetricValue(countryData)) : '#9ca3af';
          })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .style('transition', 'fill 0.2s ease')
          .on('mouseover', function(event: MouseEvent, d: GeoJSON.Feature) {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            const rawName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const normalizedGeoName = normalizeCountryName(rawName).toLowerCase();
            const countryData = countryDataMap.get(normalizedGeoName);
            
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
          .on('click', function(event: MouseEvent, d: GeoJSON.Feature) {
            const data = d as { properties: { NAME?: string; NAME_LONG?: string; name?: string; ADMIN?: string } };
            event.stopPropagation();
            const rawName = data.properties.NAME || data.properties.NAME_LONG || data.properties.name || data.properties.ADMIN;
            const normalizedGeoName = normalizeCountryName(rawName).toLowerCase();
            const countryData = countryDataMap.get(normalizedGeoName);
            onCountryClick?.(countryData || null);
          })
          .on('mousedown', function(event: MouseEvent) {
            event.stopPropagation();
            isDraggingRef.current = false;
            setIsDragging(false);
          })
          .style('pointer-events', 'all');

        // Add metric labels on map with collision detection (only if showLabels is true)
        if (showLabels) {
          const labelGroup = mapGroup.append('g').attr('class', 'metric-labels');
          
          // First, collect all potential labels with their positions and values
          interface LabelCandidate {
            feature: GeoJSON.Feature;
            countryData: BaseCountryData;
            metricValue: number;
            centroid: [number, number];
            displayText: string;
            normalizedName: string;
          }
          
          const candidates: LabelCandidate[] = [];
          
          features.forEach((feature: GeoJSON.Feature) => {
            const rawName = feature.properties?.NAME || feature.properties?.NAME_LONG || feature.properties?.name || feature.properties?.ADMIN;
            if (!rawName) return;
            
            const normalizedGeoName = normalizeCountryName(rawName).toLowerCase();
            const countryData = countryDataMap.get(normalizedGeoName);
            
            if (!countryData) return;
            
            const metricValue = getMetricValue(countryData);
            
            // Apply thresholds: only show labels for "worthy" values
            let shouldShowLabel = false;
            
            if (metricType === 'lossRatio') {
              // For Loss Ratio: only show if > 1%
              shouldShowLabel = metricValue > 1;
            } else if (metricType === 'count') {
              // For Count: only show if > 1 million (no currency conversion needed)
              shouldShowLabel = metricValue > 1000000; // 1 million
            } else {
              // For Premium and Max Liability: only show if > 1 million (after currency conversion)
              const convertedValue = convertValue(metricValue);
              shouldShowLabel = convertedValue > 1000000; // 1 million
            }
            
            // Only show labels for countries that meet the threshold
            if (shouldShowLabel && metricValue > 0) {
              // Calculate centroid for label placement
              const centroid = path.centroid(feature);
              if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
              
              // Format metric value for display
              let displayText = '';
              if (metricType === 'lossRatio') {
                displayText = `${metricValue.toFixed(0)}%`;
              } else if (metricType === 'count') {
                if (metricValue >= 1000000) {
                  displayText = `${(metricValue / 1000000).toFixed(1)}M`;
                } else if (metricValue >= 1000) {
                  displayText = `${(metricValue / 1000).toFixed(0)}K`;
                } else {
                  displayText = metricValue.toString();
                }
              } else {
                // For premium and maxLiability, convert currency
                const convertedValue = convertValue(metricValue);
                if (convertedValue >= 1000000000) {
                  displayText = `${(convertedValue / 1000000000).toFixed(1)}B`;
                } else if (convertedValue >= 1000000) {
                  displayText = `${(convertedValue / 1000000).toFixed(1)}M`;
                } else if (convertedValue >= 1000) {
                  displayText = `${(convertedValue / 1000).toFixed(0)}K`;
                } else {
                  displayText = convertedValue.toFixed(0);
                }
              }
              
              candidates.push({
                feature,
                countryData,
                metricValue,
                centroid: [centroid[0], centroid[1]],
                displayText,
                normalizedName: normalizedGeoName
              });
            }
          });
          
          // Sort by metric value (highest first) - we'll show higher value labels first
          candidates.sort((a, b) => b.metricValue - a.metricValue);
          
          // Collision detection: minimum distance between labels (in pixels)
          const minLabelDistance = 35; // Minimum spacing between labels
          const placedLabels: Array<{ x: number; y: number }> = [];
          
          // Process candidates and only place labels that don't overlap
          candidates.forEach((candidate) => {
            // Check if this label would overlap with any already placed label
            const wouldOverlap = placedLabels.some(placed => {
              const dx = candidate.centroid[0] - placed.x;
              const dy = candidate.centroid[1] - placed.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < minLabelDistance;
            });
            
            // Only place label if it doesn't overlap
            if (!wouldOverlap) {
              // Create text label with background for readability
              const label = labelGroup.append('g')
                .attr('transform', `translate(${candidate.centroid[0]}, ${candidate.centroid[1]})`)
                .style('pointer-events', 'none');
              
              // Add background rect for better visibility with improved styling
              const text = label.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', '#ffffff')
                .style('stroke', '#000000')
                .style('stroke-width', '1px')
                .style('paint-order', 'stroke')
                .style('pointer-events', 'none')
                .text(candidate.displayText);
              
              // Add background rectangle for better contrast with padding
              const bbox = (text.node() as SVGTextElement)?.getBBox();
              if (bbox) {
                const padding = 4;
                label.insert('rect', 'text')
                  .attr('x', bbox.x - padding)
                  .attr('y', bbox.y - padding / 2)
                  .attr('width', bbox.width + padding * 2)
                  .attr('height', bbox.height + padding)
                  .attr('fill', 'rgba(0, 0, 0, 0.75)')
                  .attr('rx', 3)
                  .style('pointer-events', 'none');
              }
              
              // Record this label's position for collision detection
              placedLabels.push({
                x: candidate.centroid[0],
                y: candidate.centroid[1]
              });
            }
          });
        }

        setIsLoading(false);
        loadingRef.current = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (error) {
        if (!isMounted) {
          loadingRef.current = false;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          return;
        }
        logger.error('Error loading world map', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to load world map: ${errorMessage}. Please check your internet connection and try refreshing the page.`);
        setIsLoading(false);
        loadingRef.current = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    loadWorldMap();
    
    // Expose loadWorldMap for retry button
    const windowWithReload = window as WindowWithReload;
    windowWithReload.__reloadWorldMap = () => {
      loadingRef.current = false;
      loadWorldMap();
    };
    
    // Return cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanupFn) {
        cleanupFn();
      }
      loadingRef.current = false;
    };
  }, [data, countryDataMap, getColor, getMetricValue, maxValue, metricType, handleMouseDown, handleMouseMove, handleMouseUp, onCountryClick, onCountryHover, showLabels, colorBlindMode, convertValue]);

  // Apply pan transformations - includes labels
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const mapGroup = svg.select('.map-group');
      
      if (mapGroup.node()) {
        mapGroup.attr('transform', `translate(${pan.x}, ${pan.y})`);
      }
    }
  }, [pan]);

  // Handle window resize to update map size
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && containerRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = Math.round(width * 0.5); // Maintain 2:1 aspect ratio
        const svg = d3.select(svgRef.current);
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        
        // Update projection scale
        const scale = Math.max(150, Math.min(250, width / 4.5));
        const projection = d3.geoNaturalEarth1()
          .scale(scale)
          .translate([width / 2, height / 2]);
        
        // Update path generator
        const path = d3.geoPath().projection(projection);
        
        // Update all country paths
        const mapGroup = svg.select('.map-group');
        if (mapGroup.node()) {
          mapGroup.selectAll('path')
            .attr('d', (d: unknown) => path(d as GeoJSON.Feature));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsMenu && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu]);

  return (
    <TooltipProvider>
      <div ref={containerRef} className="relative w-full h-full">
        {/* Navigation Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {/* Options Menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="h-9 w-9 bg-background/95 backdrop-blur-sm border shadow-lg"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {showOptionsMenu && (
              <div className="absolute top-12 right-0 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 min-w-[200px] z-30">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowLabels(!showLabels);
                      // Trigger map reload to update labels
                      if (svgRef.current) {
                        d3.select(svgRef.current).selectAll('*').remove();
                        loadingRef.current = false;
                        const windowWithReload = window as WindowWithReload;
                        if (windowWithReload.__reloadWorldMap) {
                          windowWithReload.__reloadWorldMap();
                        }
                      }
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <span>Show Numbers on Map</span>
                    </div>
                    <div className={`h-4 w-8 rounded-full transition-colors ${showLabels ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showLabels ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setColorBlindMode(!colorBlindMode);
                      // Trigger map reload to update colors
                      if (svgRef.current) {
                        d3.select(svgRef.current).selectAll('*').remove();
                        loadingRef.current = false;
                        const windowWithReload = window as WindowWithReload;
                        if (windowWithReload.__reloadWorldMap) {
                          windowWithReload.__reloadWorldMap();
                        }
                      }
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>Color Blind Mode</span>
                    </div>
                    <div className={`h-4 w-8 rounded-full transition-colors ${colorBlindMode ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${colorBlindMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={resetView}
                className="h-9 w-9 bg-background/95 backdrop-blur-sm border shadow-lg"
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
            <span className="text-sm font-semibold">
              {metricType === 'premium' ? 'Premium' :
               metricType === 'maxLiability' ? 'Max Liability' :
               metricType === 'lossRatio' ? 'Loss Ratio' :
               'Policy Count'}
            </span>
            {colorBlindMode && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Color Blind</span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#9ca3af' }}></div>
              <span className="text-muted-foreground">No Data</span>
            </div>
            {colorBlindMode ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f7f7f7' }}></div>
                  <span className="text-muted-foreground">Very Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bdbdbd' }}></div>
                  <span className="text-muted-foreground">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#737373' }}></div>
                  <span className="text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#252525' }}></div>
                  <span className="text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#000000' }}></div>
                  <span className="text-muted-foreground">Very High</span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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

        {/* Error State */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg z-10">
            <div className="flex flex-col items-center gap-3 p-6 bg-background/95 border rounded-lg shadow-lg max-w-md">
              <div className="text-red-500 text-lg font-semibold">Error Loading Map</div>
              <p className="text-sm text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  loadingRef.current = false;
                  setIsLoading(true);
                  // Trigger reload by clearing and re-initializing
                  if (svgRef.current) {
                    d3.select(svgRef.current).selectAll('*').remove();
                  }
                  // Force reload by calling the function directly
                  const windowWithReload = window as WindowWithReload;
                  if (windowWithReload.__reloadWorldMap) {
                    windowWithReload.__reloadWorldMap();
                  } else {
                    // Fallback: reload the page
                    window.location.reload();
                  }
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Tooltip with better design */}
        {tooltip && (
          <div
            className="absolute z-30 bg-background/95 backdrop-blur-md border-2 border-primary/20 rounded-xl shadow-2xl p-5 min-w-[280px] max-w-[380px] pointer-events-none"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 1000) - 400),
              top: Math.max(tooltip.y - 250, 10),
            }}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(getMetricValue(tooltip.country)) }}
                />
                <h4 className="font-bold text-lg truncate">{tooltip.country.country}</h4>
              </div>
              
              {/* Primary Metric */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  {metricType === 'premium' ? 'Premium' :
                   metricType === 'maxLiability' ? 'Max Liability' :
                   metricType === 'lossRatio' ? 'Loss Ratio' :
                   'Policy Count'}
                </div>
                <div className="font-bold text-2xl break-words">
                  {metricType === 'lossRatio' ? formatPct(getMetricValue(tooltip.country)) :
                   metricType === 'count' ? formatNumber(getMetricValue(tooltip.country)) :
                   formatCurrency(getMetricValue(tooltip.country))}
                </div>
              </div>

              {/* Secondary Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-muted-foreground text-xs mb-1">Policies</div>
                  <div className="font-semibold text-base break-words">{formatNumber(tooltip.country.policyCount)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-muted-foreground text-xs mb-1">Loss Ratio</div>
                  <div className={`font-semibold text-base ${
                    tooltip.country.lossRatioPct > 100 ? 'text-red-600' :
                    tooltip.country.lossRatioPct > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatPct(tooltip.country.lossRatioPct)}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-muted-foreground text-xs mb-1">Combined Ratio</div>
                  <div className={`font-semibold text-base ${
                    tooltip.country.combinedRatioPct > 100 ? 'text-red-600' :
                    tooltip.country.combinedRatioPct > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatPct(tooltip.country.combinedRatioPct)}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-muted-foreground text-xs mb-1">Near Expiry</div>
                  <div className={`font-semibold text-base ${getNearExpiryColor(tooltip.country.nearExpiryPct)}`}>
                    {formatPct(tooltip.country.nearExpiryPct || 0)}
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                <div className="text-center">
                  <div className="font-bold text-base">{tooltip.country.brokers.length}</div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Brokers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-base">{tooltip.country.cedants.length}</div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Cedants</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-base">{tooltip.country.regions.length}</div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Regions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* World Map SVG */}
        <svg
          ref={svgRef}
          className="w-full border rounded-lg bg-muted/5"
          style={{ 
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: 'none',
            touchAction: 'none'
          }}
        />
      </div>
    </TooltipProvider>
  );
}
