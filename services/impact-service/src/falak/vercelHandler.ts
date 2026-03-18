import { IncomingMessage, ServerResponse } from 'http';
import type { buildFalakApp } from './app';
import { buildFalakUnavailableResponse, writeJsonResponse } from './vercelUnavailable';
import { hasDatabase, requirePrismaClient, warmPrismaConnection } from '../lib/prisma';

type FalakVercelRuntime = Awaited<ReturnType<typeof buildFalakApp>>;

const globalForFalak = globalThis as typeof globalThis & {
  __falakVercelRuntimePromise?: Promise<FalakVercelRuntime>;
};

// Module-level database availability check (evaluated once on cold start)
const DATABASE_AVAILABLE = hasDatabase();

// Pre-warm Prisma connection on module load (non-blocking)
if (DATABASE_AVAILABLE) {
  warmPrismaConnection().catch(() => {
    // Ignore pre-warm failures
  });
}

async function createFalakVercelRuntime(): Promise<FalakVercelRuntime> {
  if (!DATABASE_AVAILABLE) {
    throw new Error('Falak Vercel runtime requires DATABASE_URL with PostgreSQL + PostGIS configured');
  }

  // Use shared Prisma client
  const prisma = requirePrismaClient();
  
  // Dynamic import for code splitting
  const { buildFalakApp } = await import('./app');

  const runtime = await buildFalakApp(prisma);
  await runtime.app.ready();

  console.info('[Falak Vercel] runtime ready', {
    routeGuardMode: process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled'
  });

  return runtime;
}

async function getFalakVercelRuntime(): Promise<FalakVercelRuntime> {
  if (!globalForFalak.__falakVercelRuntimePromise) {
    globalForFalak.__falakVercelRuntimePromise = createFalakVercelRuntime().catch((error) => {
      globalForFalak.__falakVercelRuntimePromise = undefined;
      throw error;
    });
  }

  return globalForFalak.__falakVercelRuntimePromise;
}

export default async function falakVercelHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!DATABASE_AVAILABLE) {
    writeJsonResponse(res, buildFalakUnavailableResponse(req.url, {
      code: 'FALAK_DATABASE_UNAVAILABLE',
      message: 'Falak requires DATABASE_URL with PostgreSQL + PostGIS configured',
      statusCode: 503,
      healthStatusCode: 200,
    }));
    return;
  }

  try {
    const { app } = await getFalakVercelRuntime();
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('[Falak Vercel] runtime failed to initialize', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    writeJsonResponse(res, buildFalakUnavailableResponse(req.url, {
      code: 'FALAK_STARTUP_FAILED',
      message: 'Falak could not start in the current Vercel environment',
      statusCode: 503,
    }));
  }
}
