import { Router } from 'express';
import config from '../config';

export const createRoutes = () => {
  const router = Router();

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
    });
  });

  return router;
};

export default createRoutes;
