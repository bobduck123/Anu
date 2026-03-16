import { Router } from 'express';
import config from '../config';
import { ManaraFeedMode, resolveManaraFeedState } from '../manaraFeed';

export const createRoutes = (options?: { hasPrisma?: boolean; manaraFeedMode?: ManaraFeedMode }) => {
  const router = Router();
  const manaraFeed = resolveManaraFeedState({
    configuredMode: options?.manaraFeedMode ?? config.manaraFeedMode,
    hasPrisma: Boolean(options?.hasPrisma)
  });

  // Health check (also available at app level)
  router.get('/health', (req, res) => {
    res.json({
      status: config.hasDatabase && config.hasStripe ? 'ok' : 'degraded',
      service: 'impact-service',
      betaPlaceholderInfra: config.allowPlaceholderInfra,
      dependencies: {
        database: config.hasDatabase ? 'configured' : 'todo',
        stripe: config.hasStripe ? 'configured' : 'todo',
      },
      manaraFeed,
    });
  });

  return router;
};

export default createRoutes;
