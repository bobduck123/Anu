import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Weekly digest job (runs Monday 08:00 UTC)
 * - Aggregate new subscriptions
 * - Aggregate credits granted
 * - Aggregate pool contributions
 * - Log summary (Phase 2: send emails)
 */
export const runWeeklyDigest = async (): Promise<void> => {
  try {
    logger.info('Starting weekly digest');

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Count new subscriptions
    const newSubscriptions = await prisma.subscription.count({
      where: {
        createdAt: {
          gte: lastWeek,
          lt: now
        }
      }
    });

    // Sum credits granted (monthly_grant + streak_bonus)
    const creditResult = await prisma.impactCreditTransaction.aggregate({
      where: {
        createdAt: {
          gte: lastWeek,
          lt: now
        },
        transactionType: {
          in: ['monthly_grant', 'streak_bonus']
        }
      },
      _sum: { amountCredits: true }
    });

    const creditsGranted = creditResult._sum.amountCredits || 0;

    // Sum pool contributions (subscription_credit entries)
    const poolResult = await prisma.impactLedgerEntry.aggregate({
      where: {
        createdAt: {
          gte: lastWeek,
          lt: now
        },
        entryType: 'subscription_credit'
      },
      _sum: { amountCents: true }
    });

    const poolContributionsCents = poolResult._sum.amountCents || 0;

    // Count active pools
    const activePools = await prisma.impactPool.count({
      where: { isActive: true }
    });

    // Count active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' }
    });

    const digest = {
      period: {
        from: lastWeek.toISOString(),
        to: now.toISOString()
      },
      metrics: {
        newSubscriptions,
        activeSubscriptions,
        creditsGranted,
        poolContributionsDollars: (poolContributionsCents / 100).toFixed(2),
        activePools
      }
    };

    logger.info(digest, 'Weekly digest summary');

    // Phase 2: Send email digest to admins/organizers
    // Implementation would go here

  } catch (err) {
    logger.error({ error: err }, 'Weekly digest failed');
    throw err;
  } finally {
    await prisma.$disconnect();
  }
};

export default runWeeklyDigest;
