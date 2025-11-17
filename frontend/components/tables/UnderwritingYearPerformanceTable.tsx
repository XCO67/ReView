'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKD, formatPct, formatNumber } from '@/lib/format';
import { UYPerformanceRow } from '@/lib/schema';

interface UyPerformanceTableProps {
  data: UYPerformanceRow[];
  totals: UYPerformanceRow;
  className?: string;
}

export function UyPerformanceTable({ data, totals, className }: UyPerformanceTableProps) {
  const allData = [...data, totals];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance by UY</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">UY</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Paid Claims</TableHead>
                <TableHead className="text-right">Outstanding Claims</TableHead>
                <TableHead className="text-right">Incurred Claims</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Loss Ratio</TableHead>
                <TableHead className="text-right">Expense Ratio</TableHead>
                <TableHead className="text-right">Combined Ratio</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Avg Max Liability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allData.map((row, index) => (
                <motion.tr
                  key={row.uy}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`${
                    row.uy === 'Total' 
                      ? 'bg-muted/50 font-semibold border-t-2' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <TableCell className="font-medium">
                    {row.uy}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.premium)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.paidClaims)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.outstandingClaims)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.incurredClaims)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.expense)}
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
                  <TableCell className="text-right">
                    {formatNumber(row.numberOfAccounts)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKD(row.avgMaxLiability)}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

