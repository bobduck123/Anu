#!/usr/bin/env node

/**
 * This script resolves the Falak Protocol migration issue by:
 * 1. Resetting the Prisma client state
 * 2. Running the Prisma migration resolver
 * 3. Ensuring all schema tables are initialized
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceDir = path.join(__dirname, '../../services/impact-service');

console.log('[Impact Service Migration] Starting migration process...');
console.log('[Impact Service Migration] Service directory:', serviceDir);

try {
  // Step 1: Deploy pending migrations
  console.log('\n[Impact Service Migration] Deploying pending Prisma migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: serviceDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[Impact Service Migration] ✓ Migrations deployed successfully');

  // Step 2: Generate Prisma client to ensure schema sync
  console.log('\n[Impact Service Migration] Generating Prisma client...');
  execSync('npx prisma generate', {
    cwd: serviceDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[Impact Service Migration] ✓ Prisma client generated');

  console.log('\n[Impact Service Migration] ✓ All migrations completed successfully!');
  console.log('[Impact Service Migration] The impact-service should now report "migrations": "ok"');
  process.exit(0);
} catch (error) {
  console.error('\n[Impact Service Migration] ✗ Migration failed:', error.message);
  console.error('\nTo resolve this manually, run:');
  console.error(`  cd ${serviceDir}`);
  console.error('  npx prisma migrate deploy');
  console.error('\nIf migrations don\'t exist, create them with:');
  console.error('  npx prisma migrate dev --name init');
  process.exit(1);
}
