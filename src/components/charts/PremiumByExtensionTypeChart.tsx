'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatKD, formatPct } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { ReinsuranceData } from '@/lib/schema';
import { PieChart as PieChartIcon, Building2 } from 'lucide-react';
import { METRIC_COLORS, getExtensionTypeColor } from '@/lib/colors/metrics';

interface PremiumByExtTypeDonutProps {
  data: ReinsuranceData[];
  className?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export function PremiumByExtTypeDonut({ data, className }: PremiumByExtTypeDonutProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  
  // Helper function to calculate chart data from filtered records
  const calculateChartData = (records: ReinsuranceData[]) => {
    const extTypeMap = new Map<string, { name: string; value: number; count: number }>();
    
    records.forEach(record => {
      const extType = record.extType && record.extType !== 'Unknown' ? record.extType : 'Other';
      if (!extTypeMap.has(extType)) {
        extTypeMap.set(extType, { name: extType, value: 0, count: 0 });
      }
      const entry = extTypeMap.get(extType)!;
      // Use GRS_PREM (KD) - column 66 (grsPremKD) for premium
      entry.value += record.grsPremKD || 0;
      entry.count += 1;
    });

    return Array.from(extTypeMap.values())
      .sort((a, b) => b.value - a.value);
  };

  // All data chart
  const allChartData = useMemo(() => calculateChartData(data), [data]);
  const allTotalPremium = allChartData.reduce((sum, item) => sum + item.value, 0);
  const allTopExtType = allChartData[0];

  // Helper function to check if record belongs to FERO
  const isFERO = (record: ReinsuranceData): boolean => {
    const loc = record.loc?.trim().toUpperCase();
    const office = record.office?.trim().toUpperCase();
    return loc === 'FERO' || office === 'FERO';
  };

  // Helper function to check if record belongs to HO
  const isHO = (record: ReinsuranceData): boolean => {
    const loc = record.loc?.trim().toUpperCase();
    const office = record.office?.trim().toUpperCase();
    return loc === 'HO' || office === 'HO';
  };

  // FERO data chart
  const feroData = useMemo(() => 
    data.filter(record => isFERO(record)),
    [data]
  );
  const feroChartData = useMemo(() => calculateChartData(feroData), [feroData]);
  const feroTotalPremium = feroChartData.reduce((sum, item) => sum + item.value, 0);
  const feroTopExtType = feroChartData[0];

  // HO data chart
  const hoData = useMemo(() => 
    data.filter(record => isHO(record)),
    [data]
  );
  const hoChartData = useMemo(() => calculateChartData(hoData), [hoData]);
  const hoTotalPremium = hoChartData.reduce((sum, item) => sum + item.value, 0);
  const hoTopExtType = hoChartData[0];

  // Donut chart configurations
  const donutCharts = useMemo(() => [
    {
      key: 'all',
      title: 'All Combined',
      data: allChartData,
      totalPremium: allTotalPremium,
      topExtType: allTopExtType,
    },
    {
      key: 'fero',
      title: 'FERO',
      data: feroChartData,
      totalPremium: feroTotalPremium,
      topExtType: feroTopExtType,
    },
    {
      key: 'ho',
      title: 'HO',
      data: hoChartData,
      totalPremium: hoTotalPremium,
      topExtType: hoTopExtType,
    },
  ], [allChartData, allTotalPremium, allTopExtType, feroChartData, feroTotalPremium, feroTopExtType, hoChartData, hoTotalPremium, hoTopExtType]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {donutCharts.map((chart, idx) => {
          const CustomTooltipForChart = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; count?: number } }> }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const percentage = chart.totalPremium > 0 ? ((data.value / chart.totalPremium) * 100).toFixed(1) : '0.0';
              return (
                <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[200px]">
                  <p className="font-semibold text-lg mb-2">{data.name}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Premium:</span>
                      <span className="font-medium text-blue-600">{formatCurrencyNumeric(data.value)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Percentage:</span>
                      <span className="font-medium text-green-600">{percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Accounts:</span>
                      <span className="font-medium text-purple-600">{data.count || 0}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          };

          return (
            <Card key={chart.key} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    {chart.title}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {chart.data.length} types
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrencyNumeric(chart.totalPremium)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Premium</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {chart.topExtType && chart.totalPremium > 0 ? formatPct((chart.topExtType.value / chart.totalPremium) * 100) : '0%'}
                      </div>
                      <div className="text-xs text-muted-foreground">Top: {chart.topExtType?.name || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Chart */}
                  {chart.data.length === 0 ? (
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
                            data={chart.data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chart.data.map((entry, index) => {
                              // Use specific colors for FAC, TTY, XOL, otherwise use default colors
                              const color = getExtensionTypeColor(entry.name) !== '#6b7280' 
                                ? getExtensionTypeColor(entry.name)
                                : COLORS[index % COLORS.length];
                              return <Cell key={`cell-${chart.key}-${index}`} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip content={<CustomTooltipForChart />} />
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
                  {chart.data.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Ext Types by Premium</h4>
                      <div className="space-y-1">
                        {chart.data.slice(0, 5).map((item, index) => {
                          const color = getExtensionTypeColor(item.name) !== '#6b7280' 
                            ? getExtensionTypeColor(item.name)
                            : COLORS[index % COLORS.length];
                          return (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{item.count} accounts</span>
                              <span className="font-medium">{formatCurrencyNumeric(item.value)}</span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}





