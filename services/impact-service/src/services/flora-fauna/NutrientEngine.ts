import DomainEventService from './DomainEventService';
import GeologicalClassifier from './GeologicalClassifier';
import {
  DbClient,
  DEFAULT_NUTRIENT_VECTOR,
  DomainActor,
  EcologySummary,
  NutrientVectorInput,
  normalizeRequiredText,
  normalizeNutrientVector,
  roundMetric,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class NutrientEngine {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
    private geologicalClassifier: GeologicalClassifier = new GeologicalClassifier(),
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  computeEcologySummary(input: NutrientVectorInput): EcologySummary {
    const vector = normalizeNutrientVector(input);
    const nutrientPairs: Array<{ key: string; value: number }> = [
      { key: 'care', value: vector.careIndex },
      { key: 'reciprocity', value: vector.reciprocityIndex },
      { key: 'resonance', value: vector.resonanceIndex },
      { key: 'originality', value: vector.originalityIndex },
      { key: 'stewardship', value: vector.stewardshipIndex },
      { key: 'mycelial-density', value: vector.mycelialDensityIndex },
    ].sort((left, right) => right.value - left.value);

    const dominantNutrients = nutrientPairs.slice(0, 2).map(({ key }) => key);
    const biomeByNutrient: Record<string, string> = {
      care: 'canopy',
      reciprocity: 'estuary',
      resonance: 'chorus',
      originality: 'wildfire',
      stewardship: 'terrace',
      'mycelial-density': 'mycelium',
    };
    const suffix =
      nutrientPairs[0].value - nutrientPairs[1].value <= 0.08 ? 'commons' : 'current';
    const ecologyIdentity = `${biomeByNutrient[nutrientPairs[0].key]} ${suffix}`;
    const identityConfidence = roundMetric(
      Math.min(
        0.99,
        0.55 +
          ((nutrientPairs[0].value - nutrientPairs[1].value) * 0.9) +
          (Math.abs(vector.stewardshipIndex - vector.originalityIndex) * 0.15),
      ),
    );

    return {
      ecologyIdentity,
      identityConfidence,
      dominantNutrients,
      nutrientVector: vector,
      geology: this.geologicalClassifier.classify(vector),
    };
  }

  async recordSnapshot(
    channelId: string,
    actor: Partial<DomainActor>,
    input: NutrientVectorInput = DEFAULT_NUTRIENT_VECTOR,
    memeId?: string,
    db: DbClient = this.prisma,
  ) {
    const execute = async (client: DbClient) => {
      const channel = await (client as any).creatorChannel.findUnique({
        where: { id: channelId },
      });

      if (!channel) {
        throw errors.notFound(`Creator channel ${channelId} not found`);
      }

      const normalizedActor = toDomainActorFallback(actor);
      if (normalizedActor.role !== 'organizer' && channel.creatorUserId !== normalizedActor.id) {
        throw errors.forbidden('You can only recompute ecology for your own creator channel');
      }

      let normalizedMemeId: string | undefined;
      if (memeId) {
        normalizedMemeId = normalizeRequiredText(memeId, 'memeId');
        const meme = await (client as any).meme.findUnique({
          where: { id: normalizedMemeId },
          select: {
            id: true,
            channelId: true,
          },
        });

        if (!meme) {
          throw errors.notFound(`Meme ${normalizedMemeId} not found`);
        }
        if (meme.channelId !== channelId) {
          throw errors.badRequest('memeId must belong to the same creator channel');
        }
      }

      const summary = this.computeEcologySummary(input);

      const snapshot = await (client as any).nutrientSnapshot.create({
        data: {
          channelId,
          memeId: normalizedMemeId,
          careIndex: summary.nutrientVector.careIndex,
          reciprocityIndex: summary.nutrientVector.reciprocityIndex,
          resonanceIndex: summary.nutrientVector.resonanceIndex,
          originalityIndex: summary.nutrientVector.originalityIndex,
          stewardshipIndex: summary.nutrientVector.stewardshipIndex,
          mycelialDensityIndex: summary.nutrientVector.mycelialDensityIndex,
          ecologyIdentity: summary.ecologyIdentity,
          identityConfidence: summary.identityConfidence,
          nutrientVector: summary.nutrientVector,
          capturedBy: normalizedActor.id,
        },
      });

      const geology = await (client as any).geologicalFormSnapshot.create({
        data: {
          channelId,
          nutrientSnapshotId: snapshot.id,
          formKey: summary.geology.formKey,
          strataSummary: summary.geology.strataSummary,
          permeabilityIndex: summary.geology.permeabilityIndex,
          volatilityIndex: summary.geology.volatilityIndex,
          stabilityIndex: summary.geology.stabilityIndex,
          rationale: summary.geology.rationale,
        },
      });

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'creator_channel',
          aggregateId: channelId,
          eventType: 'ecology.recomputed',
          payload: {
            nutrientSnapshotId: snapshot.id,
            geologySnapshotId: geology.id,
            ecologyIdentity: summary.ecologyIdentity,
            geologyFormKey: summary.geology.formKey,
            memeId: normalizedMemeId,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'nutrient_snapshot',
          entityId: snapshot.id,
          action: 'nutrient_snapshot_recorded',
          actor: normalizedActor,
          after: {
            channelId,
            memeId: normalizedMemeId,
            ecologyIdentity: summary.ecologyIdentity,
            geologyFormKey: summary.geology.formKey,
          },
        },
        client,
      );

      return {
        snapshot,
        geology,
        summary,
      };
    };

    if (db === this.prisma) {
      return this.db.$transaction((tx: DbClient) => execute(tx));
    }

    return execute(db);
  }

  async getLatestEcologySummary(channelId: string): Promise<EcologySummary | null> {
    const latest = await this.db.nutrientSnapshot.findFirst({
      where: { channelId },
      orderBy: { capturedAt: 'desc' },
      include: {
        geologicalForm: true,
      },
    });

    if (!latest || !latest.geologicalForm) {
      return null;
    }

    return {
      ecologyIdentity: latest.ecologyIdentity,
      identityConfidence: Number(latest.identityConfidence),
      dominantNutrients: this.extractDominantNutrients(latest.nutrientVector),
      nutrientVector: {
        careIndex: Number(latest.careIndex),
        reciprocityIndex: Number(latest.reciprocityIndex),
        resonanceIndex: Number(latest.resonanceIndex),
        originalityIndex: Number(latest.originalityIndex),
        stewardshipIndex: Number(latest.stewardshipIndex),
        mycelialDensityIndex: Number(latest.mycelialDensityIndex),
      },
      geology: {
        formKey: latest.geologicalForm.formKey,
        strataSummary: latest.geologicalForm.strataSummary,
        permeabilityIndex: Number(latest.geologicalForm.permeabilityIndex),
        volatilityIndex: Number(latest.geologicalForm.volatilityIndex),
        stabilityIndex: Number(latest.geologicalForm.stabilityIndex),
        rationale: latest.geologicalForm.rationale as Record<string, number | string>,
      },
    };
  }

  private extractDominantNutrients(value: unknown): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const vector = value as Record<string, unknown>;
    return Object.entries(vector)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([key]) => key.replace('Index', '').replace(/([A-Z])/g, '-$1').toLowerCase());
  }
}

export default NutrientEngine;
