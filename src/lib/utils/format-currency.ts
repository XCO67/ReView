/**
 * Currency formatting utilities that use the currency context
 * These functions should be used in client components
 */

'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

/**
 * Hook to format currency values based on current currency setting
 */
export function useFormatCurrency() {
  const { currency, convertValue } = useCurrency();
  
  const formatCurrency = (kwdValue: number): string => {
    const value = convertValue(kwdValue);
    if (value === 0) return `0 ${currency}`;
    if (isNaN(value)) return `0 ${currency}`;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyNumeric = (kwdValue: number): string => {
    const value = convertValue(kwdValue);
    if (value === 0) return '0';
    if (isNaN(value)) return '0';

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return { formatCurrency, formatCurrencyNumeric, currency };
}

