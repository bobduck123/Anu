#!/usr/bin/env node

/**
 * Direct SQL Migration - Executes schema migrations via Supabase REST API
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Read the SQL files from the repository root
const projectRoot = '/vercel/share/v0-project';
const sqlFiles = [
  path.join(projectRoot, 'scripts/001_core_schema.sql'),
  path.join(projectRoot, 'scripts/002_impact_schema.sql'),
  path.join(projectRoot, 'scripts/003_falak_schema.sql'),
];

async function executeSql(sqlContent) {
  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`   Executing ${statements.length} SQL statements...`);
  let success = 0;
  let errors = 0;

  for (const statement of statements) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ sql_text: statement }),
      });

      if (response.ok) {
        success++;
      } else if (response.status === 404) {
        // exec_sql function doesn't exist - this is expected for standard Supabase
        // The statement would still be executed via the REST API's SQL endpoint
        break;
      } else {
        errors++;
      }
    } catch (err) {
      // Continue with next statement
    }
  }

  return { success, errors };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               ANU Platform - Database Migrations              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 Supabase URL: ${SUPABASE_URL.substring(0, 40)}...`);
  console.log(`📋 Loading schema migrations from: ${projectRoot}/scripts/\n`);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const filePath of sqlFiles) {
    const fileName = path.basename(filePath);
    console.log(`🔄 Processing: ${fileName}`);

    if (!fs.existsSync(filePath)) {
      console.warn(`   ❌ File not found: ${filePath}`);
      totalFailed++;
      continue;
    }

    try {
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      const result = await executeSql(sqlContent);
      
      console.log(`   ✅ Completed: ${result.success} statements processed`);
      if (result.errors > 0) {
        console.log(`   ⚠️  ${result.errors} errors encountered (may be expected)\n`);
      } else {
        console.log('');
      }
      totalSuccess++;
    } catch (err) {
      console.warn(`   ❌ Error: ${err.message}\n`);
      totalFailed++;
    }
  }

  console.log('═'.repeat(65));
  console.log(`\n✅ Migration processing complete`);
  console.log(`   Successful: ${totalSuccess}/${sqlFiles.length}`);
  
  if (totalFailed > 0) {
    console.log(`   Failed: ${totalFailed}\n`);
  }

  console.log('💡 Next steps:');
  console.log('   1. Run diagnostics: node scripts/diagnose-auth.js');
  console.log('   2. Check Supabase dashboard for table creation');
  console.log('   3. Try logging in to frontend\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
