'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  // Prepare chart data: each record becomes a dot
  // Limit to MAX_DOTS for performance
  const chartData = useMemo(() => {
    const filtered = data
      .filter(record => {
        const maxLiability = convertValue(record.maxLiabilityKD || 0);
        const premium = convertValue(record.grsPremKD || 0);
        
        // Only include records with valid data
        return maxLiability > 0 && premium > 0 && maxLiability <= 10000000 && premium <= 600000;
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
  }, [data, convertValue]);

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

    // X-axis domain: 0 to 10M
    const xScale = d3
      .scaleLinear()
      .domain([0, 10000000]) // 0 to 10M
      .range([margin.left, width - margin.right]);

    // Y-axis domain: 0 to 600K
    const yScale = d3
      .scaleLinear()
      .domain([0, 600000]) // 0 to 600K
      .range([height - margin.bottom, margin.top]);

    // Color scale based on Loss Ratio
    const colorScale = d3
      .scaleSequential()
      .domain([0, 150]) // 0% to 150% Loss Ratio
      .interpolator(d3.interpolateRdYlGn)
      .clamp(true);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Grid lines
    const xCheckpoints = [2500000, 5000000, 7500000, 10000000]; // 2.5M, 5M, 7.5M, 10M
    const yCheckpoints = [300000, 600000]; // 300K, 600K (dividing lines for premium zones)

    // Vertical grid lines
    xCheckpoints.forEach(val => {
      svg.append('line')
        .attr('x1', xScale(val))
        .attr('x2', xScale(val))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    });

    // Horizontal grid lines
    yCheckpoints.forEach(val => {
      svg.append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(val))
        .attr('y2', yScale(val))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    });

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 2500000, 5000000, 7500000, 10000000])
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return '0';
      });

    const yAxis = d3.axisLeft(yScale)
      .tickValues([0, 100000, 200000, 300000, 400000, 500000, 600000])
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
      .text('Max Liability');

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
      .text('Premium');

    // Reference lines for quadrants
    const midX = xScale(5000000); // 5M
    const midY = yScale(300000); // 300K (middle of 0-600K range)

    // Add premium range background gradients FIRST (behind everything)
    // Low premium range (0-300K): Light blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', yScale(300000))
      .attr('width', width - margin.left - margin.right)
      .attr('height', yScale(0) - yScale(300000))
      .attr('fill', 'rgba(59, 130, 246, 0.06)');

    // High premium range (300K-600K): Light green
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', yScale(600000))
      .attr('width', width - margin.left - margin.right)
      .attr('height', yScale(300000) - yScale(600000))
      .attr('fill', 'rgba(34, 197, 94, 0.06)');

    // Add liability range background gradients (vertical zones)
    // Low liability range (0-2.5M): Light blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', xScale(2500000) - margin.left)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(59, 130, 246, 0.04)');

    // Medium-low liability range (2.5M-5M): Light green
    svg.append('rect')
      .attr('x', xScale(2500000))
      .attr('y', margin.top)
      .attr('width', xScale(5000000) - xScale(2500000))
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(34, 197, 94, 0.04)');

    // Medium-high liability range (5M-7.5M): Light yellow
    svg.append('rect')
      .attr('x', xScale(5000000))
      .attr('y', margin.top)
      .attr('width', xScale(7500000) - xScale(5000000))
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(234, 179, 8, 0.04)');

    // High liability range (7.5M-10M): Light orange
    svg.append('rect')
      .attr('x', xScale(7500000))
      .attr('y', margin.top)
      .attr('width', width - margin.right - xScale(7500000))
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'rgba(249, 115, 22, 0.04)');

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
  }, [chartData, formatCurrencyNumeric, convertValue, useCanvas, updateTooltip, data]);

  const emptyState = (
    <div className="flex items-center justify-center h-[600px] text-muted-foreground">
      <p>No data available for the selected filters</p>
    </div>
  );

  const chartContent = (
    <>
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
              return maxLiability > 0 && premium > 0 && maxLiability <= 10000000 && premium <= 600000;
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

