#!/usr/bin/env node
/**
 * Complete Falak Staging Deployment Script
 * 
 * This script orchestrates the full deployment process:
 * 1. Generates Prisma client
 * 2. Deploys migrations
 * 3. Seeds database
 * 4. Verifies readiness
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'blue');
  log(title, 'bright');
  log('='.repeat(60), 'blue');
}

async function runScript(scriptName, description) {
  return new Promise((resolve, reject) => {
    log(`\n▶ Running: ${description}`, 'yellow');
    
    const child = spawn('node', [scriptName], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✓ ${description} completed`, 'green');
        resolve();
      } else {
        log(`✗ ${description} failed with exit code ${code}`, 'red');
        reject(new Error(`${description} failed`));
      }
    });

    child.on('error', (err) => {
      log(`✗ Error running ${description}: ${err.message}`, 'red');
      reject(err);
    });
  });
}

async function main() {
  logSection('🚀 Falak Staging Deployment');
  
  try {
    log('This will deploy the impact service to staging.', 'bright');
    log('Steps:', 'bright');
    log('  1. Generate Prisma client');
    log('  2. Deploy migrations');
    log('  3. Seed database');
    log('  4. Verify readiness\n');

    await runScript('prisma-generate.mjs', 'Prisma generation');
    await runScript('migrate-deploy.mjs', 'Migration deployment');
    await runScript('seed.mjs', 'Database seeding');
    await runScript('readiness.mjs', 'Readiness verification');

    logSection('✨ Deployment Complete');
    log('Your staging environment is ready!', 'green');
    log('\nNext steps:', 'bright');
    log('  • Check the readiness endpoint: /v1/falak/readiness');
    log('  • Run smoke tests: npm run falak:smoke:staging');
    log('  • Monitor logs for any issues');
    
    process.exit(0);
  } catch (error) {
    logSection('❌ Deployment Failed');
    log(`Error: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Check DATABASE_URL environment variable');
    log('  2. Verify database is accessible');
    log('  3. Review migration files for errors');
    log('  4. Check logs for detailed error information');
    
    process.exit(1);
  }
}

main();
