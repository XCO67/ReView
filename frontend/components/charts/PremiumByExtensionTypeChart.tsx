'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatKD, formatPct } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { PieChart as PieChartIcon, Building2 } from 'lucide-react';

interface PremiumByExtTypeDonutProps {
  data: ReinsuranceData[];
  className?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export function PremiumByExtTypeDonut({ data, className }: PremiumByExtTypeDonutProps) {
  const chartData = useMemo(() => {
    const extTypeMap = new Map<string, { name: string; value: number; count: number }>();
    
    data.forEach(record => {
      const extType = record.extType && record.extType !== 'Unknown' ? record.extType : 'Other';
      if (!extTypeMap.has(extType)) {
        extTypeMap.set(extType, { name: extType, value: 0, count: 0 });
      }
      const entry = extTypeMap.get(extType)!;
      entry.value += record.grossUWPrem;
      entry.count += 1;
    });

    return Array.from(extTypeMap.values())
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalPremium = chartData.reduce((sum, item) => sum + item.value, 0);
  const topExtType = chartData[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalPremium > 0 ? ((data.value / totalPremium) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[200px]">
          <p className="font-semibold text-lg mb-2">{data.name}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Premium:</span>
              <span className="font-medium text-blue-600">{formatKD(data.value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Percentage:</span>
              <span className="font-medium text-green-600">{percentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Accounts:</span>
              <span className="font-medium text-purple-600">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Premium by Ext Type
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {chartData.length} types
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatKD(totalPremium)}
                </div>
                <div className="text-xs text-muted-foreground">Total Premium</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {topExtType && totalPremium > 0 ? formatPct((topExtType.value / totalPremium) * 100) : '0%'}
                </div>
                <div className="text-xs text-muted-foreground">Top: {topExtType?.name || 'N/A'}</div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Ext Types List */}
            {chartData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Ext Types by Premium</h4>
                <div className="space-y-1">
                  {chartData.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.count} accounts</span>
                        <span className="font-medium">{formatKD(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}





