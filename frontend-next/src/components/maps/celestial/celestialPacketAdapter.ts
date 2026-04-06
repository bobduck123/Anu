import type {
  FloraFaunaChannel,
  FloraFaunaMeme,
  FloraFaunaPool,
} from '@/lib/api/floraFaunaApi';
import { clamp, deriveUniversePlacement, normalizeRecency, normalizeSourceDensity } from '@/components/maps/universe/placement';
import type {
  UniverseFallbackState,
  UniversePacket,
  UniverseRelation,
  UniverseSource,
  UniverseStar,
} from '@/components/maps/universe/types';
import { getCelestialArchetype } from './celestialArchetypes';

type PacketMode = 'live' | 'read_only' | 'demo' | 'local';

const IMPACT_AXES = [
  {
    key: 'x' as const,
    label: 'Grounded to elevated',
    minLabel: 'Grounded',
    maxLabel: 'Elevated',
    description: 'Whether the signal is close to direct local work or lifted into shared consequence.',
  },
  {
    key: 'y' as const,
    label: 'Care to coordination',
    minLabel: 'Care',
    maxLabel: 'Coordination',
    description: 'Whether the signal primarily reflects care delivery or cross-route coordination movement.',
  },
  {
    key: 'z' as const,
    label: 'Current to future',
    minLabel: 'Current',
    maxLabel: 'Future',
    description: 'Whether the signal reflects current completion or future commons capacity.',
  },
];

const MEMETIC_AXES = [
  {
    key: 'x' as const,
    label: 'Raw to crafted',
    minLabel: 'Raw trace',
    maxLabel: 'Crafted artifact',
    description: 'Whether the node reads as immediate social trace or refined memetic artifact.',
  },
  {
    key: 'y' as const,
    label: 'Local to diffuse',
    minLabel: 'Local channel',
    maxLabel: 'Diffuse circulation',
    description: 'Whether a node is tied to one channel ecology or spread across wider circulation.',
  },
  {
    key: 'z' as const,
    label: 'Signal to liquidity',
    minLabel: 'Signal',
    maxLabel: 'Liquidity',
    description: 'Whether a node is primarily narrative signal or connected to economic pathways.',
  },
];

type ImpactSummaryLike = {
  relief_paid_cents?: number;
  volunteer_hours?: number;
  savings_cents?: number;
  actions_completed?: number;
  completions?: number;
  event_attendance?: number;
};

type PacketBuildOptions = {
  mode?: PacketMode;
  sourceSummary?: string;
  fallbackMessage?: string;
};

type MemeticPacketInput = {
  feed?: FloraFaunaMeme[];
  channels?: FloraFaunaChannel[];
  pools?: FloraFaunaPool[];
} | null;

const IMPACT_DEMO: Required<ImpactSummaryLike> = {
  relief_paid_cents: 184500,
  volunteer_hours: 97,
  savings_cents: 74200,
  actions_completed: 43,
  completions: 43,
  event_attendance: 128,
};

const MEMETIC_DEMO: FloraFaunaMeme[] = [
  {
    id: 'demo-meme-1',
    channelId: 'demo-channel',
    slug: 'seed-spore',
    title: 'Seed Spore Pattern',
    summary: 'A cooperative meme thread shaped around local care exchanges.',
    attentionScore: 0.58,
    createdAt: '2026-04-01T00:00:00.000Z',
    channel: {
      id: 'demo-channel',
      slug: 'demo-channel',
      title: 'Demo Channel',
    },
    ecology: {
      ecologyIdentity: 'networked-care',
      identityConfidence: 0.72,
      dominantNutrients: ['care', 'reciprocity'],
      nutrientVector: {
        careIndex: 0.81,
        reciprocityIndex: 0.74,
        resonanceIndex: 0.62,
        originalityIndex: 0.56,
        stewardshipIndex: 0.69,
        mycelialDensityIndex: 0.65,
      },
      geology: {
        formKey: 'braided-shelf',
        strataSummary: 'Layered local storytelling',
        permeabilityIndex: 0.61,
        volatilityIndex: 0.33,
        stabilityIndex: 0.68,
      },
    },
  },
  {
    id: 'demo-meme-2',
    channelId: 'demo-channel',
    slug: 'craft-relic',
    title: 'Craft Relic Dispatch',
    summary: 'Artifact-style meme built for reuse and lineage tracking.',
    attentionScore: 0.67,
    createdAt: '2026-04-02T00:00:00.000Z',
    channel: {
      id: 'demo-channel',
      slug: 'demo-channel',
      title: 'Demo Channel',
    },
  },
  {
    id: 'demo-meme-3',
    channelId: 'demo-channel',
    slug: 'pool-echo',
    title: 'Pool Echo Signal',
    summary: 'Narrative signal pointing toward shared liquidity routes.',
    attentionScore: 0.49,
    createdAt: '2026-04-03T00:00:00.000Z',
    channel: {
      id: 'demo-channel',
      slug: 'demo-channel',
      title: 'Demo Channel',
    },
  },
];

function resolveFallbackState(mode: PacketMode, message: string, label: string, source: string): UniverseFallbackState | null {
  if (mode === 'live') {
    return null;
  }

  return {
    active: true,
    mode,
    label,
    message,
    source,
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function toImpactSummary(value: unknown): ImpactSummaryLike | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    relief_paid_cents: asNumber(record.relief_paid_cents) ?? undefined,
    volunteer_hours: asNumber(record.volunteer_hours) ?? undefined,
    savings_cents: asNumber(record.savings_cents) ?? undefined,
    actions_completed: asNumber(record.actions_completed) ?? undefined,
    completions: asNumber(record.completions) ?? undefined,
    event_attendance: asNumber(record.event_attendance) ?? undefined,
  };
}

function valueToSources(id: string, title: string): UniverseSource[] {
  return [
    {
      id: `${id}-source`,
      url: '/impact',
      title,
      domain: 'impact',
      snippet: 'Derived from impact summary and route instrumentation.',
    },
  ];
}

export function buildImpactCelestialPacket(
  summaryInput: unknown,
  options: PacketBuildOptions = {},
): UniversePacket {
  const summary = toImpactSummary(summaryInput) ?? IMPACT_DEMO;
  const mode: PacketMode = options.mode ?? (summaryInput ? 'live' : 'demo');
  const archetype = getCelestialArchetype('impact_outcome');

  const outcomes = [
    {
      id: 'impact-actions',
      label: 'Action completions',
      value: summary.actions_completed ?? summary.completions ?? 0,
      unit: 'completions',
      x: 0.24,
      y: 0.62,
      z: 0.48,
      detail: 'Grounded action follow-through visible as shared consequence.',
    },
    {
      id: 'impact-attendance',
      label: 'Event attendance',
      value: summary.event_attendance ?? 0,
      unit: 'attendees',
      x: 0.42,
      y: 0.71,
      z: 0.53,
      detail: 'Participation traces moving from gatherings into civic signal.',
    },
    {
      id: 'impact-relief',
      label: 'Relief delivered',
      value: Math.round((summary.relief_paid_cents ?? 0) / 100),
      unit: 'usd',
      x: 0.35,
      y: 0.28,
      z: 0.66,
      detail: 'Private care translated into public accountability signal.',
    },
    {
      id: 'impact-savings',
      label: 'Commons savings',
      value: Math.round((summary.savings_cents ?? 0) / 100),
      unit: 'usd',
      x: 0.66,
      y: 0.52,
      z: 0.78,
      detail: 'Future capacity and resilience signal held in shared pools.',
    },
  ];

  const stars: UniverseStar[] = outcomes.map((outcome) => {
    const seed = `${outcome.id}:${outcome.value}`;
    const importance = clamp(0.3 + Math.min(0.6, outcome.value / 300));
    const placement = deriveUniversePlacement({
      seed,
      axisScores: { x: outcome.x, y: outcome.y, z: outcome.z },
      axisReasoning: [
        {
          key: 'x',
          label: IMPACT_AXES[0].label,
          score: outcome.x,
          explanation: 'Impact outcomes originate in grounded route work before becoming elevated public signal.',
          confidence: 0.71,
        },
        {
          key: 'y',
          label: IMPACT_AXES[1].label,
          score: outcome.y,
          explanation: 'Outcomes balance direct care and route-to-route coordination pressure.',
          confidence: 0.69,
        },
        {
          key: 'z',
          label: IMPACT_AXES[2].label,
          score: outcome.z,
          explanation: 'Signals include both immediate completions and future commons capacity.',
          confidence: 0.68,
        },
      ],
      evidence: mode === 'live' ? 0.8 : 0.55,
      freshness: mode === 'live' ? normalizeRecency(new Date().toISOString()) : 0.45,
      sourceDensity: normalizeSourceDensity(3),
      importance,
      centrality: 0.65,
      controversy: 0.08,
    });

    return {
      id: outcome.id,
      label: outcome.label,
      type: archetype.defaultStarType,
      color: archetype.color,
      size: 1.2 + importance * 0.8,
      coordinates: placement.finalCoordinates,
      connections: outcomes.filter((candidate) => candidate.id !== outcome.id).map((candidate) => candidate.id),
      constellationIds: ['impact-outcome-arc'],
      placement,
      explainer: {
        title: outcome.label,
        summary: `${outcome.value.toLocaleString()} ${outcome.unit}`,
        longDescription: outcome.detail,
        categoryLabel: 'Impact outcomes',
        starTypeLabel: 'Outcome',
        domainLabel: 'Impact celestial outcomes',
        scopeLabel: 'impact route',
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
        primarySource: valueToSources(outcome.id, outcome.label)[0],
        sources: valueToSources(outcome.id, outcome.label),
        tags: ['impact', 'outcome', 'celestial'],
        aliases: [outcome.unit],
      },
      metadata: {
        participants: 1,
        impact: outcome.value,
        entityType: 'impact-outcome',
        categoryKey: 'impact-outcome',
        nodeFamily: archetype.family,
      },
    };
  });

  const relations: UniverseRelation[] = outcomes.slice(1).map((outcome, index) => ({
    id: `impact-link-${index}`,
    sourceId: outcomes[index].id,
    targetId: outcome.id,
    relation: 'ascent linkage',
    weight: 0.74,
    confidence: 0.78,
    evidence: 'Impact outcome chain from grounded work to elevated public consequence.',
  }));

  const fallbackState = resolveFallbackState(
    mode,
    options.fallbackMessage ??
      (mode === 'demo'
        ? 'Impact celestial packet is running in deterministic demo mode while live impact summary data is unavailable.'
        : 'Impact celestial packet is running in read-only mode until live impact summary recovers.'),
    mode === 'demo' ? 'Impact demo packet' : 'Impact read-only packet',
    'impact',
  );

  return {
    id: 'impact-celestial-packet',
    title: 'Impact Outcome Mesh',
    description: 'Elevated impact outcomes rendered as celestial consequence nodes.',
    domain: {
      key: 'impact-outcomes',
      title: 'Impact Outcome Mesh',
      description: 'Outcome nodes derived from impact route signals.',
      surface: 'universe',
      scopeLabel: 'impact',
      semanticAxes: IMPACT_AXES,
    },
    stars,
    constellations: [
      {
        id: 'impact-outcome-arc',
        name: 'Outcome ascent arc',
        description: 'Grounded impact outcomes lifting into celestial public consequence.',
        color: archetype.color,
        starIds: stars.map((star) => star.id),
      },
    ],
    relations,
    snapshots: [
      {
        id: 'impact-current',
        name: 'Current impact outcomes',
        version: 1,
        starCount: stars.length,
        current: true,
      },
    ],
    packetMeta: {
      status: mode === 'live' ? 'published' : mode,
      version: 1,
      coverage: mode === 'live' ? 1 : 0.66,
      sourceSummary: options.sourceSummary ?? `${stars.length} impact outcome nodes / ${relations.length} ascent relations`,
      adminTopicKey: null,
    },
    filters: ['action', 'community'],
    fallbackState,
    updatedAt: new Date().toISOString(),
  };
}

function memeToSources(meme: FloraFaunaMeme): UniverseSource[] {
  const source: UniverseSource[] = [
    {
      id: `${meme.id}-meme`,
      url: `/flora-fauna/memes/${meme.id}`,
      title: meme.title,
      domain: 'memetics',
      snippet: meme.summary ?? 'Memetic artifact',
      extractedAt: meme.createdAt,
    },
  ];

  if (meme.channel?.id) {
    source.push({
      id: `${meme.channel.id}-channel`,
      url: `/flora-fauna/channels/${meme.channel.id}`,
      title: meme.channel.title,
      domain: 'memetics-channel',
    });
  }

  return source;
}

function normalizeAttentionScore(value: unknown): number {
  if (typeof value === 'number') {
    return clamp(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return clamp(parsed);
    }
  }
  return 0.35;
}

export function buildMemeticCelestialPacket(
  input: MemeticPacketInput,
  options: PacketBuildOptions = {},
): UniversePacket {
  const feed = (input?.feed ?? []).slice(0, 18);
  const channels = input?.channels ?? [];
  const pools = input?.pools ?? [];
  const effectiveFeed = feed.length > 0 ? feed : MEMETIC_DEMO;
  const mode: PacketMode =
    options.mode ??
    (feed.length > 0 ? 'live' : channels.length > 0 || pools.length > 0 ? 'read_only' : 'demo');
  const archetype = getCelestialArchetype('memetic_artifact');

  const channelLookup = new Map(channels.map((channel) => [channel.id, channel]));

  const stars: UniverseStar[] = effectiveFeed.map((meme, index) => {
    const attention = normalizeAttentionScore(meme.attentionScore);
    const freshness = normalizeRecency(meme.createdAt);
    const sourceDensity = normalizeSourceDensity((meme.ecology ? 2 : 1) + (meme.channel ? 1 : 0));
    const importance = clamp(0.22 + attention * 0.62);
    const x = clamp(0.3 + (index % 5) * 0.12);
    const y = clamp(0.18 + (meme.ecology ? meme.ecology.identityConfidence : 0.42) * 0.64);
    const z = clamp(0.28 + attention * 0.48 + (pools.length > 0 ? 0.08 : 0));
    const placement = deriveUniversePlacement({
      seed: `${meme.id}:${meme.title}`,
      axisScores: { x, y, z },
      axisReasoning: [
        {
          key: 'x',
          label: MEMETIC_AXES[0].label,
          score: x,
          explanation: 'Memetic nodes range from raw social traces to crafted artifacts with replay value.',
          confidence: 0.67,
        },
        {
          key: 'y',
          label: MEMETIC_AXES[1].label,
          score: y,
          explanation: 'Channel ecology and circulation depth set how local or diffuse the artifact appears.',
          confidence: 0.66,
        },
        {
          key: 'z',
          label: MEMETIC_AXES[2].label,
          score: z,
          explanation: 'Artifacts can stay narrative signal or connect to liquidity and pool pathways.',
          confidence: 0.64,
        },
      ],
      evidence: mode === 'live' ? clamp(0.62 + attention * 0.2) : 0.54,
      freshness,
      sourceDensity,
      importance,
      centrality: clamp(0.45 + attention * 0.35),
      controversy: 0.12,
    });

    const ecologyIdentity =
      meme.ecology?.ecologyIdentity ??
      channelLookup.get(meme.channelId)?.ecology?.ecologyIdentity ??
      'memetic-field';
    const channelId = meme.channel?.id ?? meme.channelId ?? 'unknown-channel';
    const channelTitle = meme.channel?.title ?? channelLookup.get(channelId)?.title ?? 'Unknown channel';
    const sources = memeToSources(meme);
    const sharesEstimate = Math.max(1, Math.round(attention * 50));

    return {
      id: `meme-${meme.id}`,
      label: meme.title,
      type: archetype.defaultStarType,
      color: archetype.color,
      size: 1 + importance * 0.95,
      coordinates: placement.finalCoordinates,
      connections: [],
      constellationIds: [`channel-${channelId}`, `ecology-${ecologyIdentity}`],
      placement,
      explainer: {
        title: meme.title,
        summary: meme.summary ?? 'Memetic artifact in shared circulation.',
        longDescription:
          meme.summary ??
          'This memetic artifact remains free to circulate while lineage and downstream value stay inspectable.',
        categoryLabel: channelTitle,
        starTypeLabel: 'Memetic artifact',
        domainLabel: 'Memetic celestial mesh',
        scopeLabel: ecologyIdentity,
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
        tags: ['memetics', ecologyIdentity, channelTitle.toLowerCase()],
        aliases: [meme.slug ?? meme.id],
      },
      metadata: {
        createdAt: meme.createdAt,
        participants: sharesEstimate,
        impact: sharesEstimate,
        entityType: 'memetic-artifact',
        categoryKey: channelId,
        channelId,
        ecologyIdentity,
        nodeFamily: archetype.family,
      },
    };
  });

  const relations: UniverseRelation[] = [];
  for (let index = 0; index < stars.length - 1; index += 1) {
    const left = stars[index];
    const right = stars[index + 1];
    relations.push({
      id: `${left.id}::${right.id}`,
      sourceId: left.id,
      targetId: right.id,
      relation: 'lineage drift',
      weight: 0.61,
      confidence: 0.65,
      evidence: 'Sequential memetic lineage and circulation continuity.',
    });
  }

  const byChannel = new Map<string, UniverseStar[]>();
  stars.forEach((star) => {
    const channelId = String(star.metadata.channelId ?? 'unknown-channel');
    const collection = byChannel.get(channelId) ?? [];
    collection.push(star);
    byChannel.set(channelId, collection);
  });

  const constellations = Array.from(byChannel.entries()).map(([channelId, channelStars]) => ({
    id: `channel-${channelId}`,
    name: `${channelStars[0]?.explainer.categoryLabel ?? 'Channel'} artifacts`,
    description: 'Memetic artifacts grouped by creator channel lineage.',
    color: archetype.color,
    starIds: channelStars.map((star) => star.id),
  }));

  stars.forEach((star) => {
    const neighborIds = relations
      .filter((relation) => relation.sourceId === star.id || relation.targetId === star.id)
      .map((relation) => (relation.sourceId === star.id ? relation.targetId : relation.sourceId));
    star.connections = neighborIds;
  });

  const fallbackState = resolveFallbackState(
    mode,
    options.fallbackMessage ??
      (mode === 'demo'
        ? 'Memetic celestial packet is running in deterministic demo mode while live feed services are unavailable.'
        : 'Memetic celestial packet is running in read-only mode until live feed services recover.'),
    mode === 'demo' ? 'Memetic demo packet' : 'Memetic read-only packet',
    'memetics',
  );

  return {
    id: 'memetic-celestial-packet',
    title: 'Memetic Artifact Mesh',
    description: 'Free-circulating meme artifacts rendered as celestial lineage nodes.',
    domain: {
      key: 'memetic-artifacts',
      title: 'Memetic Artifact Mesh',
      description: 'Memetic artifacts packaged into the shared celestial packet path.',
      surface: 'universe',
      scopeLabel: 'memetics',
      semanticAxes: MEMETIC_AXES,
    },
    stars,
    constellations,
    relations,
    snapshots: [
      {
        id: 'memetic-current',
        name: 'Current memetic mesh',
        version: 1,
        starCount: stars.length,
        current: true,
      },
    ],
    packetMeta: {
      status: mode === 'live' ? 'published' : mode,
      version: 1,
      coverage: mode === 'live' ? 1 : 0.62,
      sourceSummary:
        options.sourceSummary ??
        `${stars.length} memetic artifact nodes / ${constellations.length} channel constellations`,
      adminTopicKey: null,
    },
    filters: ['marketplace', 'community'],
    fallbackState,
    updatedAt: new Date().toISOString(),
  };
}

