'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logger } from '@/lib/utils/logger';type Currency = 'KWD' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number | null;
  isLoading: boolean;
  convertValue: (kwdValue: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default exchange rate (KWD to USD) - will be fetched from API
// As of 2024, 1 KWD ≈ 3.25 USD (this is a fallback)
const DEFAULT_EXCHANGE_RATE = 3.25;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('KWD');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // Set default rate immediately to prevent null state
        setExchangeRate(DEFAULT_EXCHANGE_RATE);
        
        // Try to fetch from our API first
        const response = await fetch('/api/currency/exchange-rate', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add cache control to prevent stale data
          cache: 'no-cache',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.rate && typeof data.rate === 'number') {
            setExchangeRate(data.rate);
          }
        } else {
          // Fallback to default rate if response is not ok
          setExchangeRate(DEFAULT_EXCHANGE_RATE);
        }
      } catch (error) {
        // Silently fallback to default rate - don't log in production
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Failed to fetch exchange rate, using default:', { context: error });
        }
        // Ensure default rate is always set
        setExchangeRate(DEFAULT_EXCHANGE_RATE);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchExchangeRate();
      
      // Refresh exchange rate every hour
      const interval = setInterval(fetchExchangeRate, 60 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      // Server-side: just set default
      setExchangeRate(DEFAULT_EXCHANGE_RATE);
      setIsLoading(false);
    }
  }, []);

  // Load currency preference from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency') as Currency | null;
    if (savedCurrency === 'KWD' || savedCurrency === 'USD') {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save currency preference to localStorage
  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  };

  const convertValue = (kwdValue: number): number => {
    if (currency === 'KWD' || !exchangeRate) {
      return kwdValue;
    }
    return kwdValue * exchangeRate;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        exchangeRate,
        isLoading,
        convertValue,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

