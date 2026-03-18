#!/usr/bin/env node
/**
 * Complete Falak Sandbox Deployment Script
 * 
 * This script orchestrates the full local deployment process:
 * 1. Starts local database (Docker)
 * 2. Generates Prisma client
 * 3. Deploys migrations
 * 4. Seeds database
 * 5. Verifies setup
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
  logSection('🚀 Falak Sandbox Deployment');
  
  try {
    log('This will set up the local development environment.', 'bright');
    log('Steps:', 'bright');
    log('  1. Start local database (Docker)');
    log('  2. Wait for database to be ready');
    log('  3. Generate Prisma client');
    log('  4. Deploy migrations');
    log('  5. Seed database');
    log('  6. Verify setup\n');

    log('Starting local database...', 'yellow');
    await runScript('docker-compose.mjs', 'Docker database startup');
    
    // Wait a bit for database to be ready
    log('\n⏳ Waiting for database to initialize...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await runScript('prisma-generate.mjs', 'Prisma generation');
    await runScript('migrate.mjs', 'Migration deployment');
    await runScript('seed.mjs', 'Database seeding');
    await runScript('integration-tests.mjs', 'Integration tests');

    logSection('✨ Local Development Environment Ready');
    log('Your sandbox is fully set up!', 'green');
    log('\nNext steps:', 'bright');
    log('  • Start dev server: npm run dev');
    log('  • Database logs: npm run falak:sandbox:db:logs');
    log('  • View database: npm run falak:sandbox:db:ps');
    log('  • Reset database: npm run falak:sandbox:reset');
    
    process.exit(0);
  } catch (error) {
    logSection('❌ Deployment Failed');
    log(`Error: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Ensure Docker is running: docker ps');
    log('  2. Check Docker logs: npm run falak:sandbox:db:logs');
    log('  3. Verify port 5432 is available');
    log('  4. Review error messages above');
    
    process.exit(1);
  }
}

main();
