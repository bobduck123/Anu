import { resolveCanonicalRoute } from '@/ui-system/anu/routePurposeRegistry';

export type ConnectorProvenanceMode = 'source-backed' | 'verified-summary' | 'degraded-honesty';
export type ConnectorVisibilityCue = 'public-safe' | 'participant-only';

export interface JourneyConnectorEntry {
  id: string;
  sourceRoute: string;
  targetRoute: string;
  thresholdRequired: 'OPEN' | 'MEMBER' | 'STEWARD';
  provenanceMode: ConnectorProvenanceMode;
  archiveHandoffMode: 'none' | 'optional' | 'required';
  summary: string;
  visibilityCue?: ConnectorVisibilityCue;
}

export interface JourneyConnectorRailPayload {
  journeySlug: string;
  sourceRoute: string;
  connectors: JourneyConnectorEntry[];
  activeConnectors: JourneyConnectorEntry[];
  thresholdContext: {
    activeThresholds: Array<JourneyConnectorEntry['thresholdRequired']>;
    defaultThreshold: JourneyConnectorEntry['thresholdRequired'];
  };
  provenanceSummary: {
    sourceLabel: string;
    verificationPosture: 'verified-summary';
    freshnessHint: string;
  };
  archiveHandoff: {
    route: '/archive';
    recordRoute: string;
    reportRoute: string;
  };
  degradedHonesty: {
    isDegraded: boolean;
    reason: string | null;
    fallbackNote?: string | null;
  };
}

export const FLAGSHIP_JOURNEY_SLUG = 'knowledge-action-community-governance-archive';
export const FLAGSHIP_JOURNEY_SOURCE_ROUTE = '/education/maps/weaving-futures-atlas';
export const FLAGSHIP_JOURNEY_TERMINAL_ROUTE = '/archive';

export const FLAGSHIP_JOURNEY_CONNECTORS: readonly JourneyConnectorEntry[] = [
  {
    id: 'knowledge-to-actions',
    sourceRoute: '/education/maps/[mapId]',
    targetRoute: '/actions',
    thresholdRequired: 'MEMBER',
    provenanceMode: 'source-backed',
    archiveHandoffMode: 'none',
    summary: 'Move from map literacy into concrete action pathways.',
  },
  {
    id: 'knowledge-to-events',
    sourceRoute: '/education/maps/[mapId]',
    targetRoute: '/events',
    thresholdRequired: 'MEMBER',
    provenanceMode: 'source-backed',
    archiveHandoffMode: 'none',
    summary: 'Move from map reading into situated event pathways.',
  },
  {
    id: 'actions-to-community',
    sourceRoute: '/actions',
    targetRoute: '/community',
    thresholdRequired: 'MEMBER',
    provenanceMode: 'verified-summary',
    archiveHandoffMode: 'optional',
    summary: 'Action outcomes flow into shared community context.',
  },
  {
    id: 'events-to-community',
    sourceRoute: '/events',
    targetRoute: '/community',
    thresholdRequired: 'MEMBER',
    provenanceMode: 'verified-summary',
    archiveHandoffMode: 'optional',
    summary: 'Event participation flows into community memory.',
  },
  {
    id: 'community-to-model-registry',
    sourceRoute: '/community',
    targetRoute: '/governance/model-registry',
    thresholdRequired: 'STEWARD',
    provenanceMode: 'verified-summary',
    archiveHandoffMode: 'required',
    summary: 'Community consequence can be inspected in governance model form.',
  },
  {
    id: 'community-to-transparency',
    sourceRoute: '/community',
    targetRoute: '/transparency',
    thresholdRequired: 'OPEN',
    provenanceMode: 'verified-summary',
    archiveHandoffMode: 'required',
    summary: 'Community consequence stays legible through transparency surfaces.',
  },
  {
    id: 'model-registry-to-archive',
    sourceRoute: '/governance/model-registry',
    targetRoute: '/archive',
    thresholdRequired: 'OPEN',
    provenanceMode: 'source-backed',
    archiveHandoffMode: 'required',
    summary: 'Governance review resolves into archive memory.',
  },
  {
    id: 'transparency-to-archive',
    sourceRoute: '/transparency',
    targetRoute: '/archive',
    thresholdRequired: 'OPEN',
    provenanceMode: 'source-backed',
    archiveHandoffMode: 'required',
    summary: 'Trust reports land in archive records with stable deep links.',
  },
] as const;

function getVisibilityCue(thresholdRequired: JourneyConnectorEntry['thresholdRequired']): ConnectorVisibilityCue {
  return thresholdRequired === 'OPEN' ? 'public-safe' : 'participant-only';
}

function routePatternToRegex(routePattern: string): RegExp {
  const escaped = routePattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\[[^\]]+\\\]/g, '[^/]+');
  return new RegExp(`^${escaped}(?:/.*)?$`);
}

export function routeMatchesPattern(pathname: string, routePattern: string): boolean {
  return routePatternToRegex(routePattern).test(pathname);
}

export function normalizeConnectorSourceRoute(pathname: string | null): string {
  const canonicalPath = resolveCanonicalRoute(pathname);
  if (!canonicalPath) {
    return FLAGSHIP_JOURNEY_SOURCE_ROUTE;
  }

  if (canonicalPath.startsWith('/education/maps/')) {
    const parts = canonicalPath.split('/').filter(Boolean);
    const mapId = parts[2] || 'weaving-futures-atlas';
    return `/education/maps/${mapId}`;
  }

  if (canonicalPath === '/education') {
    return FLAGSHIP_JOURNEY_SOURCE_ROUTE;
  }

  return canonicalPath;
}

export function buildJourneyConnectorRailPayload(pathname: string | null): JourneyConnectorRailPayload {
  const sourceRoute = normalizeConnectorSourceRoute(pathname);
  const connectors = FLAGSHIP_JOURNEY_CONNECTORS.map((connector) => ({
    ...connector,
    visibilityCue: getVisibilityCue(connector.thresholdRequired),
  }));
  const activeConnectors = connectors.filter((connector) => routeMatchesPattern(sourceRoute, connector.sourceRoute));

  const thresholds = activeConnectors.map((connector) => connector.thresholdRequired);
  const uniqueThresholds = thresholds.filter((threshold, index) => thresholds.indexOf(threshold) === index);

  return {
    journeySlug: FLAGSHIP_JOURNEY_SLUG,
    sourceRoute,
    connectors,
    activeConnectors,
    thresholdContext: {
      activeThresholds: uniqueThresholds,
      defaultThreshold: uniqueThresholds[0] ?? 'OPEN',
    },
    provenanceSummary: {
      sourceLabel: 'Connector rail registry',
      verificationPosture: 'verified-summary',
      freshnessHint: 'Generated at request time from canonical journey contract.',
    },
    archiveHandoff: {
      route: '/archive',
      recordRoute: '/archive/knowledge-action-community-governance-archive-record',
      reportRoute: '/transparency?report=knowledge-action-community-governance-archive-trust-report',
    },
    degradedHonesty: {
      isDegraded: activeConnectors.length === 0 && sourceRoute !== '/archive',
      reason: activeConnectors.length === 0 && sourceRoute !== '/archive' ? 'no_connectors_for_source_route' : null,
      fallbackNote:
        activeConnectors.length === 0 && sourceRoute !== '/archive'
          ? 'Connector data is partial for this route. Continue from the canonical knowledge source to follow the flagship journey.'
          : null,
    },
  };
}

export function getJourneyDeadEndRoutes(): string[] {
  const outgoing = new Map<string, Set<string>>();
  const touched = new Set<string>();
  for (const connector of FLAGSHIP_JOURNEY_CONNECTORS) {
    touched.add(connector.sourceRoute);
    touched.add(connector.targetRoute);
    if (!outgoing.has(connector.sourceRoute)) {
      outgoing.set(connector.sourceRoute, new Set<string>());
    }
    outgoing.get(connector.sourceRoute)?.add(connector.targetRoute);
  }

  return [...touched]
    .filter((route) => route !== FLAGSHIP_JOURNEY_TERMINAL_ROUTE)
    .filter((route) => !outgoing.has(route));
}

export function hasArchivePathFromKnowledgeSource(): boolean {
  const source = '/education/maps/[mapId]';
  const target = FLAGSHIP_JOURNEY_TERMINAL_ROUTE;

  const outgoing = new Map<string, Set<string>>();
  for (const connector of FLAGSHIP_JOURNEY_CONNECTORS) {
    if (!outgoing.has(connector.sourceRoute)) {
      outgoing.set(connector.sourceRoute, new Set<string>());
    }
    outgoing.get(connector.sourceRoute)?.add(connector.targetRoute);
  }

  const queue = [source];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (current === target) {
      return true;
    }

    const nextRoutes = outgoing.get(current);
    if (!nextRoutes) {
      continue;
    }

    for (const nextRoute of nextRoutes) {
      if (!seen.has(nextRoute)) {
        queue.push(nextRoute);
      }
    }
  }

  return false;
}
