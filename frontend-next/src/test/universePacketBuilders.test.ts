import { describe, expect, it } from 'vitest';
import { listFallbackEducationMapResources } from '@/lib/maps/fallbackMapData';
import { mapResourceToUniversePacket } from '@/components/maps/educationMapUniverseAdapter';
import { buildCanonicalUniversePacket } from '@/components/maps/universe/packetBuilders';

describe('buildCanonicalUniversePacket', () => {
  it('merges multiple packets into a scoped cross-domain universe packet', () => {
    const [firstMap, secondMap] = listFallbackEducationMapResources();

    expect(firstMap).toBeTruthy();
    expect(secondMap).toBeTruthy();

    const firstPacket = mapResourceToUniversePacket(firstMap!);
    const secondPacket = mapResourceToUniversePacket(secondMap!);
    const merged = buildCanonicalUniversePacket([firstPacket, secondPacket]);

    expect(merged).toBeTruthy();
    expect(merged?.title).toBe('Manara Shared Universe');
    expect(merged?.domain.surface).toBe('universe');
    expect(merged?.packetMeta?.sourceSummary).toContain('2 source domains');
    expect(merged?.stars.length).toBe(firstPacket.stars.length + secondPacket.stars.length);

    const scopedFirstStar = merged?.stars.find((star) => star.id === `${firstPacket.domain.key}::${firstPacket.stars[0].id}`);
    expect(scopedFirstStar).toBeTruthy();
    expect(scopedFirstStar?.connections.every((connectionId) => connectionId.startsWith(`${firstPacket.domain.key}::`))).toBe(true);
    expect(scopedFirstStar?.explainer.domainLabel).toBe(firstPacket.title);
    expect(merged?.constellations.some((constellation) => constellation.name.startsWith(`${firstPacket.title} / `))).toBe(true);
  });
});
