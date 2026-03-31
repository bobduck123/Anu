import type { RealmSurface } from './types';

type RealmMatcher = {
  match: (pathname: string) => boolean;
  surface: RealmSurface;
};

export interface RealmRouteEntry {
  id: string;
  prefixes: readonly string[];
  surface: RealmSurface;
}

const DEFAULT_REALM_SURFACE: RealmSurface = {
  realm: 'neutral',
  strength: 'none',
  surfaceKind: 'standard',
  environmentTitle: 'Shared commons',
  entryPattern: 'none',
  supportsRealmTransition: false,
  fallbackMode: 'standard',
  hideSupportChrome: false,
  immersiveCanvas: false,
};

function routeStartsWith(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const REALM_ROUTE_REGISTRY: RealmRouteEntry[] = [
  {
    id: 'labyrinth-passage',
    prefixes: ['/governance/model-registry'],
    surface: {
      realm: 'labyrinth',
      strength: 'strong',
      surfaceKind: 'archive',
      environmentTitle: 'Archive passage',
      entryPattern: 'descent',
      supportsRealmTransition: true,
      fallbackMode: 'manuscript',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'labyrinth-threshold',
    prefixes: ['/governance', '/transparency', '/docs'],
    surface: {
      realm: 'labyrinth',
      strength: 'subtle',
      surfaceKind: 'archive',
      environmentTitle: 'Archive threshold',
      entryPattern: 'descent',
      supportsRealmTransition: true,
      fallbackMode: 'manuscript',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'earth-field',
    prefixes: ['/actions', '/events', '/relief'],
    surface: {
      realm: 'earth',
      strength: 'strong',
      surfaceKind: 'field',
      environmentTitle: 'Grounded field',
      entryPattern: 'grounded',
      supportsRealmTransition: true,
      fallbackMode: 'utility',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'earth-impact',
    prefixes: ['/impact'],
    surface: {
      realm: 'earth',
      strength: 'strong',
      surfaceKind: 'field',
      environmentTitle: 'Grounded ascent',
      entryPattern: 'bridge',
      supportsRealmTransition: true,
      fallbackMode: 'utility',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'private-chambers',
    prefixes: ['/profile', '/teams', '/community/microcosms'],
    surface: {
      realm: 'neutral',
      strength: 'strong',
      surfaceKind: 'internal',
      environmentTitle: 'Private chamber network',
      entryPattern: 'carving',
      supportsRealmTransition: true,
      fallbackMode: 'standard',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'celestial-weave',
    prefixes: ['/community'],
    surface: {
      realm: 'celestial',
      strength: 'strong',
      surfaceKind: 'starfield',
      environmentTitle: 'Celestial weave',
      entryPattern: 'carving',
      supportsRealmTransition: true,
      fallbackMode: 'two-dimensional',
      hideSupportChrome: true,
      immersiveCanvas: true,
    },
  },
  {
    id: 'celestial-threshold',
    prefixes: ['/constellations'],
    surface: {
      realm: 'celestial',
      strength: 'subtle',
      surfaceKind: 'starfield',
      environmentTitle: 'Starfield threshold',
      entryPattern: 'threshold',
      supportsRealmTransition: true,
      fallbackMode: 'two-dimensional',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'universe-track',
    prefixes: ['/universe'],
    surface: {
      realm: 'neutral',
      strength: 'none',
      surfaceKind: 'universe',
      environmentTitle: 'Universe track',
      entryPattern: 'threshold',
      supportsRealmTransition: false,
      fallbackMode: 'standard',
      hideSupportChrome: true,
      immersiveCanvas: true,
    },
  },
  {
    id: 'internal-lab',
    prefixes: ['/sandbox', '/lab'],
    surface: {
      realm: 'neutral',
      strength: 'subtle',
      surfaceKind: 'internal',
      environmentTitle: 'Internal lab',
      entryPattern: 'threshold',
      supportsRealmTransition: false,
      fallbackMode: 'standard',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
  {
    id: 'learning-pathways',
    prefixes: ['/education'],
    surface: {
      realm: 'neutral',
      strength: 'subtle',
      surfaceKind: 'standard',
      environmentTitle: 'Learning pathways',
      entryPattern: 'threshold',
      supportsRealmTransition: false,
      fallbackMode: 'standard',
      hideSupportChrome: false,
      immersiveCanvas: false,
    },
  },
];

const REALM_MATCHERS: RealmMatcher[] = REALM_ROUTE_REGISTRY.map((entry) => ({
  match: (pathname) => routeStartsWith(pathname, entry.prefixes),
  surface: entry.surface,
}));

export function getRealmSurface(pathname: string | null): RealmSurface {
  if (!pathname) {
    return DEFAULT_REALM_SURFACE;
  }

  const matched = REALM_MATCHERS.find((candidate) => candidate.match(pathname));
  return matched?.surface ?? DEFAULT_REALM_SURFACE;
}

export function isRealmSurface(pathname: string | null, realm: RealmSurface['realm']): boolean {
  return getRealmSurface(pathname).realm === realm;
}
