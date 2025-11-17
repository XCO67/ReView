'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatPct } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { Target, AlertTriangle } from 'lucide-react';

interface LossRatioBarChartProps {
  data: ReinsuranceData[];
  className?: string;
}

export function LossRatioBarChart({ data, className }: LossRatioBarChartProps) {
  console.log('LossRatioBarChart - Data received:', data.length, 'records');
  
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
      entry.premium += record.grossUWPrem;
      entry.incurred += record.grossPaidClaims + record.grossOsLoss;
    });

    // Calculate loss ratios
    Array.from(uyMap.values()).forEach(entry => {
      entry.lossRatio = entry.premium > 0 ? (entry.incurred / entry.premium) * 100 : 0;
    });

    return Array.from(uyMap.values()).sort((a, b) => a.uy.localeCompare(b.uy));
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { lossRatio: number; premium: number; incurred: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[200px]">
          <p className="font-semibold text-lg mb-2">{`UY: ${label}`}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loss Ratio:</span>
              <span className={`font-medium ${data.lossRatio > 80 ? 'text-red-600' : data.lossRatio > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                {formatPct(data.lossRatio)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Premium:</span>
              <span className="font-medium text-blue-600">{formatPct(data.premium)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Incurred:</span>
              <span className="font-medium text-red-600">{formatPct(data.incurred)}</span>
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
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="uy" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#6b7280' }}
                      tickFormatter={(value) => formatPct(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="lossRatio"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.lossRatio)} />
                      ))}
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
