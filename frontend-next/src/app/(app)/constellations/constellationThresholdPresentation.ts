import { clamp, deriveUniversePlacement, normalizeRecency, normalizeSourceDensity } from '@/components/maps/universe/placement';
import type { UniversePacket, UniverseRelation, UniverseSource, UniverseStar } from '@/components/maps/universe/types';
import type { ConstellationSummary } from '@/lib/api/endpoints';

const CONSTELLATION_AXES = [
  {
    key: 'x' as const,
    label: 'Local to federated',
    minLabel: 'Local',
    maxLabel: 'Federated',
    description: 'Whether a constellation is rooted in one place or spans a wider civic field.',
  },
  {
    key: 'y' as const,
    label: 'Dormant to active',
    minLabel: 'Dormant',
    maxLabel: 'Active',
    description: 'Whether a constellation is currently active or paused.',
  },
  {
    key: 'z' as const,
    label: 'Mapped to adaptive',
    minLabel: 'Mapped',
    maxLabel: 'Adaptive',
    description: 'Whether a constellation mainly records structure or drives live coordination change.',
  },
];

const DOMAIN_COLORS: Record<string, string> = {
  governance: '#f1c57a',
  community: '#8dc7f3',
  relief: '#e7a4a4',
  education: '#7bc9b6',
  impact: '#d8c27d',
  general: '#a3b7d8',
};

function domainColor(domain?: string): string {
  return DOMAIN_COLORS[(domain ?? 'general').toLowerCase()] ?? DOMAIN_COLORS.general;
}

function sourcesForConstellation(item: ConstellationSummary): UniverseSource[] {
  return [
    {
      id: `constellation-${item.id}`,
      url: `/constellations/${item.id}`,
      title: item.name,
      domain: item.domain ?? 'general',
      snippet: item.description ?? 'Coordination constellation',
      extractedAt: item.createdAt,
    },
  ];
}

function buildRelations(items: ConstellationSummary[]): UniverseRelation[] {
  const relations: UniverseRelation[] = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      if ((left.domain ?? 'general') !== (right.domain ?? 'general')) {
        continue;
      }

      relations.push({
        id: `constellation-${left.id}::constellation-${right.id}`,
        sourceId: `constellation-${left.id}`,
        targetId: `constellation-${right.id}`,
        relation: 'shared domain',
        weight: 0.72,
        confidence: 0.74,
        evidence: `Both constellations are part of the ${(left.domain ?? 'general').toLowerCase()} domain.`,
      });
    }
  }

  return relations;
}

function connectionsForStar(relations: UniverseRelation[], starId: string): string[] {
  return relations.reduce<string[]>((collection, relation) => {
    if (relation.sourceId === starId) {
      collection.push(relation.targetId);
    }
    if (relation.targetId === starId) {
      collection.push(relation.sourceId);
    }
    return collection;
  }, []);
}

export function buildConstellationThresholdPacket(items: ConstellationSummary[]): UniversePacket {
  const relations = buildRelations(items);
  const domainGroups = new Map<string, ConstellationSummary[]>();

  items.forEach((item) => {
    const groupKey = (item.domain ?? 'general').toLowerCase();
    const collection = domainGroups.get(groupKey) ?? [];
    collection.push(item);
    domainGroups.set(groupKey, collection);
  });

  const stars: UniverseStar[] = items.map((item) => {
    const domainKey = (item.domain ?? 'general').toLowerCase();
    const freshness = normalizeRecency(item.createdAt);
    const sourceDensity = normalizeSourceDensity(1 + (item.geoLabel ? 1 : 0) + (item.active ? 1 : 0));
    const groupSize = domainGroups.get(domainKey)?.length ?? 1;
    const centrality = clamp(groupSize / 4);
    const placement = deriveUniversePlacement({
      seed: `constellation-${item.id}`,
      axisScores: {
        x: item.geoLabel ? 0.32 : 0.68,
        y: item.active ? 0.78 : 0.34,
        z: domainKey === 'governance' ? 0.64 : domainKey === 'impact' ? 0.74 : 0.56,
      },
      axisReasoning: [
        {
          key: 'x',
          label: CONSTELLATION_AXES[0].label,
          score: item.geoLabel ? 0.32 : 0.68,
          explanation: item.geoLabel
            ? `This constellation stays legible as a place-rooted pattern around ${item.geoLabel}.`
            : 'This constellation reads as a wider pattern that is not anchored to one local place label.',
          confidence: 0.72,
        },
        {
          key: 'y',
          label: CONSTELLATION_AXES[1].label,
          score: item.active ? 0.78 : 0.34,
          explanation: item.active
            ? 'This constellation is currently active and should read as a live coordination pattern.'
            : 'This constellation remains visible, but it is not currently active.',
          confidence: 0.76,
        },
        {
          key: 'z',
          label: CONSTELLATION_AXES[2].label,
          score: domainKey === 'impact' ? 0.74 : 0.56,
          explanation:
            domainKey === 'impact'
              ? 'This constellation is closer to adaptive coordination and outcome movement than static mapping alone.'
              : 'This constellation is primarily a mapped coordination pattern that can later open into deeper adaptive work.',
          confidence: 0.68,
        },
      ],
      evidence: clamp(0.46 + (item.active ? 0.12 : 0.04)),
      freshness,
      sourceDensity,
      importance: clamp(0.42 + (item.active ? 0.18 : 0.08) + (item.geoLabel ? 0.1 : 0)),
      centrality,
      controversy: 0.08,
    });

    const connections = connectionsForStar(relations, `constellation-${item.id}`);
    const sources = sourcesForConstellation(item);

    return {
      id: `constellation-${item.id}`,
      label: item.name,
      type: 'community',
      color: domainColor(item.domain),
      size: item.active ? 1.7 : 1.25,
      coordinates: placement.finalCoordinates,
      connections,
      constellationIds: [`domain-${domainKey}`],
      placement,
      explainer: {
        title: item.name,
        summary: item.description ?? 'Coordination constellation',
        longDescription:
          item.description ??
          'This constellation stays available as a shared coordination pattern that can later open into its own detail route.',
        categoryLabel: item.domain ?? 'general',
        starTypeLabel: 'Constellation',
        domainLabel: 'Constellation field',
        scopeLabel: item.geoLabel ?? 'shared field',
        metrics: {
          evidence: placement.evidence,
          freshness: placement.freshness,
          sourceDensity: placement.sourceDensity,
          importance: placement.importance,
          centrality: placement.centrality,
          controversy: placement.controversy,
        },
        placementRationale: placement.rationale,
        axisReasoning: placement.axisReasoning,
        primarySource: sources[0],
        sources,
        tags: [domainKey, item.active ? 'active' : 'paused'].filter(Boolean),
        aliases: [item.geoLabel ?? ''],
      },
      metadata: {
        createdAt: item.createdAt,
        participants: 1,
        impact: item.active ? 2 : 1,
        entityType: 'constellation-summary',
        categoryKey: domainKey,
        geoLabel: item.geoLabel,
        active: item.active,
      },
    };
  });

  return {
    id: `constellation-threshold-${items.length}`,
    title: 'Constellation Field',
    description: 'A celestial threshold packet for live coordination constellations.',
    domain: {
      key: 'constellations',
      title: 'Constellation Field',
      description: 'Coordination patterns rendered through the shared celestial grammar.',
      surface: 'universe',
      scopeLabel: 'shared field',
      semanticAxes: CONSTELLATION_AXES,
    },
    stars,
    constellations: Array.from(domainGroups.entries()).map(([domainKey, collection]) => ({
      id: `domain-${domainKey}`,
      name: `${domainKey.charAt(0).toUpperCase()}${domainKey.slice(1)} patterns`,
      description: `Constellations grouped by the ${domainKey} domain.`,
      color: domainColor(domainKey),
      starIds: collection.map((item) => `constellation-${item.id}`),
    })),
    relations,
    snapshots: [
      {
        id: 'constellation-current',
        name: 'Current constellation field',
        version: 1,
        starCount: stars.length,
        current: true,
      },
    ],
    packetMeta: {
      status: 'published',
      version: 1,
      coverage: items.length > 0 ? 1 : 0,
      sourceSummary: `${items.length} constellation summaries / ${relations.length} shared relations`,
      adminTopicKey: null,
    },
    filters: ['community'],
    fallbackState: null,
  };
}
