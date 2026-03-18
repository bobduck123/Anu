#!/usr/bin/env node
/**
 * Auth & Database Diagnostic Script
 * 
 * Run with: node scripts/diagnose-auth.mjs
 * 
 * This script checks:
 * 1. Environment variables are set correctly
 * 2. Supabase connection is working
 * 3. Auth tables exist
 * 4. Admin user exists
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           ANU Platform - Auth & Database Diagnostics         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Step 1: Check Environment Variables
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 1: Environment Variables Check                            │');
console.log('└─────────────────────────────────────────────────────────────────┘');

const envChecks = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_KEY },
  { name: 'DATABASE_URL / POSTGRES_URL', value: DATABASE_URL },
];

let envOk = true;
envChecks.forEach(({ name, value }) => {
  if (value && value.length > 10) {
    console.log(`  ✅ ${name}: Set (${value.substring(0, 20)}...)`);
  } else if (value) {
    console.log(`  ⚠️  ${name}: Set but seems short`);
    envOk = false;
  } else {
    console.log(`  ❌ ${name}: NOT SET`);
    envOk = false;
  }
});

if (!envOk) {
  console.log('\n⛔ Missing critical environment variables. Please set them in Vercel > Settings > Vars');
  process.exit(1);
}

// Step 2: Test Supabase Connection
console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 2: Supabase Connection Test                               │');
console.log('└─────────────────────────────────────────────────────────────────┘');

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

try {
  // Test basic connectivity
  const { data: healthCheck, error: healthError } = await supabaseAnon
    .from('_health_check_ping')
    .select('*')
    .limit(1);
  
  // This will likely fail with "relation does not exist" which is fine - it means we connected!
  if (healthError && !healthError.message.includes('does not exist')) {
    console.log(`  ⚠️  Connection test: ${healthError.message}`);
  } else {
    console.log('  ✅ Supabase client initialized successfully');
  }
} catch (err) {
  console.log(`  ❌ Connection failed: ${err.message}`);
}

// Step 3: Check Auth System
console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 3: Auth System Check                                      │');
console.log('└─────────────────────────────────────────────────────────────────┘');

try {
  const { data: session, error: sessionError } = await supabaseAnon.auth.getSession();
  if (sessionError) {
    console.log(`  ⚠️  Session check: ${sessionError.message}`);
  } else {
    console.log('  ✅ Auth system responding (no active session - expected)');
  }
} catch (err) {
  console.log(`  ❌ Auth check failed: ${err.message}`);
}

// Step 4: Check Admin User (requires service role key)
console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 4: Admin User Check                                       │');
console.log('└─────────────────────────────────────────────────────────────────┘');

if (!supabaseAdmin) {
  console.log('  ⚠️  SUPABASE_SERVICE_ROLE_KEY not set - cannot check admin user');
  console.log('      (This is fine for security, but means we cannot verify user exists)');
} else {
  try {
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log(`  ❌ Cannot list users: ${listError.message}`);
    } else {
      console.log(`  ✅ Found ${users.users.length} users in Supabase Auth`);
      
      // Check for admin user
      const adminUser = users.users.find(u => u.email === 'admin@anu.eco');
      if (adminUser) {
        console.log(`  ✅ Admin user (admin@anu.eco) exists`);
        console.log(`     - ID: ${adminUser.id}`);
        console.log(`     - Email confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`     - Created: ${adminUser.created_at}`);
        console.log(`     - Metadata: ${JSON.stringify(adminUser.user_metadata || {})}`);
      } else {
        console.log('  ⚠️  Admin user (admin@anu.eco) NOT FOUND');
        console.log('      You may need to create this user in Supabase Auth');
      }
    }
  } catch (err) {
    console.log(`  ❌ User check failed: ${err.message}`);
  }
}

// Step 5: Test Login (if admin exists)
console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 5: Login Test                                             │');
console.log('└─────────────────────────────────────────────────────────────────┘');

try {
  const testEmail = 'admin@anu.eco';
  const testPassword = 'AnuAdmin2024!';
  
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  
  if (loginError) {
    console.log(`  ❌ Login failed: ${loginError.message}`);
    
    if (loginError.message.includes('Invalid login credentials')) {
      console.log('\n  💡 Possible causes:');
      console.log('     1. Admin user does not exist in Supabase Auth');
      console.log('     2. Password is incorrect');
      console.log('     3. Email not confirmed (check Supabase dashboard)');
    }
  } else {
    console.log('  ✅ Login successful!');
    console.log(`     - User ID: ${loginData.user?.id}`);
    console.log(`     - Email: ${loginData.user?.email}`);
    console.log(`     - Session expires: ${loginData.session?.expires_at}`);
    
    // Sign out to clean up
    await supabaseAnon.auth.signOut();
  }
} catch (err) {
  console.log(`  ❌ Login test failed: ${err.message}`);
}

// Step 6: Database Tables Check
console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Step 6: Database Tables Check                                  │');
console.log('└─────────────────────────────────────────────────────────────────┘');

const tablesToCheck = ['profiles', 'nodes', 'users'];

for (const table of tablesToCheck) {
  try {
    const { data, error } = await supabaseAnon
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`  ⚠️  Table '${table}': Does not exist`);
      } else if (error.message.includes('permission denied') || error.code === 'PGRST301') {
        console.log(`  ✅ Table '${table}': Exists (RLS blocking - expected)`);
      } else {
        console.log(`  ⚠️  Table '${table}': ${error.message}`);
      }
    } else {
      console.log(`  ✅ Table '${table}': Accessible (${data?.length || 0} rows returned)`);
    }
  } catch (err) {
    console.log(`  ❌ Table '${table}': ${err.message}`);
  }
}

// Summary
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                       DIAGNOSIS COMPLETE                      ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Next Steps:');
console.log('   1. If admin user is missing, create it in Supabase Auth dashboard');
console.log('   2. Ensure email confirmation is disabled for testing, or confirm the email');
console.log('   3. If tables are missing, run database migrations');
console.log('   4. Check Vercel deployment logs for detailed errors\n');
