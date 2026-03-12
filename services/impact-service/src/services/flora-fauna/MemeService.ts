import { MemeLineageRelationType } from '@prisma/client';
import DomainEventService from './DomainEventService';
import LineageService from './LineageService';
import NutrientEngine from './NutrientEngine';
import {
  CreateMemeInput,
  DbClient,
  DomainActor,
  normalizeOptionalText,
  normalizeRequiredText,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class MemeService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
    private lineageService: LineageService,
    private nutrientEngine: NutrientEngine,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async createMeme(input: CreateMemeInput, actor: Partial<DomainActor>) {
    const normalizedActor = toDomainActorFallback(actor);
    const channelId = normalizeRequiredText(input.channelId, 'channelId');
    const slug = normalizeRequiredText(input.slug, 'slug');
    const title = normalizeRequiredText(input.title, 'title');
    const body = normalizeOptionalText(input.body, 'body');
    const summary = normalizeOptionalText(input.summary, 'summary');
    const mediaUrl = normalizeOptionalText(input.mediaUrl, 'mediaUrl');
    const parentMemeIds = [...new Set((input.parentMemeIds || []).map((id) => normalizeRequiredText(id, 'parentMemeId')))];

    return this.db.$transaction(async (tx: DbClient) => {
      const channel = await (tx as any).creatorChannel.findUnique({
        where: { id: channelId },
      });

      if (!channel) {
        throw errors.notFound(`Creator channel ${channelId} not found`);
      }
      if (normalizedActor.role !== 'organizer' && channel.creatorUserId !== normalizedActor.id) {
        throw errors.forbidden('You can only publish memes in your own creator channel');
      }

      const existing = await (tx as any).meme.findUnique({
        where: { slug },
      });
      if (existing) {
        throw errors.conflict(`Meme slug ${slug} already exists`);
      }

      const meme = await (tx as any).meme.create({
        data: {
          channelId,
          slug,
          title,
          body,
          summary,
          mediaUrl,
          createdBy: normalizedActor.id,
          shareable: true,
        },
      });

      if (parentMemeIds.length) {
        await this.lineageService.createEdges(
          meme.id,
          parentMemeIds,
          normalizedActor,
          input.lineageType ?? MemeLineageRelationType.remix,
          tx,
        );
      }

      if (input.nutrientSnapshot) {
        await this.nutrientEngine.recordSnapshot(
          channelId,
          normalizedActor,
          input.nutrientSnapshot,
          meme.id,
          tx,
        );
      }

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'meme',
          aggregateId: meme.id,
          eventType: 'meme.created',
          payload: {
            channelId: meme.channelId,
            slug: meme.slug,
            title: meme.title,
            lineageType: input.lineageType ?? MemeLineageRelationType.remix,
            parentMemeCount: parentMemeIds.length,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'meme',
          entityId: meme.id,
          action: 'meme_created',
          actor: normalizedActor,
          after: {
            channelId: meme.channelId,
            slug: meme.slug,
            shareable: meme.shareable,
          },
        },
        tx,
      );

      return meme;
    });
  }

  async getMeme(memeId: string) {
    const meme = await this.db.meme.findUnique({
      where: { id: memeId },
      include: {
        channel: true,
        nutrientSnapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 4,
          include: {
            geologicalForm: true,
          },
        },
        riskFlags: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!meme) {
      throw errors.notFound(`Meme ${memeId} not found`);
    }

    const lineage = await this.lineageService.getLineage(memeId);
    const latestSnapshot = meme.nutrientSnapshots[0];
    const ecology = latestSnapshot?.geologicalForm
      ? {
          ecologyIdentity: latestSnapshot.ecologyIdentity,
          identityConfidence: Number(latestSnapshot.identityConfidence),
          dominantNutrients: this.nutrientEngine.computeEcologySummary({
            careIndex: Number(latestSnapshot.careIndex),
            reciprocityIndex: Number(latestSnapshot.reciprocityIndex),
            resonanceIndex: Number(latestSnapshot.resonanceIndex),
            originalityIndex: Number(latestSnapshot.originalityIndex),
            stewardshipIndex: Number(latestSnapshot.stewardshipIndex),
            mycelialDensityIndex: Number(latestSnapshot.mycelialDensityIndex),
          }).dominantNutrients,
          nutrientVector: {
            careIndex: Number(latestSnapshot.careIndex),
            reciprocityIndex: Number(latestSnapshot.reciprocityIndex),
            resonanceIndex: Number(latestSnapshot.resonanceIndex),
            originalityIndex: Number(latestSnapshot.originalityIndex),
            stewardshipIndex: Number(latestSnapshot.stewardshipIndex),
            mycelialDensityIndex: Number(latestSnapshot.mycelialDensityIndex),
          },
          geology: {
            formKey: latestSnapshot.geologicalForm.formKey,
            strataSummary: latestSnapshot.geologicalForm.strataSummary,
            permeabilityIndex: Number(latestSnapshot.geologicalForm.permeabilityIndex),
            volatilityIndex: Number(latestSnapshot.geologicalForm.volatilityIndex),
            stabilityIndex: Number(latestSnapshot.geologicalForm.stabilityIndex),
            rationale: latestSnapshot.geologicalForm.rationale as Record<string, number | string>,
          },
        }
      : null;

    return {
      ...meme,
      lineage,
      ecology,
    };
  }

  async getFeed(limit: number = 12) {
    const memes = await this.db.meme.findMany({
      orderBy: [
        { attentionScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        channel: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

    const channelIds: string[] = [...new Set<string>(memes.map((meme: any) => String(meme.channelId)))];
    const latestEcology = await Promise.all(
      channelIds.map(async (channelId) => [
        channelId,
        await this.nutrientEngine.getLatestEcologySummary(channelId),
      ]),
    );
    const ecologyByChannel = Object.fromEntries(latestEcology);

    return memes.map((meme: any) => ({
      ...meme,
      ecology: ecologyByChannel[meme.channelId] ?? null,
    }));
  }
}

export default MemeService;
