import { describe, expect, it } from 'vitest';
import { getFallbackEducationMap } from '@/lib/maps/fallbackMapData';
import { mapResourceToUniversePacket } from '@/components/maps/educationMapUniverseAdapter';
import { packetToQuantumData } from '@/components/maps/universe/UniverseScene';

describe('packetToQuantumData', () => {
  it('preserves packet coordinates and placement metadata while filtering to visible stars', () => {
    const map = getFallbackEducationMap('neural-civic-governance');
    expect(map).toBeTruthy();

    const packet = mapResourceToUniversePacket(map!);
    const visibleStarIds = packet.stars.slice(0, 2).map((star) => star.id);
    const visibleSet = new Set(visibleStarIds);

    const quantumData = packetToQuantumData(packet, visibleStarIds);

    expect(quantumData.stars).toHaveLength(2);
    expect(quantumData.filters).toEqual(packet.filters);
    expect(quantumData.constellations.every((constellation) => constellation.starIds.every((starId) => visibleSet.has(starId)))).toBe(true);

    const firstPacketStar = packet.stars[0];
    const firstQuantumStar = quantumData.stars.find((star) => star.id === firstPacketStar.id);

    expect(firstQuantumStar).toBeTruthy();
    expect(firstQuantumStar?.x).toBe(firstPacketStar.coordinates.x);
    expect(firstQuantumStar?.y).toBe(firstPacketStar.coordinates.y);
    expect(firstQuantumStar?.z).toBe(firstPacketStar.coordinates.z);
    expect(firstQuantumStar?.metadata.useProvidedCoordinates).toBe(true);
    expect(firstQuantumStar?.metadata.placement).toEqual(firstPacketStar.placement);
    expect(firstQuantumStar?.connections.every((targetId) => visibleSet.has(targetId))).toBe(true);
  });
});
