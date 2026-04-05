/**
 * Shared Prisma client with connection pooling optimized for serverless.
 *
 * Prisma ORM v7 requires a driver adapter at runtime, so this module centralizes
 * adapter creation and keeps a singleton client to avoid connection churn.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  __sharedPrismaClient?: PrismaClient;
  __prismaConnectionWarmed?: boolean;
};

function isPlaceholder(value: string | undefined): boolean {
  const raw = (value || '').trim();
  if (!raw) return true;

  const normalized = raw.toLowerCase();
  return (
    normalized.startsWith('todo') ||
    normalized.includes('replace_me') ||
    normalized.includes('required_') ||
    raw.includes('<')
  );
}

function firstPresent(envVarNames: readonly string[]): string | null {
  for (const envVarName of envVarNames) {
    const value = (process.env[envVarName] ?? '').trim();
    if (!isPlaceholder(value)) {
      return value;
    }
  }
  return null;
}

function resolveDatabaseConnectionString(): string | null {
  return firstPresent([
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL',
    'DIRECT_URL',
    'POSTGRES_URL_NON_POOLING',
  ]);
}

export function hasDatabase(): boolean {
  return resolveDatabaseConnectionString() !== null;
}

function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

export function createPrismaClient(): PrismaClient {
  const connectionString = resolveDatabaseConnectionString();
  if (!connectionString) {
    throw new Error('Database is not configured. Set DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL (or DIRECT_URL / POSTGRES_URL_NON_POOLING).');
  }

  return new PrismaClient({
    adapter: createPrismaAdapter(connectionString),
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

export function getPrismaClient(): PrismaClient | null {
  if (!hasDatabase()) {
    return null;
  }

  if (!globalForPrisma.__sharedPrismaClient) {
    globalForPrisma.__sharedPrismaClient = createPrismaClient();
  }

  return globalForPrisma.__sharedPrismaClient;
}

export function requirePrismaClient(): PrismaClient {
  const client = getPrismaClient();
  if (!client) {
    throw new Error('Database is not configured. Set DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL (or DIRECT_URL / POSTGRES_URL_NON_POOLING).');
  }
  return client;
}

export async function warmPrismaConnection(): Promise<void> {
  if (globalForPrisma.__prismaConnectionWarmed) {
    return;
  }

  const client = getPrismaClient();
  if (!client) {
    return;
  }

  try {
    await client.$queryRaw`SELECT 1`;
    globalForPrisma.__prismaConnectionWarmed = true;
  } catch (error) {
    console.warn('[Prisma] Failed to pre-warm connection:', error);
  }
}

export async function disconnectPrisma(): Promise<void> {
  const client = globalForPrisma.__sharedPrismaClient;
  if (client) {
    await client.$disconnect();
    globalForPrisma.__sharedPrismaClient = undefined;
    globalForPrisma.__prismaConnectionWarmed = false;
  }
}

if (hasDatabase()) {
  warmPrismaConnection().catch(() => {
    // Ignore pre-warm failures - connection will be established on first query
  });
}

export const prisma = getPrismaClient();
