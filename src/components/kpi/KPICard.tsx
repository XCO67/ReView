'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { KPIData } from '@/lib/schema';
import { TrendingUp, TrendingDown, Minus, CircleDollarSign, ShieldCheck, Layers, PieChart, Activity, Briefcase, Percent, Gauge, Users, Shield } from 'lucide-react';

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

type PreparedKpiCard = KpiCardProps & {
  key: string;
};

const formatPrimaryValue = (value: number, format: KpiCardProps['format']) => {
  switch (format) {
    case 'currency':
      return formatKD(value);
    case 'percentage':
      return formatPct(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};

const calculateChange = (value: number, previousValue?: number) => {
  if (previousValue === undefined || previousValue === 0) return null;
  return ((value - previousValue) / previousValue) * 100;
};

export function KpiStrip({ data, previousData }: KpiStripProps) {
  const kpiCards: PreparedKpiCard[] = useMemo(() => ([
    {
      key: 'premium',
      title: 'Premium',
      value: data.premium,
      previousValue: previousData?.premium,
      format: 'currency',
      description: 'Gross Underwritten Premium',
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      key: 'paidClaims',
      title: 'Paid Claims',
      value: data.paidClaims,
      previousValue: previousData?.paidClaims,
      format: 'currency',
      description: 'Gross Paid Claims',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      key: 'outstandingClaims',
      title: 'Outstanding Claims',
      value: data.outstandingClaims,
      previousValue: previousData?.outstandingClaims,
      format: 'currency',
      description: 'Gross Outstanding Loss',
      icon: <Layers className="h-4 w-4" />,
    },
    {
      key: 'incurredClaims',
      title: 'Incurred Claims',
      value: data.incurredClaims,
      previousValue: previousData?.incurredClaims,
      format: 'currency',
      description: 'Paid + Outstanding',
      icon: <PieChart className="h-4 w-4" />,
    },
    {
      key: 'expense',
      title: 'Expense',
      value: data.expense,
      previousValue: previousData?.expense,
      format: 'currency',
      description: 'Acquisition Expense',
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      key: 'lossRatio',
      title: 'Loss Ratio',
      value: data.lossRatio,
      previousValue: previousData?.lossRatio,
      format: 'percentage',
      description: 'Incurred / Premium',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      key: 'expenseRatio',
      title: 'Expense Ratio',
      value: data.expenseRatio,
      previousValue: previousData?.expenseRatio,
      format: 'percentage',
      description: 'Expense / Premium',
      icon: <Percent className="h-4 w-4" />,
    },
    {
      key: 'combinedRatio',
      title: 'Combined Ratio',
      value: data.combinedRatio,
      previousValue: previousData?.combinedRatio,
      format: 'percentage',
      description: 'Loss + Expense Ratio',
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      key: 'accounts',
      title: 'Accounts',
      value: data.numberOfAccounts,
      previousValue: previousData?.numberOfAccounts,
      format: 'number',
      description: 'Number of Accounts',
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'avgMaxLiability',
      title: 'Avg Max Liability',
      value: data.avgMaxLiability,
      previousValue: previousData?.avgMaxLiability,
      format: 'currency',
      description: 'Average Maximum Liability',
      icon: <Shield className="h-4 w-4" />,
    },
  ]), [data, previousData]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!kpiCards.length) return;
    const availableKeys = new Set(kpiCards.map(card => card.key));
    const filteredSelections = selectedKeys.filter(key => availableKeys.has(key));
    if (filteredSelections.length !== selectedKeys.length) {
      setSelectedKeys(filteredSelections);
    }
  }, [selectedKeys, kpiCards]);

  if (kpiCards.length === 0) {
    return null;
  }

  const toggleSelection = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        return prev.filter(item => item !== key);
      }
      return [...prev, key];
    });
  };

  const clearSelection = () => setSelectedKeys([]);

  const selectedCards = kpiCards.filter(card => selectedKeys.includes(card.key));

  return (
    <div className="rounded-3xl border bg-card/70 backdrop-blur px-4 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Toggle KPIs to display their detailed values.
        </p>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selectedKeys.length === 0}
          className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-muted"
        >
          Clear selected
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {kpiCards.map((card) => {
            const isActive = selectedKeys.includes(card.key);
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => toggleSelection(card.key)}
                className={`group relative flex h-full flex-col gap-3 border border-border/30 px-4 py-4 text-left transition-all first:border-l-0 last:border-r-0 ${isActive ? 'bg-background shadow-inner' : 'bg-muted/40 hover:bg-muted/60'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border text-muted-foreground transition ${isActive ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-background/40'}`}>
                    {card.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 break-words">{card.description}</p>
                  </div>
                </div>
                {isActive && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCards.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Select one or more KPIs above to view their detailed values.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {selectedCards.map((activeCard) => {
            const change = calculateChange(activeCard.value, activeCard.previousValue);
            return (
              <motion.div
                key={activeCard.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="h-full rounded-3xl border bg-gradient-to-br from-background via-background to-muted/60 p-6 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                      {activeCard.icon}
                    </span>
                    <h3 className="text-2xl font-semibold text-foreground break-words">{activeCard.title}</h3>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                    <div>
                      <p className="text-4xl font-bold text-foreground break-words">
                        {formatPrimaryValue(activeCard.value, activeCard.format)}
                      </p>
                    </div>
                    {change !== null && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                          change >= 0
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs previous</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

