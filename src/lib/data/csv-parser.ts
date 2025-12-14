/**
 * Parse a CSV line properly handling quoted values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Clean numeric string by removing commas and quotes
 */
export function cleanNumeric(value: string | undefined): number {
  if (!value) return 0;
  
  // Remove quotes, commas, and whitespace
  const cleaned = value.toString()
    .replace(/["']/g, '')
    .replace(/,/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse date string and extract year, quarter, month
 */
export function parseDate(dateStr: string | undefined): {
  year?: number;
  quarter?: string;
  month?: string;
} {
  if (!dateStr || !dateStr.trim()) {
    return {};
  }
  
  const cleaned = dateStr.trim();
  
  // Try DD/MM/YYYY format first (common in the CSV)
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const quarter = getQuarter(monthNum);
    const monthName = getMonthName(monthNum);
    
    return {
      year: yearNum,
      quarter,
      month: monthName,
    };
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month] = isoMatch;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const quarter = getQuarter(monthNum);
    const monthName = getMonthName(monthNum);
    
    return {
      year: yearNum,
      quarter,
      month: monthName,
    };
  }
  
  // Try Excel serial number (common when dates exported as numbers)
  const numericValue = Number(cleaned);
  if (!Number.isNaN(numericValue) && cleaned.match(/^\d+(\.\d+)?$/)) {
    const excelDate = convertExcelSerialToDate(numericValue);
    if (excelDate) {
      const yearNum = excelDate.getUTCFullYear();
      const monthNum = excelDate.getUTCMonth() + 1;
      const quarter = getQuarter(monthNum);
      const monthName = getMonthName(monthNum);

      return {
        year: yearNum,
        quarter,
        month: monthName,
      };
    }
  }

  // Try to parse as Date object
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    const yearNum = date.getFullYear();
    const monthNum = date.getMonth() + 1;
    const quarter = getQuarter(monthNum);
    const monthName = getMonthName(monthNum);
    
    return {
      year: yearNum,
      quarter,
      month: monthName,
    };
  }
  
  return {};
}

function convertExcelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  let days = Math.floor(serial);
  const fractionalDay = serial - days;

  // Excel incorrectly treats 1900 as leap year; adjust for dates after 28 Feb 1900
  if (days >= 60) {
    days -= 1;
  }

  const EXCEL_EPOCH = Date.UTC(1899, 11, 30); // Excel day 1 = 1900-01-01
  const milliseconds = (days + fractionalDay) * 24 * 60 * 60 * 1000;
  return new Date(EXCEL_EPOCH + milliseconds);
}

/**
 * Parse a date string (or Excel serial) and return a JavaScript Date
 */
export function parseDateValue(dateStr: string | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const cleaned = dateStr.trim();

  // Numeric Excel serial
  const numericValue = Number(cleaned);
  if (!Number.isNaN(numericValue) && cleaned.match(/^\d+(\.\d+)?$/)) {
    return convertExcelSerialToDate(numericValue);
  }

  // Try DD/MM/YYYY or ISO using Date constructor
  const dmyMatch = cleaned.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get quarter from month number
 */
function getQuarter(month: number): string {
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  if (month >= 10 && month <= 12) return 'Q4';
  return '';
}

/**
 * Get month name from month number
 */
function getMonthName(month: number): string {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  return months[month - 1] || '';
}

/**
 * Derive region and hub from Bp Scope or Country
 */
export function deriveRegionAndHub(
  bpScope: string | undefined,
  country: string | undefined
): { region: string; hub: string } {
  // Default values
  let region = 'Unknown';
  let hub = 'Unknown';
  
  if (bpScope) {
    // Bp Scope format examples: "1-GCC", "13", "14", "11-World-Wide"
    const bpScopeLower = bpScope.toLowerCase();
    
    // Map common Bp Scope patterns to regions
    if (bpScopeLower.includes('gcc') || bpScopeLower.includes('1-')) {
      region = 'GCC';
      hub = 'GCC';
    } else if (bpScopeLower.includes('world') || bpScopeLower.includes('11-')) {
      region = 'World-Wide';
      hub = 'World-Wide';
    } else if (bpScopeLower.includes('14') || bpScopeLower.includes('arab')) {
      region = 'Arab';
      hub = 'Arab';
    } else if (bpScopeLower.includes('13')) {
      region = 'Middle East';
      hub = 'Middle East';
    } else if (bpScopeLower.includes('3-') || bpScopeLower.includes('north')) {
      region = 'North Africa';
      hub = 'North Africa';
    } else if (bpScopeLower.includes('8-') || bpScopeLower.includes('cee')) {
      region = 'CEE Region';
      hub = 'CEE Region';
    }
  }
  
  // Fallback to country-based mapping if Bp Scope doesn't provide info
  if (region === 'Unknown' && country) {
    const countryLower = country.toLowerCase();
    
    // GCC countries
    if (['kuwait', 'saudi arabia', 'uae', 'united arab emirates', 'qatar', 'bahrain', 'oman'].some(c => countryLower.includes(c))) {
      region = 'GCC';
      hub = 'GCC';
    }
    // Middle East
    else if (['jordan', 'lebanon', 'syria', 'iraq', 'yemen'].some(c => countryLower.includes(c))) {
      region = 'Middle East';
      hub = 'Middle East';
    }
    // North Africa
    else if (['algeria', 'egypt', 'morocco', 'tunisia', 'libya'].some(c => countryLower.includes(c))) {
      region = 'North Africa';
      hub = 'North Africa';
    }
    // Europe
    else if (['turkey', 'czech', 'poland', 'germany', 'france', 'uk', 'spain', 'italy'].some(c => countryLower.includes(c))) {
      region = 'Europe';
      hub = 'Europe';
    }
    // Asia
    else if (['china', 'india', 'japan', 'singapore', 'malaysia', 'thailand', 'indonesia'].some(c => countryLower.includes(c))) {
      region = 'Asia';
      hub = 'Asia';
    }
  }
  
  return { region, hub };
}

