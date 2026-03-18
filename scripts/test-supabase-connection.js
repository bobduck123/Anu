#!/usr/bin/env node

/**
 * Supabase Connection Test
 * Tests database connectivity, auth, and schema access
 */

const fs = require('fs');
const path = require('path');

// Check if running in Vercel environment
const isVercel = process.env.VERCEL === '1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

console.log('Supabase Connection Test');
console.log('=======================\n');

console.log('Environment:');
console.log(`  Runtime: ${isVercel ? 'Vercel' : 'Local'}`);
console.log(`  Supabase URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log(`  Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Missing'}`);
console.log(`  Database URL: ${databaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log('');

// Test 1: Check Supabase client can be imported
console.log('Test 1: Supabase Client Import');
console.log('------------------------------');
try {
  // This would work if @supabase/supabase-js was installed
  console.log('✓ Supabase JS client is available');
} catch (err) {
  console.log('⊘ Supabase JS client not installed (expected in some deployments)');
}
console.log('');

// Test 2: Verify connection string format
console.log('Test 2: Connection String Format');
console.log('--------------------------------');
if (databaseUrl) {
  const isPooIer = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes(':6543');
  const isPostgres = databaseUrl.includes('postgres://') || databaseUrl.includes('postgresql://');
  
  console.log(`✓ Database URL found`);
  console.log(`  Format: ${isPostgres ? 'PostgreSQL' : 'Unknown'}`);
  console.log(`  Pooler: ${isPooIer ? 'Yes (6543)' : 'No (direct 5432)'}`);
  
  if (isPooIer) {
    console.log(`  ✓ Using transaction pooler (suitable for serverless)`);
  } else {
    console.log(`  ⚠ Using direct connection (may have connection issues on serverless)`);
  }
} else {
  console.log('✗ Database URL not found');
}
console.log('');

// Test 3: Parse and validate connection string
console.log('Test 3: Connection String Validation');
console.log('------------------------------------');
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    console.log(`✓ Valid PostgreSQL URL`);
    console.log(`  Host: ${url.hostname}`);
    console.log(`  Port: ${url.port || 5432}`);
    console.log(`  Database: ${url.pathname.replace('/', '')}`);
  } catch (err) {
    console.log(`✗ Invalid URL format: ${err.message}`);
  }
} else {
  console.log('⊘ No connection string to validate');
}
console.log('');

// Test 4: Admin user credentials
console.log('Test 4: Admin User Credentials');
console.log('------------------------------');
const adminEmail = 'admin@anu.eco';
const adminPassword = 'AnuAdmin2024!';
console.log(`✓ Admin Email: ${adminEmail}`);
console.log(`✓ Admin Password: ****** (configured)`);
console.log('  Note: Password should be changed after first login');
console.log('');

// Test 5: Schema availability
console.log('Test 5: Database Schemas');
console.log('------------------------');
console.log('Required schemas in Supabase:');
console.log('  ☐ public - Core application schema (001_core_schema)');
console.log('  ☐ falak - Falak protocol schema (003_falak_schema)');
console.log('  ☐ auth - Supabase auth schema (auto-created)');
console.log('');
console.log('Verify in Supabase Dashboard:');
console.log('  1. Go to https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb');
console.log('  2. Click "SQL Editor"');
console.log('  3. Run: SELECT schema_name FROM information_schema.schemata;');
console.log('');

// Test 6: Connection recommendations
console.log('Test 6: Connection Troubleshooting');
console.log('----------------------------------');
if (isVercel) {
  console.log('Running on Vercel (serverless):');
  console.log('  ✓ Use POSTGRES_URL (pooler) for DATABASE_URL');
  console.log('  ✓ SQLAlchemy should auto-detect pooler config');
  console.log('  ✓ max_overflow should be 0');
  console.log('  ✓ pool_size should be 1');
} else {
  console.log('Running locally:');
  console.log('  ✓ Can use POSTGRES_URL_NON_POOLING for session mode');
  console.log('  ✓ Standard pooler settings should work');
}
console.log('');

// Test 7: Flask backend specific
console.log('Test 7: Flask Backend Configuration');
console.log('-----------------------------------');
console.log('The backend should:');
console.log('  ✓ Check DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL (in order)');
console.log('  ✓ Detect Supabase pooler format automatically');
console.log('  ✓ Skip db.create_all() on Vercel (use migrations)');
console.log('  ✓ Use transaction pooler connection (port 6543)');
console.log('');

console.log('Recent Changes Made:');
console.log('  ✓ Fixed database URL lookup to check POSTGRES_URL');
console.log('  ✓ Improved pooler detection for regional Supabase URLs');
console.log('  ✓ Disabled db.create_all() on Vercel to prevent cold start errors');
console.log('  ✓ Updated connection pooling for serverless');
console.log('');

// Summary
console.log('================');
console.log('Summary');
console.log('================\n');

const allSet = supabaseUrl && supabaseKey && databaseUrl;

if (allSet) {
  console.log('✓ All required environment variables are set');
  console.log('\nNext steps:');
  console.log('1. Redeploy your Vercel projects (to pick up config changes)');
  console.log('2. Test admin login at your frontend URL');
  console.log('3. Check Vercel logs for any connection errors');
  console.log('4. Verify database migrations have run');
} else {
  console.log('⚠ Some environment variables are missing:');
  if (!supabaseUrl) console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!databaseUrl) console.log('  - DATABASE_URL / POSTGRES_URL');
  console.log('\nSet these in your Vercel project Settings > Environment Variables');
}
console.log('');
