import { AxisDef, AxisKey, DiscoveredEntity, NodeAxisMeta, TopicProfile } from '../domain/types';
import { normalizeAxis, round, stableId } from './utils';

function inferAxisScore(entity: DiscoveredEntity, key: AxisKey): number {
  const seeded = entity.seedAxisScores?.[key];
  if (typeof seeded === 'number') {
    return normalizeAxis(seeded);
  }

  const importance = entity.metrics.importance ?? 0.5;
  const evidence = entity.metrics.evidence ?? 0.5;
  const popularity = entity.metrics.popularity ?? 0.5;

  if (key === 'x') {
    return normalizeAxis((importance - 0.5) * 1.2);
  }
  if (key === 'y') {
    return normalizeAxis((popularity - 0.5) * 1.2);
  }
  return normalizeAxis((evidence - 0.5) * 1.2);
}

function inferExplanation(entity: DiscoveredEntity, label: string, key: AxisKey, score: number): string {
  const seeded = entity.seedAxisExplanations?.[key];
  if (seeded) {
    return seeded;
  }

  const direction = score > 0.2 ? 'higher' : score < -0.2 ? 'lower' : 'near the midpoint';
  return `Placed ${direction} on ${label} because the available sources and metrics did not provide stronger rubric-specific evidence.`;
}

export function buildAxes(mapId: string, profile: TopicProfile): AxisDef[] {
  return profile.axisTemplates.map((axis) => ({
    id: stableId('axis', mapId, axis.key),
    mapId,
    key: axis.key,
    label: axis.label,
    minLabel: axis.minLabel,
    maxLabel: axis.maxLabel,
    description: axis.description,
    scoringMethod: axis.scoringMethod,
  }));
}

export function buildNodeAxisMeta(entity: DiscoveredEntity, axes: AxisDef[]): {
  axisScores: { x: number; y: number; z: number };
  axisMeta: NodeAxisMeta[];
} {
  const scores = {
    x: inferAxisScore(entity, 'x'),
    y: inferAxisScore(entity, 'y'),
    z: inferAxisScore(entity, 'z'),
  };

  const axisMeta: NodeAxisMeta[] = axes.map((axis) => {
    const score = scores[axis.key];
    return {
      key: axis.key,
      explanation: inferExplanation(entity, axis.label, axis.key, score),
      confidence: round(0.55 + Math.abs(score) * 0.35),
    };
  });

  return {
    axisScores: {
      x: round(scores.x),
      y: round(scores.y),
      z: round(scores.z),
    },
    axisMeta,
  };
}
