export type AnuCommunitySurface =
  | 'commons-browse-frame'
  | 'status-language'
  | 'filter-control-bar'
  | 'gallery-backup-path'
  | 'composer-chamber';

export interface AnuCommunityModule {
  id: AnuCommunitySurface;
  title: string;
  route: string;
  purpose: string;
  notes: string;
}

export const COMMUNITY_COMMONS_CONTRACT_VERSION = 'm4.2026-04-01';

export const ANU_COMMUNITY_MODULES: readonly AnuCommunityModule[] = [
  {
    id: 'commons-browse-frame',
    title: 'Commons browse frame',
    route: '/community',
    purpose: 'Primary route framing for celestial community browse posture and context.',
    notes: 'Establishes route truth, publication context, and intent guidance before deep browse.',
  },
  {
    id: 'status-language',
    title: 'Status language',
    route: '/community',
    purpose: 'Declare live, cached, demo, and read-only publication states explicitly.',
    notes: 'Prevents fallback or degraded modes from masquerading as live publication.',
  },
  {
    id: 'filter-control-bar',
    title: 'Filter and control bar',
    route: '/community',
    purpose: 'Control intent region, sort posture, composer access, and refresh lifecycle.',
    notes: 'Keeps controls legible as tools, not decorative chrome.',
  },
  {
    id: 'gallery-backup-path',
    title: 'Gallery backup path',
    route: '/community',
    purpose: 'Maintain a 2D backup inspection mode derived from the same packet truth.',
    notes: 'Ensures browsing remains viable under reduced motion or starfield fallback conditions.',
  },
  {
    id: 'composer-chamber',
    title: 'Composer chamber',
    route: '/community?compose=1',
    purpose: 'Authenticated publication chamber for stories and articles entering the commons.',
    notes: 'Publishing language should stay accountable, local, and semantically clear.',
  },
] as const;

export const ANU_COMMUNITY_PROTOCOL_RULES = [
  'Community route must explicitly label live, cached, demo, and fallback publication modes.',
  'Filter and status controls must remain legible without relying on hover-only cues.',
  'Trusted signal overlays remain secondary to community publication and must be labeled.',
  'Composer chamber must preserve accountability language and safety guardrails before publish.',
] as const;

export function getCommunityCoverageSummary() {
  const uniqueRoutes = new Set(ANU_COMMUNITY_MODULES.map((module) => module.route));
  return {
    module_count: ANU_COMMUNITY_MODULES.length,
    rule_count: ANU_COMMUNITY_PROTOCOL_RULES.length,
    route_count: uniqueRoutes.size,
  };
}
