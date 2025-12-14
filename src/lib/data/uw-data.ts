/**
 * Underwriting Data Module
 * 
 * Loads policy data from PostgreSQL database instead of CSV file.
 * 
 * @module data/uw-data
 */

import { ReinsuranceData } from '../validation/schema';
import { loadPoliciesFromDb } from '../database/policies';

// Cache for database data
let dbDataCache: ReinsuranceData[] | null = null;

/**
 * Load underwriting data from database
 * 
 * @param {object} options - Loading options
 * @param {boolean} options.forceReload - Force reload from database (ignore cache)
 * @returns {Promise<ReinsuranceData[]>} Array of policy records
 */
export async function loadUWData(options?: { forceReload?: boolean }): Promise<ReinsuranceData[]> {
  // Use cache if available and not forcing reload
  if (!options?.forceReload && dbDataCache) {
    return dbDataCache;
  }

  // Load from database
  const data = await loadPoliciesFromDb({ forceReload: options?.forceReload });
  
  // Update cache
  dbDataCache = data;
  
  return data;
}
