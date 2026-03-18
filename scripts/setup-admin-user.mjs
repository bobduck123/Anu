#!/usr/bin/env node
/**
 * Admin User Setup Script
 * 
 * Creates the admin user in Supabase Auth if it doesn't exist.
 * 
 * REQUIRES: SUPABASE_SERVICE_ROLE_KEY environment variable
 * 
 * Run with: node scripts/setup-admin-user.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'admin@anu.eco';
const ADMIN_PASSWORD = 'AnuAdmin2024!';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║             ANU Platform - Admin User Setup                   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL not set');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('   This script requires the service role key to create users');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupAdminUser() {
  console.log(`📧 Checking for admin user: ${ADMIN_EMAIL}\n`);

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`❌ Failed to list users: ${listError.message}`);
      process.exit(1);
    }

    const existingAdmin = existingUsers.users.find(u => u.email === ADMIN_EMAIL);

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Email confirmed: ${existingAdmin.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${existingAdmin.created_at}`);
      
      // Confirm email if not confirmed
      if (!existingAdmin.email_confirmed_at) {
        console.log('\n⚠️  Email not confirmed. Confirming now...');
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingAdmin.id,
          { email_confirm: true }
        );
        
        if (updateError) {
          console.error(`   ❌ Failed to confirm email: ${updateError.message}`);
        } else {
          console.log('   ✅ Email confirmed successfully!');
        }
      }

      // Update user metadata to ensure admin role
      const { error: metaError } = await supabase.auth.admin.updateUserById(
        existingAdmin.id,
        {
          user_metadata: {
            ...existingAdmin.user_metadata,
            role: 'admin',
            is_admin: true,
            username: 'admin',
          },
        }
      );

      if (metaError) {
        console.error(`   ⚠️  Failed to update metadata: ${metaError.message}`);
      } else {
        console.log('   ✅ Admin metadata updated');
      }

      return;
    }

    // Create new admin user
    console.log('📝 Creating new admin user...\n');

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        is_admin: true,
        username: 'admin',
        pseudonym: 'System Admin',
      },
    });

    if (createError) {
      console.error(`❌ Failed to create admin user: ${createError.message}`);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${newUser.user.id}`);
    console.log(`   Email: ${newUser.user.email}`);
    console.log(`   Email confirmed: Yes`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');

  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

// Test login after setup
async function testLogin() {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Testing Admin Login                                            │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  const testClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await testClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error) {
      console.error(`❌ Login test failed: ${error.message}`);
    } else {
      console.log('✅ Login test successful!');
      console.log(`   Session token obtained`);
      await testClient.auth.signOut();
    }
  } catch (err) {
    console.error(`❌ Login test error: ${err.message}`);
  }
}

async function main() {
  await setupAdminUser();
  await testLogin();
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        SETUP COMPLETE                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('You can now log in with:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('');
}

main();
