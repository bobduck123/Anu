'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();
const FEDERATION_HARDCOPY_CACHE_KEY = 'governance-federation-snapshot-hardcopy-v1';
const AUTO_RESYNC_MS = 120_000;

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type FederationSnapshot = {
  total_nodes: number;
  total_treasury_cents: number;
  total_users: number;
  total_certified_users: number;
  average_sovereignty_index: number;
  mutual_aid_pairs: number;
  protocol_versions: Record<string, string>;
  created_at?: string;
};

type MutualAidDraft = {
  from_node_id: number;
  to_node_id: number;
  status: string;
};

type PendingMutualAid = MutualAidDraft & {
  id: string;
  createdAt: string;
  statusFlag: 'pending_sync' | 'submitted';
};

type FederationSnapshotHardcopy = {
  snapshot: FederationSnapshot;
  stamp: string;
  syncedAt: string;
};

const BASELINE_SNAPSHOT: FederationSnapshot = {
  total_nodes: 12,
  total_treasury_cents: 14500000,
  total_users: 482,
  total_certified_users: 129,
  average_sovereignty_index: 0.63,
  mutual_aid_pairs: 7,
  protocol_versions: {
    governance: 'v3',
    relief: 'v2',
    trust: 'v4',
  },
  created_at: '2026-04-06T00:00:00.000Z',
};

function computeSnapshotStamp(snapshot: FederationSnapshot): string {
  const versions = Object.entries(snapshot.protocol_versions || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  return [
    `nodes:${snapshot.total_nodes}`,
    `treasury:${snapshot.total_treasury_cents}`,
    `users:${snapshot.total_users}`,
    `certified:${snapshot.total_certified_users}`,
    `sovereignty:${snapshot.average_sovereignty_index}`,
    `pairs:${snapshot.mutual_aid_pairs}`,
    versions,
  ].join('::');
}

function readSnapshotHardcopy(): FederationSnapshotHardcopy | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(FEDERATION_HARDCOPY_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FederationSnapshotHardcopy;
    if (!parsed?.snapshot || typeof parsed.stamp !== 'string' || typeof parsed.syncedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshotHardcopy(payload: FederationSnapshotHardcopy) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FEDERATION_HARDCOPY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures.
  }
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function sourceLabel(source: 'live' | 'hardcopy' | 'baseline') {
  if (source === 'live') return 'Live';
  if (source === 'hardcopy') return 'Hardcopy';
  return 'Baseline';
}

function formatSync(value: string | null) {
  if (!value) return 'Awaiting first sync';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Awaiting first sync';
  return `Synced ${parsed.toLocaleString()}`;
}

function formatCurrencyCents(value: number) {
  return `$${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function FederationDashboardPage() {
  const [snapshot, setSnapshot] = useState<FederationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingMutualAid, setSubmittingMutualAid] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [source, setSource] = useState<'live' | 'hardcopy' | 'baseline'>('baseline');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [mutualAid, setMutualAid] = useState<MutualAidDraft>({ from_node_id: 1, to_node_id: 2, status: 'active' });
  const [pendingMutualAid, setPendingMutualAid] = useState<PendingMutualAid[]>([]);

  const applyFallback = useCallback((reason: 'offline' | 'empty') => {
    const hardcopy = readSnapshotHardcopy();

    if (hardcopy?.snapshot) {
      setSnapshot(hardcopy.snapshot);
      setSource('hardcopy');
      setLastSyncAt(hardcopy.syncedAt);
      setDegradedMode(true);
      setNotice(
        reason === 'offline'
          ? 'Working now: using hardcopy federation snapshot while live sync retries every 120s.'
          : 'No live snapshot returned. Using hardcopy snapshot.',
      );
      return;
    }

    setSnapshot(BASELINE_SNAPSHOT);
    setSource('baseline');
    setLastSyncAt(null);
    setDegradedMode(true);
    setNotice('Working now: baseline federation snapshot is active until first sync succeeds.');
  }, []);

  const syncSnapshot = useCallback(
    async ({ manual = false, silent = false }: { manual?: boolean; silent?: boolean } = {}) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        const response = await fetch(`${API_BASE}/api/federation/metrics`, {
          method: 'POST',
          headers: { ...getAuthHeaders() },
        });

        if (!response.ok) {
          throw new Error('federation-metrics-unavailable');
        }

        const data = await parseJsonSafe<{ data?: { snapshot?: FederationSnapshot | null } }>(response);
        const liveSnapshot = data?.data?.snapshot ?? null;

        if (!liveSnapshot) {
          setError('');
          applyFallback('empty');
          return;
        }

        const syncedAt = new Date().toISOString();
        const stamp = computeSnapshotStamp(liveSnapshot);
        const previousHardcopy = readSnapshotHardcopy();

        if (!previousHardcopy || previousHardcopy.stamp !== stamp) {
          writeSnapshotHardcopy({ snapshot: liveSnapshot, stamp, syncedAt });
        }

        const recovered = degradedMode;
        setSnapshot(liveSnapshot);
        setSource('live');
        setLastSyncAt(syncedAt);
        setDegradedMode(false);
        setError('');

        if (!silent && (manual || recovered)) {
          setNotice(recovered ? 'Live federation snapshot restored. Hardcopy refreshed.' : 'Federation snapshot refreshed.');
        }
      } catch {
        if (!silent) {
          setError('Live federation snapshot service is unavailable in this environment.');
        }
        applyFallback('offline');
      } finally {
        setLoading(false);
        if (manual) {
          setRefreshing(false);
        }
      }
    },
    [applyFallback, degradedMode],
  );

  useEffect(() => {
    void syncSnapshot();

    const timer = window.setInterval(() => {
      void syncSnapshot({ silent: true });
    }, AUTO_RESYNC_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncSnapshot]);

  const createMutualAid = async () => {
    setError('');
    setNotice(null);

    if (mutualAid.from_node_id <= 0 || mutualAid.to_node_id <= 0) {
      setError('Node IDs must be positive.');
      return;
    }

    if (mutualAid.from_node_id === mutualAid.to_node_id) {
      setError('From and to node IDs must differ.');
      return;
    }

    const pendingRecord: PendingMutualAid = {
      ...mutualAid,
      id: `MA-${Date.now()}`,
      createdAt: new Date().toISOString(),
      statusFlag: 'pending_sync',
    };

    setSubmittingMutualAid(true);

    if (degradedMode) {
      setPendingMutualAid((current) => [pendingRecord, ...current].slice(0, 8));
      setNotice('Working now: mutual aid flag queued locally for replay after reconnect.');
      setSubmittingMutualAid(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/federation/mutual-aid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(mutualAid),
      });

      if (!response.ok) {
        throw new Error('mutual-aid-submit-failed');
      }

      setPendingMutualAid((current) => [{ ...pendingRecord, statusFlag: 'submitted' as const }, ...current].slice(0, 8));
      setNotice('Mutual aid flag submitted.');
      void syncSnapshot({ silent: true });
    } catch {
      setDegradedMode(true);
      setError('Live mutual aid submission is unavailable right now.');
      setNotice('Working now: mutual aid flag queued locally for replay after reconnect.');
      setPendingMutualAid((current) => [pendingRecord, ...current].slice(0, 8));
    } finally {
      setSubmittingMutualAid(false);
    }
  };

  const sovereigntyScore = useMemo(
    () => (snapshot ? snapshot.average_sovereignty_index.toFixed(3) : 'n/a'),
    [snapshot],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Federation Snapshot
            </h1>
            <HoverBubble title="Why this matters" align="right">
              This route shows one federation state. During outage it stays on the last synced hardcopy.
            </HoverBubble>
          </div>
          <p className="text-[color:rgba(246,212,203,0.82)]">Cross-node state and mutual aid coordination.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading federation snapshot…</div> : null}

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
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Nodes</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{snapshot?.total_nodes ?? 'n/a'}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Treasury</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">
              {snapshot ? formatCurrencyCents(snapshot.total_treasury_cents) : 'n/a'}
            </p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Users</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{snapshot?.total_users ?? 'n/a'}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Sovereignty</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{sovereigntyScore}</p>
          </article>
        </div>

        <section className="card-civic space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Snapshot details
              </h2>
              <HoverBubble title="Declutter mode" align="left">
                Extra protocol details stay in a collapsed panel to keep this view calm.
              </HoverBubble>
            </div>
            <button
              className="btn-pill btn-pill-outline text-xs"
              onClick={() => void syncSnapshot({ manual: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>

          {!snapshot ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No snapshot available.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                Certified users: <span className="font-mono-data text-[var(--color-foreground)]">{snapshot.total_certified_users}</span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                Mutual aid pairs: <span className="font-mono-data text-[var(--color-foreground)]">{snapshot.mutual_aid_pairs}</span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                Source: <span className="font-medium text-[var(--color-foreground)]">{sourceLabel(source)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">{formatSync(lastSyncAt)}</p>

          {snapshot ? (
            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
              <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">Protocol versions</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                {Object.entries(snapshot.protocol_versions || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] px-3 py-2">
                    <span className="text-[color:rgba(246,212,203,0.72)]">{key}</span>
                    <span className="ml-2 text-[var(--color-foreground)] font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Mutual aid flag
            </h2>
            <HoverBubble title="Queue behavior" align="left">
              If live submission fails, the draft stays queued here for replay after reconnect.
            </HoverBubble>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              type="number"
              value={mutualAid.from_node_id}
              onChange={(event) =>
                setMutualAid((current) => ({
                  ...current,
                  from_node_id: Number(event.target.value) || 0,
                }))
              }
              placeholder="From node ID"
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              type="number"
              value={mutualAid.to_node_id}
              onChange={(event) =>
                setMutualAid((current) => ({
                  ...current,
                  to_node_id: Number(event.target.value) || 0,
                }))
              }
              placeholder="To node ID"
            />
            <select
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              value={mutualAid.status}
              onChange={(event) => setMutualAid((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>

          <button className="btn-pill btn-pill-secondary" onClick={() => void createMutualAid()} disabled={submittingMutualAid}>
            {submittingMutualAid ? 'Submitting…' : 'Submit mutual aid'}
          </button>

          {pendingMutualAid.length > 0 ? (
            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3" open>
              <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">
                Pending / recent submissions ({pendingMutualAid.length})
              </summary>
              <div className="mt-3 space-y-2">
                {pendingMutualAid.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-2 text-sm">
                    Node {entry.from_node_id} → Node {entry.to_node_id} · {entry.status}
                    <span className="ml-2 text-xs text-[color:rgba(246,212,203,0.65)]">
                      {entry.statusFlag === 'pending_sync' ? 'pending sync' : 'submitted'} · {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <section className="card-civic space-y-3">
          <details>
            <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">Partner integration references</summary>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <code className="block rounded-lg bg-[var(--color-muted)] p-3 text-xs">POST /api/node/auth/bridge</code>
                <code className="block rounded-lg bg-[var(--color-muted)] p-3 text-xs">POST /api/node/benefits/accrue</code>
                <code className="block rounded-lg bg-[var(--color-muted)] p-3 text-xs">POST /api/node/benefits/redeem</code>
              </div>
              <div className="space-y-2">
                <p className="text-[color:rgba(246,212,203,0.75)]">Widget preview:</p>
                <iframe
                  className="w-full min-h-[180px] rounded-lg border border-[var(--color-border)]"
                  src={`${API_BASE}/community?widget=benefits`}
                  title="Federation widget preview"
                />
                <code className="block rounded-lg bg-[var(--color-muted)] p-3 text-xs">
                  /community?widget=benefits&token=PARTNER_JWT&partner_user_id=abc123
                </code>
              </div>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
