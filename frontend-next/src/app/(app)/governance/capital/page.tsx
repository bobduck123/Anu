'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { api, CapitalResilience, CapitalSnapshot, CapitalStressFlag } from '@/lib/api';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const FALLBACK_RESILIENCE: CapitalResilience = {
  index_value: 0.61,
  formula_version: 4,
  components: {
    liquidity: 0.64,
    concentration: 0.57,
    relief_capacity: 0.63,
  },
  created_at: '2026-04-06T00:00:00.000Z',
};

const FALLBACK_FLAGS: CapitalStressFlag[] = [
  {
    flag_type: 'liquidity_watch',
    severity: 'medium',
    message: 'Liquidity buffer is below preferred threshold in one pool cluster.',
    created_at: '2026-04-06T08:10:00.000Z',
  },
  {
    flag_type: 'relief_surge',
    severity: 'high',
    message: 'Relief demand is rising faster than recent allocation trend.',
    created_at: '2026-04-06T08:15:00.000Z',
  },
];

const FALLBACK_SNAPSHOTS: CapitalSnapshot[] = [
  {
    pool_id: 1,
    bucket: 'monthly',
    period_start: '2026-03-01T00:00:00.000Z',
    period_end: '2026-03-31T23:59:59.000Z',
    inflow_cents: 1025000,
    outflow_cents: 886000,
    net_flow_cents: 139000,
    balance_cents: 5123000,
    allocation_ratio: 0.32,
  },
  {
    pool_id: 2,
    bucket: 'monthly',
    period_start: '2026-03-01T00:00:00.000Z',
    period_end: '2026-03-31T23:59:59.000Z',
    inflow_cents: 784000,
    outflow_cents: 702000,
    net_flow_cents: 82000,
    balance_cents: 3885000,
    allocation_ratio: 0.24,
  },
];

function formatCurrencyCents(value: number) {
  return `$${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function CapitalDashboardPage() {
  const [snapshots, setSnapshots] = useState<CapitalSnapshot[]>([]);
  const [flags, setFlags] = useState<CapitalStressFlag[]>([]);
  const [resilience, setResilience] = useState<CapitalResilience | null>(null);
  const [loading, setLoading] = useState(true);
  const [degradedMode, setDegradedMode] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCapital = async () => {
      setLoading(true);
      setError('');
      setNotice(null);
      setDegradedMode(false);

      try {
        const [heatmapResult, resilienceResult] = await Promise.allSettled([
          api.capital.getHeatmap(),
          api.capital.getResilience(),
        ]);

        if (!active) return;

        const liveSnapshots =
          heatmapResult.status === 'fulfilled' ? heatmapResult.value.snapshots || [] : [];
        const liveFlags =
          heatmapResult.status === 'fulfilled' ? heatmapResult.value.flags || [] : [];
        const liveResilience =
          resilienceResult.status === 'fulfilled' ? resilienceResult.value : null;

        const hasIssue = heatmapResult.status === 'rejected' || resilienceResult.status === 'rejected';

        setSnapshots(liveSnapshots.length > 0 ? liveSnapshots : FALLBACK_SNAPSHOTS);
        setFlags(liveFlags.length > 0 ? liveFlags : FALLBACK_FLAGS);
        setResilience(liveResilience ?? FALLBACK_RESILIENCE);

        if (hasIssue) {
          setDegradedMode(true);
          setNotice('Working now: capital signals are using fallback values while live feeds recover.');
        }
      } catch {
        if (!active) return;

        setError('Live capital dashboard is unavailable in this environment.');
        setNotice('Working now: fallback capital snapshot remains available for governance review.');
        setDegradedMode(true);
        setSnapshots(FALLBACK_SNAPSHOTS);
        setFlags(FALLBACK_FLAGS);
        setResilience(FALLBACK_RESILIENCE);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCapital();

    return () => {
      active = false;
    };
  }, []);

  const highFlags = useMemo(
    () => flags.filter((flag) => String(flag.severity).toLowerCase() === 'high').length,
    [flags],
  );

  const totalBalanceCents = useMemo(
    () => snapshots.reduce((sum, snapshot) => sum + Number(snapshot.balance_cents || 0), 0),
    [snapshots],
  );

  const topFlags = useMemo(() => flags.slice(0, 3), [flags]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Capital Signals
            </h1>
            <HoverBubble title="Why this matters" align="right">
              Keep treasury stress readable without opening every raw feed.
            </HoverBubble>
          </div>
          <p className="text-[color:rgba(246,212,203,0.82)]">Quick governance view of resilience, stress, and flow.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading capital signals…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Governance index
                  </Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                    Transparency
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Resilience</p>
            <p className="text-2xl font-semibold font-mono-data text-[var(--color-foreground)]">
              {typeof resilience?.index_value === 'number' ? resilience.index_value.toFixed(3) : 'n/a'}
            </p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Flags</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{flags.length}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">High flags</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{highFlags}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Balance</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrencyCents(totalBalanceCents)}</p>
          </article>
        </div>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Stress flags
            </h2>
            <HoverBubble title="Declutter mode" align="left">
              Show top items by default. Expand only if you need full detail.
            </HoverBubble>
          </div>

          {flags.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No active stress flags.</p>
          ) : (
            <div className="space-y-2">
              {topFlags.map((flag, index) => (
                <div
                  key={`${flag.flag_type}-${index}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3 text-sm"
                >
                  <span className="font-medium text-[var(--color-foreground)]">{flag.flag_type}</span>
                  <span className="ml-2 text-[color:rgba(246,212,203,0.74)]">{flag.severity}</span>
                  <p className="mt-1 text-[color:rgba(246,212,203,0.82)]">{flag.message || 'No message.'}</p>
                </div>
              ))}

              {flags.length > topFlags.length ? (
                <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                  <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">
                    Show all flags ({flags.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {flags.slice(topFlags.length).map((flag, index) => (
                      <div key={`${flag.flag_type}-more-${index}`} className="text-sm text-[color:rgba(246,212,203,0.82)]">
                        <span className="font-medium text-[var(--color-foreground)]">{flag.flag_type}</span>
                        <span className="ml-2">{flag.message || 'No message.'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </section>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Snapshot rows
            </h2>
            <HoverBubble title="Fast scan" align="left">
              Keep high-level counts visible. Expand only for row-level values.
            </HoverBubble>
          </div>

          <p className="text-sm text-[color:rgba(246,212,203,0.78)]">{snapshots.length} rows loaded.</p>

          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
            <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">View rows</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {snapshots.map((snapshot, index) => (
                <div key={`${snapshot.pool_id}-${snapshot.period_end}-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 text-sm">
                  <p className="font-medium text-[var(--color-foreground)]">Pool {snapshot.pool_id}</p>
                  <p className="text-[color:rgba(246,212,203,0.78)]">{snapshot.bucket} · {snapshot.period_end.slice(0, 10)}</p>
                  <p className="mt-1 text-[color:rgba(246,212,203,0.82)]">Balance {formatCurrencyCents(snapshot.balance_cents)}</p>
                </div>
              ))}
            </div>
          </details>

          {degradedMode ? (
            <p className="text-xs text-[color:rgba(246,212,203,0.62)]">Source: fallback snapshot.</p>
          ) : (
            <p className="text-xs text-[color:rgba(246,212,203,0.62)]">Source: live snapshot.</p>
          )}
        </section>
      </div>
    </div>
  );
}
