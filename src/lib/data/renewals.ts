/**
 * Renewals Data Module
 * 
 * Loads renewal data from PostgreSQL database.
 * Transforms policy data into renewal records for the renewals dashboard.
 * 
 * @module data/renewals
 */

import { loadUWData } from './uw-data';
import { normalizeCountryName } from '../business/country-normalization';

export interface RenewalRecord {
  viewExtract: string;
  loc: string;
  uy: string;
  srl: string;
  extType: string;
  class: string;
  subClass: string; // SUB_CLASS (0 or empty = "Other")
  subBr: string;
  comDate: string;
  expDate: string;
  signShare: string;
  acceptedShare: string;
  country: string;
  countryName: string;
  broker: string;
  cedant: string;
  insuredCode: string;
  insuredName: string;
  businessType: string;
  renewalStatus: string;
  runningExpired: string;
  renewalDate: string;
  year: string;
  qtrName: string;
  monthName: string;
  month: string;
  grossUwPrem: number;
  grossPaidClaims: number;
  grossOsLoss: number;
  lossRatio: number; // Calculated as (paid claims + os loss) / premium * 100, or NaN if no premium
  statusFlag: 'renewed' | 'not-renewed' | 'upcoming-renewal';
  normalizedYear: string;
  normalizedQuarter: string;
  isUpcoming: boolean;
  isDirect: boolean; // True if broker and cedant are the same
}

let cachedData: RenewalRecord[] | null = null;

// Clear cache function for development/testing
export function clearRenewalsCache() {
  cachedData = null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Try DD-MM-YYYY format first (common in CSV)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Try to parse as Date object
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

function getQuarterFromDate(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}`;
}

function formatDate(day: number | undefined, month: number | undefined, year: number | undefined): string {
  if (day && month && year) {
    try {
      const date = new Date(year, month - 1, day);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Load renewals data from database
 * Transforms policy data into renewal records
 * 
 * @returns {RenewalRecord[]} Array of renewal records
 */
export async function loadRenewals(): Promise<RenewalRecord[]> {
  if (cachedData) return cachedData;
  
  // Load policy data from database
  const policyData = await loadUWData();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  cachedData = policyData
    .map((policy): RenewalRecord | null => {
      // Filter out "fronting" records
      const insuredName = policy.orgInsuredTrtyName || '';
      if (insuredName.toLowerCase().includes('fronting')) {
        return null;
      }
      
      // Get Renewal Year - prefer renewalYear, fallback to inceptionYear
      const renYear = policy.renewalYear;
      const inceptionYear = policy.inceptionYear;
      let yearFromColumn = renYear ? String(renYear) : (inceptionYear ? String(inceptionYear) : '');
      
      // If still no year, try to extract from Renewal Date
      if (!yearFromColumn && policy.renewalDate) {
        const parsedDate = parseDate(policy.renewalDate);
        if (parsedDate) {
          yearFromColumn = String(parsedDate.getFullYear());
        }
      }
      
      // If still no year, use inception year
      if (!yearFromColumn && inceptionYear) {
        yearFromColumn = String(inceptionYear);
      }
      
      // Only filter out records if we absolutely cannot determine a year
      if (!yearFromColumn) {
        return null;
      }
      
      // Get PolicyStatus
      const policyStatus = policy.policyStatus || '';
      const policyStatusLower = policyStatus.toLowerCase();
      
      // Get renewal date
      const renewalDateRaw = policy.renewalDate || '';
      const parsedRenewalDate = renewalDateRaw ? parseDate(renewalDateRaw) : null;
      
      // Determine if renewal is upcoming (renewal date is in the future)
      let isUpcoming = false;
      if (parsedRenewalDate) {
        const renewalDateOnly = new Date(parsedRenewalDate);
        renewalDateOnly.setHours(0, 0, 0, 0);
        isUpcoming = renewalDateOnly > today;
      }
      
      // Determine status flag directly from PolicyStatus
      let statusFlag: 'renewed' | 'not-renewed' | 'upcoming-renewal';
      
      const normalizedStatus = policyStatusLower
        .replace(/[_\s-]/g, ' ')
        .trim();
      
      if (normalizedStatus.includes('upcoming') || 
          normalizedStatus.includes('up coming') ||
          normalizedStatus === 'upcoming' ||
          normalizedStatus.startsWith('upcoming')) {
        statusFlag = 'upcoming-renewal';
      } 
      else if (normalizedStatus.includes('not') && normalizedStatus.includes('renewed')) {
        statusFlag = 'not-renewed';
      }
      else if (normalizedStatus.includes('renewed') && 
               !normalizedStatus.includes('not')) {
        statusFlag = 'renewed';
      }
      else if (normalizedStatus.startsWith('not') || 
               normalizedStatus === 'expired' ||
               normalizedStatus === 'cancelled' ||
               normalizedStatus === 'cancelled') {
        statusFlag = 'not-renewed';
      }
      else {
        statusFlag = 'not-renewed';
      }
      
      // Use Renewal Year for normalizedYear
      const normalizedYear = yearFromColumn;
      
      // Get Renewal Quarter
      const renQuarter = policy.renewalQuarter;
      const normalizedQuarter = renQuarter ? `Q${renQuarter}` : (parsedRenewalDate ? getQuarterFromDate(parsedRenewalDate) : '');
      
      // Get Renewal Month
      const renMonth = policy.renewalMonth;
      const monthName = renMonth ? ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][renMonth - 1] || '' : '';
      const month = policy.renewalDay ? String(policy.renewalDay) : '';
      
      // Extract other fields
      const signShare = policy.signSharePct ? String(policy.signSharePct) : '';
      const writtenShare = policy.writtenSharePct ? String(policy.writtenSharePct) : '';
      const rawCountryName = policy.countryName || '';
      const countryName = normalizeCountryName(rawCountryName);
      const businessType = policy.arrangement || '';
      const broker = policy.broker || '';
      const cedant = policy.cedant || '';
      const isDirect = !!(broker && cedant && broker.toLowerCase().trim() === cedant.toLowerCase().trim());
      const uy = policy.uy || yearFromColumn;
      const extType = policy.extType || '';
      const srl = policy.srl ? String(policy.srl) : '';
      const className = policy.className || '';
      const subClass = policy.subClass || 'Other';
      const office = policy.office || '';
      
      // Build comDate from inception fields
      const comDate = formatDate(policy.inceptionDay, policy.inceptionMonth, policy.inceptionYear);
      
      // Build expDate from expiry fields
      const expDate = formatDate(policy.expiryDay, policy.expiryMonth, policy.expiryYear);
      
      // Calculate loss ratio
      const premium = policy.grsPremKD || 0;
      const paidClaims = policy.paidClaimsKD || 0;
      const osLoss = policy.osClaimKD || 0;
      const lossRatio = premium > 0 ? ((paidClaims + osLoss) / premium) * 100 : NaN;
      
      return {
        viewExtract: '',
        loc: office,
        uy: uy,
        srl: srl,
        extType: extType,
        class: className,
        subClass: subClass,
        subBr: '',
        comDate: comDate,
        expDate: expDate,
        signShare,
        acceptedShare: writtenShare,
        country: countryName,
        countryName,
        broker,
        cedant,
        insuredCode: '',
        insuredName: insuredName,
        businessType,
        renewalStatus: policyStatus,
        runningExpired: '',
        renewalDate: renewalDateRaw,
        year: yearFromColumn,
        qtrName: normalizedQuarter,
        monthName: monthName,
        month: month,
        grossUwPrem: premium,
        grossPaidClaims: paidClaims,
        grossOsLoss: osLoss,
        lossRatio,
        statusFlag,
        normalizedYear,
        normalizedQuarter,
        isUpcoming,
        isDirect,
      };
    })
    .filter((record): record is RenewalRecord => record !== null);
  
  return cachedData;
}

export interface RenewalSummary {
  totalCount: number;
  totalPremium: number;
  totalPaidClaims: number;
  totalOsLoss: number;
  totalIncurred: number;
  totalLossRatio: number;
  renewedCount: number;
  renewedPremium: number;
  notRenewedCount: number;
  notRenewedPremium: number;
  upcomingRenewalCount: number;
  upcomingRenewalPremium: number;
  renewedPercentage: number;
  notRenewedPercentage: number;
  upcomingRenewalPercentage: number;
  records: RenewalRecord[];
}

export interface RenewalFilterOptions {
  businessTypes: string[];
  classes: string[];
  subClasses: string[]; // Subclasses filtered by selected class
  countries: string[];
  locs: string[];
  extTypes: string[]; // Extension types (DAC, TTY, XOL)
}

export async function getRenewalFilterOptions(allowedClasses?: string[] | null, selectedClass?: string | null): Promise<RenewalFilterOptions> {
  const data = await loadRenewals();
  
  // Filter data by role if allowedClasses is provided
  let filteredData = data;
  if (allowedClasses !== null && allowedClasses !== undefined) {
    if (allowedClasses.length === 0) {
      // User has no allowed classes - return empty options
      return {
        businessTypes: [],
        classes: [],
        subClasses: [],
        countries: [],
        locs: [],
        extTypes: [],
      };
    }
    // Filter records to only include those with allowed classes
    filteredData = data.filter((record) => {
      const recordClass = (record.class || '').trim().toLowerCase();
      if (!recordClass) return false;
      // Check if record's class matches any allowed class (case-insensitive)
      return allowedClasses.some(allowedClass => {
        const allowedClassLower = allowedClass.toLowerCase();
        return recordClass === allowedClassLower || 
               recordClass.includes(allowedClassLower) ||
               allowedClassLower.includes(recordClass);
      });
    });
  }
  
  const businessTypes = Array.from(new Set(filteredData.map((r) => r.businessType).filter(Boolean))).sort();
  const classes = Array.from(new Set(filteredData.map((r) => r.class).filter(Boolean))).sort();
  const allSubClasses = Array.from(new Set(filteredData.map((r) => r.subClass).filter(Boolean))).sort();
  const subClasses = selectedClass
    ? Array.from(new Set(
        filteredData.filter(r => 
          r.class && String(r.class).toLowerCase() === String(selectedClass).toLowerCase()
        ).map((r) => r.subClass).filter(Boolean)
      )).sort()
    : allSubClasses;
  const countries = Array.from(new Set(filteredData.map((r) => r.countryName).filter(Boolean))).sort();
  const locs = Array.from(new Set(filteredData.map((r) => r.loc).filter(Boolean))).sort();
  const extTypes = Array.from(new Set(filteredData.map((r) => r.extType).filter(Boolean))).sort();

  return {
    businessTypes,
    classes,
    subClasses,
    countries,
    locs,
    extTypes,
  };
}

export async function filterRenewals(
  year?: string, 
  quarter?: string, 
  statusFilter?: 'renewed' | 'not-renewed' | 'upcoming-renewal',
  monthName?: string,
  countryName?: string | string[],
  countrySearch?: string,
  srlSearch?: string,
  businessType?: string | string[],
  classFilter?: string | string[],
  subClassFilter?: string | string[],
  locFilter?: string,
  extTypeFilter?: string | string[],
  allowedClasses?: string[] | null, // Role-based class filtering
): Promise<RenewalSummary> {
  const data = await loadRenewals();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter based on YEAR column (not UY)
  const filtered = data.filter((record) => {
    // Role-based class filtering - if allowedClasses is provided and not null
    if (allowedClasses !== null && allowedClasses !== undefined) {
      if (allowedClasses.length === 0) {
        return false;
      }
      const recordClass = (record.class || '').trim().toLowerCase();
      if (recordClass) {
        const matches = allowedClasses.some(allowedClass => {
          const allowedClassLower = allowedClass.toLowerCase();
          return recordClass === allowedClassLower || 
                 recordClass.includes(allowedClassLower) ||
                 allowedClassLower.includes(recordClass);
        });
        if (!matches) return false;
      }
    }
    
    // Year filter - use normalizedYear (which comes from Renewal Year)
    if (year && record.normalizedYear !== year) {
      return false;
    }
    
    // Quarter filter
    if (quarter && record.normalizedQuarter !== quarter) {
      return false;
    }
    
    // Status filter
    if (statusFilter && record.statusFlag !== statusFilter) {
      return false;
    }
    
    // Month filter
    if (monthName && record.monthName !== monthName.toUpperCase()) {
      return false;
    }
    
    // Country filter (supports array)
    if (countryName) {
      const countries = Array.isArray(countryName) ? countryName : [countryName];
      if (countries.length > 0 && !countries.includes(record.countryName || '')) {
        return false;
      }
    }
    
    // Country search (partial match)
    if (countrySearch) {
      const searchLower = countrySearch.toLowerCase();
      const countryLower = (record.countryName || '').toLowerCase();
      if (!countryLower.includes(searchLower)) {
        return false;
      }
    }
    
    // SRL search
    if (srlSearch) {
      const searchLower = srlSearch.toLowerCase();
      const srlLower = (record.srl || '').toLowerCase();
      if (!srlLower.includes(searchLower)) {
        return false;
      }
    }
    
    // Business type filter (supports array)
    if (businessType) {
      const types = Array.isArray(businessType) ? businessType : [businessType];
      if (types.length > 0 && !types.includes(record.businessType || '')) {
        return false;
      }
    }
    
    // Class filter (supports array)
    if (classFilter) {
      const classes = Array.isArray(classFilter) ? classFilter : [classFilter];
      if (classes.length > 0) {
        const recordClass = (record.class || '').trim().toLowerCase();
        const matches = classes.some(filterClass => {
          const filterClassLower = filterClass.trim().toLowerCase();
          return recordClass === filterClassLower || 
                 recordClass.includes(filterClassLower) || 
                 filterClassLower.includes(recordClass);
        });
        if (!matches) return false;
      }
    }
    
    // Subclass filter (supports array) - defensive checks
    if (subClassFilter) {
      const subClasses = Array.isArray(subClassFilter) ? subClassFilter : [subClassFilter];
      if (subClasses.length > 0) {
        const recordSubClass = String(record.subClass || '').toLowerCase().trim();
        const matches = subClasses.some(filterSubClass => {
          const filterLower = String(filterSubClass || '').toLowerCase().trim();
          return filterLower && recordSubClass === filterLower;
        });
        if (!matches) return false;
      }
    }
    
    // LOC filter
    if (locFilter && record.loc !== locFilter) {
      return false;
    }
    
    // ExtType filter (supports array)
    if (extTypeFilter) {
      const types = Array.isArray(extTypeFilter) ? extTypeFilter : [extTypeFilter];
      if (types.length > 0 && !types.includes(record.extType || '')) {
        return false;
      }
    }
    
    return true;
  });
  
  // Calculate summary statistics
  const totalCount = filtered.length;
  const totalPremium = filtered.reduce((sum, r) => sum + (r.grossUwPrem || 0), 0);
  const totalPaidClaims = filtered.reduce((sum, r) => sum + (r.grossPaidClaims || 0), 0);
  const totalOsLoss = filtered.reduce((sum, r) => sum + (r.grossOsLoss || 0), 0);
  const totalIncurred = totalPaidClaims + totalOsLoss;
  const totalLossRatio = totalPremium > 0 ? (totalIncurred / totalPremium) * 100 : 0;
  
  const renewed = filtered.filter(r => r.statusFlag === 'renewed');
  const renewedCount = renewed.length;
  const renewedPremium = renewed.reduce((sum, r) => sum + (r.grossUwPrem || 0), 0);
  
  const notRenewed = filtered.filter(r => r.statusFlag === 'not-renewed');
  const notRenewedCount = notRenewed.length;
  const notRenewedPremium = notRenewed.reduce((sum, r) => sum + (r.grossUwPrem || 0), 0);
  
  const upcoming = filtered.filter(r => r.statusFlag === 'upcoming-renewal');
  const upcomingRenewalCount = upcoming.length;
  const upcomingRenewalPremium = upcoming.reduce((sum, r) => sum + (r.grossUwPrem || 0), 0);
  
  const renewedPercentage = totalCount > 0 ? (renewedCount / totalCount) * 100 : 0;
  const notRenewedPercentage = totalCount > 0 ? (notRenewedCount / totalCount) * 100 : 0;
  const upcomingRenewalPercentage = totalCount > 0 ? (upcomingRenewalCount / totalCount) * 100 : 0;
  
  return {
    totalCount,
    totalPremium,
    totalPaidClaims,
    totalOsLoss,
    totalIncurred,
    totalLossRatio,
    renewedCount,
    renewedPremium,
    notRenewedCount,
    notRenewedPremium,
    upcomingRenewalCount,
    upcomingRenewalPremium,
    renewedPercentage,
    notRenewedPercentage,
    upcomingRenewalPercentage,
    records: filtered,
  };
}
