'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import { DollarSign } from 'lucide-react';

export function CurrencyLabel() {
  const { currency } = useCurrency();
  
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <DollarSign className="h-3 w-3" />
      <span>All monetary values shown in {currency}.</span>
    </span>
  );
}

