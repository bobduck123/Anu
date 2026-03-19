export type UniverseSurface = 'education' | 'community' | 'universe' | 'admin';
export type UniverseAxisKey = 'x' | 'y' | 'z';
export type UniverseAnchorMode = 'authored' | 'derived' | 'hybrid';
export type UniverseStarType =
  | 'event'
  | 'action'
  | 'community'
  | 'donor'
  | 'relief'
  | 'education'
  | 'marketplace';

export interface UniverseCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface UniverseSource {
  id: string;
  url: string;
  title?: string;
  domain?: string;
  snippet?: string;
  extractedAt?: string;
}

export interface UniversePlacementAxisReasoning {
  key: UniverseAxisKey;
  label: string;
  score: number;
  explanation: string;
  confidence: number;
}

export interface UniversePlacementScores {
  semanticAxisVector: Record<UniverseAxisKey, number>;
  evidence: number;
  freshness: number;
  sourceDensity: number;
  importance: number;
  centrality: number;
  controversy: number;
  anchorMode: UniverseAnchorMode;
  authoredCoordinates?: UniverseCoordinates;
  derivedCoordinates: UniverseCoordinates;
  finalCoordinates: UniverseCoordinates;
  rationale: string;
  axisReasoning: UniversePlacementAxisReasoning[];
}

export interface UniverseExplainerModel {
  title: string;
  summary: string;
  longDescription?: string;
  categoryLabel?: string;
  starTypeLabel: string;
  domainLabel?: string;
  scopeLabel?: string;
  metrics: {
    evidence: number;
    freshness: number;
    sourceDensity: number;
    importance: number;
    centrality: number;
    controversy: number;
  };
  placementRationale: string;
  axisReasoning: UniversePlacementAxisReasoning[];
  primarySource?: UniverseSource;
  sources: UniverseSource[];
  tags: string[];
  aliases: string[];
}

export interface UniverseStar {
  id: string;
  label: string;
  type: UniverseStarType;
  color: string;
  size: number;
  coordinates: UniverseCoordinates;
  connections: string[];
  constellationIds: string[];
  placement: UniversePlacementScores;
  explainer: UniverseExplainerModel;
  metadata: {
    createdAt?: string;
    participants: number;
    impact: number;
    entityType?: string;
    categoryKey?: string;
    pinned?: boolean;
    [key: string]: unknown;
  };
}

export interface UniverseConstellation {
  id: string;
  name: string;
  description: string;
  color: string;
  starIds: string[];
}

export interface UniverseDomainContext {
  key: string;
  title: string;
  description?: string;
  surface: UniverseSurface;
  tenantId?: string | null;
  scopeLabel?: string;
  semanticAxes: Array<{
    key: UniverseAxisKey;
    label: string;
    description?: string;
    minLabel?: string;
    maxLabel?: string;
  }>;
}

export interface UniverseFallbackState {
  active: boolean;
  mode: 'live' | 'read_only' | 'demo' | 'local';
  label: string;
  message: string;
  source: string;
}

export interface UniversePacket {
  id: string;
  title: string;
  description?: string;
  domain: UniverseDomainContext;
  stars: UniverseStar[];
  constellations: UniverseConstellation[];
  filters: UniverseStarType[];
  fallbackState?: UniverseFallbackState | null;
  updatedAt?: string;
}
