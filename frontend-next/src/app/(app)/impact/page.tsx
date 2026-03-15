'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ImpactHeader from '@/components/impact/ImpactHeader';
import PoolCards from '@/components/impact/PoolCards';
import StreakWidget from '@/components/impact/StreakWidget';
import { membershipsApi, poolsApi, ImpactPool, SubscriptionStatus, impactApi } from '@/lib/api/endpoints';
import { api, CollaborativeChallenge, PoolMetrics, Microcosm, CollectiveStreakPayload } from '@/lib/api';
import { brand, manaraPath } from '@/lib/brand';
import { ArrowRight, Compass, CreditCard, Heart, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

type ImpactSummaryData = {
  relief_paid_cents?: number;
  volunteer_hours?: number;
  savings_cents?: number;
  actions_completed?: number;
  completions?: number;
  event_attendance?: number;
};

type StreakCollectionPayload = {
  streaks: CollectiveStreakPayload[];
};

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

  useEffect(() => {
    if (authLoading) {
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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load impact data'))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadCollab = async () => {
      try {
        const scopeId = collabScope === 'microcosm' && selectedMicrocosm ? parseInt(selectedMicrocosm) : undefined;
        const data = await api.engagement.getCollaborative(collabScope, scopeId);
        setCollaborative(data.challenges || []);
        setCollabScopeName(data.scope_name || '');
      } catch { /* ignore */ }
    };
    loadCollab();
  }, [collabScope, isAuthenticated, selectedMicrocosm]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
          <section className="card-civic">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-3">Impact Workspace</p>
            <h1 className="text-4xl font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Sign in for live pool, streak, and membership data
            </h1>
            <p className="text-[var(--color-earth-medium)] leading-relaxed max-w-3xl">
              The authenticated impact workspace pulls membership status, pool balances, collaborative challenges, and node metrics. Public visitors can still use the Manara feed, transparency surface, and memberships route.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link href="/auth" className="btn-pill btn-pill-primary text-center">
                Sign in
              </Link>
              <Link href={manaraPath()} className="btn-pill btn-pill-outline text-center">
                Open Manara
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ['Memberships', 'Subscription status, streaks, and checkout live here after sign-in.'],
              ['Pools', 'Node-level balances and pool metrics require authenticated context.'],
              ['Challenges', 'Collaborative goals are scoped to your node or microcosm.'],
            ].map(([title, body]) => (
              <div key={title} className="card-civic">
                <h2 className="text-xl font-semibold text-[var(--color-earth-dark)] mb-3">{title}</h2>
                <p className="text-[var(--color-earth-medium)] leading-relaxed">{body}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        {/* Header Banner */}
        <ImpactHeader
          tier={status?.subscription?.status || 'community'}
          streakMonths={status?.subscription?.streak_months || 0}
        />

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]">
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {/* Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StreakWidget streakMonths={status?.subscription?.streak_months || 0} />

          <div className="card-civic">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-[var(--color-institutional)]" />
              <h3 className="font-semibold text-[var(--color-earth-dark)]">Next Milestone</h3>
            </div>
            <p className="text-sm text-[var(--color-earth-medium)] mb-4">
              Invite a neighbor, complete a shared action, and unlock a community credit.
            </p>
            <div className="flex gap-2">
              {['Invite', 'Act', 'Earn'].map((step, i) => (
                <span
                  key={step}
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: i === 0 ? 'var(--color-sage-light)' : 'var(--color-muted)',
                    color: i === 0 ? 'var(--color-forest)' : 'var(--color-earth-medium)',
                  }}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="card-civic">
            <h3 className="font-semibold text-[var(--color-earth-dark)] mb-3">Quick Links</h3>
            <div className="space-y-2">
              {[
                { href: '/relief', label: 'Relief Intake', icon: Heart },
                { href: '/memberships', label: 'Memberships', icon: CreditCard },
                { href: '/pools', label: 'Impact Pools', icon: ArrowRight },
                { href: manaraPath(), label: `${brand.name} Feed`, icon: Sparkles },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 text-sm text-[var(--color-institutional)] hover:text-[var(--color-forest)] transition-colors py-1 group"
                >
                  <link.icon className="w-3.5 h-3.5" />
                  <span className="font-medium">{link.label}</span>
                  <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Public Impact Summary */}
        {impactSummary && (
          <section className="card-civic">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Public Impact Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-muted-foreground)]">Relief Paid</p>
                <p className="font-semibold">${Math.round((impactSummary.relief_paid_cents || 0) / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted-foreground)]">Volunteer Hours</p>
                <p className="font-semibold">{impactSummary.volunteer_hours || 0}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted-foreground)]">Savings</p>
                <p className="font-semibold">${Math.round((impactSummary.savings_cents || 0) / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted-foreground)]">Actions Completed</p>
                <p className="font-semibold">{impactSummary.actions_completed || impactSummary.completions || 0}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted-foreground)]">Event Attendance</p>
                <p className="font-semibold">{impactSummary.event_attendance || 0}</p>
              </div>
            </div>
          </section>
        )}

        {/* Collective Streaks */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-civic md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--color-earth-dark)]">Collective Streaks</h3>
              <span className="text-xs text-[var(--color-earth-medium)]">Weekly momentum</span>
            </div>
            {nodeStreak ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-earth-dark)]">{nodeStreak.scope_name || 'Node'}</p>
                    <p className="text-xs text-[var(--color-earth-medium)]">
                      {nodeStreak.weekly_stats?.is_active ? 'Active this week' : 'Needs momentum'} · Next milestone {nodeStreak.reward_milestones?.next || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold font-mono-data text-[var(--color-forest)]">{nodeStreak.current_streak}</p>
                    <p className="text-xs text-[var(--color-earth-medium)]">week streak</p>
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
              <p className="text-sm text-[var(--color-earth-medium)]">No collective streak data yet.</p>
            )}
          </div>
          <div className="card-civic">
            <h3 className="font-semibold text-[var(--color-earth-dark)] mb-3">Microcosm Streaks</h3>
            {microStreaks.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-medium)]">No microcosm streaks yet.</p>
            ) : (
              <div className="space-y-3">
                {microStreaks.slice(0, 3).map((streak) => (
                  <div key={streak.scope_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{streak.scope_name}</p>
                      <p className="text-xs text-[var(--color-earth-medium)]">Best {streak.best_streak} weeks</p>
                    </div>
                    <span className="text-lg font-semibold font-mono-data text-[var(--color-institutional)]">{streak.current_streak}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Impact Pools Section */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2
                className="text-2xl md:text-3xl font-semibold text-[var(--color-earth-dark)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Impact Pools
              </h2>
              <p className="text-sm text-[var(--color-earth-medium)] mt-1">
                See how your contributions are stewarded.
              </p>
            </div>
            <Link
              href="/pools"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] hover:gap-3 transition-all"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
            </div>
          ) : (
            <PoolCards pools={pools} />
          )}
        </section>

        {/* Collaborative Challenges */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Collaborative Challenges
              </h2>
              <p className="text-sm text-[var(--color-earth-medium)] mt-1">
                Work with your {collabScopeName || collabScope} to reach shared goals this week.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCollabScope('node')}
                className={`btn-pill text-xs ${collabScope === 'node' ? 'btn-pill-primary' : 'btn-pill-outline'}`}
              >
                Node
              </button>
              <button
                onClick={() => setCollabScope('microcosm')}
                className={`btn-pill text-xs ${collabScope === 'microcosm' ? 'btn-pill-primary' : 'btn-pill-outline'}`}
              >
                Microcosm
              </button>
              {collabScope === 'microcosm' && (
                <select
                  value={selectedMicrocosm}
                  onChange={(e) => setSelectedMicrocosm(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs"
                >
                  <option value="">Select</option>
                  {microcosms.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaborative.map((challenge) => {
              const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
              return (
                <div key={challenge.id} className="card-civic">
                  <h3 className="font-semibold mb-2">{challenge.title}</h3>
                  <p className="text-sm text-[var(--color-earth-medium)] mb-4">{challenge.description}</p>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span>{challenge.progress}/{challenge.target}</span>
                    <span className="font-mono-data text-[var(--color-institutional)]">+{challenge.reward_points} pts</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {collaborative.length === 0 && (
              <div className="card-civic text-center py-10">
                <p className="text-[var(--color-earth-medium)]">No collaborative challenges yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Pool Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)]">Total Pools</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              {poolMetrics?.total_pools ?? pools.length}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)]">Active Pools</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              {poolMetrics?.active_pools ?? pools.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)]">Target Total</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              ${(poolMetrics?.total_target_cents ?? pools.reduce((acc, p) => acc + (p.target_amount_cents || 0), 0)) / 100}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
