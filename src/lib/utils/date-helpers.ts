/**
 * Date and Year Extraction Utilities
 * 
 * Centralized date/year extraction logic to avoid duplication
 */

import { ReinsuranceData } from '../validation/schema';

/**
 * Extract year from a reinsurance record
 * Tries UY first, then falls back to inceptionYear
 * 
 * @param record - Reinsurance data record
 * @returns Year as number, or null if not found/invalid
 */
export function extractYear(record: ReinsuranceData): number | null {
  // Try UY first
  if (record.uy) {
    const uyYear = parseInt(record.uy, 10);
    if (!isNaN(uyYear) && uyYear >= 1900 && uyYear <= 2100) {
      return uyYear;
    }
  }
  
  // Fallback to inceptionYear
  if (record.inceptionYear) {
    const year = typeof record.inceptionYear === 'number' 
      ? record.inceptionYear 
      : parseInt(String(record.inceptionYear), 10);
    
    if (!isNaN(year) && year >= 1900 && year <= 2100) {
      return year;
    }
  }
  
  return null;
}

/**
 * Extract year as string (for filtering)
 * 
 * @param record - Reinsurance data record
 * @returns Year as string, or empty string if not found
 */
export function extractYearString(record: ReinsuranceData): string {
  const year = extractYear(record);
  return year ? String(year) : '';
}

/**
 * Extract quarter from a reinsurance record
 * 
 * @param record - Reinsurance data record
 * @returns Quarter as string (Q1, Q2, Q3, Q4), or null if not found
 */
export function extractQuarter(record: ReinsuranceData): string | null {
  // Try inceptionQuarter first
  if (record.inceptionQuarter !== undefined && record.inceptionQuarter !== null) {
    const qNum = typeof record.inceptionQuarter === 'number' 
      ? record.inceptionQuarter 
      : parseInt(String(record.inceptionQuarter), 10);
    
    if (qNum >= 1 && qNum <= 4) {
      return `Q${qNum}`;
    }
  }
  
  // Fallback to deriving from inceptionMonth
  if (record.inceptionMonth !== undefined && record.inceptionMonth !== null) {
    const month = typeof record.inceptionMonth === 'number'
      ? record.inceptionMonth
      : parseInt(String(record.inceptionMonth), 10);
    
    if (month >= 1 && month <= 12) {
      if (month <= 3) return 'Q1';
      if (month <= 6) return 'Q2';
      if (month <= 9) return 'Q3';
      return 'Q4';
    }
  }
  
  return null;
}

/**
 * Extract month from inception month
 * 
 * @param inceptionMonth - Month number (1-12)
 * @returns Month number or null if invalid
 */
export function extractMonth(inceptionMonth?: number): number | null {
  if (inceptionMonth === undefined || inceptionMonth === null) {
    return null;
  }
  
  const month = typeof inceptionMonth === 'number' 
    ? inceptionMonth 
    : parseInt(String(inceptionMonth), 10);
  
  return (month >= 1 && month <= 12) ? month : null;
}

