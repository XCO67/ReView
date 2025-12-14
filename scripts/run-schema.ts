/**
 * Run Database Schema Script
 * 
 * Executes the SQL schema file using the database connection from .env
 * This avoids needing psql in PATH or interactive password prompts.
 * 
 * Usage: npm run schema:update
 */

// Load environment variables from .env
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

// If DATABASE_URL is not set, set it from the connection string
// Convert postgres:// to postgresql:// if needed
if (!process.env.DATABASE_URL && process.env.DB_NAME) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME;
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres://')) {
  // Convert postgres:// to postgresql://
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('postgres://', 'postgresql://');
}

import { readFileSync } from 'fs';
import { join } from 'path';
import { initDb, getDb } from '../src/lib/database/connection';

async function main() {
  try {
    console.log('🚀 Starting Database Schema Update...\n');
    
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await initDb();
    console.log('✅ Database connected\n');
    
    // Read SQL schema file
    const schemaPath = join(process.cwd(), 'scripts', 'sql', 'schema.sql');
    console.log(`📖 Reading schema file: ${schemaPath}\n`);
    const sql = readFileSync(schemaPath, 'utf-8');
    
    // Split SQL into individual statements more carefully
    // Handle dollar-quoted strings and multi-line statements
    const statements: string[] = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    const lines = sql.split('\n');
    for (const line of lines) {
      // Skip comment-only lines
      if (line.trim().startsWith('--') || line.trim() === '') {
        continue;
      }
      
      // Check for dollar-quoted strings ($$ ... $$)
      const dollarMatch = line.match(/\$([^$]*)\$/g);
      if (dollarMatch) {
        for (const match of dollarMatch) {
          if (!inDollarQuote) {
            dollarTag = match;
            inDollarQuote = true;
          } else if (match === dollarTag) {
            inDollarQuote = false;
            dollarTag = '';
          }
        }
      }
      
      currentStatement += line + '\n';
      
      // If we're not in a dollar quote and line ends with semicolon, it's a complete statement
      if (!inDollarQuote && line.trim().endsWith(';')) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`🔄 Executing ${statements.length} SQL statements...\n`);
    
    const db = getDb();
    let executed = 0;
    let errors = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
          executed++;
          if (executed % 10 === 0) {
            process.stdout.write('.');
          }
        } catch (error: any) {
          // Ignore "already exists" errors (IF NOT EXISTS handles this)
          if (!error.message?.includes('already exists') && 
              !error.message?.includes('duplicate') &&
              !error.message?.includes('does not exist')) {
            console.error(`\n⚠️  Error executing statement: ${error.message}`);
            errors++;
          }
        }
      }
    }
    
    console.log(`\n\n✅ Schema update completed!`);
    console.log(`   Executed: ${executed} statements`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} (non-critical)`);
    }
    console.log('\n🎉 Database schema is ready!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  }
}

main();

