'use client';

import type { RenewalSummary } from '@/lib/renewals';
import { useFormatCurrency } from '@/lib/format-currency';

const numberFormat = (value: number) => new Intl.NumberFormat('en-US').format(value);

interface RenewalSummaryGridProps {
  summary: RenewalSummary;
}

const cards = [
  { key: 'totalCount', label: 'Total Policies', format: numberFormat, premiumKey: 'totalPremium' },
  { key: 'renewedCount', label: 'Renewed', format: numberFormat, premiumKey: 'renewedPremium' },
  { key: 'upcomingRenewalCount', label: 'Upcoming Renewal', format: numberFormat, premiumKey: 'upcomingRenewalPremium' },
  { key: 'notRenewedCount', label: 'Not Renewed', format: numberFormat, premiumKey: 'notRenewedPremium' },
] as const;

export function RenewalSummaryGrid({ summary }: RenewalSummaryGridProps) {
  const { formatCurrencyNumeric } = useFormatCurrency();
  const total = summary.totalCount || 0;

  const getPercentage = (count: number) => {
    if (!total || count < 0) return '-';
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 shadow-lg shadow-black/20 w-full"
        >
          <p className="text-sm font-medium text-white/80">{card.label}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-white">
                {card.format(summary[card.key])}
              </p>
              {card.key !== 'totalCount' && (
                <span className="text-sm text-white/60">
                  {getPercentage(summary[card.key])}
                </span>
              )}
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-white/50 mb-1">Premium</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrencyNumeric(summary[card.premiumKey as keyof typeof summary] as number || 0)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

