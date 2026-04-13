import {
  INTERNAL_ROUTE_CANON,
  getRoutePurpose,
  getRoutesByPlane,
  getRoutesByRealm,
  resolveCanonicalRoute,
  type RoutePlane,
  type RouteRealm,
  type RouteThreshold,
} from './routePurposeRegistry';

export type ThresholdActorLabel = 'Public' | 'Participant' | 'Contributor' | 'Steward' | 'Operator';

export interface ThresholdMapping {
  actor: ThresholdActorLabel;
  threshold: RouteThreshold;
}

export interface ThresholdDefinition {
  threshold: RouteThreshold;
  summary: string;
  enforcementSurface: string;
}

export const THRESHOLD_REGISTRY: readonly ThresholdDefinition[] = [
  {
    threshold: 'OPEN',
    summary: 'Public-readable surface.',
    enforcementSurface: 'Public routes, archive index, transparency.',
  },
  {
    threshold: 'MEMBER',
    summary: 'Authenticated participant surface.',
    enforcementSurface: 'Actions, events, community participation.',
  },
  {
    threshold: 'VERIFIED_ACTOR',
    summary: 'Verified actor required for consequential input or effect.',
    enforcementSurface: 'Contribution, claim submission, commitment execution.',
  },
  {
    threshold: 'STEWARD',
    summary: 'Node-scoped governance or oversight authority.',
    enforcementSurface: 'Governance review, moderation, node curation.',
  },
  {
    threshold: 'OPERATOR',
    summary: 'Privileged control-plane execution.',
    enforcementSurface: 'Control routes, runtime health, tenant admin.',
  },
] as const;

export const DEFAULT_THRESHOLD_MAPPINGS: readonly ThresholdMapping[] = [
  { actor: 'Public', threshold: 'OPEN' },
  { actor: 'Participant', threshold: 'MEMBER' },
  { actor: 'Contributor', threshold: 'VERIFIED_ACTOR' },
  { actor: 'Steward', threshold: 'STEWARD' },
  { actor: 'Operator', threshold: 'OPERATOR' },
] as const;

const NON_FLAGSHIP_ROUTE_THRESHOLDS: ReadonlyArray<{ route: string; threshold: RouteThreshold; label: ThresholdActorLabel }> = [
  { route: INTERNAL_ROUTE_CANON.lab, threshold: 'STEWARD', label: 'Steward' },
] as const;

function startsWithRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getThresholdDefinition(threshold: RouteThreshold): ThresholdDefinition {
  return THRESHOLD_REGISTRY.find((entry) => entry.threshold === threshold) ?? THRESHOLD_REGISTRY[0];
}

export function mapActorToThreshold(actor: ThresholdActorLabel): RouteThreshold {
  return DEFAULT_THRESHOLD_MAPPINGS.find((entry) => entry.actor === actor)?.threshold ?? 'OPEN';
}

export function mapThresholdToActor(threshold: RouteThreshold): ThresholdActorLabel {
  return DEFAULT_THRESHOLD_MAPPINGS.find((entry) => entry.threshold === threshold)?.actor ?? 'Public';
}

export function getThresholdForRoute(pathname: string | null): RouteThreshold {
  const canonicalPath = resolveCanonicalRoute(pathname);
  if (!canonicalPath) {
    return 'OPEN';
  }

  const nonFlagshipMatch = NON_FLAGSHIP_ROUTE_THRESHOLDS.find((entry) => startsWithRoute(canonicalPath, entry.route));
  if (nonFlagshipMatch) {
    return nonFlagshipMatch.threshold;
  }

  const routePurpose = getRoutePurpose(canonicalPath);
  return routePurpose?.threshold ?? 'OPEN';
}

export function getThresholdLabelForRoute(pathname: string | null): ThresholdActorLabel {
  const canonicalPath = resolveCanonicalRoute(pathname);
  if (!canonicalPath) {
    return 'Public';
  }

  const nonFlagshipMatch = NON_FLAGSHIP_ROUTE_THRESHOLDS.find((entry) => startsWithRoute(canonicalPath, entry.route));
  if (nonFlagshipMatch) {
    return nonFlagshipMatch.label;
  }

  const routePurpose = getRoutePurpose(canonicalPath);
  if (!routePurpose) {
    return 'Public';
  }

  return mapThresholdToActor(routePurpose.threshold);
}

export function getThresholdsByPlane(plane: RoutePlane): RouteThreshold[] {
  return Array.from(new Set(getRoutesByPlane(plane).map((entry) => entry.threshold)));
}

export function getThresholdsByRealm(realm: RouteRealm): RouteThreshold[] {
  return Array.from(new Set(getRoutesByRealm(realm).map((entry) => entry.threshold)));
}
