export type AnuChamberSurface =
  | 'profile-cockpit'
  | 'team-chambers'
  | 'microcosm-entry'
  | 'microcosm-detail'
  | 'inbox-stack'
  | 'organizer-pathway';

export interface AnuChamberModule {
  id: AnuChamberSurface;
  title: string;
  route: string;
  stewardAudience: string;
  primaryQueue: string;
  notes: string;
}

export const CHAMBER_METADATA_CONTRACT_VERSION = 'm3.2026-04-01';

export const ANU_CHAMBER_MODULES: readonly AnuChamberModule[] = [
  {
    id: 'profile-cockpit',
    title: 'Profile cockpit',
    route: '/profile',
    stewardAudience: 'participant, contributor, steward',
    primaryQueue: 'tasks and account continuity',
    notes: 'Private cockpit for identity, tasks, progression, and threshold continuity.',
  },
  {
    id: 'inbox-stack',
    title: 'Inbox stack',
    route: '/profile?tab=inbox',
    stewardAudience: 'participant, contributor, steward',
    primaryQueue: 'notifications and direct prompts',
    notes: 'Message and notification stack prioritizing semantic grouping over novelty.',
  },
  {
    id: 'organizer-pathway',
    title: 'Organizer pathway chamber',
    route: '/profile?tab=organizer',
    stewardAudience: 'participants crossing into organizer stewardship',
    primaryQueue: 'organizer application and progression',
    notes: 'Threshold chamber for organizer onboarding, review posture, and role transition.',
  },
  {
    id: 'team-chambers',
    title: 'Team chambers',
    route: '/teams',
    stewardAudience: 'signed-in team participants',
    primaryQueue: 'shared actions, members, and team momentum',
    notes: 'Semi-autonomous collective chambers inside a selected microcosm.',
  },
  {
    id: 'microcosm-entry',
    title: 'Microcosm entry',
    route: '/community/microcosms/join',
    stewardAudience: 'participants selecting local chamber membership',
    primaryQueue: 'join workflow and place selection',
    notes: 'Guided two-step entry into local chambers.',
  },
  {
    id: 'microcosm-detail',
    title: 'Microcosm detail chamber',
    route: '/community/microcosms/[id]',
    stewardAudience: 'microcosm members and observers',
    primaryQueue: 'local activity, story stream, and team linkage',
    notes: 'Local chamber detail with relation to teams and activity movement.',
  },
] as const;

export const ANU_CHAMBER_PROTOCOL_RULES = [
  'Private chamber surfaces must prioritize queue clarity over decorative novelty.',
  'Message and notification stacks must preserve semantic grouping and timestamp legibility.',
  'Microcosm and team chambers must keep local place identity visible at all times.',
  'Organizer pathway transitions must remain explicit, reviewable, and threshold-aware.',
] as const;

export function getChamberCoverageSummary() {
  const uniqueRoutes = new Set(ANU_CHAMBER_MODULES.map((module) => module.route));
  return {
    module_count: ANU_CHAMBER_MODULES.length,
    rule_count: ANU_CHAMBER_PROTOCOL_RULES.length,
    route_count: uniqueRoutes.size,
  };
}
