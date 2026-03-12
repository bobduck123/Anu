import DomainEventService from './DomainEventService';
import { DbClient, DomainActor, toDomainActorFallback } from './types';
import { errors } from '../../utils/errors';

export class SubscriptionService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async ensureSubscription(subscriptionId: string, db: DbClient = this.prisma) {
    const subscription = await (db as any).subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw errors.notFound(`Subscription ${subscriptionId} not found`);
    }

    return subscription;
  }

  async getSubscriptionSummary(userId: string) {
    const subscription = await this.db.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        revenueEvents: {
          include: {
            attributionSplits: true,
          },
          orderBy: { recognizedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!subscription) {
      return null;
    }

    const totalNetRevenueCents = subscription.revenueEvents.reduce(
      (sum: number, event: any) => sum + event.netAmountCents,
      0,
    );

    return {
      id: subscription.id,
      userId: subscription.userId,
      username: subscription.username,
      status: subscription.status,
      plan: subscription.plan
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            amountCents: subscription.plan.amountCents,
            poolAllocationPct: Number(subscription.plan.poolAllocationPct),
          }
        : null,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      streakMonths: subscription.streakMonths,
      revenueEvents: subscription.revenueEvents,
      totalNetRevenueCents,
    };
  }

  async markRevenueAttributed(subscriptionId: string, actor: Partial<DomainActor>, db: DbClient = this.prisma) {
    const subscription = await this.ensureSubscription(subscriptionId, db);
    const normalizedActor = toDomainActorFallback(actor);

    await this.domainEvents.emit(
      {
        aggregateType: 'subscription',
        aggregateId: subscriptionId,
        eventType: 'subscription.revenue_attributed',
        payload: {
          userId: subscription.userId,
          planId: subscription.planId,
          streakMonths: subscription.streakMonths,
        },
        actor: normalizedActor,
      },
      db,
    );

    return subscription;
  }
}

export default SubscriptionService;
