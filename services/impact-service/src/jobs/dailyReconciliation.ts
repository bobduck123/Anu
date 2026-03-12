import { PrismaClient } from '@prisma/client';
import StripeService from '../services/stripe.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Daily reconciliation job
 * - Find subscriptions with expired periods
 * - Verify status via Stripe API
 * - Check for negative pool balances
 */
export const runDailyReconciliation = async (): Promise<void> => {
  try {
    logger.info('Starting daily reconciliation');

    const now = new Date();

    // Find subscriptions with expired periods (but still marked as active)
    const staleSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: {
          lt: now
        }
      }
    });

    logger.info({ count: staleSubscriptions.length }, 'Found stale subscriptions');

    // Verify each via Stripe and update if needed
    for (const sub of staleSubscriptions) {
      try {
        const stripeSubscription = await StripeService.getSubscription(sub.stripeSubscriptionId);

        // Update status and period if different
        if (stripeSubscription.status !== sub.status) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: stripeSubscription.status as any,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
            }
          });

          logger.info(
            { subscriptionId: sub.id, oldStatus: sub.status, newStatus: stripeSubscription.status },
            'Subscription status updated'
          );
        }
      } catch (err) {
        logger.error({ error: err, subscriptionId: sub.id }, 'Failed to verify subscription');
      }
    }

    // Check for negative pool balances
    const pools = await prisma.impactPool.findMany({
      where: { isActive: true }
    });

    logger.info({ poolCount: pools.length }, 'Checking pool balances');

    for (const pool of pools) {
      const balance = await prisma.impactLedgerEntry.aggregate({
        where: { poolId: pool.id },
        _sum: { amountCents: true }
      });

      const currentBalance = balance._sum.amountCents || 0;

      if (currentBalance < 0) {
        logger.warn(
          { poolId: pool.id, balance: currentBalance },
          'Pool has negative balance - investigation needed'
        );
      }
    }

    logger.info('Daily reconciliation completed successfully');
  } catch (err) {
    logger.error({ error: err }, 'Daily reconciliation failed');
    throw err;
  } finally {
    await prisma.$disconnect();
  }
};

export default runDailyReconciliation;
