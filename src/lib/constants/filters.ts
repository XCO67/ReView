/**
 * Shared Filter Constants
 * 
 * Centralized filter state definitions to avoid duplication
 */

import { UniversalFilterState } from '@/components/filters/UniversalFilterPanel';

/**
 * Default empty filter state
 * Use this instead of manually creating filter objects
 */
export const DEFAULT_FILTER_STATE: UniversalFilterState = {
  office: null,
  extType: null,
  policyNature: null,
  class: null,
  subClass: null,
  hub: null,
  region: null,
  country: null,
  year: null,
  month: null,
  quarter: null,
  broker: null,
  cedant: null,
  policyName: null,
};

/**
 * Maximum limit for data fetching
 */
export const MAX_DATA_LIMIT = 100000;

/**
 * Default data limit
 */
export const DEFAULT_DATA_LIMIT = 10000;

