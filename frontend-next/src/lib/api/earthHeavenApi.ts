import { apiFetch } from './client';

export type RedactionLevel = 'public' | 'trusted' | 'steward';
export type UniverseMode = 'mutual_aid' | 'events' | 'community' | 'coverage';
export type TimeWindow = '7d' | '30d' | '90d';

export interface EarthSummaryResponse {
  featureFlags: {
    earthEntryEnabled: boolean;
    earthSkyEnabled: boolean;
    heavenUniverseEnabled: boolean;
  };
  hero: {
    fulfillmentRate30d: number;
    medianResponseHours: number;
    activeRespondersNearby: number;
  };
  network: {
    reliefReserveRunwayMonths: number;
    coverageGapIndex: number;
    crisisMode: {
      active: boolean;
      eventSubmissionFrozen: boolean;
      escrowFrozen: boolean;
    };
  };
  liveNeeds: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    requested_units: number;
    fulfilled_units: number;
    queue_position?: number | null;
    is_sensitive: boolean;
    created_at?: string | null;
  }>;
  recentlyFulfilled: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    requested_units: number;
    fulfilled_units: number;
    is_sensitive: boolean;
    created_at?: string | null;
  }>;
  microcosms: Array<{
    id: number;
    name: string;
    description?: string | null;
    status: string;
    active_needs: number;
    active_offers: number;
    fulfilled_30d: number;
  }>;
  footprint: {
    time_units: number;
    goods_units: number;
    skills_units: number;
    logistics_units: number;
    verification_units: number;
    money_cents: number;
    impact_credits: number;
    microcosm_ids: number[];
  } | null;
  permissions: {
    authenticated: boolean;
    role: string;
    canViewSensitiveNeeds: boolean;
    canEnterUniverse: boolean;
  };
  educationLinks: Array<{ title: string; href: string }>;
}

export interface UniversePacket {
  universeMode: UniverseMode;
  generatedAt: string;
  bbox?: [number, number, number, number];
  zoomLevel: number;
  privacy: { kMin: number; resolutionMetersMin: number; redactionLevel: RedactionLevel };
  objects: {
    stars: Array<{
      id: string;
      kind: 'need' | 'offer' | 'fulfillment' | 'post' | 'event' | 'action';
      x: number;
      y: number;
      z?: number | null;
      mass: number;
      brightness: number;
      colorKey: string;
      ttlSeconds?: number;
      privacyClass: 'public' | 'aggregate' | 'restricted';
      link?: { entityType: string; entityId: string; allowed: boolean };
    }>;
    constellations: Array<Record<string, unknown>>;
    galaxies: Array<Record<string, unknown>>;
    nebulas: Array<Record<string, unknown>>;
    flares: Array<Record<string, unknown>>;
  };
  drilldown: {
    starToEntity: Record<string, { entityType: string; entityId: string; allowed: boolean }>;
    constellationToQuery: Record<string, { query: string; allowed: boolean }>;
  };
  configVersion: string;
  evidenceHash: string;
}

export async function getEarthSummary(node?: number): Promise<EarthSummaryResponse> {
  const q = typeof node === 'number' ? `?node=${node}` : '';
  return apiFetch<EarthSummaryResponse>(`/api/earth/summary${q}`);
}

export async function getUniversePacket(params: {
  node?: number;
  universeMode?: UniverseMode;
  zoomLevel?: number;
  redactionLevel?: RedactionLevel;
  timeWindow?: TimeWindow;
  bbox?: [number, number, number, number];
  kMin?: number;
}): Promise<UniversePacket> {
  const search = new URLSearchParams();
  if (typeof params.node === 'number') search.set('node', String(params.node));
  if (params.universeMode) search.set('universeMode', params.universeMode);
  if (typeof params.zoomLevel === 'number') search.set('zoomLevel', String(params.zoomLevel));
  if (params.redactionLevel) search.set('redactionLevel', params.redactionLevel);
  if (params.timeWindow) search.set('timeWindow', params.timeWindow);
  if (typeof params.kMin === 'number') search.set('k_min', String(params.kMin));
  if (params.bbox) search.set('bbox', params.bbox.join(','));
  const qs = search.toString();
  return apiFetch<UniversePacket>(`/api/universe/packet${qs ? `?${qs}` : ''}`);
}

