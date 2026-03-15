import { PrismaClient } from '@prisma/client';
import config from './config';
import logger from './utils/logger';
import { buildFalakApp } from './falak/app';

async function main(): Promise<void> {
  if (!config.hasDatabase) {
    throw new Error('Falak runtime requires DATABASE_URL with PostgreSQL + PostGIS configured');
  }

  const prisma = new PrismaClient();
  const { app, fanoutPublisher } = await buildFalakApp(prisma);

  const close = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down Falak service');
    await app.close();
    await fanoutPublisher.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void close('SIGINT');
  });

  process.on('SIGTERM', () => {
    void close('SIGTERM');
  });

  try {
    await app.listen({
      host: '0.0.0.0',
      port: config.PORT
    });
    logger.info({ port: config.PORT }, 'Falak service listening');
  } catch (error) {
    await fanoutPublisher.close();
    await prisma.$disconnect();
    throw error;
  }
}

main().catch((error) => {
  logger.error(
    {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    },
    'Failed to start Falak service'
  );
  process.exit(1);
});
