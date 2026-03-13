import config from './config';
import logger from './utils/logger';
import { buildServerApp } from './bootstrapApp';
import { initializeJobs } from './jobs/scheduler';
import { PrismaClient } from '@prisma/client';

const prisma = config.hasDatabase ? new PrismaClient() : null;
const app = buildServerApp(prisma);

// Initialize scheduled jobs
if (!process.env.VERCEL && process.env.DISABLE_SCHEDULED_JOBS !== 'true' && prisma) {
  initializeJobs();
}

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, 'Impact service listening');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
