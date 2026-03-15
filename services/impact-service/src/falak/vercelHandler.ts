import { IncomingMessage, ServerResponse } from 'http';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import logger from '../utils/logger';
import { buildFalakApp } from './app';

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
  const { app } = await getFalakVercelRuntime();
  app.server.emit('request', req, res);
}
