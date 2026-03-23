import type { RealmSurface } from './types';

type RealmMatcher = {
  match: (pathname: string) => boolean;
  surface: RealmSurface;
};

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

const REALM_MATCHERS: RealmMatcher[] = [
  {
    match: (pathname) => routeStartsWith(pathname, ['/governance/model-registry']),
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
    match: (pathname) => routeStartsWith(pathname, ['/governance', '/transparency', '/docs']),
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
    match: (pathname) => routeStartsWith(pathname, ['/actions', '/events', '/relief']),
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
    match: (pathname) => routeStartsWith(pathname, ['/impact']),
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
    match: (pathname) => routeStartsWith(pathname, ['/community']),
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
    match: (pathname) => routeStartsWith(pathname, ['/constellations']),
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
    match: (pathname) => routeStartsWith(pathname, ['/universe']),
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
    match: (pathname) => routeStartsWith(pathname, ['/sandbox']),
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
    match: (pathname) => routeStartsWith(pathname, ['/education']),
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
