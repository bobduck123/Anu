import { PrismaClient } from '@prisma/client';
import { buildServerApp } from './src/bootstrapApp';

const globalForPrisma = globalThis as typeof globalThis & {
  __manaraImpactPrisma?: PrismaClient;
};

const prisma = globalForPrisma.__manaraImpactPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__manaraImpactPrisma = prisma;
}

const app = buildServerApp(prisma);

export default app;
