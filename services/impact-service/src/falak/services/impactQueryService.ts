import { errors } from '../../utils/errors';
import {
  EventImpactRecord,
  FalakRepository,
  JourneyConnectorProjectionRecord,
  PoolBalanceRecord,
  RequestContext,
} from '../domain/types';

const FLAGSHIP_JOURNEY_SLUG = 'knowledge-action-community-governance-archive';

export class ImpactQueryService {
  constructor(private readonly repository: FalakRepository) {}

  async getEventImpact(context: RequestContext, eventId: string): Promise<EventImpactRecord> {
    const impact = await this.repository.getEventImpact(context, eventId);
    if (!impact) {
      throw errors.notFound('Event not found', 'EVENT_NOT_FOUND');
    }

    return impact;
  }

  async getPoolBalance(context: RequestContext, poolId: string): Promise<PoolBalanceRecord> {
    const pool = await this.repository.getNodeById(context, poolId);
    if (!pool || pool.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool not found', 'POOL_NOT_FOUND');
    }

    return this.repository.getPoolBalance(context, poolId);
  }

  async getJourneyConnectorProjection(
    context: RequestContext,
    journeySlug: string,
  ): Promise<JourneyConnectorProjectionRecord> {
    if (journeySlug !== FLAGSHIP_JOURNEY_SLUG) {
      throw errors.notFound('Journey projection not found', 'JOURNEY_NOT_FOUND');
    }

    const sourceRoute = '/education/maps/weaving-futures-atlas';

    let eventNodeId: string | null = null;
    let contributionCount = 0;
    let pooledCurrencies: Array<{ currency: string; amount: number }> = [];
    let projectionMode: JourneyConnectorProjectionRecord['projectionMode'] = 'degraded-honesty';
    let degradedReason: string | null = 'event_impact_unavailable';

    try {
      const eventNodes = await this.repository.listNodes(context, {
        type: 'event',
        limit: 1,
      });
      const primaryEvent = eventNodes.items[0] ?? null;

      if (primaryEvent) {
        const impact = await this.repository.getEventImpact(context, primaryEvent.id);
        eventNodeId = impact.event.id;
        contributionCount = impact.contributionCount;
        pooledCurrencies = impact.poolBalance?.balances ?? impact.totalContributions;
        projectionMode = 'source-backed';
        degradedReason = null;
      }
    } catch {
      projectionMode = 'degraded-honesty';
      degradedReason = 'event_impact_unavailable';
    }

    return {
      journeySlug,
      sourceRoute,
      connectors: [
        {
          id: 'knowledge-to-actions',
          sourceRoute,
          targetRoute: '/actions',
          thresholdRequired: 'MEMBER',
          provenanceMode: 'source-backed',
          archiveHandoffMode: 'none',
          summary: 'Move from knowledge maps into concrete action pathways.',
        },
        {
          id: 'knowledge-to-events',
          sourceRoute,
          targetRoute: '/events',
          thresholdRequired: 'MEMBER',
          provenanceMode: 'source-backed',
          archiveHandoffMode: 'none',
          summary: 'Move from map understanding into events and public gatherings.',
        },
        {
          id: 'actions-to-community',
          sourceRoute: '/actions',
          targetRoute: '/community',
          thresholdRequired: 'MEMBER',
          provenanceMode: 'verified-summary',
          archiveHandoffMode: 'optional',
          summary: 'Action traces become community-readable outcomes.',
        },
        {
          id: 'events-to-community',
          sourceRoute: '/events',
          targetRoute: '/community',
          thresholdRequired: 'MEMBER',
          provenanceMode: 'verified-summary',
          archiveHandoffMode: 'optional',
          summary: 'Event outcomes are carried into shared community context.',
        },
        {
          id: 'community-to-model-registry',
          sourceRoute: '/community',
          targetRoute: '/governance/model-registry',
          thresholdRequired: 'STEWARD',
          provenanceMode: 'verified-summary',
          archiveHandoffMode: 'required',
          summary: 'Community consequences can be inspected in governance models.',
        },
        {
          id: 'community-to-transparency',
          sourceRoute: '/community',
          targetRoute: '/transparency',
          thresholdRequired: 'OPEN',
          provenanceMode: 'verified-summary',
          archiveHandoffMode: 'required',
          summary: 'Community outcomes stay legible through trust disclosure surfaces.',
        },
        {
          id: 'model-registry-to-archive',
          sourceRoute: '/governance/model-registry',
          targetRoute: '/archive',
          thresholdRequired: 'OPEN',
          provenanceMode: 'source-backed',
          archiveHandoffMode: 'required',
          summary: 'Governance review resolves into accountable archive memory.',
        },
        {
          id: 'transparency-to-archive',
          sourceRoute: '/transparency',
          targetRoute: '/archive',
          thresholdRequired: 'OPEN',
          provenanceMode: 'source-backed',
          archiveHandoffMode: 'required',
          summary: 'Public trust reports receive stable archive handoff links.',
        },
      ],
      projectionMode,
      degradedHonesty: {
        isDegraded: projectionMode === 'degraded-honesty',
        reason: degradedReason,
      },
      nodeScope: {
        tenantId: context.tenantId,
        tenantSlug: context.tenantSlug,
      },
      archiveHandoff: {
        route: '/archive',
        recordRoute: '/archive/knowledge-action-community-governance-archive-record',
        reportRoute: '/transparency?report=knowledge-action-community-governance-archive-trust-report',
      },
      eventImpactContext: {
        eventNodeId,
        contributionCount,
        pooledCurrencies,
      },
    };
  }
}
