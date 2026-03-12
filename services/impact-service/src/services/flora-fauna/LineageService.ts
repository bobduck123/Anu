import DomainEventService from './DomainEventService';
import { DbClient, DomainActor, toDomainActorFallback } from './types';
import { MemeLineageRelationType } from '@prisma/client';
import { errors } from '../../utils/errors';

export class LineageService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async createEdges(
    childMemeId: string,
    parentMemeIds: string[],
    actor: Partial<DomainActor>,
    relationType: MemeLineageRelationType = MemeLineageRelationType.remix,
    db: DbClient = this.prisma,
  ) {
    const normalizedActor = toDomainActorFallback(actor);
    const parentIds = [...new Set(parentMemeIds)].filter((parentId) => parentId !== childMemeId);

    if (parentIds.length === 0) {
      return [];
    }

    const existingParents = await (db as any).meme.findMany({
      where: { id: { in: parentIds } },
      select: { id: true },
    });
    if (existingParents.length !== parentIds.length) {
      throw errors.notFound('One or more parent memes were not found');
    }

    await (db as any).memeLineageEdge.createMany({
      data: parentIds.map((parentMemeId) => ({
        parentMemeId,
        childMemeId,
        relationType,
        createdBy: normalizedActor.id,
      })),
      skipDuplicates: true,
    });

    await this.domainEvents.emitAndAudit(
      {
        aggregateType: 'meme',
        aggregateId: childMemeId,
        eventType: 'lineage.updated',
        payload: {
          childMemeId,
          parentMemeIds: parentIds,
          relationType,
        },
        actor: normalizedActor,
      },
      {
        entityType: 'meme',
        entityId: childMemeId,
        action: 'meme_lineage_updated',
        actor: normalizedActor,
        after: {
          parentMemeIds: parentIds,
          relationType,
        },
      },
      db,
    );

    return (db as any).memeLineageEdge.findMany({
      where: {
        childMemeId,
        parentMemeId: { in: parentIds },
        relationType,
      },
    });
  }

  async getLineage(memeId: string) {
    const meme = await this.db.meme.findUnique({
      where: { id: memeId },
      select: { id: true },
    });

    if (!meme) {
      throw errors.notFound(`Meme ${memeId} not found`);
    }

    const [parents, children] = await Promise.all([
      this.db.memeLineageEdge.findMany({
        where: { childMemeId: memeId },
        include: {
          parentMeme: {
            select: {
              id: true,
              slug: true,
              title: true,
              channelId: true,
            },
          },
        },
      }),
      this.db.memeLineageEdge.findMany({
        where: { parentMemeId: memeId },
        include: {
          childMeme: {
            select: {
              id: true,
              slug: true,
              title: true,
              channelId: true,
            },
          },
        },
      }),
    ]);

    return {
      parents,
      children,
    };
  }
}

export default LineageService;
