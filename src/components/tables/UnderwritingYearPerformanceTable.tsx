'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKD, formatKDNumeric, formatPct, formatNumber } from '@/lib/format';
import { useFormatCurrency } from '@/lib/format-currency';
import { CurrencyLabel } from '@/components/currency/CurrencyLabel';
import { UYPerformanceRow } from '@/lib/schema';
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface UyPerformanceTableProps {
  data: UYPerformanceRow[];
  totals: UYPerformanceRow;
  className?: string;
  showMonthly?: boolean;
  showQuarterly?: boolean;
  rawData?: ReinsuranceData[];
}

interface MonthlyQuarterlyData extends UYPerformanceRow {
  period: string; // "Jan", "Feb", etc. or "Q1", "Q2", etc.
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];

export function UyPerformanceTable({ 
  data, 
  totals, 
  className, 
  showMonthly = false, 
  showQuarterly = false,
  rawData = []
}: UyPerformanceTableProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const allData = data.filter(row => row.uy !== 'Total');

  // Calculate monthly/quarterly data for each year
  const periodDataMap = useMemo(() => {
    if (!rawData || rawData.length === 0) return new Map<string, MonthlyQuarterlyData[]>();
    
    const map = new Map<string, MonthlyQuarterlyData[]>();
    
    // Group data by UY
    const dataByUY = new Map<string, ReinsuranceData[]>();
    rawData.forEach(record => {
      const uy = String(record.uy || '');
      if (!dataByUY.has(uy)) {
        dataByUY.set(uy, []);
      }
      dataByUY.get(uy)!.push(record);
    });

    // Calculate monthly or quarterly data for each UY
    dataByUY.forEach((records, uy) => {
      const periods: MonthlyQuarterlyData[] = [];
      
      if (showMonthly) {
        // Group by month
        const monthlyGroups = new Map<number, ReinsuranceData[]>();
        records.forEach(record => {
          const month = record.inceptionMonth || 0;
          if (month >= 1 && month <= 12) {
            if (!monthlyGroups.has(month)) {
              monthlyGroups.set(month, []);
            }
            monthlyGroups.get(month)!.push(record);
          }
        });

        // Calculate KPIs for each month
        monthLabels.forEach((monthLabel, index) => {
          const month = index + 1;
          const monthRecords = monthlyGroups.get(month) || [];
          if (monthRecords.length > 0) {
            const kpis = aggregateKPIs(monthRecords);
            periods.push({
              uy: monthLabel,
              premium: kpis.premium,
              paidClaims: kpis.paidClaims,
              outstandingClaims: kpis.outstandingClaims,
              incurredClaims: kpis.incurredClaims,
              expense: kpis.expense,
              lossRatio: kpis.lossRatio,
              expenseRatio: kpis.expenseRatio,
              combinedRatio: kpis.combinedRatio,
              numberOfAccounts: kpis.numberOfAccounts,
              avgMaxLiability: kpis.avgMaxLiability,
              period: monthLabel,
            });
          }
        });
      } else if (showQuarterly) {
        // Group by quarter
        const quarterlyGroups = new Map<number, ReinsuranceData[]>();
        records.forEach(record => {
          const month = record.inceptionMonth || 0;
          const quarter = month >= 1 && month <= 12 ? Math.ceil(month / 3) : 0;
          if (quarter >= 1 && quarter <= 4) {
            if (!quarterlyGroups.has(quarter)) {
              quarterlyGroups.set(quarter, []);
            }
            quarterlyGroups.get(quarter)!.push(record);
          }
        });

        // Calculate KPIs for each quarter
        quarterLabels.forEach((quarterLabel, index) => {
          const quarter = index + 1;
          const quarterRecords = quarterlyGroups.get(quarter) || [];
          if (quarterRecords.length > 0) {
            const kpis = aggregateKPIs(quarterRecords);
            periods.push({
              uy: quarterLabel,
              premium: kpis.premium,
              paidClaims: kpis.paidClaims,
              outstandingClaims: kpis.outstandingClaims,
              incurredClaims: kpis.incurredClaims,
              expense: kpis.expense,
              lossRatio: kpis.lossRatio,
              expenseRatio: kpis.expenseRatio,
              combinedRatio: kpis.combinedRatio,
              numberOfAccounts: kpis.numberOfAccounts,
              avgMaxLiability: kpis.avgMaxLiability,
              period: quarterLabel,
            });
          }
        });
      }
      
      if (periods.length > 0) {
        map.set(uy, periods);
      }
    });

    return map;
  }, [rawData, showMonthly, showQuarterly]);

  const toggleYear = (uy: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(uy)) {
      newExpanded.delete(uy);
    } else {
      newExpanded.add(uy);
    }
    setExpandedYears(newExpanded);
  };

  const renderRow = (row: UYPerformanceRow, index: number, isTotal = false) => {
    const isExpanded = expandedYears.has(row.uy);
    const hasPeriodData = periodDataMap.has(row.uy);
    const canExpand = (showMonthly || showQuarterly) && hasPeriodData && !isTotal;
    const rowKey = `${row.uy}-${index}-${isTotal ? 'total' : 'row'}`;

    return (
      <React.Fragment key={rowKey}>
        <motion.tr
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={`border-b ${
            isTotal 
              ? 'bg-muted/50 font-semibold' 
              : 'hover:bg-muted/30 cursor-pointer'
          }`}
          onClick={() => canExpand && toggleYear(row.uy)}
        >
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {canExpand && (
                <span className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
              )}
              {!canExpand && <span className="w-4" />}
              <span>{row.uy}</span>
            </div>
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.premium)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.paidClaims)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.outstandingClaims)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.incurredClaims)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.expense)}
          </TableCell>
          <TableCell className="text-right">
            <span className={`${
              row.lossRatio > 100 ? 'text-red-600' : 
              row.lossRatio > 80 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {formatPct(row.lossRatio)}
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className={`${
              row.expenseRatio > 30 ? 'text-red-600' : 
              row.expenseRatio > 20 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {formatPct(row.expenseRatio)}
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className={`${
              row.combinedRatio > 100 ? 'text-red-600' : 
              row.combinedRatio > 90 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {formatPct(row.combinedRatio)}
            </span>
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatNumber(row.numberOfAccounts)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {formatCurrencyNumeric(row.avgMaxLiability)}
          </TableCell>
        </motion.tr>
        <AnimatePresence>
          {canExpand && isExpanded && periodDataMap.has(row.uy) && 
            periodDataMap.get(row.uy)!.map((periodRow, periodIndex) => (
              <motion.tr
                key={`${row.uy}-${periodRow.period}-${periodIndex}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: periodIndex * 0.03 }}
                className="bg-muted/10 hover:bg-muted/20 border-b"
              >
                <TableCell className="font-medium text-muted-foreground">
                  <div className="flex items-center gap-2 pl-6">
                    <span>{periodRow.period}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.premium)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.paidClaims)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.outstandingClaims)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.incurredClaims)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.expense)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`${
                    periodRow.lossRatio > 100 ? 'text-red-600' : 
                    periodRow.lossRatio > 80 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {formatPct(periodRow.lossRatio)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`${
                    periodRow.expenseRatio > 30 ? 'text-red-600' : 
                    periodRow.expenseRatio > 20 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {formatPct(periodRow.expenseRatio)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`${
                    periodRow.combinedRatio > 100 ? 'text-red-600' : 
                    periodRow.combinedRatio > 90 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {formatPct(periodRow.combinedRatio)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatNumber(periodRow.numberOfAccounts)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrencyNumeric(periodRow.avgMaxLiability)}
                </TableCell>
              </motion.tr>
            ))
          }
        </AnimatePresence>
      </React.Fragment>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance by UY</CardTitle>
        <CardDescription>
          <CurrencyLabel />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px] font-semibold">UY</TableHead>
                <TableHead className="text-right font-semibold">Premium</TableHead>
                <TableHead className="text-right font-semibold">Paid Claims</TableHead>
                <TableHead className="text-right font-semibold">Outstanding Claims</TableHead>
                <TableHead className="text-right font-semibold">Incurred Claims</TableHead>
                <TableHead className="text-right font-semibold">Acquisition</TableHead>
                <TableHead className="text-right font-semibold">Loss Ratio</TableHead>
                <TableHead className="text-right font-semibold">Acquisition Ratio</TableHead>
                <TableHead className="text-right font-semibold">Combined Ratio</TableHead>
                <TableHead className="text-right font-semibold">Accounts</TableHead>
                <TableHead className="text-right font-semibold">Avg Max Liability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allData.map((row, index) => renderRow(row, index))}
              {renderRow(totals, allData.length, true)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

