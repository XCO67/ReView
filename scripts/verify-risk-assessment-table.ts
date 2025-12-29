import dotenv from 'dotenv';
import { getDb } from '../src/lib/database/connection';

// Load environment variables
dotenv.config({ path: '.env' });

async function verifyTable() {
  try {
    console.log('🔍 Verifying risk_control_assessments table...');
    
    const db = getDb();
    
    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'risk_control_assessments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Table does not exist! Run initDb() first.');
      process.exit(1);
    }
    
    console.log('✅ Table exists');
    
    // Get table structure
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'risk_control_assessments'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 Table has ${columns.rows.length} columns:`);
    columns.rows.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Count records
    const count = await db.query('SELECT COUNT(*) as count FROM risk_control_assessments');
    const recordCount = parseInt(count.rows[0].count);
    
    console.log(`\n📊 Current records: ${recordCount}`);
    
    if (recordCount === 0) {
      console.log('⚠️  No records found. Run the import script to load data.');
    } else {
      console.log('✅ Data is loaded in the database');
    }
    
    console.log('\n🎉 Table verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

verifyTable();

