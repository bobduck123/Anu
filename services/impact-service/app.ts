import { buildServerApp } from './src/bootstrapApp';
import { getPrismaClient } from './src/lib/prisma';

// Use shared Prisma client with connection pooling
const prisma = getPrismaClient();

const app = buildServerApp(prisma);

export default app;
