import { describe, expect, it } from 'vitest';
import {
  buildImpactCelestialPacket,
  buildMemeticCelestialPacket,
} from '@/components/maps/celestial/celestialPacketAdapter';

describe('celestialPacketAdapter', () => {
  it('builds a published impact packet from live summary input', () => {
    const packet = buildImpactCelestialPacket(
      {
        actions_completed: 21,
        event_attendance: 54,
        relief_paid_cents: 208000,
        savings_cents: 68000,
      },
      { mode: 'live' },
    );

    expect(packet.domain.key).toBe('impact-outcomes');
    expect(packet.packetMeta?.status).toBe('published');
    expect(packet.fallbackState).toBeNull();
    expect(packet.stars.length).toBeGreaterThanOrEqual(4);
    expect(packet.constellations[0]?.id).toBe('impact-outcome-arc');
  });

  it('builds a live memetic packet when feed artifacts are available', () => {
    const packet = buildMemeticCelestialPacket(
      {
        feed: [
          {
            id: 'meme-1',
            channelId: 'channel-1',
            slug: 'first',
            title: 'First artifact',
            summary: 'A crafted memetic shard.',
            attentionScore: 0.7,
            createdAt: '2026-04-05T00:00:00.000Z',
            channel: { id: 'channel-1', slug: 'channel-1', title: 'Channel One' },
          },
        ],
      },
      { mode: 'live' },
    );

    expect(packet.domain.key).toBe('memetic-artifacts');
    expect(packet.packetMeta?.status).toBe('published');
    expect(packet.fallbackState).toBeNull();
    expect(packet.stars).toHaveLength(1);
  });

  it('falls back honestly for memetics when live feed is unavailable', () => {
    const packet = buildMemeticCelestialPacket(
      {
        feed: [],
        channels: [
          {
            id: 'channel-2',
            slug: 'channel-2',
            title: 'Fallback Channel',
            creatorUserId: '42',
            sharePolicy: 'free',
            memes: [],
            ecology: null,
            moderation: { openFlags: 0, openCases: 0 },
          },
        ],
      },
      { mode: 'read_only' },
    );

    expect(packet.packetMeta?.status).toBe('read_only');
    expect(packet.fallbackState?.active).toBe(true);
    expect(packet.fallbackState?.mode).toBe('read_only');
    expect(packet.stars.length).toBeGreaterThan(0);
  });
});

