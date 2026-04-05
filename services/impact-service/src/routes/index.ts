import { Router } from 'express';
import config from '../config';
import { ManaraFeedMode, resolveManaraFeedState } from '../manaraFeed';

const RUNTIME_CONTRACT_VERSION = 'm0.2026-04-01';

export const createRoutes = (options?: { hasPrisma?: boolean; manaraFeedMode?: ManaraFeedMode }) => {
  const router = Router();
  const manaraFeed = resolveManaraFeedState({
    configuredMode: options?.manaraFeedMode ?? config.manaraFeedMode,
    hasPrisma: Boolean(options?.hasPrisma)
  });

  // Health check (also available at app level)
  router.get('/health', (req, res) => {
    const stripeReady = config.hasStripe || !config.requireStripeInfra;
    const fullyConfigured = config.hasDatabase && stripeReady;
    res.json({
      status: fullyConfigured ? 'ok' : 'degraded',
      service: 'impact-service',
      component: 'impact',
      contract_version: RUNTIME_CONTRACT_VERSION,
      timestamp: new Date().toISOString(),
      ready: fullyConfigured,
      betaPlaceholderInfra: config.allowPlaceholderInfra,
      dependencies: {
        database: config.hasDatabase ? 'ok' : 'placeholder',
        redis: config.hasRedis ? 'ok' : 'placeholder',
        stripe: config.hasStripe ? 'ok' : 'placeholder',
        postgis: 'skipped',
      },
      manaraFeed,
    });
  });

  return router;
};

export default createRoutes;
