'use client';

import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import * as d3 from 'd3';
import { useFormatCurrency } from '@/lib/format-currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ReinsuranceData } from '@/lib/schema';
import { formatPct } from '@/lib/format';

interface QuadrantChartProps {
  data: ReinsuranceData[];
  className?: string;
  noCard?: boolean; // If true, skip the Card wrapper
}

interface ChartDataPoint {
  x: number; // Max Liability
  y: number; // Premium
  lossRatio: number; // Loss Ratio = (Incurred / Premium) * 100
  record: ReinsuranceData;
}

// Maximum number of dots to render (performance limit)
const MAX_DOTS = 5000;

// Debounce function for tooltip updates
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function QuadrantChart({ data, className, noCard = false }: QuadrantChartProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const { convertValue } = useCurrency();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCanvasModeRef = useRef(false);
  
  // Premium Range state
  const [premiumRangeFrom, setPremiumRangeFrom] = useState<string>('');
  const [premiumRangeTo, setPremiumRangeTo] = useState<string>('');

  // Prepare chart data: each record becomes a dot
  // Limit to MAX_DOTS for performance
  const chartData = useMemo(() => {
    const filtered = data
      .filter(record => {
        const maxLiability = convertValue(record.maxLiabilityKD || 0);
        const premium = convertValue(record.grsPremKD || 0);
        
        // Apply premium range filter if set
        const fromPremium = premiumRangeFrom ? parseFloat(premiumRangeFrom) : 0;
        const toPremium = premiumRangeTo ? parseFloat(premiumRangeTo) : Infinity;
        const inPremiumRange = premium >= fromPremium && premium <= toPremium;
        
        // Only include records with valid data and within premium range
        return maxLiability > 0 && premium > 0 && inPremiumRange;
      })
      .map(record => {
        const maxLiability = convertValue(record.maxLiabilityKD || 0);
        const premium = convertValue(record.grsPremKD || 0);
        const incurred = convertValue(record.incClaimKD || 0);
        
        // Calculate Loss Ratio: (Incurred / Premium) * 100
        const lossRatio = premium > 0 ? (incurred / premium) * 100 : 0;
        
        return {
          x: maxLiability, // X-axis: Max Liability
          y: premium, // Y-axis: Premium
          lossRatio,
          record,
        } as ChartDataPoint;
      });

    // If we have too many points, sample them intelligently
    if (filtered.length > MAX_DOTS) {
      // Use stratified sampling: take evenly spaced points
      const step = Math.ceil(filtered.length / MAX_DOTS);
      return filtered.filter((_, index) => index % step === 0).slice(0, MAX_DOTS);
    }

    return filtered;
  }, [data, convertValue, premiumRangeFrom, premiumRangeTo]);

  // Calculate min/max values for ranges
  const dataRanges = useMemo(() => {
    if (chartData.length === 0) {
      return { premiumMin: 0, premiumMax: 600000, liabilityMin: 0, liabilityMax: 10000000 };
    }
    
    const premiums = chartData.map(d => d.y);
    const liabilities = chartData.map(d => d.x);
    
    return {
      premiumMin: Math.min(...premiums),
      premiumMax: Math.max(...premiums),
      liabilityMin: Math.min(...liabilities),
      liabilityMax: Math.max(...liabilities),
    };
  }, [chartData]);


  // Use canvas for large datasets (better performance)
  const useCanvas = chartData.length > 2000;

  // Update tooltip implementation (debounced)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTooltip = useCallback((event: MouseEvent, d: ChartDataPoint) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      if (!tooltipRef.current) return;
      const tooltip = d3.select(tooltipRef.current);
      tooltip
        .style('opacity', 1)
        .html(`
          <div class="p-3">
            <p class="font-semibold mb-2">Policy Details</p>
            <div class="space-y-1 text-sm">
              <p><span class="text-muted-foreground">Serial:</span> ${d.record.srl || 'N/A'}</p>
              <p><span class="text-muted-foreground">Type:</span> ${d.record.extType || 'N/A'}</p>
              <p><span class="text-muted-foreground">Class:</span> ${d.record.className || 'N/A'}</p>
              <p><span class="text-muted-foreground">Max Liability:</span> ${formatCurrencyNumeric(d.x)}</p>
              <p><span class="text-muted-foreground">Premium:</span> ${formatCurrencyNumeric(d.y)}</p>
              <p><span class="text-muted-foreground">Incurred:</span> ${formatCurrencyNumeric(convertValue(d.record.incClaimKD || 0))}</p>
              <p><span class="text-muted-foreground">Loss Ratio:</span> <span class="font-semibold">${formatPct(d.lossRatio)}</span></p>
            </div>
          </div>
        `)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`);
    }, 16);
  }, [formatCurrencyNumeric, convertValue]);

  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const renderChart = () => {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); // Clear previous render

      const containerWidth = svgRef.current?.parentElement?.clientWidth || 1200;
      const width = Math.max(800, containerWidth - 40);
      const height = 600;
      const margin = { top: 20, right: 20, bottom: 60, left: 80 };

      // Set dimensions
      svg.attr('width', width).attr('height', height);

    // Calculate dynamic ranges
    const premiumMin = premiumRangeFrom ? parseFloat(premiumRangeFrom) : 0;
    const premiumMax = premiumRangeTo ? parseFloat(premiumRangeTo) : 600000;
    const liabilityMin = dataRanges.liabilityMin;
    const liabilityMax = dataRanges.liabilityMax;
    
    // Add padding to ranges
    const premiumRange = premiumMax - premiumMin;
    const liabilityRange = liabilityMax - liabilityMin;
    const premiumPadding = premiumRange * 0.1;
    const liabilityPadding = liabilityRange * 0.1;

    // X-axis domain: dynamic based on filtered data
    const xScale = d3
      .scaleLinear()
      .domain([Math.max(0, liabilityMin - liabilityPadding), liabilityMax + liabilityPadding])
      .range([margin.left, width - margin.right]);

    // Y-axis domain: dynamic based on premium range
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, premiumMin - premiumPadding), premiumMax + premiumPadding])
      .range([height - margin.bottom, margin.top]);

    // Color scale based on Loss Ratio
    const colorScale = d3
      .scaleSequential()
      .domain([0, 150]) // 0% to 150% Loss Ratio
      .interpolator(d3.interpolateRdYlGn)
      .clamp(true);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Generate tick values for axes (needed for grid lines)
    const xDomain = xScale.domain();
    const yDomain = yScale.domain();
    const xTicks = d3.ticks(xDomain[0], xDomain[1], 5);
    const yTicks = d3.ticks(yDomain[0], yDomain[1], 6);

    // Grid lines - use dynamic tick values
    // Vertical grid lines
    xTicks.forEach(val => {
      if (val > xDomain[0] && val < xDomain[1]) {
        svg.append('line')
          .attr('x1', xScale(val))
          .attr('x2', xScale(val))
          .attr('y1', margin.top)
          .attr('y2', height - margin.bottom)
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.5);
      }
    });

    // Horizontal grid lines
    yTicks.forEach(val => {
      if (val > yDomain[0] && val < yDomain[1]) {
        svg.append('line')
          .attr('x1', margin.left)
          .attr('x2', width - margin.right)
          .attr('y1', yScale(val))
          .attr('y2', yScale(val))
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.5);
      }
    });

    // Add axes with dynamic tick values
    const xAxis = d3.axisBottom(xScale)
      .tickValues(xTicks)
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return val.toString();
      });

    const yAxis = d3.axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return val.toString();
      });

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text('Max Liability (for share)');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text('Premium (for share)');

    // Reference lines for quadrants - use midpoints of dynamic ranges
    const midX = xScale((liabilityMin + liabilityMax) / 2);
    const midY = yScale((premiumMin + premiumMax) / 2);

    // Add premium range background gradients FIRST (behind everything)
    // Low premium range (below midpoint): Light blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', midY)
      .attr('width', width - margin.left - margin.right)
      .attr('height', yScale(yDomain[0]) - midY)
      .attr('fill', 'rgba(59, 130, 246, 0.06)');

    // High premium range (above midpoint): Light green
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', midY - margin.top)
      .attr('fill', 'rgba(34, 197, 94, 0.06)');

    // Add liability range background gradients (vertical zones)
    // Low liability range (left of midpoint): Light blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', midX - margin.left)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(59, 130, 246, 0.04)');

    // High liability range (right of midpoint): Light green
    svg.append('rect')
      .attr('x', midX)
      .attr('y', margin.top)
      .attr('width', width - margin.right - midX)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(34, 197, 94, 0.04)');

    // Quadrant backgrounds (on top of premium ranges)
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Top Left (Low Liability, High Premium) - Blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', midX - margin.left)
      .attr('height', midY - margin.top)
      .attr('fill', 'rgba(59, 130, 246, 0.05)')
      .attr('stroke', 'rgba(59, 130, 246, 0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Top Right (High Liability, High Premium) - Green
    svg.append('rect')
      .attr('x', midX)
      .attr('y', margin.top)
      .attr('width', width - margin.right - midX)
      .attr('height', midY - margin.top)
      .attr('fill', 'rgba(34, 197, 94, 0.05)')
      .attr('stroke', 'rgba(34, 197, 94, 0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Bottom Right (High Liability, Low Premium) - Yellow
    svg.append('rect')
      .attr('x', midX)
      .attr('y', midY)
      .attr('width', width - margin.right - midX)
      .attr('height', height - margin.bottom - midY)
      .attr('fill', 'rgba(234, 179, 8, 0.05)')
      .attr('stroke', 'rgba(234, 179, 8, 0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Bottom Left (Low Liability, Low Premium) - Red
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', midY)
      .attr('width', midX - margin.left)
      .attr('height', height - margin.bottom - midY)
      .attr('fill', 'rgba(239, 68, 68, 0.05)')
      .attr('stroke', 'rgba(239, 68, 68, 0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add quadrant labels
    // Bottom-Left: LPLL
    svg.append('text')
      .attr('x', margin.left + (midX - margin.left) / 2)
      .attr('y', midY + (height - margin.bottom - midY) / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('LPLL');

    // Bottom-Right: LPHL
    svg.append('text')
      .attr('x', midX + (width - margin.right - midX) / 2)
      .attr('y', midY + (height - margin.bottom - midY) / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('LPHL');

    // Top-Left: HPLL
    svg.append('text')
      .attr('x', margin.left + (midX - margin.left) / 2)
      .attr('y', margin.top + (midY - margin.top) / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('HPLL');

    // Top-Right: HPHL
    svg.append('text')
      .attr('x', midX + (width - margin.right - midX) / 2)
      .attr('y', margin.top + (midY - margin.top) / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('HPHL');

    // Reference lines (quadrant dividers)
    svg.append('line')
      .attr('x1', midX)
      .attr('x2', midX)
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#888')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2)
      .attr('opacity', 0.7);

    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', midY)
      .attr('y2', midY)
      .attr('stroke', '#888')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2)
      .attr('opacity', 0.7);

      // Add dots - use canvas for large datasets
      if (useCanvas && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas size to match SVG
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, width, height);

          // Draw dots on canvas (much faster)
          chartData.forEach(d => {
            const x = xScale(d.x);
            const y = yScale(d.y);
            const lr = d.lossRatio;
            
            // Color based on Loss Ratio
            let color = '#22c55e'; // Green for <= 50%
            if (lr > 100) color = '#ef4444'; // Red for > 100%
            else if (lr > 80) color = '#f59e0b'; // Orange for > 80%
            else if (lr > 50) color = '#3b82f6'; // Blue for > 50%

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1;
          });

          // Add invisible overlay for hover detection
          const overlay = svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent')
            .style('cursor', 'default');

          // Optimized hover detection (find nearest point with early exit)
          let hoverTimeout: NodeJS.Timeout | null = null;
          overlay.on('mousemove', function(event) {
            // Debounce hover detection for better performance
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
              const [mouseX, mouseY] = d3.pointer(event, svgRef.current);
              
              // Find nearest point (optimized: check distance squared to avoid sqrt)
              let nearest: ChartDataPoint | null = null;
              let minDistSq = 400; // 20px threshold squared
              
              // Limit search to nearby points for better performance
              for (let i = 0; i < chartData.length; i++) {
                const d = chartData[i];
                const dx = xScale(d.x) - mouseX;
                const dy = yScale(d.y) - mouseY;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < minDistSq) {
                  minDistSq = distSq;
                  nearest = d;
                }
              }

              if (nearest) {
                updateTooltip(event as MouseEvent, nearest);
              } else {
                tooltip.style('opacity', 0);
              }
            }, 16); // ~60fps
          });

          overlay.on('mouseout', () => {
            tooltip.style('opacity', 0);
          });
        }
      } else {
        // Use SVG for smaller datasets (better interactivity)
        const dots = svg.append('g')
          .selectAll('circle')
          .data(chartData)
          .join('circle')
          .attr('cx', d => xScale(d.x))
          .attr('cy', d => yScale(d.y))
          .attr('r', 3)
          .attr('fill', d => {
            // Color based on Loss Ratio
            const lr = d.lossRatio;
            if (lr > 100) return '#ef4444'; // Red for > 100%
            if (lr > 80) return '#f59e0b'; // Orange for > 80%
            if (lr > 50) return '#3b82f6'; // Blue for > 50%
            return '#22c55e'; // Green for <= 50%
          })
          .attr('opacity', 0.7)
          .attr('stroke', 'white')
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', function(event: MouseEvent, d: ChartDataPoint) {
            d3.select(this)
              .attr('r', 5)
              .attr('opacity', 1);
            updateTooltip(event, d);
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('r', 3)
              .attr('opacity', 0.7);
            tooltip.style('opacity', 0);
          });
      }
    };

    // Use requestAnimationFrame for smooth rendering
    animationFrameRef.current = requestAnimationFrame(renderChart);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
      }
    };
  }, [chartData, formatCurrencyNumeric, convertValue, useCanvas, updateTooltip, data, premiumRangeFrom, premiumRangeTo, dataRanges]);

  const emptyState = (
    <div className="flex items-center justify-center h-[600px] text-muted-foreground">
      <p>No data available for the selected filters</p>
    </div>
  );

  const chartContent = (
    <>
      {/* Premium Range Controls */}
      <div className="mb-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="premium-from" className="text-sm font-medium whitespace-nowrap">
              Premium Range:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="premium-from"
                type="number"
                placeholder="From"
                value={premiumRangeFrom}
                onChange={(e) => setPremiumRangeFrom(e.target.value)}
                className="w-24 h-8 text-sm"
                min="0"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                id="premium-to"
                type="number"
                placeholder="To"
                value={premiumRangeTo}
                onChange={(e) => setPremiumRangeTo(e.target.value)}
                className="w-24 h-8 text-sm"
                min="0"
              />
            </div>
            {(premiumRangeFrom || premiumRangeTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPremiumRangeFrom('');
                  setPremiumRangeTo('');
                }}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Max Liability Range: {formatCurrencyNumeric(dataRanges.liabilityMin)} - {formatCurrencyNumeric(dataRanges.liabilityMax)}
          </div>
        </div>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="w-full" style={{ position: 'relative', zIndex: 1 }} />
        {useCanvas && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, width: '100%', height: '100%' }}
          />
        )}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 bg-popover text-popover-foreground border rounded-lg shadow-lg z-50 transition-opacity"
          style={{ minWidth: '200px' }}
        />
        {chartData.length >= MAX_DOTS && (
          <div className="absolute top-2 right-2 bg-muted/80 text-muted-foreground text-xs px-2 py-1 rounded z-10">
            Showing {MAX_DOTS.toLocaleString()} of {data.filter(r => {
              const maxLiability = convertValue(r.maxLiabilityKD || 0);
              const premium = convertValue(r.grsPremKD || 0);
              const fromPremium = premiumRangeFrom ? parseFloat(premiumRangeFrom) : 0;
              const toPremium = premiumRangeTo ? parseFloat(premiumRangeTo) : Infinity;
              const inPremiumRange = premium >= fromPremium && premium <= toPremium;
              return maxLiability > 0 && premium > 0 && inPremiumRange;
            }).length.toLocaleString()} records
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Loss Ratio ≤ 50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>50% &lt; LR ≤ 80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
          <span>80% &lt; LR ≤ 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>Loss Ratio &gt; 100%</span>
        </div>
      </div>
    </>
  );

  if (chartData.length === 0) {
    if (noCard) {
      return <div className={className}>{emptyState}</div>;
    }
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Quadrant Chart</CardTitle>
          <CardDescription>Max Liability vs Premium (colored by Loss Ratio)</CardDescription>
        </CardHeader>
        <CardContent>
          {emptyState}
        </CardContent>
      </Card>
    );
  }

  if (noCard) {
    return <div className={className}>{chartContent}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quadrant Chart</CardTitle>
        <CardDescription>
          Max Liability vs Premium (colored by Loss Ratio = Incurred / Premium × 100)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}

