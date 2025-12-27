#!/usr/bin/env node
/**
 * Railway Deployment Diagnostic Script
 * 
 * This script checks:
 * 1. Environment variables
 * 2. Database connectivity
 * 3. Next.js build status
 * 4. Port configuration
 * 5. Network binding
 */

// Load environment variables from .env file if it exists
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔍 Railway Deployment Diagnostics\n');
console.log('=' .repeat(60));

// 1. Check Environment Variables
console.log('\n📋 1. Environment Variables Check:');
console.log('-'.repeat(60));

const requiredVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'NODE_ENV'
];

// PORT and HOSTNAME are set by Railway automatically, so they're optional for local testing
const railwayVars = [
  'PORT',
  'HOSTNAME'
];

const optionalVars = [
  'DEFAULT_ADMIN_USERNAME',
  'DEFAULT_ADMIN_EMAIL',
  'DEFAULT_ADMIN_PASSWORD'
];

let envIssues = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    envIssues.push(varName);
  } else {
    // Mask sensitive values
    let displayValue = value;
    if (varName === 'DATABASE_URL') {
      // Show only host and database, mask password
      try {
        const url = new URL(value);
        displayValue = `${url.protocol}//${url.username}:***@${url.hostname}:${url.port}${url.pathname}`;
      } catch (e) {
        displayValue = '*** (invalid format)';
      }
    } else if (varName === 'SESSION_SECRET') {
      displayValue = value.substring(0, 8) + '***';
    } else {
      displayValue = value;
    }
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

railwayVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`ℹ️  ${varName}: Not set (Railway will set this automatically)`);
  }
});

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`ℹ️  ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

// 2. Check Database Connection
console.log('\n🗄️  2. Database Connection Test:');
console.log('-'.repeat(60));

async function testDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('❌ DATABASE_URL not set - cannot test connection');
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    console.log('⏳ Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Database connection: SUCCESS');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`   Tables found: ${tablesResult.rows.length}`);
    if (tablesResult.rows.length > 0) {
      console.log(`   Tables: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ Database connection: FAILED');
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('timeout')) {
      console.log('   ⚠️  Connection timeout - check if database is accessible from Railway');
    } else if (error.message.includes('password')) {
      console.log('   ⚠️  Authentication failed - check DATABASE_URL password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('   ⚠️  DNS resolution failed - check database hostname');
    }
    return false;
  }
}

// 3. Check Next.js Build
console.log('\n📦 3. Next.js Build Check:');
console.log('-'.repeat(60));

const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('✅ .next directory exists');
  
  const standaloneDir = path.join(nextDir, 'standalone');
  const staticDir = path.join(nextDir, 'static');
  
  if (fs.existsSync(standaloneDir)) {
    console.log('⚠️  Standalone build detected (but we\'re using custom server.js)');
  }
  
  if (fs.existsSync(staticDir)) {
    console.log('✅ Static files directory exists');
  }
  
  // Check for server.js in .next
  const serverJs = path.join(nextDir, 'server.js');
  if (fs.existsSync(serverJs)) {
    console.log('✅ .next/server.js exists');
  }
} else {
  console.log('❌ .next directory NOT found - build may have failed');
  console.log('   Run: npm run build');
}

// 4. Check Port and Hostname
console.log('\n🌐 4. Network Configuration:');
console.log('-'.repeat(60));

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

console.log(`✅ PORT: ${port} (default: 3000, Railway will override)`);
console.log(`✅ HOSTNAME: ${hostname} (server.js hardcoded to 0.0.0.0)`);

if (hostname !== '0.0.0.0' && hostname !== '::') {
  console.log('⚠️  WARNING: HOSTNAME should be "0.0.0.0" for Railway');
}

// 5. Check server.js
console.log('\n🖥️  5. Server Configuration:');
console.log('-'.repeat(60));

const serverJsPath = path.join(process.cwd(), 'server.js');
if (fs.existsSync(serverJsPath)) {
  console.log('✅ Custom server.js exists');
  const serverContent = fs.readFileSync(serverJsPath, 'utf8');
  if (serverContent.includes('0.0.0.0')) {
    console.log('✅ Server binds to 0.0.0.0');
  } else {
    console.log('⚠️  Server may not bind to 0.0.0.0');
  }
  if (serverContent.includes('process.env.PORT')) {
    console.log('✅ Server uses PORT environment variable');
  }
} else {
  console.log('❌ Custom server.js NOT found');
}

// 6. Check package.json start script
console.log('\n📜 6. Package.json Start Script:');
console.log('-'.repeat(60));

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const startScript = packageJson.scripts?.start;
  if (startScript) {
    console.log(`✅ Start script: ${startScript}`);
    if (startScript.includes('server.js')) {
      console.log('✅ Uses custom server.js');
    } else if (startScript.includes('next start')) {
      console.log('⚠️  Uses "next start" - may not bind to 0.0.0.0');
    }
  } else {
    console.log('❌ No start script found');
  }
}

// 7. Summary
console.log('\n📊 Summary:');
console.log('='.repeat(60));

if (envIssues.length > 0) {
  console.log(`❌ Missing required environment variables: ${envIssues.join(', ')}`);
  console.log('   Fix: Add these variables in Railway → Variables tab');
}

// Run async checks
testDatabase().then(dbOk => {
  if (!dbOk) {
    console.log('\n❌ Database connection failed - this will prevent the app from starting');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Fix any issues listed above');
  console.log('2. Check Railway Deploy Logs for startup errors');
  console.log('3. Verify all environment variables are set (without quotes)');
  console.log('4. Ensure PORT and HOSTNAME are correctly configured');
  console.log('5. Check Railway service status (should be "Active")');
  
  console.log('\n📝 To run this script in Railway:');
  console.log('   Add to package.json: "diagnose": "node scripts/diagnose-railway.js"');
  console.log('   Then run: npm run diagnose');
  
  process.exit(envIssues.length > 0 || !dbOk ? 1 : 0);
}).catch(err => {
  console.error('\n❌ Diagnostic script error:', err);
  process.exit(1);
});

