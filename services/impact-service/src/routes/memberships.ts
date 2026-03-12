import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import MembershipsController from '../controllers/memberships.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const createMembershipsRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new MembershipsController(prisma);

  // GET /plans - public, no auth required
  router.get('/plans', (req: Request, res: Response, next: NextFunction) =>
    controller.getPlans(req, res, next)
  );

  // GET /status - requires auth
  router.get('/status', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.getStatus(req, res, next)
  );

  // POST /subscribe - requires auth
  router.post('/subscribe', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.subscribe(req, res, next)
  );

  // POST /portal - requires auth
  router.post('/portal', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.createPortalSession(req, res, next)
  );

  // DELETE /cancel - requires auth
  router.delete('/cancel', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.cancelSubscription(req, res, next)
  );

  return router;
};

export default createMembershipsRoutes;
