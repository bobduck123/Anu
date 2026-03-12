import DomainEventService from './DomainEventService';
import NutrientEngine from './NutrientEngine';
import {
  CreateChannelInput,
  DbClient,
  DEFAULT_NUTRIENT_VECTOR,
  DomainActor,
  ensureShareablePolicy,
  normalizeOptionalText,
  normalizeRequiredText,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class ChannelService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
    private nutrientEngine: NutrientEngine,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async createChannel(input: CreateChannelInput, actor: Partial<DomainActor>) {
    const normalizedActor = toDomainActorFallback(actor);
    const slug = normalizeRequiredText(input.slug, 'slug');
    const title = normalizeRequiredText(input.title, 'title');
    const creatorUserId = normalizeRequiredText(input.creatorUserId, 'creatorUserId');
    const description = normalizeOptionalText(input.description, 'description');
    const manifesto = normalizeOptionalText(input.manifesto, 'manifesto');

    if (normalizedActor.role !== 'organizer' && creatorUserId !== normalizedActor.id) {
      throw errors.forbidden('You can only create creator channels for yourself');
    }

    return this.db.$transaction(async (tx: DbClient) => {
      const existing = await (tx as any).creatorChannel.findUnique({
        where: { slug },
      });

      if (existing) {
        throw errors.conflict(`Creator channel slug ${slug} already exists`);
      }

      const channel = await (tx as any).creatorChannel.create({
        data: {
          slug,
          creatorUserId,
          title,
          description,
          manifesto,
          sharePolicy: ensureShareablePolicy(undefined),
        },
      });

      const ecology = await this.nutrientEngine.recordSnapshot(
        channel.id,
        normalizedActor,
        input.initialNutrients ?? DEFAULT_NUTRIENT_VECTOR,
        undefined,
        tx,
      );

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'creator_channel',
          aggregateId: channel.id,
          eventType: 'channel.created',
          payload: {
            slug: channel.slug,
            title: channel.title,
            creatorUserId: channel.creatorUserId,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'creator_channel',
          entityId: channel.id,
          action: 'creator_channel_created',
          actor: normalizedActor,
          after: {
            slug: channel.slug,
            title: channel.title,
            creatorUserId: channel.creatorUserId,
            ecologyIdentity: ecology.summary.ecologyIdentity,
          },
        },
        tx,
      );

      return {
        ...channel,
        ecology: ecology.summary,
      };
    });
  }

  async listChannels(limit: number = 12) {
    const channels = await this.db.creatorChannel.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        memes: {
          orderBy: { createdAt: 'desc' },
          take: 4,
        },
      },
    });

    return Promise.all(
      channels.map(async (channel: any) => {
        const [ecology, openFlags, openCases] = await Promise.all([
          this.nutrientEngine.getLatestEcologySummary(channel.id),
          this.db.riskFlag.count({
            where: {
              channelId: channel.id,
              status: 'open',
            },
          }),
          this.db.moderationCase.count({
            where: {
              channelId: channel.id,
              status: { in: ['open', 'reviewed', 'actioned'] },
            },
          }),
        ]);

        return {
          ...channel,
          ecology,
          moderation: {
            openFlags,
            openCases,
          },
        };
      }),
    );
  }

  async getChannel(channelId: string) {
    const channel = await this.db.creatorChannel.findUnique({
      where: { id: channelId },
      include: {
        memes: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!channel) {
      throw errors.notFound(`Creator channel ${channelId} not found`);
    }

    const [ecology, openFlags, openCases] = await Promise.all([
      this.nutrientEngine.getLatestEcologySummary(channelId),
      this.db.riskFlag.count({
        where: {
          channelId,
          status: 'open',
        },
      }),
      this.db.moderationCase.count({
        where: {
          channelId,
          status: {
            in: ['open', 'reviewed', 'actioned'],
          },
        },
      }),
    ]);

    return {
      ...channel,
      ecology,
      moderation: {
        openFlags,
        openCases,
      },
    };
  }
}

export default ChannelService;
