'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { formatPct } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { ReinsuranceData } from '@/lib/schema';
import { Target, AlertTriangle } from 'lucide-react';
import { METRIC_COLORS } from '@/lib/colors/metrics';

interface LossRatioBarChartProps {
  data: ReinsuranceData[];
  className?: string;
}

export function LossRatioBarChart({ data, className }: LossRatioBarChartProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  
  const chartData = useMemo(() => {
    const uyMap = new Map<string, { 
      uy: string; 
      premium: number; 
      paidClaims: number;
      osClaims: number;
      incurred: number; 
      lossRatio: number;
      paidClaimsPct: number;
      osClaimsPct: number;
    }>();
    
    data.forEach(record => {
      const uy = record.uy;
      if (!uyMap.has(uy)) {
        uyMap.set(uy, { 
          uy, 
          premium: 0, 
          paidClaims: 0,
          osClaims: 0,
          incurred: 0, 
          lossRatio: 0,
          paidClaimsPct: 0,
          osClaimsPct: 0
        });
      }
      const entry = uyMap.get(uy)!;
      // Use GRS_PREM (KD) - column 66 (grsPremKD) for premium
      entry.premium += record.grsPremKD || 0;
      // Track paid and OS claims separately
      entry.paidClaims += record.paidClaimsKD || 0;
      entry.osClaims += record.osClaimKD || 0;
      // Use INC_CLAIM (KD) - column 71 (incClaimKD) for incurred claims
      // If incClaimKD is not available, calculate from paid + OS
      entry.incurred += record.incClaimKD || (record.paidClaimsKD || 0) + (record.osClaimKD || 0);
    });

    // Calculate loss ratios and percentages
    Array.from(uyMap.values()).forEach(entry => {
      entry.lossRatio = entry.premium > 0 ? (entry.incurred / entry.premium) * 100 : 0;
      entry.paidClaimsPct = entry.premium > 0 ? (entry.paidClaims / entry.premium) * 100 : 0;
      entry.osClaimsPct = entry.premium > 0 ? (entry.osClaims / entry.premium) * 100 : 0;
    });

    const sorted = Array.from(uyMap.values()).sort((a, b) => a.uy.localeCompare(b.uy));
    return sorted;
  }, [data]);

  const avgLossRatio = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.lossRatio, 0) / chartData.length : 0;
  const bestUY = chartData.length > 0 ? chartData.reduce((best, current) => 
    current.lossRatio < best.lossRatio ? current : best
  ) : { uy: 'N/A', lossRatio: 0 };
  const worstUY = chartData.length > 0 ? chartData.reduce((worst, current) => 
    current.lossRatio > worst.lossRatio ? current : worst
  ) : { uy: 'N/A', lossRatio: 0 };

  const getBarColor = (lossRatio: number) => {
    if (lossRatio > 100) return '#ef4444'; // red
    if (lossRatio > 80) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  interface TooltipPayload {
    name: string;
    value: number;
    payload: {
      uy: string;
      premium: number;
      incurred: number;
      incurredClaims: number;
      paidClaims: number;
      osClaims: number;
      lossRatio: number;
      paidClaimsPct: number;
      osClaimsPct: number;
    };
  }
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[250px]">
          <p className="font-semibold text-lg mb-3">{`UY: ${label}`}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loss Ratio:</span>
              <span className="font-semibold text-base" style={{ color: METRIC_COLORS.lossRatio }}>
                {formatPct(data.lossRatio)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Premium:</span>
              <span className="font-medium" style={{ color: METRIC_COLORS.premium }}>{formatCurrencyNumeric(data.premium)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Incurred:</span>
              <span className="font-medium" style={{ color: METRIC_COLORS.incurredClaims }}>{formatCurrencyNumeric(data.incurred || data.incurredClaims)}</span>
            </div>
            <div className="border-t border-muted pt-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Breakdown:</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: METRIC_COLORS.paidClaims }}></span>
                  Paid Claims:
                </span>
                <span className="font-medium" style={{ color: METRIC_COLORS.paidClaims }}>
                  {formatCurrencyNumeric(data.paidClaims)} ({formatPct(data.paidClaimsPct)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: METRIC_COLORS.outstandingClaims }}></span>
                  OS Claims:
                </span>
                <span className="font-medium" style={{ color: METRIC_COLORS.outstandingClaims }}>
                  {formatCurrencyNumeric(data.osClaims)} ({formatPct(data.osClaimsPct)})
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Loss Ratio % by UY
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Avg: {formatPct(avgLossRatio)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Performance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatPct(bestUY.lossRatio)}
                </div>
                <div className="text-xs text-muted-foreground">Best UY: {bestUY.uy}</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatPct(avgLossRatio)}
                </div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatPct(worstUY.lossRatio)}
                </div>
                <div className="text-xs text-muted-foreground">Worst UY: {worstUY.uy}</div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="uy" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                      axisLine={{ stroke: '#6b7280' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                      tickFormatter={(value) => {
                        // Only show positive values, format as clean percentage
                        const num = Number(value);
                        if (isNaN(num) || num < 0) return '';
                        return formatPct(num);
                      }}
                      allowDecimals={false}
                      ticks={[0, 20, 40, 60, 80, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => {
                        if (value === 'paidClaimsPct') return 'Paid Claims %';
                        if (value === 'osClaimsPct') return 'OS Claims %';
                        return value;
                      }}
                    />
                    {/* Stacked bars showing Paid Claims % and OS Claims % */}
                    <Bar
                      dataKey="paidClaimsPct"
                      stackId="claims"
                      fill={METRIC_COLORS.paidClaims}
                      name="Paid Claims %"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="osClaimsPct"
                      stackId="claims"
                      fill={METRIC_COLORS.outstandingClaims}
                      name="OS Claims %"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => {
                        // Use outstanding claims color, but adjust opacity based on loss ratio
                        return <Cell key={`cell-${index}`} fill={METRIC_COLORS.outstandingClaims} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
