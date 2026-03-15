import { computeRenderRadius, computeSizeScore, DEFAULT_SCORING_WEIGHTS } from '../../src/maps/compiler/scoringEngine';

describe('scoringEngine', () => {
  it('uses the canonical size score weighting with reduced popularity and evidence equal to importance', () => {
    const sizeScore = computeSizeScore({
      importance: 0.8,
      popularity: 0.9,
      evidence: 0.8,
      centrality: 0.5,
      complexity: 0.4,
      freshness: 0.3,
    }, DEFAULT_SCORING_WEIGHTS);

    expect(sizeScore).toBeCloseTo(0.7, 3);
  });

  it('keeps the scoring formula stable for regression-sensitive weighting', () => {
    const sizeScore = computeSizeScore({
      importance: 0.9,
      popularity: 1,
      evidence: 0.2,
      centrality: 0.4,
      complexity: 0.5,
      freshness: 0.3,
    }, DEFAULT_SCORING_WEIGHTS);

    expect(sizeScore).toBeCloseTo(0.555, 3);
  });

  it('derives render radius using sqrt normalization', () => {
    const radius = computeRenderRadius(0.49, 2, 6);
    expect(radius).toBeCloseTo(4.8, 1);
  });
});
