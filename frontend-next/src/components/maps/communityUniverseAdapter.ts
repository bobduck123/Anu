import type { CommunityPost } from '@/data/adapters/communityAdapter';
import { colorTokenToHex } from './presentation';
import {
  clamp,
  deriveUniversePlacement,
  normalizeRecency,
  normalizeSourceDensity,
} from './universe/placement';
import type {
  UniverseConstellation,
  UniverseFallbackState,
  UniversePacket,
  UniverseRelation,
  UniverseSource,
  UniverseStar,
  UniverseStarType,
} from './universe/types';

const COMMUNITY_AXES = [
  {
    key: 'x' as const,
    label: 'Embodied to abstract',
    minLabel: 'Embodied',
    maxLabel: 'Abstract',
    description: 'Whether a trace is grounded in lived action or in broader interpretation and narration.',
  },
  {
    key: 'y' as const,
    label: 'Local to federated',
    minLabel: 'Local',
    maxLabel: 'Federated',
    description: 'Whether a trace is rooted in a local cell or radiates across a wider public field.',
  },
  {
    key: 'z' as const,
    label: 'Signal to action',
    minLabel: 'Signal',
    maxLabel: 'Action',
    description: 'Whether a trace mostly reports conditions or directly changes the world around it.',
  },
];

const TAG_COLOR_TOKEN: Record<string, string> = {
  community: 'teal',
  education: 'cyan',
  events: 'sky',
  governance: 'amber',
  impact: 'gold',
  marketplace: 'violet',
  'mutual-aid': 'emerald',
  news: 'slate',
  relief: 'rose',
  stories: 'indigo',
};

export interface BuildCommunityUniversePacketOptions {
  mode?: UniverseFallbackState['mode'] | 'live';
  title?: string;
  description?: string;
  status?: string;
  sourceSummary?: string;
  fallbackMessage?: string;
}

type CommunityUniverseSeed = {
  post: CommunityPost;
  starId: string;
  tagKey: string;
  starType: UniverseStarType;
  sources: UniverseSource[];
  axisScores: {
    x: number;
    y: number;
    z: number;
  };
  evidence: number;
  freshness: number;
  sourceDensity: number;
  importance: number;
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 31) + value.charCodeAt(index);
  }

  return Math.abs(hash);
}

function toCommunityStarId(post: CommunityPost): string {
  return `community-${post.id}`;
}

function primaryTag(post: CommunityPost): string {
  return post.tags.find((tag) => tag.trim().length > 0)?.trim().toLowerCase() ?? 'community';
}

function starTypeForPost(post: CommunityPost): UniverseStarType {
  const tags = new Set(post.tags.map((tag) => tag.toLowerCase()));
  if (tags.has('relief') || tags.has('mutual-aid')) {
    return 'relief';
  }
  if (tags.has('education') || tags.has('skills')) {
    return 'education';
  }
  if (tags.has('marketplace')) {
    return 'marketplace';
  }
  if (tags.has('events')) {
    return 'event';
  }
  if (tags.has('governance') || tags.has('impact')) {
    return 'action';
  }
  return 'community';
}

function tagLabel(tag: string): string {
  return tag
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tagColor(tag: string): string {
  return colorTokenToHex(TAG_COLOR_TOKEN[tag] ?? 'sky');
}

function sourcesForPost(post: CommunityPost): UniverseSource[] {
  if (!post.sourceUrl) {
    return [];
  }

  return [
    {
      id: `${post.id}-source`,
      url: post.sourceUrl,
      title: post.title ?? post.sourceName ?? 'Community source',
      domain: post.sourceName,
      snippet: post.content.slice(0, 220),
      extractedAt: post.createdAt,
    },
  ];
}

function axisScoresForPost(post: CommunityPost, starType: UniverseStarType): { x: number; y: number; z: number } {
  const tags = new Set(post.tags.map((tag) => tag.toLowerCase()));
  const hasSource = Boolean(post.sourceUrl || post.sourceName);

  const embodiedWeight =
    (post.microcosm ? 0.24 : 0) +
    (tags.has('relief') || tags.has('mutual-aid') ? 0.22 : 0) +
    (tags.has('events') ? 0.16 : 0);
  const abstractWeight =
    (hasSource ? 0.18 : 0) +
    (tags.has('governance') ? 0.14 : 0) +
    (tags.has('education') ? 0.08 : 0);

  const localWeight = (post.microcosm ? 0.28 : 0) + (starType === 'relief' ? 0.12 : 0);
  const federatedWeight = (hasSource ? 0.24 : 0) + (tags.has('news') ? 0.12 : 0) + (tags.has('governance') ? 0.08 : 0);

  const actionWeight =
    (starType === 'relief' ? 0.22 : 0) +
    (starType === 'event' ? 0.14 : 0) +
    (starType === 'marketplace' ? 0.18 : 0) +
    (tags.has('mutual-aid') ? 0.12 : 0);
  const signalWeight = (hasSource ? 0.18 : 0) + (tags.has('news') ? 0.18 : 0) + (tags.has('stories') ? 0.08 : 0);

  return {
    x: clamp(0.48 - embodiedWeight + abstractWeight),
    y: clamp(0.46 - localWeight + federatedWeight),
    z: clamp(0.52 - signalWeight + actionWeight),
  };
}

function engagementScore(post: CommunityPost): number {
  return post.likes + post.comments * 2 + post.shares * 3;
}

function selectionScore(post: CommunityPost): number {
  const freshness = normalizeRecency(post.createdAt);
  return freshness * 0.58 + clamp(engagementScore(post) / 150) * 0.42;
}

function rankPosts(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((left, right) => {
    const scoreDelta = selectionScore(right) - selectionScore(left);
    if (Math.abs(scoreDelta) > 0.0001) {
      return scoreDelta;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

function limitPosts(posts: CommunityPost[]): CommunityPost[] {
  return rankPosts(posts).slice(0, 24);
}

function buildSeed(post: CommunityPost): CommunityUniverseSeed {
  const tagKey = primaryTag(post);
  const starType = starTypeForPost(post);
  const sources = sourcesForPost(post);
  const freshness = normalizeRecency(post.createdAt);
  const sourceDensity = normalizeSourceDensity(post.tags.length + (post.sourceUrl ? 1 : 0) + (post.microcosm ? 1 : 0));
  const evidence = clamp(0.34 + (sources.length > 0 ? 0.3 : 0) + clamp(engagementScore(post) / 220) * 0.22);
  const importance = clamp(0.26 + freshness * 0.24 + clamp(engagementScore(post) / 140) * 0.5);

  return {
    post,
    starId: toCommunityStarId(post),
    tagKey,
    starType,
    sources,
    axisScores: axisScoresForPost(post, starType),
    evidence,
    freshness,
    sourceDensity,
    importance,
  };
}

function relationshipScore(left: CommunityUniverseSeed, right: CommunityUniverseSeed): number {
  let score = 0;

  const sharedTags = left.post.tags.filter((tag) => right.post.tags.includes(tag)).length;
  if (sharedTags > 0) {
    score += sharedTags * 2;
  }
  if (left.post.microcosm && right.post.microcosm && left.post.microcosm === right.post.microcosm) {
    score += 3;
  }
  if (left.post.sourceName && right.post.sourceName && left.post.sourceName === right.post.sourceName) {
    score += 2;
  }
  if (left.starType === right.starType) {
    score += 1;
  }

  return score;
}

function relationLabel(left: CommunityUniverseSeed, right: CommunityUniverseSeed): string {
  if (left.post.microcosm && right.post.microcosm && left.post.microcosm === right.post.microcosm) {
    return 'same microcosm';
  }
  if (left.post.sourceName && right.post.sourceName && left.post.sourceName === right.post.sourceName) {
    return 'same source';
  }
  return 'shared thread';
}

function relationEvidence(left: CommunityUniverseSeed, right: CommunityUniverseSeed): string {
  if (left.post.microcosm && right.post.microcosm && left.post.microcosm === right.post.microcosm) {
    return `Both traces are rooted in ${left.post.microcosm}.`;
  }

  if (left.post.sourceName && right.post.sourceName && left.post.sourceName === right.post.sourceName) {
    return `Both traces come through ${left.post.sourceName}.`;
  }

  const sharedTags = left.post.tags.filter((tag) => right.post.tags.includes(tag)).slice(0, 2);
  if (sharedTags.length > 0) {
    return `These traces share tags including ${sharedTags.join(', ')}.`;
  }

  return 'These traces stay connected through the same type of community activity.';
}

function buildRelations(seeds: CommunityUniverseSeed[]): UniverseRelation[] {
  const rankedPairs: Array<{ left: CommunityUniverseSeed; right: CommunityUniverseSeed; score: number }> = [];

  for (let leftIndex = 0; leftIndex < seeds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < seeds.length; rightIndex += 1) {
      const left = seeds[leftIndex];
      const right = seeds[rightIndex];
      const score = relationshipScore(left, right);
      if (score > 0) {
        rankedPairs.push({ left, right, score });
      }
    }
  }

  rankedPairs.sort((left, right) => right.score - left.score);
  const perStarCounts = new Map<string, number>();
  const relations: UniverseRelation[] = [];

  rankedPairs.forEach((pair) => {
    const leftCount = perStarCounts.get(pair.left.starId) ?? 0;
    const rightCount = perStarCounts.get(pair.right.starId) ?? 0;
    if (leftCount >= 3 || rightCount >= 3) {
      return;
    }

    relations.push({
      id: `${pair.left.starId}::${pair.right.starId}`,
      sourceId: pair.left.starId,
      targetId: pair.right.starId,
      relation: relationLabel(pair.left, pair.right),
      weight: clamp(pair.score / 8),
      confidence: clamp(0.45 + pair.score / 10),
      evidence: relationEvidence(pair.left, pair.right),
    });

    perStarCounts.set(pair.left.starId, leftCount + 1);
    perStarCounts.set(pair.right.starId, rightCount + 1);
  });

  return relations;
}

function connectionsForStar(relations: UniverseRelation[], starId: string): string[] {
  const connections = new Set<string>();
  relations.forEach((relation) => {
    if (relation.sourceId === starId) {
      connections.add(relation.targetId);
    }
    if (relation.targetId === starId) {
      connections.add(relation.sourceId);
    }
  });
  return Array.from(connections);
}

function axisReasoning(seed: CommunityUniverseSeed): UniverseStar['placement']['axisReasoning'] {
  return [
    {
      key: 'x',
      label: COMMUNITY_AXES[0].label,
      score: seed.axisScores.x,
      explanation:
        seed.post.microcosm || seed.starType === 'relief'
          ? 'This trace stays close to lived community action and local stewardship.'
          : 'This trace leans toward interpretation, narrative framing, or institutional reflection.',
      confidence: clamp(0.58 + seed.sourceDensity * 0.3),
    },
    {
      key: 'y',
      label: COMMUNITY_AXES[1].label,
      score: seed.axisScores.y,
      explanation:
        seed.post.sourceName
          ? 'This trace travels through a broader public channel rather than a single neighborhood cell.'
          : 'This trace is anchored in a local social context, group, or microcosm.',
      confidence: clamp(0.56 + seed.freshness * 0.24),
    },
    {
      key: 'z',
      label: COMMUNITY_AXES[2].label,
      score: seed.axisScores.z,
      explanation:
        seed.starType === 'relief' || seed.starType === 'event' || seed.starType === 'marketplace'
          ? 'This trace indicates a direct change in care, exchange, or coordination.'
          : 'This trace mainly signals a condition, memory, or narrative that may later drive action.',
      confidence: clamp(0.54 + seed.evidence * 0.28),
    },
  ];
}

function buildConstellations(seeds: CommunityUniverseSeed[]): UniverseConstellation[] {
  const byTag = new Map<string, CommunityUniverseSeed[]>();

  seeds.forEach((seed) => {
    const collection = byTag.get(seed.tagKey) ?? [];
    collection.push(seed);
    byTag.set(seed.tagKey, collection);
  });

  return Array.from(byTag.entries())
    .map(([tagKey, tagSeeds]) => ({
      id: `community-${tagKey}`,
      name: `${tagLabel(tagKey)} threads`,
      description: `Community traces grouped around ${tagLabel(tagKey).toLowerCase()} activity.`,
      color: tagColor(tagKey),
      starIds: tagSeeds.map((seed) => seed.starId),
    }))
    .sort((left, right) => right.starIds.length - left.starIds.length);
}

function fallbackStateForMode(mode: BuildCommunityUniversePacketOptions['mode'], message?: string): UniverseFallbackState | null {
  if (!mode || mode === 'live') {
    return null;
  }

  return {
    active: true,
    mode,
    label:
      mode === 'demo'
        ? 'Community demo universe'
        : mode === 'local'
          ? 'Local community universe'
          : 'Read-only community universe',
    message:
      message ??
      (mode === 'demo'
        ? 'This community universe is rendering deterministic local demo traces.'
        : 'This community universe is rendering a degraded read-only packet so the shared scene remains inspectable.'),
    source: mode === 'local' ? 'local' : 'community',
  };
}

export function buildCommunityUniversePacket(
  posts: CommunityPost[],
  options: BuildCommunityUniversePacketOptions = {},
): UniversePacket {
  const selectedPosts = limitPosts(posts);
  const seeds = selectedPosts.map(buildSeed);
  const relations = buildRelations(seeds);
  const maxConnectionCount = Math.max(1, ...seeds.map((seed) => connectionsForStar(relations, seed.starId).length));
  const constellations = buildConstellations(seeds);
  const constellationByTag = new Map(constellations.map((constellation) => [constellation.id.replace(/^community-/, ''), constellation]));

  const stars: UniverseStar[] = seeds.map((seed) => {
    const connections = connectionsForStar(relations, seed.starId);
    const centrality = clamp(connections.length / maxConnectionCount);
    const constellation = constellationByTag.get(seed.tagKey);
    const placement = deriveUniversePlacement({
      seed: seed.starId,
      axisScores: seed.axisScores,
      axisReasoning: axisReasoning(seed),
      evidence: seed.evidence,
      freshness: seed.freshness,
      sourceDensity: seed.sourceDensity,
      importance: seed.importance,
      centrality,
      controversy: seed.post.sourceName ? 0.12 : 0.06,
    });
    const color = tagColor(seed.tagKey);

    return {
      id: seed.starId,
      label: seed.post.title ?? seed.post.author.pseudonym,
      type: seed.starType,
      color,
      size: 1 + seed.importance * 0.9,
      coordinates: placement.finalCoordinates,
      connections,
      constellationIds: constellation ? [constellation.id] : [],
      placement,
      explainer: {
        title: seed.post.title ?? seed.post.author.pseudonym,
        summary: seed.post.content,
        longDescription: seed.post.sourceName
          ? `${seed.post.content} This trace is linked to ${seed.post.sourceName} and remains source-linked inside the shared community universe.`
          : `${seed.post.content} This trace is rooted in community participation and remains inspectable through the shared community universe view.`,
        categoryLabel: tagLabel(seed.tagKey),
        starTypeLabel: tagLabel(seed.starType),
        domainLabel: 'Manara Community Universe',
        scopeLabel: seed.post.microcosm ?? 'community-wide',
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
        primarySource: seed.sources[0],
        sources: seed.sources,
        tags: seed.post.tags,
        aliases: [seed.post.author.pseudonym, seed.post.author.username].filter(Boolean),
      },
      metadata: {
        createdAt: seed.post.createdAt,
        participants: seed.post.comments + 1,
        impact: engagementScore(seed.post),
        entityType: seed.post.sourceName ? 'trusted-source-trace' : 'community-trace',
        categoryKey: seed.tagKey,
        pinned: seed.importance > 0.82,
        microcosm: seed.post.microcosm,
        sourceName: seed.post.sourceName,
      },
    };
  });

  const latestTimestamp = selectedPosts
    .map((post) => Date.parse(post.createdAt))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => right - left)[0];
  const fallbackState = fallbackStateForMode(options.mode, options.fallbackMessage);

  return {
    id: `community-universe-${hashString(selectedPosts.map((post) => post.id).join('|') || 'empty')}`,
    title: options.title ?? 'Manara Community Universe',
    description:
      options.description ??
      'A shared community packet composed from stories, trusted news, and public traces so local participation becomes inspectable in the same universe language as the rest of ANU.',
    domain: {
      key: 'community',
      title: 'Manara Community Universe',
      description: 'Community traces normalized onto the shared universe contract.',
      surface: 'community',
      scopeLabel: 'community-wide',
      semanticAxes: COMMUNITY_AXES,
    },
    stars,
    constellations,
    relations,
    snapshots: [
      {
        id: 'community-current',
        name: 'Current community packet',
        version: 1,
        starCount: stars.length,
        createdAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined,
        current: true,
      },
    ],
    packetMeta: {
      status: options.status ?? (fallbackState ? fallbackState.mode : 'published'),
      version: 1,
      coverage: posts.length > 0 ? clamp(selectedPosts.length / posts.length) : 1,
      sourceSummary:
        options.sourceSummary ??
        `${selectedPosts.length} community traces / ${relations.length} shared relations / ${constellations.length} constellations`,
      adminTopicKey: null,
    },
    filters: Array.from(new Set(stars.map((star) => star.type))),
    fallbackState,
    updatedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined,
  };
}
