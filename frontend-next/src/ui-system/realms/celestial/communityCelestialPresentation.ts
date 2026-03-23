import type { CommunityPost } from '@/data/adapters/communityAdapter';
import type { UniversePacket, UniverseStar } from '@/components/maps/universe/types';

export type CommunityCelestialIntent =
  | 'stories'
  | 'news'
  | 'topics'
  | 'moods'
  | 'local'
  | 'global'
  | 'people';

export interface CommunityCelestialIntentOption {
  id: CommunityCelestialIntent;
  label: string;
  description: string;
}

export const COMMUNITY_CELESTIAL_INTENTS: readonly CommunityCelestialIntentOption[] = [
  {
    id: 'stories',
    label: 'Stories',
    description: 'Follow lived traces and authored community memory.',
  },
  {
    id: 'news',
    label: 'News',
    description: 'Open trusted public signals and wider reporting.',
  },
  {
    id: 'topics',
    label: 'Topics',
    description: 'Traverse the field by thread rather than chronology.',
  },
  {
    id: 'moods',
    label: 'Moods',
    description: 'Enter the area where affect, urgency, and momentum are strongest.',
  },
  {
    id: 'local',
    label: 'Local',
    description: 'Stay close to named microcosms and grounded local traces.',
  },
  {
    id: 'global',
    label: 'Global',
    description: 'Drift toward outward-facing and federated signals.',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Start from human traces and the voices behind them.',
  },
] as const;

function scoreSharedTags(left: string[], right: string[]): number {
  return left.filter((tag) => right.includes(tag)).length;
}

function communityFreshnessScore(post: CommunityPost): number {
  const ageMs = Date.now() - Date.parse(post.createdAt);
  const dayMs = 1000 * 60 * 60 * 24;
  if (Number.isNaN(ageMs)) {
    return 0;
  }
  return Math.max(0, 1 - ageMs / (dayMs * 30));
}

export function communityPostIdFromStarId(starId: string): string {
  return starId.replace(/^community-/, '');
}

export function shouldAutoFallbackToTwoDimensional(prefersReducedMotion: boolean): boolean {
  return prefersReducedMotion;
}

export function getCommunityNodeSurface(star: UniverseStar): 'bubble' | 'chamber' {
  if (star.metadata.sourceName || star.metadata.categoryKey === 'impact') {
    return 'chamber';
  }
  return 'bubble';
}

export function getCommunityIntentStarIds(
  packet: UniversePacket,
  intent: CommunityCelestialIntent,
): string[] {
  const stars = packet.stars;

  const filtered = stars.filter((star) => {
    const categoryKey = String(star.metadata.categoryKey ?? '').toLowerCase();
    const hasSource = Boolean(star.metadata.sourceName);
    const hasMicrocosm = Boolean(star.metadata.microcosm);

    switch (intent) {
      case 'stories':
        return categoryKey === 'stories' || !hasSource;
      case 'news':
        return hasSource || categoryKey === 'news';
      case 'topics':
        return true;
      case 'moods':
        return star.placement.freshness >= 0.45 || star.placement.importance >= 0.55;
      case 'local':
        return hasMicrocosm;
      case 'global':
        return !hasMicrocosm || hasSource;
      case 'people':
        return !hasSource || star.type === 'community';
      default:
        return true;
    }
  });

  const candidateStars = filtered.length > 0 ? filtered : stars;

  return [...candidateStars]
    .sort((left, right) => right.placement.importance - left.placement.importance)
    .map((star) => star.id);
}

export function prioritizeRelatedCommunityPosts(
  posts: CommunityPost[],
  focusPostId: string | null,
): CommunityPost[] {
  if (!focusPostId) {
    return posts;
  }

  const focusPost = posts.find((post) => post.id === focusPostId);
  if (!focusPost) {
    return posts;
  }

  return [...posts].sort((left, right) => {
    if (left.id === focusPostId) return -1;
    if (right.id === focusPostId) return 1;

    const leftScore =
      (left.sourceName && focusPost.sourceName && left.sourceName === focusPost.sourceName ? 4 : 0) +
      (left.microcosm && focusPost.microcosm && left.microcosm === focusPost.microcosm ? 3 : 0) +
      scoreSharedTags(left.tags, focusPost.tags) * 2 +
      communityFreshnessScore(left);
    const rightScore =
      (right.sourceName && focusPost.sourceName && right.sourceName === focusPost.sourceName ? 4 : 0) +
      (right.microcosm && focusPost.microcosm && right.microcosm === focusPost.microcosm ? 3 : 0) +
      scoreSharedTags(right.tags, focusPost.tags) * 2 +
      communityFreshnessScore(right);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}
