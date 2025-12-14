/**
 * CSV to Database Import Script
 * 
 * Imports data from CSV file into PostgreSQL database.
 * Run this once to migrate existing CSV data to the database.
 * 
 * Usage:
 *   npx tsx scripts/import-csv-to-db.ts [path-to-csv-file]
 */

// Load environment variables from .env
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { promises as fs } from 'fs';
import path from 'path';
import { initDb } from '../src/lib/database/connection';
import { bulkInsertPolicies } from '../src/lib/database/policies';
import { parseCSVLine, cleanNumeric } from '../src/lib/data/csv-parser';
import type { ReinsuranceData } from '../src/lib/validation/schema';

const CSV_FILE_NAME = 'Kuwait Re - Clean Data - 02.12.2025.csv';
const POSSIBLE_PATHS = [
  path.join(process.cwd(), CSV_FILE_NAME),
  path.join(process.cwd(), '..', CSV_FILE_NAME),
  path.join(process.cwd(), '..', '..', CSV_FILE_NAME),
  path.join(process.cwd(), 'src', CSV_FILE_NAME),
];

async function resolveCsvPath(customPath?: string): Promise<string> {
  if (customPath) {
    const resolved = path.resolve(customPath);
    await fs.access(resolved);
    return resolved;
  }

  for (const candidate of POSSIBLE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`CSV file "${CSV_FILE_NAME}" not found. Tried: ${POSSIBLE_PATHS.join(', ')}\nProvide path as argument: npx tsx scripts/import-csv-to-db.ts <path-to-csv>`);
}

function mapRowToRecord(values: string[]): ReinsuranceData | null {
  // Use Inception Year for UY
  const inceptionYear = values[21]?.trim() ? Number(values[21].trim()) : undefined;
  if (!inceptionYear || isNaN(inceptionYear)) {
    return null;
  }
  const uy = String(inceptionYear);

  // Filter out "fronting" records
  const policyName = values[34]?.trim() || '';
  if (policyName.toLowerCase().includes('fronting')) {
    return null;
  }

  // Display fields
  const extType = values[3]?.trim() || 'Unknown';
  const srl = values[6]?.trim();
  const broker = values[32]?.trim() || 'Unknown';
  const cedant = values[33]?.trim() || 'Unknown';
  const orgInsuredTrtyName = policyName;
  const office = values[4]?.trim() || undefined;
  const loc = office;
  const className = values[7]?.trim() || undefined;
  const subClassRaw = values[8]?.trim() || '';
  const subClass = (subClassRaw === '' || subClassRaw === '0' || subClassRaw === '0.0') ? 'Other' : subClassRaw;
  const channel = values[5]?.trim() || undefined;
  const arrangement = values[9]?.trim() || undefined;

  // Calculation fields
  const countryName = values[0]?.trim() || 'Unknown';
  const region = values[1]?.trim() || 'Unknown';
  const hub = values[2]?.trim() || 'Unknown';
  
  // Financial fields in KD
  const grsPremKD = cleanNumeric(values[10]);
  const acqCostKD = cleanNumeric(values[11]);
  const paidClaimsKD = cleanNumeric(values[12]);
  const osClaimKD = cleanNumeric(values[13]);
  const incClaimKD = cleanNumeric(values[14]);
  const maxLiabilityKD = cleanNumeric(values[15]);
  const signSharePct = cleanNumeric(values[16]);
  const writtenSharePct = values[17]?.trim() ? cleanNumeric(values[17]) : undefined;

  // Date fields
  const inceptionDay = values[18]?.trim() ? Number(values[18].trim()) : undefined;
  const inceptionMonthStr = values[19]?.trim();
  let inceptionMonth: number | undefined = undefined;
  if (inceptionMonthStr) {
    const monthMap: Record<string, number> = {
      'JAN': 1, 'JANUARY': 1, 'FEB': 2, 'FEBRUARY': 2, 'MAR': 3, 'MARCH': 3,
      'APR': 4, 'APRIL': 4, 'MAY': 5, 'JUN': 6, 'JUNE': 6,
      'JUL': 7, 'JULY': 7, 'AUG': 8, 'AUGUST': 8, 'SEP': 9, 'SEPTEMBER': 9,
      'OCT': 10, 'OCTOBER': 10, 'NOV': 11, 'NOVEMBER': 11, 'DEC': 12, 'DECEMBER': 12
    };
    const monthUpper = inceptionMonthStr.toUpperCase();
    if (monthMap[monthUpper]) {
      inceptionMonth = monthMap[monthUpper];
    } else {
      const monthNum = Number(inceptionMonthStr);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        inceptionMonth = monthNum;
      }
    }
  }
  
  const inceptionQuarterStr = values[20]?.trim();
  let inceptionQuarter: number | undefined = undefined;
  if (inceptionQuarterStr) {
    const qMatch = inceptionQuarterStr.match(/^Q?(\d+)$/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      if (qNum >= 1 && qNum <= 4) {
        inceptionQuarter = qNum;
      }
    } else {
      const qNum = Number(inceptionQuarterStr);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 4) {
        inceptionQuarter = qNum;
      }
    }
  }
  
  const expiryDay = values[22]?.trim() ? Number(values[22].trim()) : undefined;
  const expiryMonthStr = values[23]?.trim();
  let expiryMonth: number | undefined = undefined;
  if (expiryMonthStr) {
    const monthMap: Record<string, number> = {
      'JAN': 1, 'JANUARY': 1, 'FEB': 2, 'FEBRUARY': 2, 'MAR': 3, 'MARCH': 3,
      'APR': 4, 'APRIL': 4, 'MAY': 5, 'JUN': 6, 'JUNE': 6,
      'JUL': 7, 'JULY': 7, 'AUG': 8, 'AUGUST': 8, 'SEP': 9, 'SEPTEMBER': 9,
      'OCT': 10, 'OCTOBER': 10, 'NOV': 11, 'NOVEMBER': 11, 'DEC': 12, 'DECEMBER': 12
    };
    const monthUpper = expiryMonthStr.toUpperCase();
    if (monthMap[monthUpper]) {
      expiryMonth = monthMap[monthUpper];
    } else {
      const monthNum = Number(expiryMonthStr);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        expiryMonth = monthNum;
      }
    }
  }
  
  const expiryQuarterStr = values[24]?.trim();
  let expiryQuarter: number | undefined = undefined;
  if (expiryQuarterStr) {
    const qMatch = expiryQuarterStr.match(/^Q?(\d+)$/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      if (qNum >= 1 && qNum <= 4) {
        expiryQuarter = qNum;
      }
    } else {
      const qNum = Number(expiryQuarterStr);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 4) {
        expiryQuarter = qNum;
      }
    }
  }
  const expiryYear = values[25]?.trim() ? Number(values[25].trim()) : undefined;
  
  const renewalDate = values[26]?.trim() || undefined;
  const renewalDay = values[27]?.trim() ? Number(values[27].trim()) : undefined;
  const renewalMonthStr = values[28]?.trim();
  let renewalMonth: number | undefined = undefined;
  if (renewalMonthStr) {
    const monthMap: Record<string, number> = {
      'JAN': 1, 'JANUARY': 1, 'FEB': 2, 'FEBRUARY': 2, 'MAR': 3, 'MARCH': 3,
      'APR': 4, 'APRIL': 4, 'MAY': 5, 'JUN': 6, 'JUNE': 6,
      'JUL': 7, 'JULY': 7, 'AUG': 8, 'AUGUST': 8, 'SEP': 9, 'SEPTEMBER': 9,
      'OCT': 10, 'OCTOBER': 10, 'NOV': 11, 'NOVEMBER': 11, 'DEC': 12, 'DECEMBER': 12
    };
    const monthUpper = renewalMonthStr.toUpperCase();
    if (monthMap[monthUpper]) {
      renewalMonth = monthMap[monthUpper];
    } else {
      const monthNum = Number(renewalMonthStr);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        renewalMonth = monthNum;
      }
    }
  }
  
  const renewalQuarterStr = values[29]?.trim();
  let renewalQuarter: number | undefined = undefined;
  if (renewalQuarterStr) {
    const qMatch = renewalQuarterStr.match(/^Q?(\d+)$/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      if (qNum >= 1 && qNum <= 4) {
        renewalQuarter = qNum;
      }
    } else {
      const qNum = Number(renewalQuarterStr);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 4) {
        renewalQuarter = qNum;
      }
    }
  }
  const renewalYear = values[30]?.trim() ? Number(values[30].trim()) : undefined;

  // Additional fields
  const source = values[31]?.trim() || undefined;
  const policyStatus = values[35]?.trim() || undefined;

  // Build comDate from inception fields if available
  let comDate: string | undefined = undefined;
  if (inceptionYear && inceptionMonth && inceptionDay) {
    try {
      const date = new Date(inceptionYear, inceptionMonth - 1, inceptionDay);
      comDate = date.toISOString().split('T')[0];
    } catch {
      // Invalid date, leave undefined
    }
  }

  // Build expiryDate from expiry fields if available
  let expiryDate: string | undefined = undefined;
  if (expiryYear && expiryMonth && expiryDay) {
    try {
      const date = new Date(expiryYear, expiryMonth - 1, expiryDay);
      expiryDate = date.toISOString().split('T')[0];
    } catch {
      // Invalid date, leave undefined
    }
  }

  const record: ReinsuranceData = {
    // Display fields
    uy,
    extType,
    srl,
    broker,
    cedant,
    orgInsuredTrtyName,
    loc,
    className,
    subClass,
    cedTerritory: undefined,
    
    // Calculation fields
    countryName,
    region,
    hub,
    office,
    grsPremKD,
    acqCostKD,
    paidClaimsKD,
    osClaimKD,
    incClaimKD,
    maxLiabilityKD,
    signSharePct,
    writtenSharePct,
    
    // Date fields
    inceptionDay,
    inceptionMonth,
    inceptionQuarter,
    inceptionYear,
    expiryDay,
    expiryMonth,
    expiryQuarter,
    expiryYear,
    renewalDate,
    renewalDay,
    renewalMonth,
    renewalQuarter,
    renewalYear,
    
    // Additional fields
    source,
    policyStatus,
    channel,
    arrangement,
    
    // Legacy fields
    comDate,
    expiryDate,
    maxLiabilityFC: maxLiabilityKD,
    grossUWPrem: grsPremKD,
    grossActualAcq: acqCostKD,
    grossPaidClaims: paidClaimsKD,
    grossOsLoss: osClaimKD,
  };

  return record;
}

async function main() {
  try {
    console.log('🚀 Starting CSV to Database Import...\n');
    
    // Get CSV file path
    const csvPath = process.argv[2];
    const resolvedPath = await resolveCsvPath(csvPath);
    console.log(`📄 Reading CSV file: ${resolvedPath}\n`);
    
    // Initialize database
    console.log('🔌 Connecting to database...');
    await initDb();
    console.log('✅ Database connected\n');
    
    // Read CSV file
    console.log('📖 Reading CSV file...');
    const csvContent = await fs.readFile(resolvedPath, 'utf-8');
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
    console.log(`   Found ${lines.length} lines (including header)\n`);
    
    // Parse CSV data
    console.log('🔄 Parsing CSV data...');
    const data: ReinsuranceData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 36) continue;
      const record = mapRowToRecord(values);
      if (record) {
        data.push(record);
      }
    }
    console.log(`   Parsed ${data.length} valid records\n`);
    
    // Import to database
    console.log('💾 Importing to database...');
    const inserted = await bulkInsertPolicies(data);
    console.log(`✅ Successfully imported ${inserted} records\n`);
    
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();

