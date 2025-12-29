import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSVLine, parseDateValue } from '@/lib/data/csv-parser';
import { getDb } from '@/lib/database/connection';

function cleanNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.toString()
    .replace(/["']/g, '')
    .replace(/,/g, '')
    .trim();
  
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Try to find the CSV file
    const csvPaths = [
      join(process.cwd(), 'Risk & Control Self-Assessment.csv'),
      join(process.cwd(), 'ReView', 'Risk & Control Self-Assessment.csv'),
      join(process.cwd(), '..', 'Risk & Control Self-Assessment.csv'),
    ];
    
    let csvFilePath: string | null = null;
    for (const path of csvPaths) {
      try {
        readFileSync(path, 'utf-8');
        csvFilePath = path;
        break;
      } catch {
        // Continue to next path
      }
    }
    
    if (!csvFilePath) {
      return NextResponse.json(
        { error: 'CSV file not found. Please ensure "Risk & Control Self-Assessment.csv" is in the project root.' },
        { status: 404 }
      );
    }
    
    console.log(`📖 Reading CSV file: ${csvFilePath}...`);
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header and one data row' },
        { status: 400 }
      );
    }
    
    // Parse header
    const header = parseCSVLine(lines[0]);
    console.log(`📋 Found ${header.length} columns in CSV`);
    console.log(`📊 Processing ${lines.length - 1} data rows...`);
    
    const db = getDb();
    let inserted = 0;
    let skipped = 0;
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        if (row.length < 2) {
          skipped++;
          continue;
        }
        
        // Get risk_id (first column)
        const riskId = row[0]?.trim();
        if (!riskId || riskId === '') {
          skipped++;
          continue;
        }
        
        // Map CSV columns to database fields
        const riskItem = row[1]?.trim() || null;
        const riskDescription = row[2]?.trim() || null;
        const controlExist = row[3]?.trim() || null;
        const unit = row[4]?.trim() || null;
        const lob = row[5]?.trim() || null;
        const classField = row[6]?.trim() || null;
        const riskOwner = row[7]?.trim() || null;
        const level01 = row[8]?.trim() || null;
        const level02 = row[9]?.trim() || null;
        const level03 = row[10]?.trim() || null;
        const level04 = row[11]?.trim() || null;
        const inputFrequency = cleanNumeric(row[12]);
        const inputSeverity = cleanNumeric(row[13]);
        const inputImpact = cleanNumeric(row[14]);
        const inherentFrequency = cleanNumeric(row[15]);
        const inherentSeverity = cleanNumeric(row[16]);
        const inherentImpact = cleanNumeric(row[17]);
        const inherentCategory = row[18]?.trim() || null;
        const noOfControls = cleanNumeric(row[19]);
        const control01 = row[20]?.trim() || null;
        const effectC1 = row[21]?.trim() || null;
        const control02 = row[22]?.trim() || null;
        const effectC2 = row[23]?.trim() || null;
        const control03 = row[24]?.trim() || null;
        const effectC3 = row[25]?.trim() || null;
        const control04 = row[26]?.trim() || null;
        const effectC4 = row[27]?.trim() || null;
        const control05 = row[28]?.trim() || null;
        const effectC5 = row[29]?.trim() || null;
        const dateOfReview = row[30] ? parseDateValue(row[30]) : null;
        const controlToBeImplemented = row[31]?.trim() || null;
        const dueDate = row[32] ? parseDateValue(row[32]) : null;
        const residualImpact = cleanNumeric(row[33]);
        const residualCategory = row[34]?.trim() || null;
        const riskManagerRemarks = row[35]?.trim() || null;
        
        // Insert or update record
        await db.query(`
          INSERT INTO risk_control_assessments (
            risk_id, risk_item, risk_description, control_exist, unit, lob, class,
            risk_owner, level_01, level_02, level_03, level_04,
            input_frequency, input_severity, input_impact,
            inherent_frequency, inherent_severity, inherent_impact, inherent_category,
            no_of_controls,
            control_01, effect_c1, control_02, effect_c2, control_03, effect_c3,
            control_04, effect_c4, control_05, effect_c5,
            date_of_review, control_to_be_implemented, due_date,
            residual_impact, residual_category, risk_manager_remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36
          )
          ON CONFLICT (risk_id) DO UPDATE SET
            risk_item = EXCLUDED.risk_item,
            risk_description = EXCLUDED.risk_description,
            control_exist = EXCLUDED.control_exist,
            unit = EXCLUDED.unit,
            lob = EXCLUDED.lob,
            class = EXCLUDED.class,
            risk_owner = EXCLUDED.risk_owner,
            level_01 = EXCLUDED.level_01,
            level_02 = EXCLUDED.level_02,
            level_03 = EXCLUDED.level_03,
            level_04 = EXCLUDED.level_04,
            input_frequency = EXCLUDED.input_frequency,
            input_severity = EXCLUDED.input_severity,
            input_impact = EXCLUDED.input_impact,
            inherent_frequency = EXCLUDED.inherent_frequency,
            inherent_severity = EXCLUDED.inherent_severity,
            inherent_impact = EXCLUDED.inherent_impact,
            inherent_category = EXCLUDED.inherent_category,
            no_of_controls = EXCLUDED.no_of_controls,
            control_01 = EXCLUDED.control_01,
            effect_c1 = EXCLUDED.effect_c1,
            control_02 = EXCLUDED.control_02,
            effect_c2 = EXCLUDED.effect_c2,
            control_03 = EXCLUDED.control_03,
            effect_c3 = EXCLUDED.effect_c3,
            control_04 = EXCLUDED.control_04,
            effect_c4 = EXCLUDED.effect_c4,
            control_05 = EXCLUDED.control_05,
            effect_c5 = EXCLUDED.effect_c5,
            date_of_review = EXCLUDED.date_of_review,
            control_to_be_implemented = EXCLUDED.control_to_be_implemented,
            due_date = EXCLUDED.due_date,
            residual_impact = EXCLUDED.residual_impact,
            residual_category = EXCLUDED.residual_category,
            risk_manager_remarks = EXCLUDED.risk_manager_remarks,
            updated_at = CURRENT_TIMESTAMP
        `, [
          riskId, riskItem, riskDescription, controlExist, unit, lob, classField,
          riskOwner, level01, level02, level03, level04,
          inputFrequency, inputSeverity, inputImpact,
          inherentFrequency, inherentSeverity, inherentImpact, inherentCategory,
          noOfControls,
          control01, effectC1, control02, effectC2, control03, effectC3,
          control04, effectC4, control05, effectC5,
          dateOfReview, controlToBeImplemented, dueDate,
          residualImpact, residualCategory, riskManagerRemarks
        ]);
        
        inserted++;
      } catch (rowError) {
        console.warn(`⚠️  Skipping row ${i + 1}: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
        skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} risk assessment records${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
      inserted,
      skipped
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import CSV' },
      { status: 500 }
    );
  }
}

