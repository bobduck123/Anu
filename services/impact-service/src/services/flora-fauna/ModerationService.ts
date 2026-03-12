import {
  ModerationActionType,
  ModerationCaseStatus,
  ModerationSeverity,
} from '@prisma/client';
import DomainEventService from './DomainEventService';
import {
  MODERATION_ACTION_TYPES,
  MODERATION_SEVERITIES,
  DbClient,
  DomainActor,
  FlagRiskInput,
  MODERATION_ACTION_TO_STATUS,
  ModerationActionInput,
  assertEnumValue,
  normalizeOptionalText,
  normalizeRequiredText,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class ModerationService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async listCases(limit: number = 50, status?: ModerationCaseStatus) {
    return this.db.moderationCase.findMany({
      where: {
        status: status || undefined,
      },
      include: {
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
        actions: {
          orderBy: { createdAt: 'desc' },
        },
        riskFlags: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async flagRisk(input: FlagRiskInput, actor: Partial<DomainActor>) {
    const channelId = normalizeOptionalText(input.channelId, 'channelId');
    const memeId = normalizeOptionalText(input.memeId, 'memeId');
    const flagType = normalizeRequiredText(input.flagType, 'flagType');
    const reason = normalizeRequiredText(input.reason, 'reason');
    const severity = assertEnumValue(input.severity, MODERATION_SEVERITIES, 'severity');

    if (!channelId && !memeId) {
      throw errors.badRequest('Either channelId or memeId is required to flag risk');
    }

    const normalizedActor = toDomainActorFallback(actor);

    return this.db.$transaction(async (tx: DbClient) => {
      if (channelId) {
        const channel = await (tx as any).creatorChannel.findUnique({
          where: { id: channelId },
          select: { id: true },
        });
        if (!channel) {
          throw errors.notFound(`Creator channel ${channelId} not found`);
        }
      }

      if (memeId) {
        const meme = await (tx as any).meme.findUnique({
          where: { id: memeId },
          select: {
            id: true,
            channelId: true,
          },
        });
        if (!meme) {
          throw errors.notFound(`Meme ${memeId} not found`);
        }
        if (channelId && meme.channelId !== channelId) {
          throw errors.badRequest('memeId must belong to channelId');
        }
      }

      let moderationCase = null;
      if (severity === ModerationSeverity.high || severity === ModerationSeverity.critical) {
        moderationCase = await (tx as any).moderationCase.create({
          data: {
            channelId,
            memeId,
            openedBy: normalizedActor.id,
            severity,
            summary: `Auto-opened from ${flagType} flag`,
          },
        });
      }

      const flag = await (tx as any).riskFlag.create({
        data: {
          channelId,
          memeId,
          caseId: moderationCase?.id,
          flagType,
          severity,
          reason,
          createdBy: normalizedActor.id,
        },
      });

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: memeId ? 'meme' : 'creator_channel',
          aggregateId: memeId || channelId || flag.id,
          eventType: 'moderation.flagged',
          payload: {
            riskFlagId: flag.id,
            moderationCaseId: moderationCase?.id,
            flagType,
            severity,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'risk_flag',
          entityId: flag.id,
          action: 'risk_flag_created',
          actor: normalizedActor,
          after: {
            caseId: moderationCase?.id,
            severity: flag.severity,
            flagType: flag.flagType,
          },
        },
        tx,
      );

      return {
        flag,
        moderationCase,
      };
    });
  }

  async recordAction(input: ModerationActionInput, actor: Partial<DomainActor>) {
    const actionType = assertEnumValue(input.actionType, MODERATION_ACTION_TYPES, 'actionType');
    const notes = normalizeOptionalText(input.notes, 'notes');
    const caseRecord = await this.db.moderationCase.findUnique({
      where: { id: input.caseId },
    });

    if (!caseRecord) {
      throw errors.notFound(`Moderation case ${input.caseId} not found`);
    }

    const normalizedActor = toDomainActorFallback(actor);

    return this.db.$transaction(async (tx: DbClient) => {
      const action = await (tx as any).moderationAction.create({
        data: {
          caseId: input.caseId,
          actionType,
          actorId: normalizedActor.id,
          notes,
        },
      });

      const status = MODERATION_ACTION_TO_STATUS[actionType] ?? ModerationCaseStatus.reviewed;
      const updatedCase = await (tx as any).moderationCase.update({
        where: { id: input.caseId },
        data: { status },
      });

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'moderation_case',
          aggregateId: input.caseId,
          eventType: 'moderation.action_recorded',
          payload: {
            actionId: action.id,
            actionType,
            status,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'moderation_case',
          entityId: input.caseId,
          action: 'moderation_action_recorded',
          actor: normalizedActor,
          before: {
            status: caseRecord.status,
          },
          after: {
            status: updatedCase.status,
            actionType,
          },
        },
        tx,
      );

      return {
        action,
        case: updatedCase,
      };
    });
  }
}

export default ModerationService;
