import dotenv from 'dotenv';
import { getDb } from '../src/lib/database/connection';

// Load environment variables
dotenv.config({ path: '.env' });

async function checkConnection() {
  try {
    console.log('🔍 Checking database connection...\n');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }
    
    // Mask password in URL for display
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`📡 Database URL: ${maskedUrl}`);
    
    // Check if it's Railway
    const isRailway = dbUrl.includes('railway.app') || dbUrl.includes('railway') || dbUrl.includes('railway.internal');
    console.log(`🏗️  Database Provider: ${isRailway ? 'Railway' : 'Other'}`);
    
    const db = getDb();
    
    // Test connection
    const result = await db.query('SELECT version(), current_database(), inet_server_addr(), inet_server_port()');
    const version = result.rows[0].version;
    const database = result.rows[0].current_database;
    const host = result.rows[0].inet_server_addr || 'N/A';
    const port = result.rows[0].inet_server_port || 'N/A';
    
    console.log(`\n✅ Connected successfully!`);
    console.log(`   Database: ${database}`);
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   PostgreSQL Version: ${version.split(' ')[0]} ${version.split(' ')[1]}`);
    
    // Check for risk_control_assessments table
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'risk_control_assessments'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      const count = await db.query('SELECT COUNT(*) as count FROM risk_control_assessments');
      console.log(`\n📊 risk_control_assessments table: ✅ EXISTS (${count.rows[0].count} records)`);
    } else {
      console.log(`\n📊 risk_control_assessments table: ❌ NOT FOUND`);
    }
    
    // List all tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 All tables in database:`);
    tables.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });
    
    console.log('\n🎉 Connection check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection check failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

checkConnection();

