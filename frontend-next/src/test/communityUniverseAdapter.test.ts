import { describe, expect, it } from 'vitest';
import { buildCommunityUniversePacket } from '@/components/maps/communityUniverseAdapter';
import type { CommunityPost } from '@/data/adapters/communityAdapter';

const SAMPLE_POSTS: CommunityPost[] = [
  {
    id: 'story-1',
    title: 'Mutual aid round-up',
    author: {
      id: 1,
      username: 'river-stone',
      pseudonym: 'River Stone',
      role: 'storyteller',
    },
    content: 'Local stewards delivered support packs across the neighborhood.',
    coverImage: 'https://example.com/story.jpg',
    layout: { imagePosition: 'top', imageSize: 50 },
    likes: 12,
    comments: 4,
    shares: 3,
    tags: ['mutual-aid', 'community'],
    createdAt: '2026-03-20T00:00:00.000Z',
    microcosm: 'Northside Gardens',
  },
  {
    id: 'news-1',
    title: 'Trusted bulletin',
    author: {
      id: 2,
      username: 'trusted-source',
      pseudonym: 'Trusted Source',
      role: 'trusted source',
    },
    content: 'A public-interest update on community support corridors.',
    coverImage: 'https://example.com/news.jpg',
    layout: { imagePosition: 'left', imageSize: 33 },
    likes: 0,
    comments: 0,
    shares: 0,
    tags: ['news', 'community'],
    createdAt: '2026-03-19T00:00:00.000Z',
    sourceUrl: 'https://example.com/news',
    sourceName: 'BBC News',
  },
  {
    id: 'article-1',
    title: 'Learning circle recap',
    author: {
      id: 3,
      username: 'morning-dew',
      pseudonym: 'Morning Dew',
      role: 'editor',
    },
    content: 'The civic learning circle expanded its weekly practice sessions.',
    coverImage: 'https://example.com/article.jpg',
    layout: { imagePosition: 'right', imageSize: 25 },
    likes: 5,
    comments: 2,
    shares: 1,
    tags: ['education', 'community'],
    createdAt: '2026-03-18T00:00:00.000Z',
    microcosm: 'Northside Gardens',
  },
];

describe('buildCommunityUniversePacket', () => {
  it('builds a live community packet from current community traces', () => {
    const packet = buildCommunityUniversePacket(SAMPLE_POSTS, {
      mode: 'live',
      sourceSummary: '3 live traces / shared packet',
    });

    expect(packet.title).toBe('Manara Community Universe');
    expect(packet.domain.surface).toBe('community');
    expect(packet.packetMeta?.status).toBe('published');
    expect(packet.fallbackState).toBeNull();
    expect(packet.stars).toHaveLength(3);
    expect(packet.constellations.length).toBeGreaterThan(0);
    expect(packet.filters).toEqual(expect.arrayContaining(['community', 'education', 'relief']));
    expect(packet.relations?.length).toBeGreaterThan(0);
    expect(packet.stars.some((star) => star.explainer.primarySource?.url === 'https://example.com/news')).toBe(true);
  });

  it('marks degraded packets honestly when community data is fallback-only', () => {
    const packet = buildCommunityUniversePacket(SAMPLE_POSTS, {
      mode: 'read_only',
      fallbackMessage: 'Community sources are degraded.',
    });

    expect(packet.fallbackState?.active).toBe(true);
    expect(packet.fallbackState?.mode).toBe('read_only');
    expect(packet.fallbackState?.message).toContain('degraded');
    expect(packet.packetMeta?.status).toBe('read_only');
  });
});
