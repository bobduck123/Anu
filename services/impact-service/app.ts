import { PrismaClient } from '@prisma/client';
import { buildServerApp } from './src/bootstrapApp';
import config from './src/config';

const globalForPrisma = globalThis as typeof globalThis & {
  __manaraImpactPrisma?: PrismaClient | null;
};

const prisma = globalForPrisma.__manaraImpactPrisma ?? (config.hasDatabase ? new PrismaClient() : null);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__manaraImpactPrisma = prisma;
}

const app = buildServerApp(prisma);

export default app;
