'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatKD, formatPct } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { ReinsuranceData } from '@/lib/schema';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { METRIC_COLORS } from '@/lib/colors/metrics';

interface PremiumIncurredLineChartProps {
  data: ReinsuranceData[];
  className?: string;
}

export function PremiumIncurredLineChart({ data, className }: PremiumIncurredLineChartProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  
  const chartData = useMemo(() => {
    const uyMap = new Map<string, { 
      uy: string; 
      premium: number; 
      incurred: number; 
      lossRatio: number;
    }>();
    
    data.forEach(record => {
      const uy = record.uy;
      if (!uyMap.has(uy)) {
        uyMap.set(uy, { uy, premium: 0, incurred: 0, lossRatio: 0 });
      }
      const entry = uyMap.get(uy)!;
      // Use GRS_PREM (KD) - column 66 (grsPremKD) for premium
      entry.premium += record.grsPremKD || 0;
      // Use INC_CLAIM (KD) - column 71 (incClaimKD) for incurred claims
      entry.incurred += record.incClaimKD || (record.paidClaimsKD || 0) + (record.osClaimKD || 0);
    });

    // Calculate loss ratios
    Array.from(uyMap.values()).forEach(entry => {
      entry.lossRatio = entry.premium > 0 ? (entry.incurred / entry.premium) * 100 : 0;
    });

    return Array.from(uyMap.values()).sort((a, b) => a.uy.localeCompare(b.uy));
  }, [data]);

  const totalPremium = chartData.reduce((sum, item) => sum + item.premium, 0);
  const totalIncurred = chartData.reduce((sum, item) => sum + item.incurred, 0);
  const overallLossRatio = totalPremium > 0 ? (totalIncurred / totalPremium) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { lossRatio: number; premium: number; incurred: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[200px]">
          <p className="font-semibold text-lg mb-2">{`UY: ${label}`}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Premium:</span>
              <span className="font-medium" style={{ color: METRIC_COLORS.premium }}>{formatCurrencyNumeric(data.premium)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Incurred Claims:</span>
              <span className="font-medium" style={{ color: METRIC_COLORS.incurredClaims }}>{formatCurrencyNumeric(data.incurred)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loss Ratio:</span>
              <span className="font-medium" style={{ color: METRIC_COLORS.lossRatio }}>
                {formatPct(data.lossRatio)}
              </span>
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
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Premium vs Incurred by UY
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: METRIC_COLORS.premium }}></div>
                <span>Premium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: METRIC_COLORS.incurredClaims }}></div>
                <span>Incurred</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${METRIC_COLORS.premium}20` }}>
                <div className="text-2xl font-bold" style={{ color: METRIC_COLORS.premium }}>
                  {formatCurrencyNumeric(totalPremium)}
                </div>
                <div className="text-xs text-muted-foreground">Total Premium</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${METRIC_COLORS.incurredClaims}20` }}>
                <div className="text-2xl font-bold" style={{ color: METRIC_COLORS.incurredClaims }}>
                  {formatCurrencyNumeric(totalIncurred)}
                </div>
                <div className="text-xs text-muted-foreground">Total Incurred</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${METRIC_COLORS.lossRatio}20` }}>
                <div className="text-2xl font-bold" style={{ color: METRIC_COLORS.lossRatio }}>
                  {formatPct(overallLossRatio)}
                </div>
                <div className="text-xs text-muted-foreground">Loss Ratio</div>
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
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="uy" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                    />
                    <YAxis 
                      domain={[0, 'auto']}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                      tickFormatter={(value) => {
                        const num = Number(value);
                        if (isNaN(num) || num < 0) return '0';
                        // Format as clean numbers: 100M, 50M, 10M, etc.
                        if (num >= 1000000000) {
                          return `${(num / 1000000000).toFixed(1)}B`;
                        }
                        if (num >= 1000000) {
                          return `${(num / 1000000).toFixed(1)}M`;
                        }
                        if (num >= 1000) {
                          return `${(num / 1000).toFixed(0)}K`;
                        }
                        return num.toString();
                      }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="premium"
                      stroke={METRIC_COLORS.premium}
                      strokeWidth={3}
                      dot={{ fill: METRIC_COLORS.premium, strokeWidth: 2, r: 4 }}
                      name="Premium"
                    />
                    <Line
                      type="monotone"
                      dataKey="incurred"
                      stroke={METRIC_COLORS.incurredClaims}
                      strokeWidth={3}
                      dot={{ fill: METRIC_COLORS.incurredClaims, strokeWidth: 2, r: 4 }}
                      name="Incurred Claims"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
