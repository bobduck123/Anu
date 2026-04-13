export type RoutePlane = 'public' | 'participant' | 'control';

export type RouteThreshold = 'OPEN' | 'MEMBER' | 'VERIFIED_ACTOR' | 'STEWARD' | 'OPERATOR';

export type RouteRealm = 'celestial' | 'earth' | 'labyrinth' | 'neutral' | 'control';

export type ThresholdActor = 'Public' | 'Participant' | 'Contributor' | 'Steward' | 'Operator';

export interface RoutePurposeEntry {
  route: string;
  plane: RoutePlane;
  realm: RouteRealm;
  purpose: string;
  primaryActor: ThresholdActor;
  keyInputs: readonly string[];
  keyOutputs: readonly string[];
  adjacentRoutes: readonly string[];
  degradedMode: string;
  thresholdLabel: ThresholdActor;
  threshold: RouteThreshold;
  provenanceTrustRequirement: string;
  notes: string;
}

export interface RouteAliasEntry {
  alias: string;
  canonical: string;
  status: 'legacy-redirect' | 'runtime-alias';
  rationale: string;
}

export const FLAGSHIP_ROUTE_CANON = {
  community: '/community',
  impact: '/impact',
  governanceModelRegistry: '/governance/model-registry',
  education: '/education',
  transparency: '/transparency',
  actions: '/actions',
  events: '/events',
  universe: '/universe',
  archive: '/archive',
  controlTenants: '/control/tenants',
  controlRuntimeHealth: '/control/runtime-health',
} as const;

export const INTERNAL_ROUTE_CANON = {
  lab: '/lab',
} as const;

export const ROUTE_ALIAS_REGISTRY: readonly RouteAliasEntry[] = [
  {
    alias: '/sandbox/ui-lab',
    canonical: INTERNAL_ROUTE_CANON.lab,
    status: 'legacy-redirect',
    rationale: 'M1/M2 canon: /lab is the canonical internal lab route; /sandbox/ui-lab remains a compatibility redirect.',
  },
] as const;

export const ROUTE_PURPOSE_REGISTRY: readonly RoutePurposeEntry[] = [
  {
    route: FLAGSHIP_ROUTE_CANON.community,
    plane: 'participant',
    realm: 'celestial',
    purpose: 'Surface live commons activity and participation pathways.',
    primaryActor: 'Participant',
    keyInputs: ['community feed', 'microcosm state', 'tenant semantics', 'user role'],
    keyOutputs: ['join prompts', 'activity context', 'route bridges'],
    adjacentRoutes: ['/events', '/impact', '/actions', '/community/microcosms/[id]', '/universe'],
    degradedMode: 'Reduced-motion and utility fallback with continuity of core information and exits.',
    thresholdLabel: 'Participant',
    threshold: 'MEMBER',
    provenanceTrustRequirement: 'Consequential community claims must retain source, freshness, or fallback honesty.',
    notes: 'Existing starfield fallback must remain.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.impact,
    plane: 'participant',
    realm: 'earth',
    purpose: 'Show grounded consequence across memberships, actions, pools, care, and outcomes.',
    primaryActor: 'Contributor',
    keyInputs: ['memberships', 'pools', 'challenges', 'care summaries', 'impact aggregates'],
    keyOutputs: ['outcome reading', 'care/contribution transitions', 'evidence handoffs'],
    adjacentRoutes: ['/memberships', '/pools', '/relief', '/events', '/community', '/transparency'],
    degradedMode: 'Preserve transitions and explicit degradation notice if feeds are partial.',
    thresholdLabel: 'Contributor',
    threshold: 'VERIFIED_ACTOR',
    provenanceTrustRequirement: 'Consequential metrics require source grouping and live/fallback clarity.',
    notes: 'Connector-driven bridges should replace hand-authored adjacency over time.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.governanceModelRegistry,
    plane: 'public',
    realm: 'labyrinth',
    purpose: 'Expose model registry for governance legibility and public inspection.',
    primaryActor: 'Steward',
    keyInputs: ['model definitions', 'version metadata', 'governance context', 'verification state'],
    keyOutputs: ['registry visibility', 'trust/archive transitions'],
    adjacentRoutes: ['/governance', '/transparency', '/archive', '/docs'],
    degradedMode: 'Show stale/partial state explicitly with canonical source pointers.',
    thresholdLabel: 'Steward',
    threshold: 'STEWARD',
    provenanceTrustRequirement: 'Model claims require status and verification posture.',
    notes: 'Editing remains control-plane only.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.education,
    plane: 'public',
    realm: 'neutral',
    purpose: 'Orient people from knowledge context into action pathways.',
    primaryActor: 'Public',
    keyInputs: ['learning modules', 'map links', 'journey context', 'route semantics'],
    keyOutputs: ['transitions into maps, routes, journeys, archive'],
    adjacentRoutes: ['/education/maps', '/universe', '/actions', '/events', '/community', '/archive'],
    degradedMode: 'Static navigable shell with explicit fallback honesty.',
    thresholdLabel: 'Public',
    threshold: 'OPEN',
    provenanceTrustRequirement: 'Consequential educational claims require provenance or explicit limitation note.',
    notes: 'Must never become a dead-end dashboard.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.transparency,
    plane: 'public',
    realm: 'labyrinth',
    purpose: 'Public trust and institutional disclosure surface.',
    primaryActor: 'Public',
    keyInputs: ['trust summaries', 'pool disclosures', 'sponsor disclosures', 'health posture'],
    keyOutputs: ['trust reading', 'disclosure inspection', 'archive/governance transitions'],
    adjacentRoutes: ['/docs', '/archive', '/governance/model-registry', '/impact'],
    degradedMode: 'Mark unavailable live sections while preserving trust context.',
    thresholdLabel: 'Public',
    threshold: 'OPEN',
    provenanceTrustRequirement: 'Every displayed claim requires provenance, disclosure, or a degraded honesty marker.',
    notes: 'First sponsor disclosure anchor surface.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.actions,
    plane: 'participant',
    realm: 'earth',
    purpose: 'Move users from understanding into concrete commitments and civic tasks.',
    primaryActor: 'Participant',
    keyInputs: ['action list', 'identity', 'node scope', 'participation history'],
    keyOutputs: ['commitment state', 'downstream community/impact effects'],
    adjacentRoutes: ['/events', '/community', '/impact', '/archive'],
    degradedMode: 'Preserve action pathway map when live detail is unavailable.',
    thresholdLabel: 'Participant',
    threshold: 'MEMBER',
    provenanceTrustRequirement: 'Action claims with consequence require source and completion posture.',
    notes: 'No dead-end action route allowed.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.events,
    plane: 'participant',
    realm: 'earth',
    purpose: 'Coordinate participation via gatherings and civic programs.',
    primaryActor: 'Participant',
    keyInputs: ['event feed', 'schedules', 'venue info', 'node scope'],
    keyOutputs: ['attendance', 'participation transitions', 'downstream impact linkage'],
    adjacentRoutes: ['/community', '/impact', '/actions', '/archive', '/education'],
    degradedMode: 'Schedule readability and key transitions must survive degraded state.',
    thresholdLabel: 'Participant',
    threshold: 'MEMBER',
    provenanceTrustRequirement: 'Event state must show source and freshness posture.',
    notes: 'weaving-futures-festival remains strong flagship candidate.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.universe,
    plane: 'public',
    realm: 'neutral',
    purpose: 'Aggregate cross-domain orientation and transition surface.',
    primaryActor: 'Public',
    keyInputs: ['map packets', 'community traces', 'domain metadata', 'featured journeys'],
    keyOutputs: ['route transitions across domains'],
    adjacentRoutes: ['/education', '/community', '/governance/model-registry', '/archive'],
    degradedMode: 'Utility fallback under reduced motion / low power.',
    thresholdLabel: 'Public',
    threshold: 'OPEN',
    provenanceTrustRequirement: 'Aggregated claims must expose source summaries.',
    notes: 'Connective surface, not governance or operator center of gravity.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.archive,
    plane: 'public',
    realm: 'labyrinth',
    purpose: 'Canonical institutional memory with deep-linkable records.',
    primaryActor: 'Public',
    keyInputs: ['trust reports', 'decisions', 'source-route metadata', 'visibility class'],
    keyOutputs: ['verifiable record access', 'citation', 'route back-links'],
    adjacentRoutes: ['/transparency', '/governance/model-registry', '/docs', 'source routes'],
    degradedMode: 'Show canonical references and last snapshot time if live index is unavailable.',
    thresholdLabel: 'Public',
    threshold: 'OPEN',
    provenanceTrustRequirement: 'Records require provenance, visibility, verification metadata, and redaction posture.',
    notes: 'Initial next-era addition.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.controlTenants,
    plane: 'control',
    realm: 'control',
    purpose: 'Privileged tenant and node administration.',
    primaryActor: 'Operator',
    keyInputs: ['control session', 'node/domain/config state', 'binding status'],
    keyOutputs: ['provision/update/inspect node tenancy'],
    adjacentRoutes: ['/control/runtime-health', '/control/nodes/[id]'],
    degradedMode: 'Unavailable on public hosts; fail closed on control auth failure.',
    thresholdLabel: 'Operator',
    threshold: 'OPERATOR',
    provenanceTrustRequirement: 'Every mutation must be audited with actor, scope, target, and result.',
    notes: 'Migration target from /admin/tenants.',
  },
  {
    route: FLAGSHIP_ROUTE_CANON.controlRuntimeHealth,
    plane: 'control',
    realm: 'control',
    purpose: 'Privileged runtime and service health operations surface.',
    primaryActor: 'Operator',
    keyInputs: ['service health checks', 'runtime contract status', 'release context'],
    keyOutputs: ['diagnosis', 'operator follow-up actions'],
    adjacentRoutes: ['/control/tenants', '/transparency'],
    degradedMode: 'Unavailable on public hosts; may show last known snapshot + timestamp.',
    thresholdLabel: 'Operator',
    threshold: 'OPERATOR',
    provenanceTrustRequirement: 'Every operational signal must include source and timestamp.',
    notes: 'Migration target from /admin/runtime-health.',
  },
] as const;

export const FLAGSHIP_ROUTE_LIST = ROUTE_PURPOSE_REGISTRY.map((entry) => entry.route);

function normalizePathname(pathname: string): string {
  const queryIndex = pathname.indexOf('?');
  const hashIndex = pathname.indexOf('#');
  const cutIndex = [queryIndex, hashIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return cutIndex === undefined ? pathname : pathname.slice(0, cutIndex);
}

function startsWithRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getRouteAlias(pathname: string | null): RouteAliasEntry | null {
  if (!pathname) {
    return null;
  }

  const normalized = normalizePathname(pathname);
  return ROUTE_ALIAS_REGISTRY.find((entry) => startsWithRoute(normalized, entry.alias)) ?? null;
}

export function resolveCanonicalRoute(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }

  const normalized = normalizePathname(pathname);
  const alias = getRouteAlias(normalized);
  if (!alias) {
    return normalized;
  }

  if (normalized === alias.alias) {
    return alias.canonical;
  }

  return `${alias.canonical}${normalized.slice(alias.alias.length)}`;
}

export function isFlagshipRoute(pathname: string | null): boolean {
  const canonicalPath = resolveCanonicalRoute(pathname);
  if (!canonicalPath) {
    return false;
  }

  return FLAGSHIP_ROUTE_LIST.some((route) => startsWithRoute(canonicalPath, route));
}

export function getRoutePurpose(pathname: string | null): RoutePurposeEntry | null {
  const canonicalPath = resolveCanonicalRoute(pathname);
  if (!canonicalPath) {
    return null;
  }

  return ROUTE_PURPOSE_REGISTRY.find((entry) => startsWithRoute(canonicalPath, entry.route)) ?? null;
}

export function getRoutesByPlane(plane: RoutePlane): RoutePurposeEntry[] {
  return ROUTE_PURPOSE_REGISTRY.filter((entry) => entry.plane === plane);
}

export function getRoutesByRealm(realm: RouteRealm): RoutePurposeEntry[] {
  return ROUTE_PURPOSE_REGISTRY.filter((entry) => entry.realm === realm);
}
