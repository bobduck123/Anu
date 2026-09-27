import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../lib/prisma';

export interface WeeklyDigestSummary {
  period: { from: string; to: string };
  metrics: {
    newSubscriptions: number;
    activeSubscriptions: number;
    creditsGranted: number;
    poolContributionsDollars: string;
    activePools: number;
  };
}

/** Build an aggregate summary for the seven days ending at the scheduled slot. */
export async function collectWeeklyDigest(
  prisma: PrismaClient,
  periodEnd: Date
): Promise<WeeklyDigestSummary> {
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const window = { gte: periodStart, lt: periodEnd };
  const [newSubscriptions, creditResult, poolResult, activePools, activeSubscriptions] =
    await Promise.all([
      prisma.subscription.count({ where: { createdAt: window } }),
      prisma.impactCreditTransaction.aggregate({
        where: {
          createdAt: window,
          transactionType: { in: ['monthly_grant', 'streak_bonus'] }
        },
        _sum: { amountCredits: true }
      }),
      prisma.impactLedgerEntry.aggregate({
        where: { createdAt: window, entryType: 'subscription_credit' },
        _sum: { amountCents: true }
      }),
      prisma.impactPool.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: 'active' } })
    ]);

  return {
    period: { from: periodStart.toISOString(), to: periodEnd.toISOString() },
    metrics: {
      newSubscriptions,
      activeSubscriptions,
      creditsGranted: creditResult._sum.amountCredits ?? 0,
      poolContributionsDollars: ((poolResult._sum.amountCents ?? 0) / 100).toFixed(2),
      activePools
    }
  };
}

/** Legacy manual entry point; summary only, with no outbound delivery. */
export const runWeeklyDigest = async (): Promise<void> => {
  const { default: logger } = await import('../utils/logger');
  const prisma = createPrismaClient();
  try {
    logger.info('Starting weekly digest');
    logger.info(await collectWeeklyDigest(prisma, new Date()), 'Weekly digest summary');
  } catch (err) {
    logger.error({ error: err }, 'Weekly digest failed');
    throw err;
  } finally {
    await prisma.$disconnect();
  }
};

export default runWeeklyDigest;
