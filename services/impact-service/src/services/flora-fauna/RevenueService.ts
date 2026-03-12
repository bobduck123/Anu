import { AttributionRecipientType, RevenueSourceType } from '@prisma/client';
import DomainEventService from './DomainEventService';
import PoolLedgerService from './PoolLedgerService';
import SubscriptionService from './SubscriptionService';
import {
  REVENUE_SOURCE_TYPES,
  DbClient,
  DomainActor,
  RecordRevenueEventInput,
  RevenueSplitInput,
  assertEnumValue,
  normalizeCurrency,
  normalizeOptionalText,
  normalizeRequiredText,
  assertPositiveCents,
  roundMetric,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class RevenueService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
    private subscriptionService: SubscriptionService,
    private poolLedgerService: PoolLedgerService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async listRevenueEvents(limit: number = 50, filters?: {
    subscriptionId?: string;
    channelId?: string;
    memeId?: string;
  }) {
    return this.db.revenueEvent.findMany({
      where: {
        subscriptionId: filters?.subscriptionId,
        channelId: filters?.channelId,
        memeId: filters?.memeId,
      },
      include: {
        attributionSplits: true,
        channel: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        meme: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        subscription: {
          select: {
            id: true,
            userId: true,
            username: true,
          },
        },
      },
      orderBy: { recognizedAt: 'desc' },
      take: limit,
    });
  }

  async recordRevenueEvent(input: RecordRevenueEventInput, actor: Partial<DomainActor>) {
    const sourceType = assertEnumValue(input.sourceType, REVENUE_SOURCE_TYPES, 'sourceType');
    assertPositiveCents(input.grossAmountCents, 'grossAmountCents');
    assertPositiveCents(input.netAmountCents, 'netAmountCents');
    if (input.netAmountCents > input.grossAmountCents) {
      throw errors.badRequest('netAmountCents cannot exceed grossAmountCents');
    }
    if (!Array.isArray(input.splits)) {
      throw errors.badRequest('splits must be an array');
    }

    const normalizedInput = {
      subscriptionId: normalizeOptionalText(input.subscriptionId, 'subscriptionId'),
      channelId: normalizeOptionalText(input.channelId, 'channelId'),
      memeId: normalizeOptionalText(input.memeId, 'memeId'),
      sourceType,
      grossAmountCents: input.grossAmountCents,
      netAmountCents: input.netAmountCents,
      currency: normalizeCurrency(input.currency),
      memo: normalizeOptionalText(input.memo, 'memo'),
      splits: input.splits.map((split, index) => ({
        ...split,
        recipientId: normalizeRequiredText(split.recipientId, `splits[${index}].recipientId`),
      })),
    };

    this.validateRevenueSplits(normalizedInput.splits, normalizedInput.netAmountCents);

    if (normalizedInput.sourceType === RevenueSourceType.subscription && !normalizedInput.subscriptionId) {
      throw errors.badRequest('subscriptionId is required for subscription revenue events');
    }

    const normalizedActor = toDomainActorFallback(actor);

    return this.db.$transaction(async (tx: DbClient) => {
      if (normalizedInput.subscriptionId) {
        await this.subscriptionService.ensureSubscription(normalizedInput.subscriptionId, tx);
      }

      let channelId = normalizedInput.channelId;
      if (channelId) {
        const channel = await (tx as any).creatorChannel.findUnique({
          where: { id: channelId },
          select: { id: true },
        });
        if (!channel) {
          throw errors.notFound(`Creator channel ${channelId} not found`);
        }
      }

      if (normalizedInput.memeId) {
        const meme = await (tx as any).meme.findUnique({
          where: { id: normalizedInput.memeId },
          select: {
            id: true,
            channelId: true,
          },
        });

        if (!meme) {
          throw errors.notFound(`Meme ${normalizedInput.memeId} not found`);
        }
        if (channelId && meme.channelId !== channelId) {
          throw errors.badRequest('memeId must belong to channelId');
        }

        channelId = channelId || meme.channelId;
      }

      const poolRecipientIds = [
        ...new Set(
          normalizedInput.splits
            .filter((split) => split.recipientType === AttributionRecipientType.pool)
            .map((split) => split.recipientId),
        ),
      ];
      if (poolRecipientIds.length) {
        const pools = await (tx as any).liquidityPool.findMany({
          where: {
            id: { in: poolRecipientIds },
            isActive: true,
          },
          select: { id: true },
        });
        if (pools.length !== poolRecipientIds.length) {
          throw errors.notFound('One or more pool attribution recipients were not found or are inactive');
        }
      }

      const revenueEvent = await (tx as any).revenueEvent.create({
        data: {
          subscriptionId: normalizedInput.subscriptionId,
          channelId,
          memeId: normalizedInput.memeId,
          sourceType: normalizedInput.sourceType,
          grossAmountCents: normalizedInput.grossAmountCents,
          netAmountCents: normalizedInput.netAmountCents,
          currency: normalizedInput.currency,
          memo: normalizedInput.memo,
          createdBy: normalizedActor.id,
        },
      });

      const splits = await Promise.all(
        normalizedInput.splits.map((split) =>
          (tx as any).attributionSplit.create({
            data: {
              revenueEventId: revenueEvent.id,
              recipientType: split.recipientType,
              recipientId: split.recipientId,
              sharePct: roundMetric(split.sharePct),
              amountCents: split.amountCents,
              metadata: split.metadata,
            },
          }),
        ),
      );

      for (const split of splits) {
        if (split.recipientType === AttributionRecipientType.pool) {
          await this.poolLedgerService.recordRevenueAllocation(
            split.recipientId,
            split.amountCents,
            normalizedActor,
            'revenue_event',
            revenueEvent.id,
            tx,
          );
        }
      }

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'revenue_event',
          aggregateId: revenueEvent.id,
          eventType: 'revenue.recorded',
          payload: {
            sourceType: normalizedInput.sourceType,
            subscriptionId: normalizedInput.subscriptionId,
            channelId,
            memeId: normalizedInput.memeId,
            grossAmountCents: normalizedInput.grossAmountCents,
            netAmountCents: normalizedInput.netAmountCents,
            splitCount: splits.length,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'revenue_event',
          entityId: revenueEvent.id,
          action: 'revenue_event_recorded',
          actor: normalizedActor,
          after: {
            sourceType: normalizedInput.sourceType,
            netAmountCents: normalizedInput.netAmountCents,
            splitCount: splits.length,
          },
        },
        tx,
      );

      if (normalizedInput.subscriptionId) {
        await this.subscriptionService.markRevenueAttributed(normalizedInput.subscriptionId, normalizedActor, tx);
      }

      return {
        ...revenueEvent,
        attributionSplits: splits,
      };
    });
  }

  private validateRevenueSplits(splits: RevenueSplitInput[], netAmountCents: number) {
    if (splits.length < 3) {
      throw errors.badRequest('Revenue events must include creator, platform, and pool splits');
    }

    const amountTotal = splits.reduce((sum, split) => sum + split.amountCents, 0);
    if (amountTotal !== netAmountCents) {
      throw errors.unprocessable('Attribution split amounts must sum to netAmountCents');
    }

    const shareTotal = roundMetric(splits.reduce((sum, split) => sum + split.sharePct, 0));
    if (Math.abs(shareTotal - 1) > 0.0002) {
      throw errors.unprocessable('Attribution share percentages must sum to 1.0');
    }

    const recipientTypes = new Set(splits.map((split) => split.recipientType));
    for (const requiredRecipientType of [
      AttributionRecipientType.creator,
      AttributionRecipientType.platform,
      AttributionRecipientType.pool,
    ]) {
      if (!recipientTypes.has(requiredRecipientType)) {
        throw errors.badRequest(
          `Revenue events must include at least one ${requiredRecipientType} attribution split`,
        );
      }
    }

    splits.forEach((split) => {
      assertPositiveCents(split.amountCents, 'split.amountCents');
      if (typeof split.sharePct !== 'number' || !Number.isFinite(split.sharePct)) {
        throw errors.badRequest('split.sharePct must be a finite number');
      }
      if (split.sharePct <= 0 || split.sharePct > 1) {
        throw errors.badRequest('split.sharePct must be between 0 and 1');
      }
    });
  }
}

export default RevenueService;
