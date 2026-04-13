export type AnuPrimitiveCategory =
  | 'hero-frame'
  | 'section-header'
  | 'cta'
  | 'panel'
  | 'chip'
  | 'filter'
  | 'instrumentation'
  | 'chamber';

export interface AnuPrimitiveManifestEntry {
  id: string;
  title: string;
  category: AnuPrimitiveCategory;
  component: string;
  variants: readonly string[];
  adoptedRoutes: readonly string[];
  notes: string;
}

export const MIN_SHARED_ROUTE_TARGET = 3;

export const ANU_PRIMITIVE_MANIFEST: readonly AnuPrimitiveManifestEntry[] = [
  {
    id: 'hero-frame',
    title: 'Route hero frame',
    category: 'hero-frame',
    component: 'AnuPageHero',
    variants: ['with-aside', 'no-aside'],
    adoptedRoutes: ['/home', '/auth', '/sandbox', '/contact', '/memberships', '/organizer'],
    notes: 'Keeps top-of-route anatomy consistent while preserving route-specific voice and copy.',
  },
  {
    id: 'section-header',
    title: 'Section heading block',
    category: 'section-header',
    component: 'AnuSectionHeading',
    variants: ['default'],
    adoptedRoutes: ['/contact', '/memberships', '/control/tenants', '/education/admin'],
    notes: 'Standard heading hierarchy for section breaks and local action context.',
  },
  {
    id: 'primary-cta',
    title: 'Primary ANU call-to-action',
    category: 'cta',
    component: 'AnuActionLink',
    variants: ['primary'],
    adoptedRoutes: ['/home', '/sandbox', '/contact', '/docs', '/transparency'],
    notes: 'Institutional primary action posture for route entry and next-step transitions.',
  },
  {
    id: 'secondary-cta',
    title: 'Secondary and ghost CTA family',
    category: 'cta',
    component: 'AnuActionLink',
    variants: ['secondary', 'ghost'],
    adoptedRoutes: ['/home', '/sandbox', '/contact', '/relief', '/transparency'],
    notes: 'Secondary progression links and contextual alternatives without visual collapse.',
  },
  {
    id: 'panel-variants',
    title: 'Panel variants',
    category: 'panel',
    component: 'AnuSurfacePanel',
    variants: ['shell', 'soft', 'quiet'],
    adoptedRoutes: ['/home', '/auth', '/sandbox', '/contact', '/actions', '/events', '/organizer', '/memberships'],
    notes: 'Shared panel language for shell, route sections, and utility surfaces.',
  },
  {
    id: 'chip-variants',
    title: 'Chip variants',
    category: 'chip',
    component: 'AnuChip',
    variants: ['signal', 'muted', 'accent'],
    adoptedRoutes: ['/home', '/auth', '/contact', '/profile', '/onboarding'],
    notes: 'Compact status and framing tags with consistent spacing and icon posture.',
  },
  {
    id: 'filter-bars',
    title: 'Filter and control bars',
    category: 'filter',
    component: 'AnuFilterBar + AnuControlButton',
    variants: ['default', 'active', 'warning'],
    adoptedRoutes: ['/actions', '/events', '/organizer', '/education/admin'],
    notes: 'Tool-like control surfaces for dense route state changes.',
  },
  {
    id: 'instrumentation-cards',
    title: 'Instrumentation cards',
    category: 'instrumentation',
    component: 'AnuInstrumentationCard',
    variants: ['steady', 'signal', 'warning'],
    adoptedRoutes: ['/contact', '/impact', '/runtime-health'],
    notes: 'Operational signal blocks for measurable runtime and route health context.',
  },
  {
    id: 'chamber-cards',
    title: 'Chamber cards',
    category: 'chamber',
    component: 'AnuChamberCard',
    variants: ['default', 'affirmed', 'alert'],
    adoptedRoutes: ['/profile', '/contact', '/community/microcosms'],
    notes: 'Private and semi-private chamber framing for accountable local coordination.',
  },
] as const;

export function getPrimitiveAdoptionSummary() {
  const uniqueRoutes = new Set(ANU_PRIMITIVE_MANIFEST.flatMap((entry) => entry.adoptedRoutes));
  return {
    family_count: ANU_PRIMITIVE_MANIFEST.length,
    unique_adopted_route_count: uniqueRoutes.size,
    minimum_shared_route_target: MIN_SHARED_ROUTE_TARGET,
    meets_shared_route_target: uniqueRoutes.size >= MIN_SHARED_ROUTE_TARGET,
  };
}
