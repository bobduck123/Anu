import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import WebhooksController from '../controllers/webhooks.controller';

export const createWebhooksRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new WebhooksController(prisma);

  // POST /stripe/webhooks - webhook endpoint (raw body handled in app.ts)
  // The raw body middleware must be applied before this route is mounted
  router.post('/stripe/webhooks', (req: Request, res: Response, next: NextFunction) =>
    controller.handleWebhook(req, res, next)
  );

  return router;
};

export default createWebhooksRoutes;
