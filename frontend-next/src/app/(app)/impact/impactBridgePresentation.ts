import type { PoolMetrics } from '@/lib/api';
import type { ImpactPool } from '@/lib/api/endpoints';

export type ImpactSummaryData = {
  relief_paid_cents?: number;
  volunteer_hours?: number;
  savings_cents?: number;
  actions_completed?: number;
  completions?: number;
  event_attendance?: number;
};

export interface ImpactOutcomeSignal {
  id: string;
  title: string;
  groundedValue: string;
  groundedDetail: string;
  ascentDetail: string;
  celestialInfluence: string;
  provenance: string;
}

function currencyLabel(amountCents: number | undefined): string {
  return `$${Math.round((amountCents ?? 0) / 100).toLocaleString()}`;
}

export function buildImpactOutcomeSignals(
  summary: ImpactSummaryData | null,
  poolMetrics: PoolMetrics | null,
  pools: ImpactPool[],
): ImpactOutcomeSignal[] {
  const actionsCompleted = summary?.actions_completed ?? summary?.completions ?? 0;
  const eventAttendance = summary?.event_attendance ?? 0;
  const reliefPaid = summary?.relief_paid_cents ?? 0;
  const poolTarget =
    poolMetrics?.total_target_cents ?? pools.reduce((total, pool) => total + (pool.target_amount_cents ?? 0), 0);

  return [
    {
      id: 'actions-completed',
      title: 'Grounded action follow-through',
      groundedValue: `${actionsCompleted} completions`,
      groundedDetail: 'Actions completed through the field become the most direct proof that contribution is actually moving into practice.',
      ascentDetail: 'Completions rise out of the terrain as evidence that grounded effort is holding.',
      celestialInfluence: 'This lifts the weight of public trust and future coordination signals without displaying a permanent tether.',
      provenance: 'Derived from the live impact summary action completion count.',
    },
    {
      id: 'event-attendance',
      title: 'Gathering participation',
      groundedValue: `${eventAttendance} attendees`,
      groundedDetail: 'Attendance shows where gatherings and local coordination are becoming lived commons participation.',
      ascentDetail: 'Participation rises upward as social proof that the field is alive rather than merely planned.',
      celestialInfluence: 'This influences the visibility of community traces and constellation-scale activity.',
      provenance: 'Derived from the live impact summary event attendance count.',
    },
    {
      id: 'relief-paid',
      title: 'Care delivered',
      groundedValue: currencyLabel(reliefPaid),
      groundedDetail: 'Relief paid is the grounded care consequence that should remain legible without exposing private requests.',
      ascentDetail: 'Care capacity rises upward as accountable consequence rather than staying trapped in a private queue.',
      celestialInfluence: 'This shapes how the commons reads care credibility and mutual-aid afterlife.',
      provenance: 'Derived from the live impact summary relief paid total.',
    },
    {
      id: 'pool-capacity',
      title: 'Pooled capacity',
      groundedValue: currencyLabel(poolTarget),
      groundedDetail: 'Targeted pooled capacity shows how much grounded value is being stewarded before it becomes care, events, or field action.',
      ascentDetail: 'Capacity rises upward as future possibility, not just current spend.',
      celestialInfluence: 'This influences how strongly future outcomes can appear in the shared celestial layer.',
      provenance: 'Derived from live pool metrics or aggregate pool targets when summary metrics are unavailable.',
    },
  ];
}
