'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useFormatCurrency } from '@/lib/format-currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { formatPct } from '@/lib/format';

interface QuadrantsChartProps {
  data: ReinsuranceData[];
  className?: string;
}

interface ChartDataPoint {
  x: number; // Max Liability (aggregated)
  y: number; // Premium (aggregated)
  lossRatio: number; // Loss Ratio for this period
  period: string; // Year or Year-Month
  year?: number;
  month?: number;
  policyCount: number;
}

type AggregationType = 'year' | 'month';

// Custom background component for quadrants
interface QuadrantBackgroundProps {
  xDomain?: [number, number];
  yDomain?: [number, number];
  width?: number;
  height?: number;
}
const QuadrantBackground = ({ xDomain, yDomain, width, height }: QuadrantBackgroundProps) => {
  if (!xDomain || !yDomain || !width || !height) return null;
  
  const midX = width / 2;
  const midY = height / 2;
  
  return (
    <defs>
      <pattern id="quadrant-pattern" patternUnits="userSpaceOnUse" width={width} height={height}>
        {/* Top Left - Red */}
        <rect x="0" y="0" width={midX} height={midY} fill="rgba(239, 68, 68, 0.1)" />
        {/* Top Right - Blue */}
        <rect x={midX} y="0" width={midX} height={midY} fill="rgba(59, 130, 246, 0.1)" />
        {/* Bottom Right - Green */}
        <rect x={midX} y={midY} width={midX} height={midY} fill="rgba(34, 197, 94, 0.1)" />
        {/* Bottom Left - Yellow */}
        <rect x="0" y={midY} width={midX} height={midY} fill="rgba(234, 179, 8, 0.1)" />
      </pattern>
    </defs>
  );
};

// Extract year from UY or other date fields
function extractYear(uy: string | undefined, inceptionYear?: number, expiryYear?: number): number | null {
  if (uy) {
    // Try to extract year from UY (e.g., "2020", "UY 2020", "2020-2021")
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

export function QuadrantsChart({ data, className }: QuadrantsChartProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const { convertValue } = useCurrency();
  const [aggregationType, setAggregationType] = useState<AggregationType>('year');

  // Aggregate data by year or month
  const chartData = useMemo(() => {
    const aggregationMap = new Map<string, ReinsuranceData[]>();

    // Group records by period (year or year-month)
    data.forEach(record => {
      const year = extractYear(record.uy, record.inceptionYear, record.expiryYear);
      if (!year) return;

      let periodKey: string;
      if (aggregationType === 'month') {
        const month = extractMonth(record.inceptionMonth);
        if (!month) return;
        periodKey = `${year}-${String(month).padStart(2, '0')}`;
      } else {
        periodKey = String(year);
      }

      if (!aggregationMap.has(periodKey)) {
        aggregationMap.set(periodKey, []);
      }
      aggregationMap.get(periodKey)!.push(record);
    });

    // Calculate aggregated metrics for each period
    const aggregatedPoints: ChartDataPoint[] = [];
    
    aggregationMap.forEach((records, periodKey) => {
      // Filter records with valid data
      const validRecords = records.filter(r => {
        const maxLiability = convertValue(r.maxLiabilityKD || 0);
        const premium = convertValue(r.grsPremKD || 0);
        return maxLiability > 0 && premium > 0;
      });

      if (validRecords.length === 0) return;

      // Aggregate KPIs
      const kpis = aggregateKPIs(validRecords);
      const aggregatedMaxLiability = validRecords.reduce((sum, r) => sum + convertValue(r.maxLiabilityKD || 0), 0);
      const aggregatedPremium = convertValue(kpis.premium);
      const lossRatio = kpis.lossRatio;

      // Parse period for display
      const parts = periodKey.split('-');
      const year = parseInt(parts[0], 10);
      const month = parts.length > 1 ? parseInt(parts[1], 10) : undefined;

      aggregatedPoints.push({
        x: aggregatedMaxLiability,
        y: aggregatedPremium,
        lossRatio,
        period: aggregationType === 'month' 
          ? `${year}-${String(month).padStart(2, '0')}` 
          : String(year),
        year,
        month,
        policyCount: validRecords.length,
      });
    });

    // Sort by period
    return aggregatedPoints.sort((a, b) => {
      if (a.year !== b.year) return a.year! - b.year!;
      if (a.month && b.month) return a.month - b.month;
      return 0;
    });
  }, [data, convertValue, aggregationType]);

  // Calculate median values for quadrant lines
  const medianMaxLiability = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sorted = [...chartData].map(d => d.x).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }, [chartData]);

  const medianPremium = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sorted = [...chartData].map(d => d.y).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }, [chartData]);

  // Custom tooltip
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: ChartDataPoint;
    }>;
  }
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const periodLabel = aggregationType === 'month' && data.month
        ? `${monthNames[data.month - 1]} ${data.year}`
        : `Year ${data.year}`;
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{periodLabel}</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Period:</span> {data.period}</p>
            <p><span className="text-muted-foreground">Max Liability:</span> {formatCurrencyNumeric(data.x)}</p>
            <p><span className="text-muted-foreground">Premium:</span> {formatCurrencyNumeric(data.y)}</p>
            <p>
              <span className="text-muted-foreground">Loss Ratio:</span>{' '}
              <span className={data.lossRatio > 100 ? 'text-red-500 font-semibold' : data.lossRatio > 80 ? 'text-yellow-500 font-semibold' : 'text-green-500 font-semibold'}>
                {formatPct(data.lossRatio)}
              </span>
            </p>
            <p><span className="text-muted-foreground">Policies:</span> {data.policyCount.toLocaleString()}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Quadrants Chart</CardTitle>
          <CardDescription>Max Liability vs Premium</CardDescription>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quadrants Chart - Loss Ratio by Period</CardTitle>
            <CardDescription>
              Max Liability (X-axis) vs Premium (Y-axis) aggregated by {aggregationType === 'year' ? 'Year' : 'Month'}
              <br />
              <span className="text-xs text-muted-foreground">
                Median Max Liability: {formatCurrencyNumeric(medianMaxLiability)} | Median Premium: {formatCurrencyNumeric(medianPremium)}
              </span>
            </CardDescription>
          </div>
          <Select value={aggregationType} onValueChange={(value: AggregationType) => setAggregationType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Aggregate by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">By Year</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            
            {/* Quadrant Background */}
            <defs>
              <linearGradient id="quadrant-topLeft" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.1)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.05)" />
              </linearGradient>
              <linearGradient id="quadrant-topRight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
              </linearGradient>
              <linearGradient id="quadrant-bottomRight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.1)" />
                <stop offset="100%" stopColor="rgba(34, 197, 94, 0.05)" />
              </linearGradient>
              <linearGradient id="quadrant-bottomLeft" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(234, 179, 8, 0.1)" />
                <stop offset="100%" stopColor="rgba(234, 179, 8, 0.05)" />
              </linearGradient>
            </defs>
            
            {/* Reference lines for quadrants (median values) */}
            <ReferenceLine 
              x={medianMaxLiability} 
              stroke="#888" 
              strokeDasharray="5 5" 
              label={{ value: 'Median Max Liability', position: 'top', fill: '#888' }}
            />
            <ReferenceLine 
              y={medianPremium} 
              stroke="#888" 
              strokeDasharray="5 5" 
              label={{ value: 'Median Premium', position: 'right', fill: '#888' }}
            />
            
            <XAxis
              type="number"
              dataKey="x"
              name="Max Liability"
              label={{ value: 'Max Liability', position: 'insideBottom', offset: -10 }}
              tickFormatter={(value) => {
                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Premium"
              label={{ value: 'Premium', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => {
                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="Periods" data={chartData} fill="#3b82f6">
              {chartData.map((entry, index) => {
                // Color based on Loss Ratio
                let fill = '#3b82f6'; // Default blue
                if (entry.lossRatio > 100) {
                  fill = '#ef4444'; // Red - High Loss Ratio (>100%)
                } else if (entry.lossRatio > 80) {
                  fill = '#f59e0b'; // Yellow - Medium-High Loss Ratio (80-100%)
                } else if (entry.lossRatio > 50) {
                  fill = '#3b82f6'; // Blue - Medium Loss Ratio (50-80%)
                } else {
                  fill = '#22c55e'; // Green - Low Loss Ratio (<50%)
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Loss Ratio Color Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
            <span className="text-muted-foreground">Low LR (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
            <span className="text-muted-foreground">Medium LR (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500"></div>
            <span className="text-muted-foreground">High LR (80-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500"></div>
            <span className="text-muted-foreground">Very High LR (&gt;100%)</span>
          </div>
        </div>
        
        {/* Quadrant Legend */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quadrants (based on median values):</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
              <span className="text-muted-foreground">Top Left: Low Liability, High Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
              <span className="text-muted-foreground">Top Right: High Liability, High Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500"></div>
              <span className="text-muted-foreground">Bottom Left: Low Liability, Low Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500"></div>
              <span className="text-muted-foreground">Bottom Right: High Liability, Low Premium</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

