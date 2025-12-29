import dotenv from 'dotenv';
import { getDb } from '../src/lib/database/connection';

// Load environment variables
dotenv.config({ path: '.env' });

async function fixInvalidRiskIds() {
  try {
    console.log('🔍 Checking for invalid risk IDs...');
    
    const db = getDb();
    
    // Find invalid risk IDs (empty, "also", or just whitespace)
    const invalidRecords = await db.query(`
      SELECT risk_id, risk_item, risk_description
      FROM risk_control_assessments
      WHERE risk_id IS NULL 
         OR TRIM(risk_id) = ''
         OR LOWER(TRIM(risk_id)) = 'also'
         OR risk_id !~ '^[A-Z0-9]+[0-9]*$'
      ORDER BY risk_id;
    `);
    
    if (invalidRecords.rows.length === 0) {
      console.log('✅ No invalid risk IDs found!');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${invalidRecords.rows.length} invalid risk ID(s):`);
    invalidRecords.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. Risk ID: "${row.risk_id}" | Item: "${row.risk_item?.substring(0, 50)}..."`);
    });
    
    // Delete invalid records
    console.log('\n🗑️  Deleting invalid records...');
    const deleteResult = await db.query(`
      DELETE FROM risk_control_assessments
      WHERE risk_id IS NULL 
         OR TRIM(risk_id) = ''
         OR LOWER(TRIM(risk_id)) = 'also'
         OR risk_id !~ '^[A-Z0-9]+[0-9]*$'
      RETURNING risk_id;
    `);
    
    console.log(`✅ Deleted ${deleteResult.rows.length} invalid record(s)`);
    
    // Show remaining count
    const count = await db.query('SELECT COUNT(*) as count FROM risk_control_assessments');
    console.log(`\n📊 Remaining records: ${count.rows[0].count}`);
    
    console.log('\n🎉 Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

fixInvalidRiskIds();

