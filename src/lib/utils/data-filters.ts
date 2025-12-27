/**
 * Data Filtering Utilities
 * 
 * Centralized filtering logic to avoid duplication across API routes
 */

import { ReinsuranceData } from '../validation/schema';
import { extractYearString } from './date-helpers';

export interface FilterParams {
  year?: string | null;
  country?: string | null;
  hub?: string | null;
  region?: string | null;
  cedant?: string | null;
  insured?: string | null;
  class?: string | null;
  subClass?: string | null;
  extType?: string | null;
  loc?: string | null;
}

/**
 * Apply filters to reinsurance data
 * 
 * @param data - Array of reinsurance records
 * @param filters - Filter parameters
 * @returns Filtered array
 */
export function applyFilters(data: ReinsuranceData[], filters: FilterParams): ReinsuranceData[] {
  let filtered = [...data];
  
  // Filter by year (UY or inception_year)
  if (filters.year) {
    filtered = filtered.filter(record => {
      const recordUy = extractYearString(record);
      return recordUy === filters.year;
    });
  }
  
  // Filter by country
  if (filters.country) {
    filtered = filtered.filter(record => 
      record.countryName.toLowerCase().includes(filters.country!.toLowerCase())
    );
  }
  
  // Filter by hub
  if (filters.hub) {
    filtered = filtered.filter(record => 
      record.hub.toLowerCase().includes(filters.hub!.toLowerCase())
    );
  }
  
  // Filter by region
  if (filters.region) {
    filtered = filtered.filter(record => 
      record.region.toLowerCase().includes(filters.region!.toLowerCase())
    );
  }
  
  // Filter by cedant
  if (filters.cedant) {
    filtered = filtered.filter(record => 
      record.cedant.toLowerCase().includes(filters.cedant!.toLowerCase())
    );
  }
  
  // Filter by insured
  if (filters.insured) {
    filtered = filtered.filter(record => 
      record.orgInsuredTrtyName.toLowerCase().includes(filters.insured!.toLowerCase())
    );
  }
  
  // Filter by class
  if (filters.class && filters.class !== 'all') {
    filtered = filtered.filter(record => 
      record.className === filters.class
    );
  }
  
  // Filter by subclass
  if (filters.subClass && filters.subClass !== 'all') {
    filtered = filtered.filter(record => 
      record.subClass === filters.subClass
    );
  }
  
  // Filter by extType
  if (filters.extType && filters.extType !== 'all') {
    filtered = filtered.filter(record => 
      record.extType === filters.extType
    );
  }
  
  // Filter by loc
  if (filters.loc && filters.loc !== 'all') {
    filtered = filtered.filter(record => 
      record.loc === filters.loc
    );
  }
  
  return filtered;
}

/**
 * Extract filter parameters from URLSearchParams
 * 
 * @param params - URL search parameters
 * @returns Filter parameters object
 */
export function extractFilterParams(params: URLSearchParams): FilterParams {
  return {
    year: params.get('year'),
    country: params.get('country'),
    hub: params.get('hub'),
    region: params.get('region'),
    cedant: params.get('cedant'),
    insured: params.get('insured'),
    class: params.get('class'),
    subClass: params.get('subClass'),
    extType: params.get('extType'),
    loc: params.get('loc'),
  };
}

