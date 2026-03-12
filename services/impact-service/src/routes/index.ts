import { Router } from 'express';

export const createRoutes = () => {
  const router = Router();

  // Health check (also available at app level)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'impact-service' });
  });

  return router;
};

export default createRoutes;
