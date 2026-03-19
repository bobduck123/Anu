import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Migration Management Endpoint
 * 
 * Protected endpoint to manage database migrations.
 * 
 * Usage:
 *   POST /api/migrations
 *   Body: { action: 'deploy' | 'status', token: process.env.MIGRATION_TOKEN }
 * 
 * Environment Variables Required:
 *   - MIGRATION_TOKEN: Secret token for authorization
 *   - DATABASE_URL: PostgreSQL connection string
 */

interface MigrationRequest {
  action: 'deploy' | 'status';
  token: string;
}

interface MigrationResponse {
  success: boolean;
  action: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

async function runMigration(action: string): Promise<string> {
  try {
    const scriptPath = path.join(
      process.cwd(),
      'scripts',
      'falak-staging'
    );

    let command: string;

    switch (action) {
      case 'deploy':
        command = `node ${path.join(scriptPath, 'deploy.mjs')}`;
        break;
      case 'seed':
        command = `node ${path.join(scriptPath, 'seed.mjs')}`;
        break;
      case 'status':
        command = `node ${path.join(scriptPath, 'readiness.mjs')}`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[v0] Running migration: ${command}`);
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    console.log(`[v0] Migration output: ${output}`);
    return output;
  } catch (error) {
    console.error(`[v0] Migration error:`, error);
    throw error;
  }
}

export default async function handler(
  req: any,
  res: any,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, token } = req.body as MigrationRequest;

    // Verify authorization token
    const migrationToken = process.env.MIGRATION_TOKEN;
    if (!migrationToken || token !== migrationToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify required environment variables
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable not set',
      });
    }

    if (action === 'deploy') {
      return handleMigrationDeploy(res);
    } else if (action === 'status') {
      return handleMigrationStatus(res);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[migrations] Error:', errorMessage);
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
    });
  }
}

  try {
    const { action, token } = req.body as MigrationRequest;

    // Validate token
    const expectedToken = process.env.MIGRATION_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      console.warn('[v0] Unauthorized migration attempt');
      return res.status(401).json({
        success: false,
        action: action || 'unknown',
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
        error: 'Invalid or missing token',
      });
    }

    // Validate action
    if (!action || !['deploy', 'status', 'seed'].includes(action)) {
      return res.status(400).json({
        success: false,
        action: action || 'unknown',
        message: 'Invalid action',
        timestamp: new Date().toISOString(),
        error: 'Action must be one of: deploy, status, seed',
      });
    }

    console.log(`[v0] Processing migration action: ${action}`);

    const output = await runMigration(action);

    return res.status(200).json({
      success: true,
      action,
      message: `Migration ${action} completed successfully`,
      timestamp: new Date().toISOString(),
      details: {
        output: output.slice(0, 500), // First 500 chars
      },
    });
  } catch (error: any) {
    console.error('[v0] Migration endpoint error:', error);

    return res.status(500).json({
      success: false,
      action: req.body?.action || 'unknown',
      message: 'Migration failed',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error',
      details: {
        stderr: error?.stderr?.toString().slice(0, 200),
      },
    });
  }
}
