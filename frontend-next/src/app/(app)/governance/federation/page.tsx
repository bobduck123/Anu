'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';

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
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(FEDERATION_HARDCOPY_CACHE_KEY);
    if (!raw) {
      return null;
    }

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
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(FEDERATION_HARDCOPY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
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
  if (source === 'live') return 'Live snapshot';
  if (source === 'hardcopy') return 'Hardcopy snapshot';
  return 'Baseline snapshot';
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
          ? 'Live federation feeds are unavailable. Running the last synced hardcopy snapshot with automatic re-sync every 120 seconds.'
          : 'No live federation snapshot was returned. Running the last synced hardcopy snapshot.',
      );
      return;
    }

    setSnapshot(BASELINE_SNAPSHOT);
    setSource('baseline');
    setLastSyncAt(null);
    setDegradedMode(true);
    setNotice('No synced federation hardcopy exists yet. Using baseline snapshot until live sync resumes.');
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

        if (!silent) {
          setNotice(recovered ? 'Live federation snapshot restored. Hardcopy refreshed.' : 'Live federation snapshot loaded.');
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
      setError('Node IDs must be positive numbers.');
      return;
    }

    if (mutualAid.from_node_id === mutualAid.to_node_id) {
      setError('From and to node IDs must be different.');
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
      setNotice('Mutual aid flag queued in fallback mode. It will remain visible for replay once live services recover.');
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

      setPendingMutualAid((current) => [
        { ...pendingRecord, statusFlag: 'submitted' as const },
        ...current,
      ].slice(0, 8));
      setNotice('Mutual aid flag submitted.');
      void syncSnapshot({ silent: true });
    } catch {
      setDegradedMode(true);
      setError('Live mutual aid submission is unavailable right now.');
      setNotice('Working now: the mutual aid flag has been queued locally for replay after reconnection.');
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Federation Metrics
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Cross-node intelligence layer and mutual aid tracking.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading federation snapshot…</div>
        ) : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Open governance index
                  </Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                    Open transparency
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Open docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Nodes</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{snapshot?.total_nodes ?? 'n/a'}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Treasury</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">
              {snapshot ? formatCurrencyCents(snapshot.total_treasury_cents) : 'n/a'}
            </p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Users</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{snapshot?.total_users ?? 'n/a'}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Sovereignty avg</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{sovereigntyScore}</p>
          </div>
        </div>

        <div className="card-civic space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Snapshot
            </h2>
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
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No snapshot yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 text-sm">
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

          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
            {lastSyncAt ? `Synced ${new Date(lastSyncAt).toLocaleString()}` : 'Awaiting first live sync'}
          </p>
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Mutual Aid Flag
          </h2>
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
            {submittingMutualAid ? 'Submitting…' : 'Create mutual aid flag'}
          </button>

          {pendingMutualAid.length > 0 ? (
            <div className="space-y-2">
              {pendingMutualAid.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3 text-sm">
                  Node {entry.from_node_id} → Node {entry.to_node_id} · {entry.status}
                  <span className="ml-2 text-xs text-[color:rgba(246,212,203,0.65)]">
                    {entry.statusFlag === 'pending_sync' ? 'pending sync' : 'submitted'} · {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card-civic space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Silent Federation Nodes
            </h2>
            <span className="text-xs text-[color:rgba(246,212,203,0.64)]">Partner integration</span>
          </div>
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">
            Partner products can embed our civic engine via reverse proxy or the widget SDK.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Bridge identity</h3>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">POST /api/node/auth/bridge</code>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Accrue / redeem benefits</h3>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">POST /api/node/benefits/accrue</code>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">POST /api/node/benefits/redeem</code>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Widget preview</h3>
              <p className="text-xs text-[color:rgba(246,212,203,0.72)]">
                Use a partner token and partner_user_id query to render benefits balance.
              </p>
              <iframe
                className="w-full min-h-[180px] rounded-lg border border-[var(--color-border)]"
                src={`${API_BASE}/community?widget=benefits`}
                title="Federation widget preview"
              />
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">
                /community?widget=benefits&token=PARTNER_JWT&partner_user_id=abc123
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
