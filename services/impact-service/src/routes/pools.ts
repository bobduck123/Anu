import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import PoolsController from '../controllers/pools.controller';
import { optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const createPoolsRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new PoolsController(prisma);

  // GET / - public, optional auth
  router.get('/', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.listPools(req, res, next)
  );

  // GET /:id - public, optional auth
  router.get('/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getPool(req, res, next)
  );

  // GET /:id/ledger - public, optional auth
  router.get('/:id/ledger', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getPoolLedger(req, res, next)
  );

  // POST / - organizer only
  router.post('/', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.createPool(req, res, next)
  );

  // POST /:id/credit - organizer only
  router.post('/:id/credit', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.creditPool(req, res, next)
  );

  return router;
};

export default createPoolsRoutes;
