/**
 * Custom Hook for Reinsurance Data Fetching
 * 
 * Centralized data fetching logic to avoid duplication across components
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ReinsuranceData } from '@/lib/validation/schema';
import { DEFAULT_DATA_LIMIT, MAX_DATA_LIMIT } from '@/lib/constants/filters';
import { validateApiResponse, handleError } from '@/lib/utils/error-handler';

interface UseReinsuranceDataOptions {
  limit?: number;
  autoFetch?: boolean;
  filters?: Record<string, string | null>;
}

interface UseReinsuranceDataReturn {
  data: ReinsuranceData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching reinsurance data
 * 
 * @param options - Configuration options
 * @returns Data, loading state, error, and refetch function
 */
export function useReinsuranceData(
  options: UseReinsuranceDataOptions = {}
): UseReinsuranceDataReturn {
  const { limit = DEFAULT_DATA_LIMIT, autoFetch = true, filters = {} } = options;
  
  const [data, setData] = useState<ReinsuranceData[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  
  // Create a stable key from filters to prevent unnecessary re-fetches
  const filtersKey = useMemo(() => {
    const entries = Object.entries(filters)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`);
    return entries.join('|');
  }, [filters]);
  
  // Use ref to track if we're already fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);
  
  const fetchData = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add limit (clamp to max)
      const safeLimit = Math.min(limit, MAX_DATA_LIMIT);
      params.append('limit', String(safeLimit));
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      
      const response = await fetch(`/api/data?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!validateApiResponse(result)) {
        throw new Error('Invalid data structure received from API');
      }
      
      setData(result.data as ReinsuranceData[]);
      setError(null);
    } catch (err) {
      const errorMessage = handleError(err, 'useReinsuranceData');
      setError(errorMessage);
      setData([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [limit, filtersKey]); // ✅ Use filtersKey instead of filters object
  
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, filtersKey]); // ✅ Only depend on filtersKey, not fetchData
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

