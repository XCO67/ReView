'use client';

import { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Line, 
  ComposedChart,
  Cell,
  ReferenceLine
} from 'recharts';
import { formatPct } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { METRIC_COLORS } from '@/lib/colors/metrics';

interface ComparisonData {
  id: string;
  label: string;
  kpis: {
    premium: number;
    paidClaims: number;
    outstandingClaims: number;
    incurredClaims: number;
    lossRatio: number;
  };
}

interface ComparisonBarChartProps {
  data: ComparisonData[];
  className?: string;
}

export function ComparisonBarChart({ data, className }: ComparisonBarChartProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const { currency, convertValue } = useCurrency();

  // Transform data for chart - create grouped bars
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((entity) => {
      const totalIncurred = entity.kpis.incurredClaims;

      return {
        name: entity.label,
        // Premium bar (left side) - use actual premium value
        premium: entity.kpis.premium,
        // Claims bars (right side, stacked) - use actual claim values
        paidClaims: entity.kpis.paidClaims,
        outstandingClaims: entity.kpis.outstandingClaims,
        incurredClaims: totalIncurred,
        // Loss ratio line
        lossRatio: entity.kpis.lossRatio,
      };
    });
  }, [data]);

  // Calculate max values for axes (converted to current currency)
  const maxPremium = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => convertValue(d.premium)), 1);
  }, [chartData, convertValue]);

  const maxClaims = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => convertValue(d.incurredClaims)), 1);
  }, [chartData, convertValue]);

  const maxPrice = useMemo(() => {
    return Math.max(maxPremium, maxClaims) * 1.1;
  }, [maxPremium, maxClaims]);

  // Transform data with currency conversion
  const chartDataWithCurrency = useMemo(() => {
    return chartData.map((item) => ({
      ...item,
      premiumConverted: convertValue(item.premium),
      paidClaimsConverted: convertValue(item.paidClaims),
      outstandingClaimsConverted: convertValue(item.outstandingClaims),
      incurredClaimsConverted: convertValue(item.incurredClaims),
    }));
  }, [chartData, convertValue]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No data available for comparison
      </div>
    );
  }

  // Clean black tooltip matching website design with color indicators
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Use converted values if available, otherwise use original
      const premium = data.premiumConverted ?? data.premium;
      const paidClaims = data.paidClaimsConverted ?? data.paidClaims;
      const outstandingClaims = data.outstandingClaimsConverted ?? data.outstandingClaims;
      
      return (
        <div className="bg-[#050505] border border-[#1a1a1a] rounded-md shadow-2xl p-3 min-w-[180px] backdrop-blur-sm">
          <p className="font-semibold mb-2.5 text-white text-xs border-b border-[#1a1a1a] pb-2">
            {data.name}
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.premium }}></div>
                <span className="text-[#6b7280] font-medium">Premium:</span>
              </div>
              <span className="font-semibold" style={{ color: METRIC_COLORS.premium }}>
                {formatCurrencyNumeric(premium)} {currency}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.paidClaims }}></div>
                <span className="text-[#6b7280] font-medium">Paid Claims:</span>
              </div>
              <span className="font-semibold" style={{ color: METRIC_COLORS.paidClaims }}>
                {formatCurrencyNumeric(paidClaims)} {currency}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.outstandingClaims }}></div>
                <span className="text-[#6b7280] font-medium">Outstanding:</span>
              </div>
              <span className="font-semibold" style={{ color: METRIC_COLORS.outstandingClaims }}>
                {formatCurrencyNumeric(outstandingClaims)} {currency}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3 pt-2 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.lossRatio }}></div>
                <span className="text-[#9ca3af] font-semibold">Loss Ratio:</span>
              </div>
              <span className="font-bold text-xs" style={{ color: METRIC_COLORS.lossRatio }}>
                {formatPct(data.lossRatio)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate max for loss ratio Y-axis
  const maxLossRatio = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.lossRatio), 100) * 1.1;
  }, [chartData]);

  return (
    <div className={className}>
      {/* Info icon with legend explanation */}
      <div className="flex justify-end mb-2">
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <button className="text-[#9ca3af] hover:text-[#d1d5db] transition-colors p-1 rounded">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="left"
              className="bg-[#1f2937] border-[#374151] text-[#f3f4f6] p-4 min-w-[200px]"
            >
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: METRIC_COLORS.premium }}></div>
                  <span className="text-[#d1d5db]">Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: METRIC_COLORS.paidClaims }}></div>
                  <span className="text-[#d1d5db]">Paid Claims</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: METRIC_COLORS.outstandingClaims }}></div>
                  <span className="text-[#d1d5db]">Outstanding Claims</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[#374151]">
                  <div className="w-3 h-0.5" style={{ backgroundColor: METRIC_COLORS.lossRatio }}></div>
                  <span className="text-[#d1d5db]">Loss Ratio Line</span>
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
      
      <ResponsiveContainer width="100%" height={Math.max(600, data.length * 90)}>
        <ComposedChart
          data={chartDataWithCurrency}
          margin={{ top: 20, right: 50, left: 80, bottom: 100 }}
        >
          {/* Clean professional grid - must be before axes for proper rendering */}
          <CartesianGrid 
            strokeDasharray="5 5" 
            stroke="#5a5a5a" 
            vertical={true}
            horizontal={true}
            strokeOpacity={1}
            strokeWidth={1.5}
          />
          
          {/* X-Axis - Clean styling */}
          <XAxis 
            type="category" 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
            stroke="#4b5563"
            strokeWidth={0.5}
          />
          
          {/* Left Y-Axis - Price Range with increments */}
          <YAxis 
            yAxisId="left"
            type="number" 
            domain={[0, maxPrice]}
            ticks={(() => {
              // Generate ticks starting from 0 with reasonable increments
              // Calculate step based on maxPrice to get ~10-12 ticks
              const numTicks = 10;
              const step = Math.ceil(maxPrice / numTicks);
              // Round step to nice numbers (10, 50, 100, 500, 1000, etc.)
              const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
              const normalized = step / magnitude;
              let niceStep = magnitude;
              if (normalized <= 1) niceStep = magnitude;
              else if (normalized <= 2) niceStep = 2 * magnitude;
              else if (normalized <= 5) niceStep = 5 * magnitude;
              else niceStep = 10 * magnitude;
              
              const ticks: number[] = [];
              for (let i = 0; i <= maxPrice; i += niceStep) {
                ticks.push(i);
              }
              // Ensure max is included
              if (ticks[ticks.length - 1] < maxPrice) {
                ticks.push(maxPrice);
              }
              return ticks;
            })()}
            tickFormatter={(value) => {
              // Format with appropriate precision
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M ${currency}`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K ${currency}`;
              }
              return `${value.toFixed(0)} ${currency}`;
            }}
            label={{ 
              value: `Amount (${currency})`, 
              angle: -90, 
              position: 'insideLeft', 
              style: { 
                textAnchor: 'middle',
                fill: '#9ca3af',
                fontSize: 12,
                fontWeight: 600
              } 
            }}
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
            stroke="#4b5563"
            strokeWidth={0.5}
            axisLine={{ stroke: '#374151', strokeWidth: 0.5 }}
            width={80}
          />
          
          {/* Right Y-Axis - Loss Ratio with increments of 10 */}
          <YAxis 
            yAxisId="right"
            type="number" 
            domain={[0, maxLossRatio]}
            orientation="right"
            ticks={(() => {
              // Generate ticks starting from 0, incrementing by 10
              const ticks: number[] = [];
              for (let i = 0; i <= maxLossRatio; i += 10) {
                ticks.push(i);
              }
              // Ensure max is included if not already
              if (ticks[ticks.length - 1] < maxLossRatio) {
                ticks.push(maxLossRatio);
              }
              return ticks;
            })()}
            tickFormatter={(value) => formatPct(value)}
            label={{ 
              value: 'Loss Ratio (%)', 
              angle: 90, 
              position: 'insideRight', 
              style: { 
                textAnchor: 'middle',
                fill: '#9ca3af',
                fontSize: 12,
                fontWeight: 600
              } 
            }}
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
            stroke="#4b5563"
            strokeWidth={0.5}
            axisLine={{ stroke: '#374151', strokeWidth: 0.5 }}
            width={70}
          />
          
          {/* Professional tooltip with dark theme */}
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ 
              fill: 'rgba(17, 24, 39, 0.4)',
              stroke: '#6b7280',
              strokeWidth: 1,
              strokeDasharray: '3 3'
            }}
          />
          
          {/* Premium Bar - Left side, modern design with gradient */}
          <Bar 
            yAxisId="left"
            dataKey="premiumConverted" 
            name="premium"
            radius={[8, 8, 0, 0]}
            barSize={40}
            animationDuration={800}
            animationEasing="ease-out"
            isAnimationActive={true}
          >
            {chartDataWithCurrency.map((entry, index) => (
              <Cell 
                key={`premium-${index}`} 
                fill="url(#premiumGradient)"
                style={{ 
                  transition: 'opacity 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                  filter: `drop-shadow(0 2px 4px ${METRIC_COLORS.premium}40)`
                }}
              />
            ))}
          </Bar>

          {/* Stacked Claims Bars - Paid Claims (right side, bottom) - No rounding for seamless stack */}
          <Bar 
            yAxisId="left"
            dataKey="paidClaimsConverted" 
            stackId="claims"
            name="paidClaims"
            radius={[0, 0, 0, 0]}
            barSize={40}
            animationDuration={800}
            animationEasing="ease-out"
            isAnimationActive={true}
          >
            {chartDataWithCurrency.map((entry, index) => (
              <Cell 
                key={`paid-${index}`} 
                fill="url(#paidGradient)"
                style={{ 
                  transition: 'opacity 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                  filter: `drop-shadow(0 2px 4px ${METRIC_COLORS.paidClaims}40)`
                }}
              />
            ))}
          </Bar>

          {/* Stacked Claims Bars - Outstanding Claims (right side, top) - Rounded top only, flat bottom for seamless stack */}
          <Bar 
            yAxisId="left"
            dataKey="outstandingClaimsConverted" 
            stackId="claims"
            name="outstandingClaims"
            radius={[8, 8, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
            isAnimationActive={true}
          >
            {chartDataWithCurrency.map((entry, index) => (
              <Cell 
                key={`os-${index}`} 
                fill="url(#outstandingGradient)"
                style={{ 
                  transition: 'opacity 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                  filter: `drop-shadow(0 2px 4px ${METRIC_COLORS.outstandingClaims}40)`
                }}
              />
            ))}
          </Bar>

          {/* Loss Ratio Line - Modern smooth line with glow effect */}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="lossRatio" 
            stroke="url(#lossRatioGradient)"
            strokeWidth={4}
            dot={{ 
              fill: METRIC_COLORS.lossRatio, 
              r: 6, 
              strokeWidth: 3, 
              stroke: '#ffffff',
              opacity: 1,
              filter: `drop-shadow(0 0 4px ${METRIC_COLORS.lossRatio}99)`
            }}
            activeDot={{ 
              r: 9, 
              strokeWidth: 3, 
              stroke: '#ffffff',
              fill: METRIC_COLORS.lossRatio,
              opacity: 1,
              filter: `drop-shadow(0 0 8px ${METRIC_COLORS.lossRatio}CC)`
            }}
            name="lossRatio"
            strokeOpacity={1}
            animationDuration={1000}
            animationEasing="ease-out"
            isAnimationActive={true}
          />
          
          {/* Gradient definitions for modern look */}
          <defs>
            <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={METRIC_COLORS.premium} stopOpacity={0.9} />
              <stop offset="100%" stopColor={METRIC_COLORS.premium} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={METRIC_COLORS.paidClaims} stopOpacity={0.9} />
              <stop offset="100%" stopColor={METRIC_COLORS.paidClaims} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="outstandingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={METRIC_COLORS.outstandingClaims} stopOpacity={0.9} />
              <stop offset="100%" stopColor={METRIC_COLORS.outstandingClaims} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="lossRatioGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={METRIC_COLORS.lossRatio} stopOpacity={0.8} />
              <stop offset="100%" stopColor={METRIC_COLORS.lossRatio} stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

