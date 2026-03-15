import { IncomingMessage, ServerResponse } from 'http';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import logger from '../utils/logger';
import { buildFalakApp } from './app';
import { buildFalakUnavailableResponse, writeJsonResponse } from './vercelUnavailable';

type FalakVercelRuntime = Awaited<ReturnType<typeof buildFalakApp>>;

const globalForFalak = globalThis as typeof globalThis & {
  __falakVercelPrisma?: PrismaClient;
  __falakVercelRuntimePromise?: Promise<FalakVercelRuntime>;
};

async function createFalakVercelRuntime(): Promise<FalakVercelRuntime> {
  if (!config.hasDatabase) {
    throw new Error('Falak Vercel runtime requires DATABASE_URL with PostgreSQL + PostGIS configured');
  }

  const prisma = globalForFalak.__falakVercelPrisma ?? new PrismaClient();
  globalForFalak.__falakVercelPrisma = prisma;

  const runtime = await buildFalakApp(prisma);
  await runtime.app.ready();

  logger.info({
    category: 'falak.vercel',
    routeGuardMode: process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled'
  }, 'Falak Vercel runtime ready');

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
  if (!config.hasDatabase) {
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
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Falak Vercel runtime failed to initialize'
    );

    writeJsonResponse(res, buildFalakUnavailableResponse(req.url, {
      code: 'FALAK_STARTUP_FAILED',
      message: 'Falak could not start in the current Vercel environment',
      statusCode: 503,
    }));
  }
}
