'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ImpactHeader from '@/components/impact/ImpactHeader';
import PoolCards from '@/components/impact/PoolCards';
import StreakWidget from '@/components/impact/StreakWidget';
import { membershipsApi, poolsApi, ImpactPool, SubscriptionStatus, impactApi } from '@/lib/api/endpoints';
import { api, CollaborativeChallenge, PoolMetrics, Microcosm, CollectiveStreakPayload } from '@/lib/api';
import { brand, manaraPath } from '@/lib/brand';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  CreditCard,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import {
  AnuActionLink,
  AnuChip,
  AnuControlButton,
  AnuInstrumentationCard,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { AnuProcessPanel, AnuRouteBridgePanel } from '@/ui-system/anu/coordinationPrimitives';
import { AnuNarrativeBriefPanel } from '@/ui-system/anu/narrativePrimitives';
import { EarthFieldShell } from '@/ui-system/realms/earth/EarthFieldShell';
import { EarthNavPill } from '@/ui-system/realms/earth/EarthNavPill';
import { EarthObjectMarker } from '@/ui-system/realms/earth/EarthObjectMarker';
import { EarthRisingPanel } from '@/ui-system/realms/earth/EarthRisingPanel';
import { ImpactAscentThread } from '@/ui-system/realms/earth/ImpactAscentThread';
import { buildImpactOutcomeSignals, type ImpactSummaryData } from './impactBridgePresentation';

type StreakCollectionPayload = {
  streaks: CollectiveStreakPayload[];
};

const IMPACT_FIELD_POSITIONS = [
  { top: '18%', left: '18%' },
  { top: '24%', left: '50%' },
  { top: '32%', left: '82%' },
  { top: '66%', left: '28%' },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCollectiveStreakPayload = (value: unknown): value is CollectiveStreakPayload =>
  isRecord(value) &&
  typeof value.scope === 'string' &&
  typeof value.scope_id === 'number' &&
  typeof value.current_streak === 'number' &&
  typeof value.best_streak === 'number' &&
  isRecord(value.weekly_stats) &&
  isRecord(value.reward_milestones);

const isStreakCollectionPayload = (value: unknown): value is StreakCollectionPayload =>
  isRecord(value) && Array.isArray(value.streaks);

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const toImpactSummaryData = (value: unknown): ImpactSummaryData | null => {
  if (!isRecord(value)) return null;
  return {
    relief_paid_cents: asNumber(value.relief_paid_cents),
    volunteer_hours: asNumber(value.volunteer_hours),
    savings_cents: asNumber(value.savings_cents),
    actions_completed: asNumber(value.actions_completed),
    completions: asNumber(value.completions),
    event_attendance: asNumber(value.event_attendance),
  };
};

const impactLoopSteps = [
  {
    title: 'Contribute through memberships and participation',
    detail: 'Memberships, streaks, and activity create visible commons support rather than disappearing into an opaque account state.',
  },
  {
    title: 'Steward value through pools and collaborative action',
    detail: 'Pool balances, challenges, and milestones keep collective movement legible at the node and microcosm level.',
  },
  {
    title: 'Lift grounded consequence upward',
    detail: 'Relief, attendance, and completion signals should rise upward as visible public consequence without losing the ground they came from.',
  },
];

export default function ImpactHomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [pools, setPools] = useState<ImpactPool[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [collaborative, setCollaborative] = useState<CollaborativeChallenge[]>([]);
  const [collabScope, setCollabScope] = useState<'node' | 'microcosm'>('node');
  const [microcosms, setMicrocosms] = useState<Microcosm[]>([]);
  const [selectedMicrocosm, setSelectedMicrocosm] = useState<string>('');
  const [collabScopeName, setCollabScopeName] = useState<string>('');
  const [poolMetrics, setPoolMetrics] = useState<PoolMetrics | null>(null);
  const [nodeStreak, setNodeStreak] = useState<CollectiveStreakPayload | null>(null);
  const [microStreaks, setMicroStreaks] = useState<CollectiveStreakPayload[]>([]);
  const [impactSummary, setImpactSummary] = useState<ImpactSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('actions-completed');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      Promise.all([
        membershipsApi.status(),
        poolsApi.list(),
        api.engagement.getCollaborative('node'),
        api.engagement.getPoolMetrics(),
        api.community.getMicrocosms().catch(() => [] as Microcosm[]),
        api.engagement.getCollectiveStreaks('node'),
        api.engagement.getCollectiveStreaks('microcosm'),
        impactApi.summary().catch(() => null),
      ])
        .then(([statusData, poolsData, collabData, metrics, microData, nodeStreakData, microStreakData, summaryData]) => {
          if (cancelled) {
            return;
          }
          setStatus(statusData);
          setPools(poolsData);
          setCollaborative(collabData.challenges || []);
          setCollabScopeName(collabData.scope_name || '');
          setPoolMetrics(metrics);
          setMicrocosms(microData);
          setImpactSummary(toImpactSummaryData(summaryData));
          if (isStreakCollectionPayload(microStreakData)) {
            setMicroStreaks(microStreakData.streaks || []);
          } else if (isCollectiveStreakPayload(microStreakData)) {
            setMicroStreaks([microStreakData]);
          } else {
            setMicroStreaks([]);
          }
          setNodeStreak(isCollectiveStreakPayload(nodeStreakData) ? nodeStreakData : null);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to load impact data');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadCollab = async () => {
      try {
        const scopeId = collabScope === 'microcosm' && selectedMicrocosm ? parseInt(selectedMicrocosm, 10) : undefined;
        const data = await api.engagement.getCollaborative(collabScope, scopeId);
        setCollaborative(data.challenges || []);
        setCollabScopeName(data.scope_name || '');
      } catch {
        // ignore background collaborative refresh failures
      }
    };

    void loadCollab();
  }, [collabScope, isAuthenticated, selectedMicrocosm]);

  const outcomeSignals = useMemo(
    () => buildImpactOutcomeSignals(impactSummary, poolMetrics, pools),
    [impactSummary, poolMetrics, pools],
  );

  const activeOutcomeId = outcomeSignals.some((signal) => signal.id === selectedOutcomeId)
    ? selectedOutcomeId
    : outcomeSignals[0]?.id ?? 'actions-completed';

  const selectedOutcome = outcomeSignals.find((signal) => signal.id === activeOutcomeId) ?? outcomeSignals[0];
  const actionsCompleted = impactSummary?.actions_completed ?? impactSummary?.completions ?? 0;
  const eventAttendance = impactSummary?.event_attendance ?? 0;
  const reliefPaid = impactSummary?.relief_paid_cents ?? 0;
  const volunteerHours = impactSummary?.volunteer_hours ?? 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  const field = (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-5">
        <div className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.16)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#f6d4cb]/84 backdrop-blur-md">
          Outcomes gather on the ground before they rise into the wider commons.
        </div>
      </div>

      {outcomeSignals.map((signal, index) => (
        <EarthObjectMarker
          key={signal.id}
          kind="outcome"
          title={signal.title}
          summary={signal.groundedDetail}
          meta={signal.groundedValue}
          badges={['Outcome', 'Bridge route']}
          active={activeOutcomeId === signal.id}
          style={IMPACT_FIELD_POSITIONS[index]}
          onSelect={() => setSelectedOutcomeId(signal.id)}
        />
      ))}
    </div>
  );

  const fieldAside = (
    <>
      {selectedOutcome ? (
        <ImpactAscentThread
          title={selectedOutcome.title}
          groundedValue={selectedOutcome.groundedValue}
          groundedDetail={selectedOutcome.groundedDetail}
          ascentDetail={selectedOutcome.ascentDetail}
          celestialInfluence={selectedOutcome.celestialInfluence}
          provenance={selectedOutcome.provenance}
        />
      ) : null}

      <AnuProcessPanel
        eyebrow="Earth bridge"
        title="How grounded consequence rises"
        description="Impact should not feel like a detached dashboard. It should explain how money, labor, action, and care relate before they become public consequence."
        steps={impactLoopSteps}
      />

      <AnuRouteBridgePanel
        eyebrow="Commons loop"
        title="Impact sits between contribution, care, and participation"
        description="These routes make the earth-plane loop legible: contribute, act, schedule, care, and inspect public state without leaving the ANU commons."
        links={[
          {
            href: '/memberships',
            label: 'Memberships',
            detail: 'Recurring contribution and subscription state that sustain the commons.',
            icon: CreditCard,
            tone: 'accent',
          },
          {
            href: '/pools',
            label: 'Impact pools',
            detail: 'Inspect pooled value, routing, and stewardship of shared resources.',
            icon: Sparkles,
            tone: 'signal',
          },
          {
            href: '/relief',
            label: 'Relief',
            detail: 'Move from pooled capacity into private care intake and queue tracking.',
            icon: Heart,
          },
          {
            href: '/events',
            label: 'Events',
            detail: 'Participation and local gatherings are part of the same visible commons loop.',
            icon: Users,
          },
          {
            href: manaraPath(),
            label: `${brand.name} feed`,
            detail: 'Return to signals and community activity when impact needs social context.',
            icon: Sparkles,
          },
        ]}
      />
    </>
  );

  const risingPanel = selectedOutcome ? (
    <EarthRisingPanel
      eyebrow="Grounded outcome"
      title={selectedOutcome.title}
      summary={
        <div className="space-y-3">
          <p>{selectedOutcome.groundedDetail}</p>
          <p>{selectedOutcome.ascentDetail}</p>
        </div>
      }
      badges={
        <>
          <AnuChip tone="accent" icon={Waypoints}>
            {selectedOutcome.groundedValue}
          </AnuChip>
          <AnuChip tone="muted" icon={Sparkles}>
            Public consequence
          </AnuChip>
        </>
      }
      primary={
        <div className="grid gap-4 md:grid-cols-2">
          <AnuInstrumentationCard
            label="Grounded measure"
            value={selectedOutcome.groundedValue}
            detail={selectedOutcome.groundedDetail}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Ascent posture"
            value="Upward bridge"
            detail={selectedOutcome.celestialInfluence}
            tone="steady"
          />
        </div>
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Bridge provenance</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            <p>{selectedOutcome.provenance}</p>
            <p>{selectedOutcome.celestialInfluence}</p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <AnuActionLink href="/relief" tone="secondary">
            Open relief
          </AnuActionLink>
          <AnuActionLink href="/community" tone="ghost">
            Return to community traces
          </AnuActionLink>
        </div>
      }
    />
  ) : null;

  const utility = isAuthenticated ? (
    <>
      <ImpactHeader tier={status?.subscription?.status || 'community'} streakMonths={status?.subscription?.streak_months || 0} />

      {error ? (
        <AnuSurfacePanel tone="quiet" className="p-4 text-[#e0b115]">
          <p className="text-sm">{error}</p>
        </AnuSurfacePanel>
      ) : null}

      <AnuNarrativeBriefPanel
        eyebrow="Route reading"
        title="How to read this live impact workspace"
        description="Impact is an operational summary surface. It should tell stewards how contribution, participation, scheduling, and care are currently being translated into visible commons state."
        signals={[
          {
            label: 'Output mode',
            value: loading ? 'Syncing live workspace' : 'Live action-to-care workspace',
            detail: 'The route combines memberships, pools, collaborative activity, streaks, and impact summaries into one operational reading surface.',
            tone: loading ? 'muted' : 'signal',
            icon: Sparkles,
          },
          {
            label: 'Source state',
            value: loading ? 'Loading memberships, pools, and summaries' : 'Memberships / pools / challenges / events',
            detail: 'This workspace only becomes trustworthy when the surrounding contribution, activity, and participation feeds are read together.',
            tone: 'muted',
            icon: CalendarDays,
          },
          {
            label: 'Fallback truth',
            value: error ? 'Partially degraded' : 'Bridge routes remain available',
            detail: error
              ? 'If one live feed fails, the workspace should still tell the operator which adjacent route carries the relevant state.'
              : 'Even when data is healthy, this route should keep its connection to relief, calendar, community, and transparency explicit.',
            tone: error ? 'accent' : 'signal',
            icon: ShieldCheck,
          },
        ]}
        whyItMatters="Impact is where the commons learns whether contribution is actually becoming action, care, and accountable movement. Without route legibility, it collapses into dashboard theater."
        actions={[
          { href: '/relief', label: 'Open relief', tone: 'secondary', icon: Heart },
          { href: '/calendar', label: 'Open calendar', tone: 'ghost', icon: CalendarDays },
        ]}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AnuInstrumentationCard
          label="Relief paid"
          value={`$${Math.round(reliefPaid / 100).toLocaleString()}`}
          detail="Visible care delivered through the commons."
          tone="signal"
        />
        <AnuInstrumentationCard
          label="Volunteer hours"
          value={String(volunteerHours)}
          detail="Labor and contribution remain part of the same impact picture as finance."
        />
        <AnuInstrumentationCard
          label="Actions completed"
          value={String(actionsCompleted)}
          detail="Action flows remain tied to the same commons performance surface."
        />
        <AnuInstrumentationCard
          label="Event attendance"
          value={String(eventAttendance)}
          detail="Participation loops across calendar and event surfaces feed back into impact visibility."
          icon={CalendarDays}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StreakWidget streakMonths={status?.subscription?.streak_months || 0} />

        <AnuSurfacePanel tone="soft" className="p-5">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--color-institutional)]" />
            <h3 className="font-semibold text-[var(--color-foreground)]">Next milestone</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            Invite a neighbor, complete a shared action, and unlock a community credit.
          </p>
          <div className="mt-4 flex gap-2">
            {['Invite', 'Act', 'Earn'].map((step, index) => (
              <span
                key={step}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: index === 0 ? 'var(--color-sage-light)' : 'var(--color-muted)',
                  color: index === 0 ? 'var(--color-forest)' : 'var(--color-earth-medium)',
                }}
              >
                {step}
              </span>
            ))}
          </div>
        </AnuSurfacePanel>

        <AnuSurfacePanel tone="quiet" className="p-5">
          <h3 className="font-semibold text-[var(--color-foreground)]">Quick links</h3>
          <div className="mt-4 space-y-2">
            {[
              { href: '/relief', label: 'Relief Intake', icon: Heart },
              { href: '/memberships', label: 'Memberships', icon: CreditCard },
              { href: '/pools', label: 'Impact Pools', icon: ArrowRight },
              { href: manaraPath(), label: `${brand.name} Feed`, icon: Sparkles },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 py-1 text-sm text-[var(--color-institutional)] transition-colors hover:text-[var(--color-forest)]"
              >
                <link.icon className="h-3.5 w-3.5" />
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </AnuSurfacePanel>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AnuSurfacePanel tone="soft" className="p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[var(--color-foreground)]">Collective streaks</h3>
              <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Weekly momentum</p>
            </div>
          </div>
          {nodeStreak ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{nodeStreak.scope_name || 'Node'}</p>
                  <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                    {nodeStreak.weekly_stats?.is_active ? 'Active this week' : 'Needs momentum'} · Next milestone{' '}
                    {nodeStreak.reward_milestones?.next || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono-data text-2xl font-semibold text-[var(--color-forest)]">{nodeStreak.current_streak}</p>
                  <p className="text-xs text-[color:rgba(246,212,203,0.64)]">week streak</p>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, (nodeStreak.current_streak / (nodeStreak.reward_milestones?.next || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.82)]">No collective streak data yet.</p>
          )}
        </AnuSurfacePanel>

        <AnuSurfacePanel tone="quiet" className="p-5">
          <h3 className="font-semibold text-[var(--color-foreground)]">Microcosm streaks</h3>
          {microStreaks.length === 0 ? (
            <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.82)]">No microcosm streaks yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {microStreaks.slice(0, 3).map((streak) => (
                <div key={streak.scope_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{streak.scope_name}</p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Best {streak.best_streak} weeks</p>
                  </div>
                  <span className="font-mono-data text-lg font-semibold text-[var(--color-institutional)]">{streak.current_streak}</span>
                </div>
              ))}
            </div>
          )}
        </AnuSurfacePanel>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Impact Pools
            </h2>
            <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.82)]">See how your contributions are stewarded.</p>
          </div>
          <Link href="/pools" className="hidden items-center gap-2 text-sm font-medium text-[var(--color-institutional)] transition-all hover:gap-3 md:inline-flex">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : (
          <PoolCards pools={pools} />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Collaborative Challenges
            </h2>
            <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.82)]">
              Work with your {collabScopeName || collabScope} to reach shared goals this week.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnuControlButton tone={collabScope === 'node' ? 'active' : 'default'} onClick={() => setCollabScope('node')}>
              Node
            </AnuControlButton>
            <AnuControlButton tone={collabScope === 'microcosm' ? 'active' : 'default'} onClick={() => setCollabScope('microcosm')}>
              Microcosm
            </AnuControlButton>
            {collabScope === 'microcosm' ? (
              <select
                value={selectedMicrocosm}
                onChange={(event) => setSelectedMicrocosm(event.target.value)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs"
              >
                <option value="">Select</option>
                {microcosms.map((microcosm) => (
                  <option key={microcosm.id} value={microcosm.id}>
                    {microcosm.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collaborative.map((challenge) => {
            const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
            return (
              <AnuSurfacePanel key={challenge.id} tone="soft" className="p-5">
                <h3 className="font-semibold text-[var(--color-foreground)]">{challenge.title}</h3>
                <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.82)]">{challenge.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span>{challenge.progress}/{challenge.target}</span>
                  <span className="font-mono-data text-[var(--color-institutional)]">+{challenge.reward_points} pts</span>
                </div>
                <div className="progress-bar mt-2">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </AnuSurfacePanel>
            );
          })}
          {collaborative.length === 0 ? (
            <AnuSurfacePanel tone="quiet" className="p-5 text-center md:col-span-2 lg:col-span-3">
              <p className="text-[color:rgba(246,212,203,0.82)]">No collaborative challenges yet.</p>
            </AnuSurfacePanel>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AnuSurfacePanel tone="soft" className="p-5">
          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Total Pools</p>
          <p className="font-mono-data text-2xl font-semibold text-[var(--color-foreground)]">{poolMetrics?.total_pools ?? pools.length}</p>
        </AnuSurfacePanel>
        <AnuSurfacePanel tone="soft" className="p-5">
          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Active Pools</p>
          <p className="font-mono-data text-2xl font-semibold text-[var(--color-foreground)]">{poolMetrics?.active_pools ?? pools.filter((pool) => pool.is_active).length}</p>
        </AnuSurfacePanel>
        <AnuSurfacePanel tone="soft" className="p-5">
          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Target Total</p>
          <p className="font-mono-data text-2xl font-semibold text-[var(--color-foreground)]">
            ${(poolMetrics?.total_target_cents ?? pools.reduce((acc, pool) => acc + (pool.target_amount_cents || 0), 0)) / 100}
          </p>
        </AnuSurfacePanel>
      </section>
    </>
  ) : (
    <>
      <AnuSurfacePanel tone="soft" className="p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Impact workspace</p>
        <h2 className="mt-3 text-4xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          Sign in for live pool, streak, and membership data
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:rgba(246,212,203,0.84)]">
          The authenticated impact workspace pulls membership status, pool balances, collaborative challenges, and node metrics. Public visitors can still inspect the grounded bridge around it.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <AnuActionLink href="/auth" tone="primary">
            Sign in
          </AnuActionLink>
          <AnuActionLink href={manaraPath()} tone="ghost">
            Open Manara
          </AnuActionLink>
        </div>
      </AnuSurfacePanel>

      <AnuNarrativeBriefPanel
        eyebrow="Route reading"
        title="How to read this bridge before sign-in"
        description="Before sign-in, impact operates as a public bridge rather than a live workspace. It should still explain where trust, contribution, and community state can be inspected."
        signals={[
          {
            label: 'Output mode',
            value: 'Public bridge only',
            detail: 'Live membership, pool, and streak data stay behind authentication, but the surrounding commons routes remain visible.',
            tone: 'signal',
            icon: Sparkles,
          },
          {
            label: 'Source state',
            value: 'Auth-gated live data',
            detail: 'This route becomes fully operational only when the user session can load contribution, challenge, and pool state.',
            tone: 'muted',
            icon: ShieldCheck,
          },
          {
            label: 'Fallback truth',
            value: 'Trust paths stay open',
            detail: 'When the private workspace is unavailable, the route should keep pointing clearly toward memberships, transparency, and community context.',
            tone: 'accent',
            icon: Compass,
          },
        ]}
        whyItMatters="People should be able to understand what impact means in ANU before they enter the authenticated workspace. A bridge route keeps contribution, trust, and community context legible."
        actions={[
          { href: '/memberships', label: 'Open memberships', tone: 'secondary', icon: CreditCard },
          { href: '/transparency', label: 'Open transparency', tone: 'ghost', icon: ShieldCheck },
        ]}
      />
    </>
  );

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <EarthFieldShell
          eyebrow="Earth bridge / impact"
          title="The Commons"
          description="Impact gathers grounded consequence before it rises upward. Outcomes stay shaped by their earthly origin even when the wider commons reads them as public trace."
          actions={
            <div className="anu-earth-top-links">
              <Link href="/relief" className="anu-earth-top-link">
                Open relief
              </Link>
              <Link href="/community" className="anu-earth-top-link">
                Return to community traces
              </Link>
            </div>
          }
          metrics={
            <div className="anu-earth-hud-lines">
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Actions</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{actionsCompleted} completed</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Attendance</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{eventAttendance} participants</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Relief paid</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">${Math.round(reliefPaid / 100).toLocaleString()}</span>
              </div>
            </div>
          }
          field={field}
          fieldAside={fieldAside}
          risingPanel={risingPanel}
          nav={
            <EarthNavPill
              items={[
                { href: '/actions', label: 'Actions' },
                { href: '/events', label: 'Events' },
                { href: '/relief', label: 'Relief' },
                { href: '/impact', label: 'Impact', active: true },
              ]}
            />
          }
          utility={utility}
        />
      </div>
    </div>
  );
}
