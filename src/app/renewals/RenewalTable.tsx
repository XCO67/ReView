'use client';

import type { RenewalSummary } from '@/lib/renewals';
import { useFormatCurrency } from '@/lib/format-currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RenewalTableProps {
  summary: RenewalSummary;
}

export function RenewalTable({ summary }: RenewalTableProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  return (
    <Card className="bg-white/5 border-white/10 text-white w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base tracking-[0.2em] uppercase text-white/70">
          Renewal Records
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 w-full overflow-x-auto">
        <div className="border rounded-lg w-full min-w-full">
          <Table className="w-full table-fixed min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[10%]">Renewal Date</TableHead>
                <TableHead className="w-[6%]">Srl</TableHead>
                <TableHead className="w-[18%]">Insured / Cedant</TableHead>
                <TableHead className="w-[10%]">Class</TableHead>
                <TableHead className="w-[12%]">Country</TableHead>
                <TableHead className="w-[10%] text-right">Premium</TableHead>
                <TableHead className="w-[7%] text-right">LR%</TableHead>
                <TableHead className="w-[8%] text-right">Signed Share</TableHead>
                <TableHead className="w-[9%] text-right">Accepted Share</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.records && summary.records.length > 0 ? (
                summary.records.slice(0, 100).map((record, index) => (
                <TableRow
                  key={`renewal-${index}-${record.srl || 'no-srl'}-${record.renewalDate || 'no-date'}-${record.insuredName || 'no-insured'}`}
                  id={`renewal-row-${index}-${record.srl || 'no-srl'}`}
                  className="border-b"
                >
                  <TableCell className="font-medium text-white">
                    {record.renewalDate || '-'}
                  </TableCell>
                  <TableCell>{record.srl || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white truncate">{record.insuredName || '-'}</span>
                      <span className="text-xs text-white/60 truncate">
                        {record.isDirect ? (
                          <span className="text-blue-300 font-medium">Direct</span>
                        ) : (
                          record.cedant || 'Unknown Cedant'
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white">{record.class}</span>
                      <span className="text-xs text-white/50">{record.subBr}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate">{record.countryName || record.country}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrencyNumeric(record.grossUwPrem)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {record.lossRatio == null || isNaN(record.lossRatio) || (record.grossUwPrem === 0 && record.lossRatio === 0)
                      ? '-'
                      : `${Number(record.lossRatio).toFixed(2)}%`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {record.signShare ? `${record.signShare}${record.signShare.includes('%') ? '' : '%'}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {record.acceptedShare ? `${record.acceptedShare}${record.acceptedShare.includes('%') ? '' : '%'}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        record.statusFlag === 'renewed'
                          ? 'border-emerald-400 text-emerald-200 whitespace-nowrap'
                          : record.statusFlag === 'upcoming-renewal'
                          ? 'border-yellow-400 text-yellow-200 whitespace-nowrap'
                          : 'border-rose-400 text-rose-200 whitespace-nowrap'
                      }
                    >
                      {record.statusFlag === 'renewed'
                        ? 'Renewed'
                        : record.statusFlag === 'upcoming-renewal'
                        ? 'Upcoming Renewal'
                        : 'Not Renewed'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-white/60">
                    No renewal records found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

