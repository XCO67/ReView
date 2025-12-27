import { ReinsuranceData, KPIData, UYPerformanceRow } from '../validation/schema';
import { safeDivide } from '../utils/format';

// Cache for parsed dates to improve performance
const dateCache = new Map<string, Date | null>();

/**
 * Robust Com date parser with multiple format support and caching
 * Optimized for common date formats in reinsurance data
 */
function parseComDateToJSDate(raw: string | undefined): Date | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // Check cache first
  if (dateCache.has(s)) {
    return dateCache.get(s)!;
  }

  let result: Date | null = null;

  // 1) Try ISO first (YYYY-MM-DD) - most reliable
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(s)) {
    const d = new Date(s + "T00:00:00");
    result = isNaN(d.getTime()) ? null : d;
  } else {
    // 2) Try D/M/Y vs M/D/Y disambiguation
    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
    const m1 = s.match(dmy);
    if (m1) {
      const [, a, b, y] = m1;
      const A = parseInt(a, 10), B = parseInt(b, 10);
      const Y = parseInt(y, 10) < 100 ? 2000 + parseInt(y, 10) : parseInt(y, 10);

      // If a > 12 -> a is day (DD/MM), else if b > 12 -> b is day (MM/DD)
      // Prefer DD/MM/YYYY when unambiguous (common in the file)
      let day = A, month = B;
      if (A <= 12 && B > 12) { day = B; month = A; }  // MM/DD -> swap
      // JS Date months are 0-based
      const d = new Date(Y, month - 1, day);
      result = isNaN(d.getTime()) ? null : d;
    } else {
      // 3) Try "01 Jan 2020" style
      const d2 = Date.parse(s);
      result = !isNaN(d2) ? new Date(d2) : null;
    }
  }

  // Cache the result
  dateCache.set(s, result);
  return result;
}

/**
 * Calculate KPIs for a single reinsurance data record
 * Uses only the specified KD columns for calculations
 */
export function calculateRecordKPIs(record: ReinsuranceData): KPIData {
  // Use KD columns for all calculations (grsPremKD, acqCostKD, paidClaimsKD, osClaimKD, incClaimKD, maxLiabilityKD)
  const premium = record.grsPremKD || 0;
  const paidClaims = record.paidClaimsKD || 0;
  const osLoss = record.osClaimKD || 0;
  const incurredClaims = record.incClaimKD || (paidClaims + osLoss); // Use incClaimKD if available, otherwise calculate
  const expense = record.acqCostKD || 0;
  const maxLiability = record.maxLiabilityKD || 0;
  
  const lossRatio = safeDivide(incurredClaims, premium) * 100;
  const expenseRatio = safeDivide(expense, premium) * 100;
  const combinedRatio = lossRatio + expenseRatio;

  return {
    premium,
    paidClaims,
    outstandingClaims: osLoss,
    incurredClaims,
    expense,
    lossRatio,
    expenseRatio,
    combinedRatio,
    numberOfAccounts: 1,
    avgMaxLiability: maxLiability,
  };
}

/**
 * Aggregate KPIs from multiple records
 */
export function aggregateKPIs(records: ReinsuranceData[]): KPIData {
  if (records.length === 0) {
    return {
      premium: 0,
      paidClaims: 0,
      outstandingClaims: 0,
      incurredClaims: 0,
      expense: 0,
      lossRatio: 0,
      expenseRatio: 0,
      combinedRatio: 0,
      numberOfAccounts: 0,
      avgMaxLiability: 0,
    };
  }

  // Use KD columns for all calculations
  const totalPremium = records.reduce((sum, record) => sum + (record.grsPremKD || 0), 0);
  const totalPaidClaims = records.reduce((sum, record) => sum + (record.paidClaimsKD || 0), 0);
  const totalOutstandingClaims = records.reduce((sum, record) => sum + (record.osClaimKD || 0), 0);
  const totalIncurredClaims = records.reduce((sum, record) => sum + (record.incClaimKD || (record.paidClaimsKD || 0) + (record.osClaimKD || 0)), 0);
  const totalExpense = records.reduce((sum, record) => sum + (record.acqCostKD || 0), 0);
  const totalMaxLiability = records.reduce((sum, record) => sum + (record.maxLiabilityKD || 0), 0);

  const lossRatio = safeDivide(totalIncurredClaims, totalPremium) * 100;
  const expenseRatio = safeDivide(totalExpense, totalPremium) * 100;
  const combinedRatio = lossRatio + expenseRatio;
  const avgMaxLiability = safeDivide(totalMaxLiability, records.length);

  return {
    premium: totalPremium,
    paidClaims: totalPaidClaims,
    outstandingClaims: totalOutstandingClaims,
    incurredClaims: totalIncurredClaims,
    expense: totalExpense,
    lossRatio,
    expenseRatio,
    combinedRatio,
    numberOfAccounts: records.length,
    avgMaxLiability,
  };
}

/**
 * Calculate UY performance data
 */
export function calculateUYPerformance(records: ReinsuranceData[]): UYPerformanceRow[] {
  // Group records by UY (auto-generate from inception_year if not provided)
  const groupedByUY = records.reduce((acc, record) => {
    // Get UY - use provided uy or generate from inception_year
    const uy = record.uy || (record.inceptionYear ? String(record.inceptionYear) : 'Unknown');
    if (!acc[uy]) {
      acc[uy] = [];
    }
    acc[uy].push(record);
    return acc;
  }, {} as Record<string, ReinsuranceData[]>);

  // Calculate KPIs for each UY
  const uyPerformance: UYPerformanceRow[] = Object.entries(groupedByUY).map(([uy, uyRecords]) => {
    const kpis = aggregateKPIs(uyRecords);
    return {
      uy,
      ...kpis,
    };
  });

  // Sort by UY
  return uyPerformance.sort((a, b) => a.uy.localeCompare(b.uy));
}

/**
 * Calculate totals for UY performance table
 */
export function calculateUYPerformanceTotals(uyPerformance: UYPerformanceRow[]): UYPerformanceRow {
  if (uyPerformance.length === 0) {
    return {
      uy: 'Total',
      premium: 0,
      paidClaims: 0,
      outstandingClaims: 0,
      incurredClaims: 0,
      expense: 0,
      lossRatio: 0,
      expenseRatio: 0,
      combinedRatio: 0,
      numberOfAccounts: 0,
      avgMaxLiability: 0,
    };
  }

  const totalPremium = uyPerformance.reduce((sum, row) => sum + row.premium, 0);
  const totalPaidClaims = uyPerformance.reduce((sum, row) => sum + row.paidClaims, 0);
  const totalOutstandingClaims = uyPerformance.reduce((sum, row) => sum + row.outstandingClaims, 0);
  const totalIncurredClaims = uyPerformance.reduce((sum, row) => sum + row.incurredClaims, 0);
  const totalExpense = uyPerformance.reduce((sum, row) => sum + row.expense, 0);
  const totalAccounts = uyPerformance.reduce((sum, row) => sum + row.numberOfAccounts, 0);
  const totalMaxLiability = uyPerformance.reduce((sum, row) => sum + row.avgMaxLiability * row.numberOfAccounts, 0);

  const lossRatio = safeDivide(totalIncurredClaims, totalPremium) * 100;
  const expenseRatio = safeDivide(totalExpense, totalPremium) * 100;
  const combinedRatio = lossRatio + expenseRatio;
  const avgMaxLiability = safeDivide(totalMaxLiability, totalAccounts);

  return {
    uy: 'Total',
    premium: totalPremium,
    paidClaims: totalPaidClaims,
    outstandingClaims: totalOutstandingClaims,
    incurredClaims: totalIncurredClaims,
    expense: totalExpense,
    lossRatio,
    expenseRatio,
    combinedRatio,
    numberOfAccounts: totalAccounts,
    avgMaxLiability,
  };
}

/**
 * Filter records based on filter options with case-insensitive exact matching
 * Optimized with early returns and cached year parsing
 */
export function filterRecords(records: ReinsuranceData[], filters: Partial<Record<string, string[]>>): ReinsuranceData[] {
  // Early return if no filters
  const hasFilters = Object.values(filters).some(arr => arr && arr.length > 0);
  if (!hasFilters) return records;

  const filtered = records.filter(record => {
    return Object.entries(filters).every(([key, values]) => {
      // Skip empty filters - treat as "no filter"
      if (!values || values.length === 0) return true;
      
      // Handle year filter - use Com date first, then inception year
      if (key === 'year') {
        let recordYear = '';
        
        // Try Com date first (more reliable for 2020, 2021, 2017)
        if (record.comDate) {
          const date = parseComDateToJSDate(record.comDate);
          if (date) {
            recordYear = date.getFullYear().toString();
          } else {
            // If Com date fails, try inception year
            recordYear = record.inceptionYear?.toString() || '';
          }
        } else {
          // Fallback to inception year
          recordYear = record.inceptionYear?.toString() || '';
        }
        
        if (!recordYear) return false;
        return values.includes(recordYear);
      }
      
      const recordValue = record[key as keyof ReinsuranceData];
      if (typeof recordValue === 'string') {
        // Case-insensitive exact matching for text fields
        const normalizedRecordValue = recordValue.toLowerCase().trim();
        return values.some(filterValue => 
          filterValue.toLowerCase().trim() === normalizedRecordValue
        );
      }
      return false;
    });
  });
  
  return filtered;
}

/**
 * Get unique values for filter options
 */
export function getFilterOptions(records: ReinsuranceData[]) {
  return {
    uy: [...new Set(records.map(r => r.uy || (r.inceptionYear ? String(r.inceptionYear) : '')).filter(Boolean))].sort(),
    extType: [...new Set(records.map(r => r.extType))].sort(),
    broker: [...new Set(records.map(r => r.broker))].sort(),
    cedant: [...new Set(records.map(r => r.cedant))].sort(),
    orgInsuredTrtyName: [...new Set(records.map(r => r.orgInsuredTrtyName))].sort(),
    countryName: [...new Set(records.map(r => r.countryName))].sort(),
    region: [...new Set(records.map(r => r.region))].sort(),
    hub: [...new Set(records.map(r => r.hub))].sort(),
  };
}
