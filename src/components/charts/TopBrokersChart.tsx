'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKD, formatPct } from '@/lib/format';
import { ReinsuranceData } from '@/lib/schema';
import { Users, Award } from 'lucide-react';

interface TopBrokersListProps {
  data: ReinsuranceData[];
  className?: string;
}

export function TopBrokersList({ data, className }: TopBrokersListProps) {
  const brokersData = useMemo(() => {
    const brokerMap = new Map<string, {
      broker: string;
      premium: number;
      incurredClaims: number;
      lossRatio: number;
      accountCount: number;
    }>();
    
    data.forEach(record => {
      const broker = record.broker && record.broker !== 'Unknown' ? record.broker : 'Other';
      if (!brokerMap.has(broker)) {
        brokerMap.set(broker, {
          broker,
          premium: 0,
          incurredClaims: 0,
          lossRatio: 0,
          accountCount: 0,
        });
      }
      const entry = brokerMap.get(broker)!;
      entry.premium += record.grossUWPrem;
      entry.incurredClaims += record.grossPaidClaims + record.grossOsLoss;
      entry.accountCount += 1;
    });

    // Calculate loss ratios
    Array.from(brokerMap.values()).forEach(entry => {
      entry.lossRatio = entry.premium > 0 ? (entry.incurredClaims / entry.premium) * 100 : 0;
    });

    return Array.from(brokerMap.values())
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 10);
  }, [data]);

  const totalPremium = brokersData.reduce((sum, item) => sum + item.premium, 0);
  const avgLossRatio = brokersData.length > 0 ? brokersData.reduce((sum, item) => sum + item.lossRatio, 0) / brokersData.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top 10 Brokers by Premium
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Avg Loss Ratio: {formatPct(avgLossRatio)}
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
                  {brokersData.length}
                </div>
                <div className="text-xs text-muted-foreground">Top Brokers</div>
              </div>
            </div>

            {/* Top Brokers List */}
            {brokersData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {brokersData.map((item, index) => (
                  <div key={item.broker} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="font-medium">{item.broker}</div>
                          <div className="text-xs text-muted-foreground">{item.accountCount} accounts</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">{formatKD(item.premium)}</div>
                        <div className="text-xs text-muted-foreground">
                          {totalPremium > 0 ? formatPct((item.premium / totalPremium) * 100) : '0%'} share
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.lossRatio > 80 ? 'bg-red-100 text-red-700' : 
                        item.lossRatio > 60 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {formatPct(item.lossRatio)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}





