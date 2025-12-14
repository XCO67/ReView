'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Info, X } from 'lucide-react';
import * as d3 from 'd3';
import { useFormatCurrency } from '@/lib/format-currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { formatPct } from '@/lib/format';

interface D3ScatterplotProps {
  data: ReinsuranceData[];
  className?: string;
}

interface ChartDataPoint {
  x: number; // Max Liability
  y: number; // Loss Ratio %
  lossRatio: number; // Loss Ratio for this period (for aggregated view)
  period: string; // Year or Year-Month
  year?: number;
  month?: number;
  policyCount: number;
  // For individual policy dots
  isIndividualPolicy?: boolean;
  policyId?: string;
}


// Extract year from UY or other date fields
function extractYear(uy: string | undefined, inceptionYear?: number, expiryYear?: number): number | null {
  if (uy) {
    const yearMatch = uy.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return parseInt(yearMatch[0], 10);
    }
  }
  if (inceptionYear && inceptionYear > 1900 && inceptionYear < 2100) {
    return inceptionYear;
  }
  if (expiryYear && expiryYear > 1900 && expiryYear < 2100) {
    return expiryYear;
  }
  return null;
}

// Extract month from inception month
function extractMonth(inceptionMonth?: number): number | null {
  if (inceptionMonth && inceptionMonth >= 1 && inceptionMonth <= 12) {
    return inceptionMonth;
  }
  return null;
}

export function D3Scatterplot({ data, className }: D3ScatterplotProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const { convertValue } = useCurrency();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get individual policy data for selected year
  const individualPolicyData = useMemo(() => {
    if (!selectedYear) return [];
    
    return data
      .filter(record => {
        const year = extractYear(record.uy, record.inceptionYear, record.expiryYear);
        if (year !== selectedYear) return false;
        
        const maxLiability = convertValue(record.maxLiabilityKD || 0);
        const premium = convertValue(record.grsPremKD || 0);
        const incurredClaims = convertValue(record.incClaimKD || (record.paidClaimsKD || 0) + (record.osClaimKD || 0));
        const lossRatio = premium > 0 ? (incurredClaims / premium) * 100 : 0;
        
        // Filter: Max Liability 0-10M, Premium > 0
        return maxLiability > 0 && premium > 0 && maxLiability <= 10000000;
      })
      .map(record => {
        const maxLiability = convertValue(record.maxLiabilityKD || 0);
        const premium = convertValue(record.grsPremKD || 0);
        const incurredClaims = convertValue(record.incClaimKD || (record.paidClaimsKD || 0) + (record.osClaimKD || 0));
        const lossRatio = premium > 0 ? (incurredClaims / premium) * 100 : 0;
        
        return {
          x: maxLiability, // X-axis: Max Liability
          y: premium, // Y-axis: Premium
          lossRatio, // Color by Loss Ratio
          period: String(selectedYear),
          year: selectedYear,
          policyCount: 1,
          isIndividualPolicy: true,
          policyId: record.srl || `${record.uy}-${record.orgInsuredTrtyName}`,
        } as ChartDataPoint;
      });
  }, [data, convertValue, selectedYear]);

  // Aggregate data by year (for aggregated view when no year selected)
  const chartData = useMemo(() => {
    if (selectedYear) return []; // Don't show aggregated when showing individual policies
    
    const aggregationMap = new Map<string, ReinsuranceData[]>();

    data.forEach(record => {
      const year = extractYear(record.uy, record.inceptionYear, record.expiryYear);
      if (!year) return;

      const periodKey = String(year);

      if (!aggregationMap.has(periodKey)) {
        aggregationMap.set(periodKey, []);
      }
      aggregationMap.get(periodKey)!.push(record);
    });

    const aggregatedPoints: ChartDataPoint[] = [];
    
    aggregationMap.forEach((records, periodKey) => {
      const validRecords = records.filter(r => {
        const maxLiability = convertValue(r.maxLiabilityKD || 0);
        const premium = convertValue(r.grsPremKD || 0);
        return maxLiability > 0 && premium > 0 && maxLiability <= 10000000;
      });

      if (validRecords.length === 0) return;

      const kpis = aggregateKPIs(validRecords);
      const aggregatedMaxLiability = validRecords.reduce((sum, r) => sum + convertValue(r.maxLiabilityKD || 0), 0);
      const aggregatedPremium = convertValue(kpis.premium);
      const lossRatio = kpis.lossRatio;

      const year = parseInt(periodKey, 10);

      aggregatedPoints.push({
        x: aggregatedMaxLiability,
        y: aggregatedPremium, // Y-axis is premium
        lossRatio,
        period: String(year),
        year,
        policyCount: validRecords.length,
      });
    });

    return aggregatedPoints.sort((a, b) => a.year! - b.year!);
  }, [data, convertValue, selectedYear]);

  useEffect(() => {
    const displayData = selectedYear ? individualPolicyData : chartData;
    if (!svgRef.current || displayData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const containerWidth = svgRef.current?.parentElement?.clientWidth || 1200;
    const width = Math.max(800, containerWidth - 40); // Fit horizontally with padding
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 60, left: 80 };

    // Set dimensions
    svg.attr('width', width).attr('height', height);

    // Fixed X-axis domain: 0 to 10M with grids at 2.5M, 5M, 10M
    // Grids: 0-2.5M (small), 2.5-5M (medium), 5-10M (large)
    const xScale = d3
      .scaleLinear()
      .domain([0, 10000000]) // 0 to 10M
      .range([margin.left, width - margin.right]);

    // Fixed Y-axis domain: 0 to 2M with grids at 500K, 1M, 1.5M, 2M
    const yScale = d3
      .scaleLinear()
      .domain([0, 2000000]) // 0 to 2M
      .range([height - margin.bottom, margin.top]);

    // Color scale based on Loss Ratio
    const colorScale = d3
      .scaleSequential()
      .domain([0, 150]) // 0% to 150% Loss Ratio
      .interpolator(d3.interpolateRdYlGn)
      .clamp(true);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Add grid lines for checkpoints
    // X-axis grids: 2.5M (small/medium boundary), 5M (medium/large boundary), 10M (max)
    const xCheckpoints = [2500000, 5000000, 10000000]; // 2.5M, 5M, 10M
    
    // Y-axis grids: 500K, 1M, 1.5M, 2M
    const yCheckpoints = [500000, 1000000, 1500000, 2000000]; // 500K, 1M, 1.5M, 2M

    // Vertical grid lines (Max Liability checkpoints)
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

    // Horizontal grid lines (Premium checkpoints)
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

    // Add axes with custom ticks
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 2500000, 5000000, 7500000, 10000000])
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return '0';
      });

    const yAxis = d3.axisLeft(yScale)
      .tickValues([0, 500000, 1000000, 1500000, 2000000])
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
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
      .text('Premium');

    // Reference lines for quadrants (using fixed checkpoints)
    // Vertical: 5M (middle of 0-10M range, between medium and large)
    // Horizontal: 1M (middle of 0-2M range)
    const midX = xScale(5000000); // 5M (medium/large boundary)
    const midY = yScale(1000000); // 1M (middle of premium range)

    // Add quadrant background colors
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Top Left quadrant (Low Liability, High Premium) - Blue
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', midX - margin.left)
      .attr('height', midY - margin.top)
      .attr('fill', 'rgba(59, 130, 246, 0.1)')
      .attr('stroke', 'rgba(59, 130, 246, 0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Top Right quadrant (High Liability, High Premium) - Green
    svg.append('rect')
      .attr('x', midX)
      .attr('y', margin.top)
      .attr('width', width - margin.right - midX)
      .attr('height', midY - margin.top)
      .attr('fill', 'rgba(34, 197, 94, 0.1)')
      .attr('stroke', 'rgba(34, 197, 94, 0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Bottom Right quadrant (High Liability, Low Premium) - Yellow
    svg.append('rect')
      .attr('x', midX)
      .attr('y', midY)
      .attr('width', width - margin.right - midX)
      .attr('height', height - margin.bottom - midY)
      .attr('fill', 'rgba(234, 179, 8, 0.1)')
      .attr('stroke', 'rgba(234, 179, 8, 0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Bottom Left quadrant (Low Liability, Low Premium) - Red
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', midY)
      .attr('width', midX - margin.left)
      .attr('height', height - margin.bottom - midY)
      .attr('fill', 'rgba(239, 68, 68, 0.1)')
      .attr('stroke', 'rgba(239, 68, 68, 0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add reference lines (quadrant dividers) - on top of backgrounds
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

    // Add dots
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dots = svg.append('g')
      .selectAll('circle')
      .data(displayData)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => {
        if (d.isIndividualPolicy) return 2; // Tiny dots for individual policies
        return 6;
      })
      .attr('fill', d => {
        // Color based on Loss Ratio
        const lr = d.lossRatio;
        if (lr > 100) return '#ef4444';
        if (lr > 80) return '#f59e0b';
        if (lr > 50) return '#3b82f6';
        return '#22c55e';
      })
      .attr('opacity', d => {
        if (d.isIndividualPolicy) return 0.6; // Slightly transparent for individual policies
        return 0.7;
      })
      .attr('stroke', d => {
        if (d.isIndividualPolicy) return 'none'; // No stroke for tiny dots
        return 'white';
      })
      .attr('stroke-width', d => {
        if (d.isIndividualPolicy) return 0;
        return 1.5;
      })
      .style('cursor', 'default')
      .on('mouseover', function(event, d) {
        if (d.isIndividualPolicy) return; // No tooltip for individual policy dots
        
        d3.select(this)
          .attr('r', 8)
          .attr('opacity', 1);

        const periodLabel = `Year ${d.year}`;

        tooltip
          .style('opacity', 1)
          .html(`
            <div class="p-3">
              <p class="font-semibold mb-2">${periodLabel}</p>
              <div class="space-y-1 text-sm">
                <p><span class="text-muted-foreground">Period:</span> ${d.period}</p>
                <p><span class="text-muted-foreground">Max Liability:</span> ${formatCurrencyNumeric(d.x)}</p>
                <p><span class="text-muted-foreground">Premium:</span> ${formatCurrencyNumeric(d.y)}</p>
                <p><span class="text-muted-foreground">Loss Ratio:</span> <span class="${d.lossRatio > 100 ? 'text-red-500 font-semibold' : d.lossRatio > 80 ? 'text-yellow-500 font-semibold' : 'text-green-500 font-semibold'}">${formatPct(d.lossRatio)}</span></p>
                <p><span class="text-muted-foreground">Policies:</span> ${d.policyCount.toLocaleString()}</p>
              </div>
            </div>
          `);
      })
      .on('mousemove', function(event, d) {
        if (d.isIndividualPolicy) return;
        const [mouseX, mouseY] = d3.pointer(event, svgRef.current);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          tooltip
            .style('left', `${svgRect.left + mouseX + 15}px`)
            .style('top', `${svgRect.top + mouseY - 10}px`);
        } else {
          tooltip
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 10}px`);
        }
      })
      .on('mouseout', function(event, d) {
        if (d.isIndividualPolicy) return;
        d3.select(this)
          .attr('r', 6)
          .attr('opacity', 0.7)
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5);
        tooltip.style('opacity', 0);
      });

    // Add labels for aggregated dots only (not for individual policies)
    if (!selectedYear) {
      svg.append('g')
        .selectAll('text')
        .data(displayData)
        .join('text')
        .attr('x', d => xScale(d.x))
        .attr('y', d => yScale(d.y) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'currentColor')
        .attr('opacity', 0.6)
        .text(d => String(d.year));
    }

  }, [chartData, individualPolicyData, selectedYear, formatCurrencyNumeric]);

  // Get available years for selection
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.forEach(record => {
      const year = extractYear(record.uy, record.inceptionYear, record.expiryYear);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  if (chartData.length === 0 && individualPolicyData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Quadrants Chart - Loss Ratio by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle>Quadrants Chart - Loss Ratio by Period</CardTitle>
            <CardDescription className="mt-1">
              Max Liability (X-axis: 0-10M) vs Premium (Y-axis: 0-2M) - Dots colored by Loss Ratio
              {selectedYear ? ` - ${individualPolicyData.length} Individual Policies for ${selectedYear}` : ' - Aggregated by Year'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={selectedYear ? String(selectedYear) : ''} 
              onValueChange={(value) => setSelectedYear(value ? parseInt(value, 10) : null)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Info className="h-4 w-4" />
                  Info
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Chart Information & Color Guide</DialogTitle>
                  <DialogDescription>
                    Understanding the quadrants chart and color coding
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {/* Quadrant Backgrounds */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm">Chart Axes</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      The chart displays Max Liability (X-axis) vs Premium (Y-axis), with dots colored by Loss Ratio:
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">X-axis (Horizontal):</span>
                        <span className="text-muted-foreground">Max Liability (0-10M)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Y-axis (Vertical):</span>
                        <span className="text-muted-foreground">Premium (0-2M)</span>
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                        <p className="font-medium mb-1">Max Liability Grids:</p>
                        <p className="text-muted-foreground">• 0-2.5M: Small</p>
                        <p className="text-muted-foreground">• 2.5-5M: Medium</p>
                        <p className="text-muted-foreground">• 5-10M: Large</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Dot Color:</span>
                        <span className="text-muted-foreground">Loss Ratio %</span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium mb-1">Grid Lines:</p>
                      <p className="text-xs text-muted-foreground">X-axis (Max Liability): 2.5M (Small/Medium), 5M (Medium/Large), 10M (Max)</p>
                      <p className="text-xs text-muted-foreground mt-1">Y-axis (Premium): 500K, 1M, 1.5M, 2M</p>
                    </div>
                  </div>

                  {/* Dot Colors */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm">Dot Colors (Loss Ratio)</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Each dot is colored based on its Loss Ratio percentage:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white"></div>
                        <div>
                          <p className="font-medium text-sm">Low Loss Ratio</p>
                          <p className="text-xs text-muted-foreground">&lt; 50%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white"></div>
                        <div>
                          <p className="font-medium text-sm">Medium Loss Ratio</p>
                          <p className="text-xs text-muted-foreground">50% - 80%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-white"></div>
                        <div>
                          <p className="font-medium text-sm">High Loss Ratio</p>
                          <p className="text-xs text-muted-foreground">80% - 100%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white"></div>
                        <div>
                          <p className="font-medium text-sm">Very High Loss Ratio</p>
                          <p className="text-xs text-muted-foreground">&gt; 100%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* How to Use */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm">How to Use</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Hover over dots to see quick information in a tooltip</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Select a year from the dropdown to view individual policy dots for that year</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>When no year is selected, the chart shows aggregated data by year</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>The dashed vertical line shows the 1M Max Liability checkpoint dividing the quadrants</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Individual policy dots are tiny and colored by their Loss Ratio</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full">
          <svg ref={svgRef} className="w-full" style={{ height: '500px' }}></svg>
          <div
            ref={tooltipRef}
            className="fixed pointer-events-none bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg opacity-0 transition-opacity z-50"
            style={{ minWidth: '200px' }}
          ></div>
        </div>
      </CardContent>
    </Card>
  );
}

