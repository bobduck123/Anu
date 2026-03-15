import { IncomingMessage, ServerResponse } from 'http';
import type { PrismaClient } from '@prisma/client';
import type { buildFalakApp } from './app';
import { buildFalakUnavailableResponse, writeJsonResponse } from './vercelUnavailable';

type FalakVercelRuntime = Awaited<ReturnType<typeof buildFalakApp>>;

const globalForFalak = globalThis as typeof globalThis & {
  __falakVercelPrisma?: PrismaClient;
  __falakVercelRuntimePromise?: Promise<FalakVercelRuntime>;
};

function isPlaceholder(value: string | undefined): boolean {
  const raw = (value || '').trim();
  if (!raw) {
    return true;
  }

  const normalized = raw.toLowerCase();
  return (
    normalized.startsWith('todo') ||
    normalized.includes('replace_me') ||
    normalized.includes('required_') ||
    raw.includes('<')
  );
}

function hasDatabase(): boolean {
  return !isPlaceholder(process.env.DATABASE_URL);
}

async function createFalakVercelRuntime(): Promise<FalakVercelRuntime> {
  if (!hasDatabase()) {
    throw new Error('Falak Vercel runtime requires DATABASE_URL with PostgreSQL + PostGIS configured');
  }

  const [{ PrismaClient }, { buildFalakApp }] = await Promise.all([
    import('@prisma/client'),
    import('./app')
  ]);

  const prisma = globalForFalak.__falakVercelPrisma ?? new PrismaClient();
  globalForFalak.__falakVercelPrisma = prisma;

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
  if (!hasDatabase()) {
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
