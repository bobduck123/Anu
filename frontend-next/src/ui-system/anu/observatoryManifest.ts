export type AnuObservatorySurface =
  | 'trust-transparency'
  | 'trust-docs'
  | 'trust-contact'
  | 'trust-memberships'
  | 'subsystem-flora-fauna'
  | 'governance-observatory'
  | 'admin-runtime-health'
  | 'organizer-observatory';

export interface AnuObservatoryModule {
  id: AnuObservatorySurface;
  title: string;
  route: string;
  class: 'trust' | 'observatory' | 'subsystem';
  purpose: string;
  notes: string;
}

export const OBSERVATORY_CONTRACT_VERSION = 'm5.2026-04-01';

export const ANU_OBSERVATORY_MODULES: readonly AnuObservatoryModule[] = [
  {
    id: 'trust-transparency',
    title: 'Transparency truth surface',
    route: '/transparency',
    class: 'trust',
    purpose: 'Public truth route for pool totals, receipts, and relief-capacity signals.',
    notes: 'Model route for trust reporting with explicit degraded-mode language.',
  },
  {
    id: 'trust-docs',
    title: 'Operations library',
    route: '/docs',
    class: 'trust',
    purpose: 'Editorial route map for trust, governance, and applied system pathways.',
    notes: 'Must feel like an inspectable library, not a generic link grid.',
  },
  {
    id: 'trust-contact',
    title: 'Routing surface',
    route: '/contact',
    class: 'trust',
    purpose: 'Evidence-first intake and escalation route selection.',
    notes: 'Directs to the right institutional lane before intervention.',
  },
  {
    id: 'trust-memberships',
    title: 'Membership trust and sustainability',
    route: '/memberships',
    class: 'trust',
    purpose: 'Contribution covenant and sustainability trust route.',
    notes: 'Should present institutional trust posture over checkout-style framing.',
  },
  {
    id: 'subsystem-flora-fauna',
    title: 'Flora & Fauna subsystem observability',
    route: '/flora-fauna',
    class: 'subsystem',
    purpose: 'Subsystem-specific operational and trust context.',
    notes: 'Keeps subsystem identity while inheriting ANU trust and observatory structure.',
  },
  {
    id: 'governance-observatory',
    title: 'Governance observatory index',
    route: '/governance',
    class: 'observatory',
    purpose: 'Institutional registry, review, and model navigation surface.',
    notes: 'Calm scanability and instrument grammar over visual randomness.',
  },
  {
    id: 'admin-runtime-health',
    title: 'Runtime contract diagnostics',
    route: '/admin/runtime-health',
    class: 'observatory',
    purpose: 'Operational contract verification for core and impact runtimes.',
    notes: 'Operational scan route with clear pass/fail and latency truth.',
  },
  {
    id: 'organizer-observatory',
    title: 'Organizer operations surface',
    route: '/organizer',
    class: 'observatory',
    purpose: 'Organizer-level operational flow and review routes.',
    notes: 'Tool-like control bars and measurable state over decorative treatment.',
  },
] as const;

export const ANU_OBSERVATORY_PROTOCOL_RULES = [
  'Public trust routes must remain editorial, inspectable, and explicit about degraded states.',
  'Operational observatories must prioritize scanability, metrics, and list-row clarity over spectacle.',
  'Instrumentation panels and comparison surfaces should use a shared visual grammar across governance and admin.',
  'Route relationships between trust, doctrine, and operations must remain explicit and linkable.',
] as const;

export function getObservatoryCoverageSummary() {
  const uniqueRoutes = new Set(ANU_OBSERVATORY_MODULES.map((module) => module.route));
  const classCounts = ANU_OBSERVATORY_MODULES.reduce<Record<string, number>>((accumulator, module) => {
    accumulator[module.class] = (accumulator[module.class] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    module_count: ANU_OBSERVATORY_MODULES.length,
    rule_count: ANU_OBSERVATORY_PROTOCOL_RULES.length,
    route_count: uniqueRoutes.size,
    class_counts: classCounts,
  };
}
