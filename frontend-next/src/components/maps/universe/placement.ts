import type {
  UniverseAnchorMode,
  UniverseAxisKey,
  UniverseCoordinates,
  UniversePlacementAxisReasoning,
  UniversePlacementScores,
} from './types';

export interface UniversePlacementInput {
  seed: string;
  axisScores: Record<UniverseAxisKey, number>;
  axisReasoning: UniversePlacementAxisReasoning[];
  evidence: number;
  freshness: number;
  sourceDensity: number;
  importance: number;
  centrality: number;
  controversy?: number;
  authoredCoordinates?: UniverseCoordinates;
  authoredWeight?: number;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function hashValue(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

export function normalizeRecency(extractedAt?: string): number {
  if (!extractedAt) {
    return 0.5;
  }

  const timestamp = Date.parse(extractedAt);
  if (Number.isNaN(timestamp)) {
    return 0.5;
  }

  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return clamp(1 - ageDays / 730);
}

export function normalizeSourceDensity(count: number): number {
  return clamp(count / 6);
}

export function hasMeaningfulCoordinates(coordinates?: UniverseCoordinates | null): coordinates is UniverseCoordinates {
  if (!coordinates) {
    return false;
  }

  return Math.abs(coordinates.x) + Math.abs(coordinates.y) + Math.abs(coordinates.z) > 0.001;
}

function mixNumber(left: number, right: number, weight: number): number {
  return left * (1 - weight) + right * weight;
}

function mixCoordinates(
  left: UniverseCoordinates,
  right: UniverseCoordinates,
  weight: number,
): UniverseCoordinates {
  return {
    x: mixNumber(left.x, right.x, weight),
    y: mixNumber(left.y, right.y, weight),
    z: mixNumber(left.z, right.z, weight),
  };
}

function deriveCoordinates(input: UniversePlacementInput): UniverseCoordinates {
  const axisX = input.axisScores.x - 0.5;
  const axisY = input.axisScores.y - 0.5;
  const axisZ = input.axisScores.z - 0.5;
  const seedHash = hashValue(input.seed);
  const seedHashTwo = hashValue(`${input.seed}:secondary`);

  return {
    x: axisX * 96 + (input.sourceDensity - 0.5) * 18 + (seedHash - 0.5) * 14,
    y: axisY * 96 + (input.freshness - 0.5) * 26 + (input.importance - 0.5) * 16,
    z: axisZ * 96 + (input.evidence - 0.5) * 24 + (input.centrality - 0.5) * 14 + (seedHashTwo - 0.5) * 12,
  };
}

function buildPlacementRationale(anchorMode: UniverseAnchorMode): string {
  if (anchorMode === 'authored') {
    return 'This star keeps an authored position as the primary anchor, with the semantic axes preserved for inspection rather than for visual override.';
  }

  if (anchorMode === 'hybrid') {
    return 'This star blends authored coordinates with derived placement so the universe stays curator-guided without losing its evidence and axis logic.';
  }

  return 'This star is placed from semantic axis scores, evidence, freshness, and source density so its position remains inspectable rather than decorative.';
}

export function deriveUniversePlacement(input: UniversePlacementInput): UniversePlacementScores {
  const evidence = clamp(input.evidence);
  const freshness = clamp(input.freshness);
  const sourceDensity = clamp(input.sourceDensity);
  const importance = clamp(input.importance);
  const centrality = clamp(input.centrality);
  const controversy = clamp(input.controversy ?? 0);
  const derivedCoordinates = deriveCoordinates({
    ...input,
    evidence,
    freshness,
    sourceDensity,
    importance,
    centrality,
    controversy,
  });

  const authoredCoordinates = hasMeaningfulCoordinates(input.authoredCoordinates) ? input.authoredCoordinates : undefined;
  const authoredWeight = clamp(input.authoredWeight ?? 0.68);
  const anchorMode: UniverseAnchorMode = authoredCoordinates
    ? authoredWeight >= 0.95
      ? 'authored'
      : 'hybrid'
    : 'derived';
  const finalCoordinates = authoredCoordinates
    ? mixCoordinates(derivedCoordinates, authoredCoordinates, authoredWeight)
    : derivedCoordinates;

  return {
    semanticAxisVector: {
      x: clamp(input.axisScores.x),
      y: clamp(input.axisScores.y),
      z: clamp(input.axisScores.z),
    },
    evidence,
    freshness,
    sourceDensity,
    importance,
    centrality,
    controversy,
    anchorMode,
    authoredCoordinates,
    derivedCoordinates,
    finalCoordinates,
    rationale: buildPlacementRationale(anchorMode),
    axisReasoning: input.axisReasoning,
  };
}
