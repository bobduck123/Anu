/**
 * Shared Prisma client with connection pooling optimized for serverless.
 * 
 * This module provides a singleton Prisma client that:
 * - Uses global caching to prevent connection leaks in serverless
 * - Pre-warms connections on module load
 * - Configures logging appropriately for each environment
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  __sharedPrismaClient?: PrismaClient;
  __prismaConnectionWarmed?: boolean;
};

/**
 * Check if a DATABASE_URL is a placeholder/unconfigured value
 */
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

/**
 * Check if database is configured
 */
export function hasDatabase(): boolean {
  return !isPlaceholder(process.env.DATABASE_URL);
}

/**
 * Create a new Prisma client with serverless-optimized settings
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // Connection pool settings are configured via DATABASE_URL query params
    // e.g., ?pgbouncer=true&connection_limit=1
  });
}

/**
 * Get the shared Prisma client instance.
 * Returns null if DATABASE_URL is not configured.
 */
export function getPrismaClient(): PrismaClient | null {
  if (!hasDatabase()) {
    return null;
  }

  if (!globalForPrisma.__sharedPrismaClient) {
    globalForPrisma.__sharedPrismaClient = createPrismaClient();
  }

  return globalForPrisma.__sharedPrismaClient;
}

/**
 * Get the shared Prisma client, throwing if not available.
 */
export function requirePrismaClient(): PrismaClient {
  const client = getPrismaClient();
  if (!client) {
    throw new Error('Database is not configured. Set DATABASE_URL environment variable.');
  }
  return client;
}

/**
 * Pre-warm the database connection.
 * Call this at module load time to reduce cold start latency.
 */
export async function warmPrismaConnection(): Promise<void> {
  if (globalForPrisma.__prismaConnectionWarmed) {
    return;
  }

  const client = getPrismaClient();
  if (!client) {
    return;
  }

  try {
    // Simple query to establish connection
    await client.$queryRaw`SELECT 1`;
    globalForPrisma.__prismaConnectionWarmed = true;
  } catch (error) {
    // Log but don't throw - connection will be established on first real query
    console.warn('[Prisma] Failed to pre-warm connection:', error);
  }
}

/**
 * Disconnect the Prisma client.
 * Call this during graceful shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  const client = globalForPrisma.__sharedPrismaClient;
  if (client) {
    await client.$disconnect();
    globalForPrisma.__sharedPrismaClient = undefined;
    globalForPrisma.__prismaConnectionWarmed = false;
  }
}

// Pre-warm connection on module load (non-blocking)
if (hasDatabase()) {
  warmPrismaConnection().catch(() => {
    // Ignore pre-warm failures - connection will be established on first query
  });
}

// Default export for convenience
export const prisma = getPrismaClient();
