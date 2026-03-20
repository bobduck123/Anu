import { describe, expect, it } from 'vitest';
import { getFallbackEducationMap } from '@/lib/maps/fallbackMapData';
import { mapResourceToUniversePacket } from '@/components/maps/educationMapUniverseAdapter';
import {
  labelUniverseAnchorMode,
  labelUniverseStarType,
  starIndexLabel,
  universeIndexLabel,
} from '@/components/maps/universe/presentationTerms';
import { getCommunityDemoUniversePacket } from '@/components/maps/universe/fallbackPackets';

describe('shared universe ontology', () => {
  it('exposes canonical user-facing labels for star types and anchor modes', () => {
    expect(labelUniverseStarType('education')).toBe('Education');
    expect(labelUniverseStarType('marketplace')).toBe('Marketplace');
    expect(labelUniverseAnchorMode('authored')).toBe('Authored anchor');
    expect(labelUniverseAnchorMode('hybrid')).toBe('Hybrid anchor');
    expect(starIndexLabel()).toBe('Star index');
    expect(universeIndexLabel()).toBe('Universe index');
  });

  it('uses canonical star type labels in adapted education packets', () => {
    const map = getFallbackEducationMap('neural-civic-governance');
    expect(map).toBeTruthy();

    const packet = mapResourceToUniversePacket(map!);
    expect(packet.stars.length).toBeGreaterThan(0);

    for (const star of packet.stars) {
      expect(star.explainer.starTypeLabel).toBe(labelUniverseStarType(star.type));
      expect(star.explainer.starTypeLabel).not.toBe(star.type);
    }
  });

  it('uses canonical star type labels in fallback demo packets', () => {
    const packet = getCommunityDemoUniversePacket();

    expect(packet.stars.length).toBeGreaterThan(0);

    for (const star of packet.stars) {
      expect(star.explainer.starTypeLabel).toBe(labelUniverseStarType(star.type));
    }
  });
});
