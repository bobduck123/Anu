import { describe, expect, it } from 'vitest';
import { deriveUniversePlacement } from '@/components/maps/universe/placement';

describe('deriveUniversePlacement', () => {
  it('honors fully authored coordinates when authored weight is 1', () => {
    const placement = deriveUniversePlacement({
      seed: 'authored-star',
      axisScores: { x: 0.2, y: 0.4, z: 0.8 },
      axisReasoning: [],
      evidence: 0.7,
      freshness: 0.6,
      sourceDensity: 0.5,
      importance: 0.8,
      centrality: 0.65,
      authoredCoordinates: { x: 12, y: -4, z: 30 },
      authoredWeight: 1,
    });

    expect(placement.anchorMode).toBe('authored');
    expect(placement.finalCoordinates).toEqual({ x: 12, y: -4, z: 30 });
  });

  it('keeps hybrid placement between derived and authored anchors', () => {
    const placement = deriveUniversePlacement({
      seed: 'hybrid-star',
      axisScores: { x: 0.9, y: 0.1, z: 0.6 },
      axisReasoning: [],
      evidence: 0.82,
      freshness: 0.77,
      sourceDensity: 0.45,
      importance: 0.91,
      centrality: 0.68,
      authoredCoordinates: { x: -20, y: 35, z: 12 },
      authoredWeight: 0.68,
    });

    expect(placement.anchorMode).toBe('hybrid');
    expect(placement.finalCoordinates).not.toEqual(placement.derivedCoordinates);
    expect(placement.finalCoordinates).not.toEqual(placement.authoredCoordinates);
    expect(placement.finalCoordinates.x).toBeGreaterThan(Math.min(placement.derivedCoordinates.x, -20));
    expect(placement.finalCoordinates.x).toBeLessThan(Math.max(placement.derivedCoordinates.x, -20));
  });
});
