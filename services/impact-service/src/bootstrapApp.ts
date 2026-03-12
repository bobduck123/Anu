import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { createRoutes } from './routes';
import createMembershipsRoutes from './routes/memberships';
import createWebhooksRoutes from './routes/webhooks';
import createPoolsRoutes from './routes/pools';
import createCreditsRoutes from './routes/credits';
import createFloraFaunaRoutes from './routes/floraFauna';
import { errorHandler } from './utils/errors';

export const buildServerApp = (prisma: PrismaClient): Express => {
  const app = createApp(prisma);
  const routes = createRoutes();

  app.use('/api', routes);
  app.use('/api/memberships', createMembershipsRoutes(prisma));
  app.use('/api', createWebhooksRoutes(prisma));
  app.use('/api/pools', createPoolsRoutes(prisma));
  app.use('/api/credits', createCreditsRoutes(prisma));
  app.use('/api/flora-fauna', createFloraFaunaRoutes(prisma));
  app.use('/api/manara', createFloraFaunaRoutes(prisma));
  app.use(errorHandler);

  return app;
};

export default buildServerApp;
