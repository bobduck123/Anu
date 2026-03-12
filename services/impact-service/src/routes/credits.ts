import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import CreditsController from '../controllers/credits.controller';
import { authMiddleware } from '../middleware/auth';

export const createCreditsRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new CreditsController(prisma);

  // GET /balance - requires auth
  router.get('/balance', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.getBalance(req, res, next)
  );

  // GET /history - requires auth
  router.get('/history', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.getHistory(req, res, next)
  );

  return router;
};

export default createCreditsRoutes;
