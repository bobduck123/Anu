import { describe, expect, it } from 'vitest';
import { buildCommunityUniversePacket } from '@/components/maps/communityUniverseAdapter';
import type { CommunityPost } from '@/data/adapters/communityAdapter';
import {
  getCommunityIntentStarIds,
  getCommunityNodeSurface,
  prioritizeRelatedCommunityPosts,
} from '@/ui-system/realms/celestial/communityCelestialPresentation';

const posts: CommunityPost[] = [
  {
    id: 'story-1',
    title: 'Garden round-up',
    author: {
      id: 1,
      username: 'river-stone',
      pseudonym: 'River Stone',
      role: 'storyteller',
    },
    content: 'Neighbors gathered in the garden and documented the harvest.',
    coverImage: 'https://example.com/story.jpg',
    layout: { imagePosition: 'top', imageSize: 50 },
    likes: 12,
    comments: 4,
    shares: 3,
    tags: ['stories', 'community'],
    createdAt: '2026-03-22T00:00:00.000Z',
    microcosm: 'Northside Gardens',
  },
  {
    id: 'news-1',
    title: 'Regional climate brief',
    author: {
      id: 2,
      username: 'bbc-news',
      pseudonym: 'BBC News',
      role: 'trusted source',
    },
    content: 'Trusted reporting on regional climate infrastructure.',
    coverImage: 'https://example.com/news.jpg',
    layout: { imagePosition: 'top', imageSize: 50 },
    likes: 0,
    comments: 0,
    shares: 0,
    tags: ['news'],
    createdAt: '2026-03-21T00:00:00.000Z',
    sourceUrl: 'https://example.com/news',
    sourceName: 'BBC News',
  },
  {
    id: 'impact-1',
    title: 'Commons contribution outcome',
    author: {
      id: 3,
      username: 'ember-field',
      pseudonym: 'Ember Field',
      role: 'member',
    },
    content: 'Contribution and participation translated into relief capacity.',
    coverImage: 'https://example.com/impact.jpg',
    layout: { imagePosition: 'top', imageSize: 50 },
    likes: 8,
    comments: 2,
    shares: 1,
    tags: ['impact', 'community'],
    createdAt: '2026-03-20T00:00:00.000Z',
    microcosm: 'Northside Gardens',
  },
];

describe('community celestial presentation', () => {
  it('filters the news intent down to trusted-source stars', () => {
    const packet = buildCommunityUniversePacket(posts, { mode: 'live' });

    const starIds = getCommunityIntentStarIds(packet, 'news');

    expect(starIds).toContain('community-news-1');
    expect(starIds).not.toContain('community-story-1');
  });

  it('uses chambers for trusted-source and impact stars', () => {
    const packet = buildCommunityUniversePacket(posts, { mode: 'live' });
    const trustedStar = packet.stars.find((star) => star.id === 'community-news-1');
    const impactStar = packet.stars.find((star) => star.id === 'community-impact-1');
    const storyStar = packet.stars.find((star) => star.id === 'community-story-1');

    expect(trustedStar).toBeDefined();
    expect(impactStar).toBeDefined();
    expect(storyStar).toBeDefined();
    expect(getCommunityNodeSurface(trustedStar!)).toBe('chamber');
    expect(getCommunityNodeSurface(impactStar!)).toBe('chamber');
    expect(getCommunityNodeSurface(storyStar!)).toBe('bubble');
  });

  it('prioritizes the focused post and closely related traces for the backup gallery', () => {
    const ordered = prioritizeRelatedCommunityPosts(posts, 'impact-1');

    expect(ordered[0]?.id).toBe('impact-1');
    expect(ordered[1]?.id).toBe('story-1');
  });
});
