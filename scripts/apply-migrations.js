#!/usr/bin/env node

/**
 * Direct SQL Migration - Executes schema migrations using Supabase's native SQL interface
 * This uses the psql protocol endpoint to execute SQL directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing Supabase environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

// SQL migration files
const migrations = [
  path.join(__dirname, '001_core_schema.sql'),
  path.join(__dirname, '002_impact_schema.sql'),
  path.join(__dirname, '003_falak_schema.sql'),
];

async function executeViaSql(sqlContent) {
  /**
   * Execute SQL via Supabase's GraphQL or REST endpoint
   * We'll use the REST endpoint with raw SQL execution
   */
  try {
    // Build the proper Supabase SQL API endpoint
    const dbUrl = new URL(SUPABASE_URL);
    const host = dbUrl.hostname;
    const projectRef = host.split('.')[0];
    
    // Use Supabase's SQL Editor endpoint
    const sqlEndpoint = `https://${projectRef}.supabase.co/rest/v1/sql`;
    
    // Split into statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const response = await fetch(sqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          const errData = await response.text();
          errorCount++;
          continue;
        }
        
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    return { successCount, errorCount, total: statements.length };
  } catch (err) {
    console.error('Connection error:', err.message);
    throw err;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               ANU Platform - Database Migrations              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 Supabase Project: ${SUPABASE_URL.substring(0, 45)}...`);
  console.log(`📋 Applying ${migrations.length} migration files\n`);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const migrationPath of migrations) {
    const fileName = path.basename(migrationPath);
    console.log(`🔄 Running: ${fileName}`);

    if (!fs.existsSync(migrationPath)) {
      console.error(`   ❌ File not found: ${migrationPath}`);
      totalFailed++;
      continue;
    }

    try {
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      console.log(`   📄 File size: ${sqlContent.length} bytes`);

      const result = await executeViaSql(sqlContent);
      
      console.log(`   ✅ Processed: ${result.total} statements`);
      console.log(`      Success: ${result.successCount}, Errors: ${result.errorCount}\n`);
      totalSuccess++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      totalFailed++;
    }
  }

  console.log('═'.repeat(65));
  console.log(`\n📊 Migration Results:`);
  console.log(`   ✅ Completed: ${totalSuccess}/${migrations.length}`);
  
  if (totalFailed > 0) {
    console.log(`   ❌ Failed: ${totalFailed}\n`);
  } else {
    console.log('');
  }

  console.log('💡 Next steps:');
  console.log('   1. Check Supabase dashboard -> SQL Editor');
  console.log('   2. Verify tables: SELECT * FROM information_schema.tables');
  console.log('   3. Run: node scripts/diagnose-auth.js');
  console.log('   4. Test login at http://localhost:3000/auth\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
