import { MapMetrics, ScoringWeights } from '../domain/types';
import { clamp, normalizeScore, round } from './utils';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  importance: 0.3,
  popularity: 0.1,
  evidence: 0.3,
  centrality: 0.15,
  complexity: 0.1,
  freshness: 0.05,
};

export const DEFAULT_SIZE_FORMULA =
  '0.30 * importance + 0.10 * popularity + 0.30 * evidence + 0.15 * centrality + 0.10 * complexity + 0.05 * freshness';

export function computeSizeScore(
  metrics: Pick<MapMetrics, 'importance' | 'popularity' | 'evidence' | 'centrality' | 'complexity' | 'freshness'>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): number {
  return round(
    normalizeScore(metrics.importance) * weights.importance +
      normalizeScore(metrics.popularity) * weights.popularity +
      normalizeScore(metrics.evidence) * weights.evidence +
      normalizeScore(metrics.centrality) * weights.centrality +
      normalizeScore(metrics.complexity) * weights.complexity +
      normalizeScore(metrics.freshness) * weights.freshness,
  );
}

export function computeRenderRadius(sizeScore: number, minR = 1.8, maxR = 6.2): number {
  const normalized = clamp(sizeScore, 0, 1);
  return round(minR + (maxR - minR) * Math.sqrt(normalized));
}

export function finalizeMetrics(
  partial: Partial<Omit<MapMetrics, 'sizeScore' | 'renderRadius'>>,
  overrides: Partial<Pick<MapMetrics, 'centrality'>> = {},
): MapMetrics {
  const importance = normalizeScore(partial.importance);
  const popularity = normalizeScore(partial.popularity);
  const evidence = normalizeScore(partial.evidence);
  const centrality = normalizeScore(overrides.centrality ?? partial.centrality);
  const complexity = normalizeScore(partial.complexity);
  const freshness = normalizeScore(partial.freshness);

  const sizeScore = computeSizeScore({
    importance,
    popularity,
    evidence,
    centrality,
    complexity,
    freshness,
  });

  return {
    importance: round(importance),
    popularity: round(popularity),
    evidence: round(evidence),
    centrality: round(centrality),
    complexity: round(complexity),
    controversy: round(normalizeScore(partial.controversy)),
    freshness: round(freshness),
    sizeScore,
    renderRadius: computeRenderRadius(sizeScore),
  };
}
