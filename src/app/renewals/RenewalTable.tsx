'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RenewalSummary } from '@/lib/renewals';
import { useFormatCurrency } from '@/lib/format-currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface RenewalTableProps {
  summary: RenewalSummary;
}

interface PolicyYearsData {
  years: string[];
  broker: string | null;
  isDirect: boolean;
}

export function RenewalTable({ summary }: RenewalTableProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const [hoveredSrl, setHoveredSrl] = useState<string | null>(null);
  const [policyYearsData, setPolicyYearsData] = useState<Record<string, PolicyYearsData>>({});
  const [loadingSrl, setLoadingSrl] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredRowRef = useRef<HTMLTableRowElement | null>(null);

  const fetchPolicyYears = useCallback(async (srl: string) => {
    if (!srl || policyYearsData[srl]) {
      return; // Already loaded or no SRL
    }

    setLoadingSrl(srl);
    try {
      const response = await fetch(`/api/renewals/policy-years?srl=${encodeURIComponent(srl)}`);
      if (response.ok) {
        const data = await response.json();
        setPolicyYearsData(prev => ({
          ...prev,
          [srl]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching policy years:', error);
    } finally {
      setLoadingSrl(null);
    }
  }, [policyYearsData]);

  const handleMouseEnter = useCallback((srl: string, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (srl) {
      setHoveredSrl(srl);
      hoveredRowRef.current = event.currentTarget;
      fetchPolicyYears(srl);
      
      // Calculate tooltip position
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  }, [fetchPolicyYears]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSrl(null);
    setTooltipPosition(null);
    hoveredRowRef.current = null;
  }, []);

  // Update tooltip position on scroll
  useEffect(() => {
    if (!hoveredSrl || !hoveredRowRef.current || !tooltipPosition) return;

    const updatePosition = () => {
      if (hoveredRowRef.current) {
        const rect = hoveredRowRef.current.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    return () => window.removeEventListener('scroll', updatePosition, true);
  }, [hoveredSrl, tooltipPosition]);

  return (
    <Card className="bg-white/5 border-white/10 text-white w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base tracking-[0.2em] uppercase text-white/70">
          Renewal Records
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 w-full overflow-x-auto">
        <div className="border rounded-lg w-full min-w-full relative">
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
                summary.records.slice(0, 100).map((record, index) => {
                  return (
                    <TableRow
                      key={`renewal-${index}-${record.srl || 'no-srl'}-${record.renewalDate || 'no-date'}-${record.insuredName || 'no-insured'}`}
                      id={`renewal-row-${index}-${record.srl || 'no-srl'}`}
                      className="border-b cursor-pointer"
                      onMouseEnter={(e) => handleMouseEnter(record.srl || '', e)}
                      onMouseLeave={handleMouseLeave}
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
                  );
                  })
                ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-white/60">
                    No renewal records found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Custom Tooltip - Rendered outside table structure */}
          {hoveredSrl && tooltipPosition && (policyYearsData[hoveredSrl] || loadingSrl === hoveredSrl) && (
            <div
              ref={tooltipRef}
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onMouseEnter={() => {
                // Keep tooltip visible when hovering over it
              }}
              onMouseLeave={handleMouseLeave}
            >
              <div className="bg-popover border border-border shadow-lg p-3 max-w-xs rounded-md text-foreground">
                {loadingSrl === hoveredSrl ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : policyYearsData[hoveredSrl] ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Broker:</span>
                      <span className="text-sm font-medium ml-2">
                        {policyYearsData[hoveredSrl].broker || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Years Written:</span>
                      <div className="text-sm mt-1">
                        {policyYearsData[hoveredSrl].years.length > 0 ? (
                          <span className="font-medium">
                            {policyYearsData[hoveredSrl].years.join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No data available</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

