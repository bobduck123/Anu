import { NextFunction, Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import FloraFaunaController from '../controllers/floraFauna.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const createFloraFaunaRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new FloraFaunaController(prisma);

  router.get('/feed', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getFeed(req, res, next),
  );
  router.get('/channels', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.listChannels(req, res, next),
  );
  router.get('/channels/:channelId', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getChannel(req, res, next),
  );
  router.get('/channels/:channelId/ecology', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getChannelEcology(req, res, next),
  );
  router.get('/memes/:memeId', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getMeme(req, res, next),
  );
  router.get('/pools', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.listPools(req, res, next),
  );
  router.get('/pools/:poolId', optionalAuth, (req: Request, res: Response, next: NextFunction) =>
    controller.getPool(req, res, next),
  );
  router.get('/revenue-events', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.listRevenueEvents(req, res, next),
  );
  router.get('/allocations', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.listAllocationRequests(req, res, next),
  );
  router.get('/moderation/cases', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.listModerationCases(req, res, next),
  );

  router.post('/channels', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.createChannel(req, res, next),
  );
  router.post('/channels/:channelId/nutrients', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.recordChannelNutrients(req, res, next),
  );
  router.post('/memes', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.createMeme(req, res, next),
  );

  router.post('/pools', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.createPool(req, res, next),
  );
  router.post('/pools/:poolId/allocations', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.createAllocationRequest(req, res, next),
  );
  router.post('/allocations/:requestId/approve', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.approveAllocation(req, res, next),
  );
  router.post('/allocations/:requestId/disburse', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.disburseAllocation(req, res, next),
  );

  router.post('/revenue-events', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.recordRevenueEvent(req, res, next),
  );
  router.get('/subscriptions/:userId', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.getSubscriptionSummary(req, res, next),
  );

  router.post('/moderation/flags', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
    controller.flagRisk(req, res, next),
  );
  router.post('/moderation/cases/:caseId/actions', requireRole('organizer'), (req: Request, res: Response, next: NextFunction) =>
    controller.recordModerationAction(req, res, next),
  );

  return router;
};

export default createFloraFaunaRoutes;
