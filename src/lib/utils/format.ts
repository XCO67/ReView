/**
 * Formatting utilities for the reinsurance dashboard
 */

import { useCurrency } from '@/contexts/CurrencyContext';

/**
 * Format a number as currency (KWD or USD) with thousand separators
 * This is a hook version that uses the currency context
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

/**
 * Format a number as Kuwaiti Dinar currency with thousand separators
 * @deprecated Use useFormatCurrency hook instead for currency conversion support
 */
export function formatKD(value: number): string {
  if (value === 0) return '0 KD';
  if (isNaN(value)) return '0 KD';
  
  return new Intl.NumberFormat('en-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as Kuwaiti Dinar without displaying the currency designator.
 * Useful for tables where space is limited and a shared currency note is displayed.
 * @deprecated Use useFormatCurrency hook instead for currency conversion support
 */
export function formatKDNumeric(value: number): string {
  if (value === 0) return '0';
  if (isNaN(value)) return '0';

  return new Intl.NumberFormat('en-KW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as percentage with 1 decimal place
 */
export function formatPct(value: number): string {
  if (isNaN(value)) return '0.0%';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a number as a ratio (e.g., 0.75 -> 75.0%)
 */
export function formatRatio(value: number): string {
  if (isNaN(value)) return '0.0%';
  
  return formatPct(value * 100);
}

/**
 * Safely divide two numbers, returning 0 if denominator is 0
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return 0;
  }
  return numerator / denominator;
}

