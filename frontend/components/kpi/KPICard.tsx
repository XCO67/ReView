'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { KPIData } from '@/lib/schema';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  description?: string;
  delay?: number;
}

export function KpiCard({ 
  title, 
  value, 
  previousValue, 
  format, 
  icon, 
  description,
  delay = 0 
}: KpiCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatKD(val);
      case 'percentage':
        return formatPct(val);
      case 'number':
        return formatNumber(val);
      default:
        return val.toString();
    }
  };

  const getTrendIcon = () => {
    if (previousValue === undefined) return null;
    
    if (value > previousValue) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < previousValue) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (previousValue === undefined) return 'text-gray-500';
    
    if (value > previousValue) {
      return 'text-green-500';
    } else if (value < previousValue) {
      return 'text-red-500';
    } else {
      return 'text-gray-500';
    }
  };

  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    return ((value - previousValue) / previousValue) * 100;
  };

  const change = calculateChange();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatValue(value)}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {previousValue !== undefined && change !== null && (
            <div className="flex items-center mt-2">
              {getTrendIcon()}
              <span className={`text-xs ml-1 ${getTrendColor()}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KpiStripProps {
  data: KPIData;
  previousData?: KPIData;
}

export function KpiStrip({ data, previousData }: KpiStripProps) {
  const kpiCards = [
    {
      title: 'Premium',
      value: data.premium,
      previousValue: previousData?.premium,
      format: 'currency' as const,
      description: 'Gross Underwritten Premium',
    },
    {
      title: 'Paid Claims',
      value: data.paidClaims,
      previousValue: previousData?.paidClaims,
      format: 'currency' as const,
      description: 'Gross Paid Claims',
    },
    {
      title: 'Outstanding Claims',
      value: data.outstandingClaims,
      previousValue: previousData?.outstandingClaims,
      format: 'currency' as const,
      description: 'Gross Outstanding Loss',
    },
    {
      title: 'Incurred Claims',
      value: data.incurredClaims,
      previousValue: previousData?.incurredClaims,
      format: 'currency' as const,
      description: 'Paid + Outstanding',
    },
    {
      title: 'Expense',
      value: data.expense,
      previousValue: previousData?.expense,
      format: 'currency' as const,
      description: 'Acquisition Expense',
    },
    {
      title: 'Loss Ratio',
      value: data.lossRatio,
      previousValue: previousData?.lossRatio,
      format: 'percentage' as const,
      description: 'Incurred / Premium',
    },
    {
      title: 'Expense Ratio',
      value: data.expenseRatio,
      previousValue: previousData?.expenseRatio,
      format: 'percentage' as const,
      description: 'Expense / Premium',
    },
    {
      title: 'Combined Ratio',
      value: data.combinedRatio,
      previousValue: previousData?.combinedRatio,
      format: 'percentage' as const,
      description: 'Loss + Expense Ratio',
    },
    {
      title: 'Accounts',
      value: data.numberOfAccounts,
      previousValue: previousData?.numberOfAccounts,
      format: 'number' as const,
      description: 'Number of Accounts',
    },
    {
      title: 'Avg Max Liability',
      value: data.avgMaxLiability,
      previousValue: previousData?.avgMaxLiability,
      format: 'currency' as const,
      description: 'Average Maximum Liability',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {kpiCards.map((card, index) => (
        <KpiCard
          key={card.title}
          {...card}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

