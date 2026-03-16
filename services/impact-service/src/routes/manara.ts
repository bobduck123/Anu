import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { ManaraFeedMode } from '../manaraFeed';
import createFloraFaunaRoutes from './floraFauna';
import { createFloraFaunaPlaceholderFeedRoutes } from './floraFaunaPlaceholder';

interface CreateManaraRoutesOptions {
  feedMode: ManaraFeedMode;
  liveRoutesFactory?: (prisma: PrismaClient) => Router;
  placeholderFeedRoutesFactory?: () => Router;
}

export const createManaraRoutes = (
  prisma: PrismaClient,
  options: CreateManaraRoutesOptions
): Router => {
  const router = Router();
  const liveRoutesFactory = options.liveRoutesFactory ?? createFloraFaunaRoutes;
  const placeholderFeedRoutesFactory =
    options.placeholderFeedRoutesFactory ?? createFloraFaunaPlaceholderFeedRoutes;

  if (options.feedMode === 'placeholder') {
    router.use(placeholderFeedRoutesFactory());
  }

  router.use(liveRoutesFactory(prisma));
  return router;
};

export default createManaraRoutes;
