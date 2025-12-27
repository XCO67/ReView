#!/usr/bin/env node
/**
 * Test Database Connection String Parsing
 * Helps diagnose DATABASE_URL parsing issues
 */

require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

console.log('🔍 Database Connection String Analysis\n');
console.log('='.repeat(60));

if (!dbUrl) {
  console.log('❌ DATABASE_URL is not set!');
  process.exit(1);
}

console.log('\n📋 Raw DATABASE_URL (first 50 chars):');
console.log(dbUrl.substring(0, 50) + '...');

console.log('\n📋 Full DATABASE_URL length:', dbUrl.length);

// Try to parse it
try {
  const url = new URL(dbUrl);
  
  console.log('\n✅ Successfully parsed as URL:');
  console.log('  Protocol:', url.protocol);
  console.log('  Username:', url.username);
  console.log('  Password:', url.password ? '***' + url.password.substring(url.password.length - 4) : 'NOT SET');
  console.log('  Hostname:', url.hostname);
  console.log('  Port:', url.port || 'default (5432)');
  console.log('  Pathname:', url.pathname);
  console.log('  Full host:', url.host);
  
  if (url.hostname === 'base' || url.hostname.length < 5) {
    console.log('\n❌ ERROR: Hostname is incorrect!');
    console.log('   This suggests the DATABASE_URL is malformed.');
    console.log('   Check if there are quotes or extra characters.');
  } else {
    console.log('\n✅ Hostname looks correct');
  }
  
} catch (error) {
  console.log('\n❌ Failed to parse DATABASE_URL as URL:');
  console.log('   Error:', error.message);
  console.log('\n   This usually means:');
  console.log('   - DATABASE_URL has quotes around it');
  console.log('   - DATABASE_URL is missing parts');
  console.log('   - DATABASE_URL has invalid characters');
}

// Check for common issues
console.log('\n🔍 Checking for common issues:');
if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) {
  console.log('❌ DATABASE_URL starts with quotes - remove them!');
}
if (dbUrl.endsWith('"') || dbUrl.endsWith("'")) {
  console.log('❌ DATABASE_URL ends with quotes - remove them!');
}
if (dbUrl.includes('\\n') || dbUrl.includes('\\r')) {
  console.log('❌ DATABASE_URL contains newline characters');
}
if (!dbUrl.includes('://')) {
  console.log('❌ DATABASE_URL missing protocol (postgresql://)');
}
if (!dbUrl.includes('@')) {
  console.log('❌ DATABASE_URL missing @ separator');
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 Expected format:');
console.log('postgresql://username:password@hostname:port/database');
console.log('\nExample:');
console.log('postgresql://postgres.pvboydyzaczrkeeexiyl:password%5E%26@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres');

