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
import { NextFunction, Request, Response, Router } from 'express';
import config from './config';

const createDependencyUnavailableRouter = (serviceName: string): Router => {
  const router = Router();

  router.all('*', (req: Request, res: Response, next: NextFunction) => {
    res.status(503).json({
      ok: false,
      error: {
        code: 'BetaDependencyMissing',
        message: `${serviceName} is running in beta-limited mode until database and billing configuration are completed.`,
      },
      dependencies: {
        database: config.hasDatabase ? 'configured' : 'todo',
        stripe: config.hasStripe ? 'configured' : 'todo',
      },
    });
  });

  return router;
};

export const buildServerApp = (prisma: PrismaClient | null): Express => {
  const app = createApp(prisma);
  const routes = createRoutes();

  app.use('/api', routes);

  if (prisma) {
    app.use('/api/memberships', createMembershipsRoutes(prisma));
    app.use('/api', createWebhooksRoutes(prisma));
    app.use('/api/pools', createPoolsRoutes(prisma));
    app.use('/api/credits', createCreditsRoutes(prisma));
    app.use('/api/flora-fauna', createFloraFaunaRoutes(prisma));
    app.use('/api/manara', createFloraFaunaRoutes(prisma));
  } else {
    const dependencyUnavailable = createDependencyUnavailableRouter('Impact service');
    app.use('/api/memberships', dependencyUnavailable);
    app.use('/api/pools', dependencyUnavailable);
    app.use('/api/credits', dependencyUnavailable);
    app.use('/api/stripe', dependencyUnavailable);
    app.use('/api/flora-fauna', dependencyUnavailable);
    app.use('/api/manara', dependencyUnavailable);
  }

  app.use(errorHandler);

  return app;
};

export default buildServerApp;
