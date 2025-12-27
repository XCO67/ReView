import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { parseCSVLine, cleanNumeric, parseDate, parseDateValue } from '../src/lib/data/csv-parser';
import { bulkInsertPolicies } from '../src/lib/database/policies';
import type { ReinsuranceData } from '../src/lib/validation/schema';

// Load environment variables
dotenv.config({ path: '.env' });

// Month name to number mapping
const monthMap: Record<string, number> = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

// Quarter string to number mapping
const quarterMap: Record<string, number> = {
  'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4
};

function parseMonthName(monthStr: string | undefined): number | undefined {
  if (!monthStr) return undefined;
  const monthUpper = monthStr.trim().toUpperCase();
  return monthMap[monthUpper];
}

function parseQuarter(quarterStr: string | undefined): number | undefined {
  if (!quarterStr) return undefined;
  const quarterUpper = quarterStr.trim().toUpperCase();
  return quarterMap[quarterUpper];
}

function parsePercentage(percentStr: string | undefined): number {
  if (!percentStr) return 0;
  // Remove % sign and parse
  const cleaned = percentStr.toString().replace(/%/g, '').trim();
  return cleanNumeric(cleaned);
}

async function importCSV(csvFilePath: string) {
  try {
    console.log(`📖 Reading CSV file: ${csvFilePath}...`);
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    // Parse header
    const header = parseCSVLine(lines[0]);
    console.log(`📋 Found ${header.length} columns in CSV`);
    console.log(`📊 Processing ${lines.length - 1} data rows...`);
    
    // Create column index map
    const colIndex: Record<string, number> = {};
    header.forEach((col, idx) => {
      colIndex[col.toLowerCase()] = idx;
    });
    
    // Parse data rows
    const policies: ReinsuranceData[] = [];
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        if (row.length < header.length) {
          skipped++;
          continue; // Skip incomplete rows
        }
        
        // Helper function to get column value
        const getCol = (name: string): string => {
          const idx = colIndex[name.toLowerCase()];
          return idx !== undefined ? (row[idx] || '') : '';
        };
        
        // Map CSV columns to ReinsuranceData
        const policy: ReinsuranceData = {
          // Required fields
          broker: getCol('broker') || '',
          cedant: getCol('cedant') || '',
          orgInsuredTrtyName: getCol('org_insured_trty_name') || '',
          countryName: getCol('country_name') || '',
          region: getCol('region') || '',
          hub: getCol('hub') || '',
          extType: getCol('ext_type') || '',
          
          // Optional fields
          office: getCol('office') || undefined,
          channel: getCol('channel') || undefined,
          srl: getCol('srl') || undefined,
          className: getCol('class_name') || undefined,
          subClass: getCol('sub_class') || undefined,
          arrangement: getCol('arrangement') || undefined,
          source: getCol('source') || undefined,
          policyStatus: getCol('policy_status') || undefined,
          
          // Numeric fields
          grsPremKD: cleanNumeric(getCol('grs_prem_kd')),
          acqCostKD: cleanNumeric(getCol('acq_cost_kd')),
          paidClaimsKD: cleanNumeric(getCol('paid_claims_kd')),
          osClaimKD: cleanNumeric(getCol('os_claim_kd')),
          incClaimKD: cleanNumeric(getCol('inc_claim_kd')),
          maxLiabilityKD: cleanNumeric(getCol('max_liability_kd')),
          signSharePct: parsePercentage(getCol('sign_share_pct')),
          writtenSharePct: getCol('written_share_pct') ? parsePercentage(getCol('written_share_pct')) : undefined,
          
          // Date fields - inception
          inceptionDay: getCol('inception_day') ? parseInt(getCol('inception_day'), 10) || undefined : undefined,
          inceptionMonth: parseMonthName(getCol('inception_month')),
          inceptionQuarter: parseQuarter(getCol('inception_quarter')),
          inceptionYear: getCol('inception_year') ? parseInt(getCol('inception_year'), 10) || undefined : undefined,
          
          // Date fields - expiry
          expiryDay: getCol('expiry_day') ? parseInt(getCol('expiry_day'), 10) || undefined : undefined,
          expiryMonth: parseMonthName(getCol('expiry_month')),
          expiryQuarter: parseQuarter(getCol('expiry_quarter')),
          expiryYear: getCol('expiry_year') ? parseInt(getCol('expiry_year'), 10) || undefined : undefined,
          
          // Renewal fields
          renewalDate: getCol('renewal_date') || undefined,
          renewalDay: getCol('renewal_day') ? parseInt(getCol('renewal_day'), 10) || undefined : undefined,
          renewalMonth: parseMonthName(getCol('renewal_month')),
          renewalQuarter: parseQuarter(getCol('renewal_quarter')),
          renewalYear: getCol('renewal_year') ? parseInt(getCol('renewal_year'), 10) || undefined : undefined,
        };
        
        // Parse renewal_date to get com_date if available
        const renewalDateStr = getCol('renewal_date');
        if (renewalDateStr) {
          const comDate = parseDateValue(renewalDateStr);
          if (comDate) {
            policy.comDate = comDate.toISOString();
          }
        }
        
        // Validate required fields
        if (!policy.broker || !policy.cedant || !policy.orgInsuredTrtyName || !policy.countryName) {
          skipped++;
          continue;
        }
        
        policies.push(policy);
      } catch (rowError) {
        console.warn(`⚠️  Skipping row ${i + 1}: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
        skipped++;
      }
    }
    
    console.log(`✅ Parsed ${policies.length} valid policies from CSV`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} invalid/incomplete rows`);
    }
    
    if (policies.length === 0) {
      console.error('❌ No valid policies to import!');
      process.exit(1);
    }
    
    // Import to database
    console.log('📤 Importing to Railway database...');
    const inserted = await bulkInsertPolicies(policies);
    console.log(`✅ Successfully imported ${inserted} policies!`);
    console.log('🎉 CSV import complete!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run import
const csvFile = process.argv[2] || 'Kuwait Re - Clean Data - 02.12.2025.csv';
const csvPath = join(process.cwd(), csvFile);

console.log('🚀 Starting CSV import...');
console.log(`📁 CSV file: ${csvPath}`);
importCSV(csvPath);

