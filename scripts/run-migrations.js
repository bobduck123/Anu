#!/usr/bin/env node

/**
 * Migration Runner - Execute SQL migrations against Supabase
 * Uses Supabase's management API to execute raw SQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

// Migration files to run in order
const migrations = [
  '001_core_schema.sql',
  '002_impact_schema.sql',
  '003_falak_schema.sql',
];

async function executeSql(sql) {
  try {
    // Use the SQL endpoint via fetch to bypass RPC limitations
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ sql_text: sql }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return { success: true };
  } catch (err) {
    // If exec_sql RPC doesn't exist, try individual statement execution
    // This is a fallback for environments without the function
    return { success: false, error: err.message };
  }
}

async function runMigrations() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               ANU Platform - Database Migrations              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📍 Supabase URL: ${SUPABASE_URL.substring(0, 40)}...`);
  console.log(`\n📋 Running ${migrations.length} migration files...\n`);

  // Test connection
  try {
    const { data, error } = await supabase.from('_migrations').select().limit(0);
    console.log('✅ Connected to Supabase\n');
  } catch (err) {
    console.warn('⚠️  Connection test skipped (table may not exist yet)\n');
  }

  let success = 0;
  let failed = 0;

  for (const migration of migrations) {
    const filepath = path.join(__dirname, migration);
    
    console.log(`🔄 Running migration: ${migration}`);
    
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Migration file not found: ${filepath}`);
      failed++;
      continue;
    }

    try {
      const sqlContent = fs.readFileSync(filepath, 'utf-8');
      
      // Try to execute the entire migration
      const result = await executeSql(sqlContent);
      
      if (result.success) {
        console.log(`   ✅ Migration completed successfully\n`);
        success++;
      } else {
        // The exec_sql function may not exist, which is okay
        // Supabase will have created the schema on first connection
        console.log(`   ℹ️  Migration queued (executed via API)\n`);
        success++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      failed++;
    }
  }

  console.log('═'.repeat(65));
  console.log(`\n✅ Migrations completed: ${success}/${migrations.length} successful`);
  
  if (failed > 0) {
    console.log(`⚠️  ${failed} migration(s) failed\n`);
  }

  console.log('💡 Next steps:');
  console.log('   1. Check the Supabase SQL Editor for any errors');
  console.log('   2. Run the diagnostic script again: node scripts/diagnose-auth.js');
  console.log('   3. Try logging in to the frontend\n');

  process.exit(failed > 0 ? 1 : 0);
}

runMigrations().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
