'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();
const INSTITUTIONAL_HARDCOPY_CACHE_KEY = 'governance-institutional-config-hardcopy-v1';
const AUTO_RESYNC_MS = 120_000;

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type Config = {
  enabled: boolean;
  quorum_min: number;
  external_observer_enabled: boolean;
  extended_audit_logging: boolean;
  worm_audit_suggestion: boolean;
};

type ObserverDraft = {
  name: string;
  organization: string;
  email: string;
};

type PendingObserver = ObserverDraft & {
  id: string;
  queuedAt: string;
  statusFlag: 'pending_sync' | 'submitted';
};

type ConfigHardcopy = {
  config: Config;
  stamp: string;
  syncedAt: string;
};

const BASELINE_CONFIG: Config = {
  enabled: false,
  quorum_min: 2,
  external_observer_enabled: false,
  extended_audit_logging: false,
  worm_audit_suggestion: false,
};

function computeConfigStamp(config: Config): string {
  return [
    `enabled:${config.enabled}`,
    `quorum:${config.quorum_min}`,
    `observer:${config.external_observer_enabled}`,
    `audit:${config.extended_audit_logging}`,
    `worm:${config.worm_audit_suggestion}`,
  ].join('|');
}

function readConfigHardcopy(): ConfigHardcopy | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(INSTITUTIONAL_HARDCOPY_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConfigHardcopy;
    if (!parsed?.config || typeof parsed.stamp !== 'string' || typeof parsed.syncedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeConfigHardcopy(payload: ConfigHardcopy) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(INSTITUTIONAL_HARDCOPY_CACHE_KEY, JSON.stringify(payload));
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

export default function InstitutionalModePage() {
  const [config, setConfig] = useState<Config>(BASELINE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingObserver, setAddingObserver] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [source, setSource] = useState<'live' | 'hardcopy' | 'baseline'>('baseline');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [observer, setObserver] = useState<ObserverDraft>({ name: '', organization: '', email: '' });
  const [pendingObservers, setPendingObservers] = useState<PendingObserver[]>([]);

  const applyFallback = useCallback((reason: 'offline' | 'empty') => {
    const hardcopy = readConfigHardcopy();

    if (hardcopy?.config) {
      setConfig(hardcopy.config);
      setSource('hardcopy');
      setLastSyncAt(hardcopy.syncedAt);
      setDegradedMode(true);
      setNotice(
        reason === 'offline'
          ? 'Working now: using hardcopy config while live sync retries every 120s.'
          : 'No live config returned. Using hardcopy config.',
      );
      return;
    }

    setConfig(BASELINE_CONFIG);
    setSource('baseline');
    setLastSyncAt(null);
    setDegradedMode(true);
    setNotice('Working now: baseline config is active until first sync succeeds.');
  }, []);

  const syncConfig = useCallback(
    async ({ manual = false, silent = false }: { manual?: boolean; silent?: boolean } = {}) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        const response = await fetch(`${API_BASE}/api/institutional/config`, { headers: getAuthHeaders() });

        if (!response.ok) {
          throw new Error('institutional-config-unavailable');
        }

        const data = await parseJsonSafe<{ data?: { config?: Config } }>(response);
        const liveConfig = data?.data?.config;

        if (!liveConfig) {
          setError('');
          applyFallback('empty');
          return;
        }

        const syncedAt = new Date().toISOString();
        const stamp = computeConfigStamp(liveConfig);
        const previousHardcopy = readConfigHardcopy();

        if (!previousHardcopy || previousHardcopy.stamp !== stamp) {
          writeConfigHardcopy({ config: liveConfig, stamp, syncedAt });
        }

        const recovered = degradedMode;
        setConfig(liveConfig);
        setSource('live');
        setLastSyncAt(syncedAt);
        setDegradedMode(false);
        setError('');

        if (!silent && (manual || recovered)) {
          setNotice(recovered ? 'Live config restored. Hardcopy refreshed.' : 'Institutional config refreshed.');
        }
      } catch {
        if (!silent) {
          setError('Live institutional config is unavailable in this environment.');
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
    void syncConfig();

    const timer = window.setInterval(() => {
      void syncConfig({ silent: true });
    }, AUTO_RESYNC_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncConfig]);

  const saveConfig = async () => {
    setSaving(true);
    setError('');
    setNotice(null);

    if (config.quorum_min < 1) {
      setError('Quorum minimum must be at least 1.');
      setSaving(false);
      return;
    }

    if (degradedMode) {
      const syncedAt = new Date().toISOString();
      writeConfigHardcopy({ config, stamp: computeConfigStamp(config), syncedAt });
      setSource('hardcopy');
      setLastSyncAt(syncedAt);
      setNotice('Working now: config saved to hardcopy fallback.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/institutional/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('institutional-save-failed');
      }

      const data = await parseJsonSafe<{ data?: { config?: Config } }>(response);
      const nextConfig = data?.data?.config ?? config;
      const syncedAt = new Date().toISOString();

      setConfig(nextConfig);
      setSource('live');
      setLastSyncAt(syncedAt);
      setDegradedMode(false);
      writeConfigHardcopy({ config: nextConfig, stamp: computeConfigStamp(nextConfig), syncedAt });
      setNotice('Config saved.');
    } catch {
      const syncedAt = new Date().toISOString();
      setDegradedMode(true);
      setSource('hardcopy');
      setLastSyncAt(syncedAt);
      writeConfigHardcopy({ config, stamp: computeConfigStamp(config), syncedAt });
      setError('Live config save is unavailable right now.');
      setNotice('Working now: config kept in hardcopy fallback for replay.');
    } finally {
      setSaving(false);
    }
  };

  const addObserver = async () => {
    setError('');
    setNotice(null);

    if (!observer.name.trim() || !observer.email.trim()) {
      setError('Observer name and email are required.');
      return;
    }

    const pendingEntry: PendingObserver = {
      ...observer,
      id: `OBS-${Date.now()}`,
      queuedAt: new Date().toISOString(),
      statusFlag: 'pending_sync',
    };

    setAddingObserver(true);

    if (degradedMode) {
      setPendingObservers((current) => [pendingEntry, ...current].slice(0, 10));
      setObserver({ name: '', organization: '', email: '' });
      setNotice('Working now: observer entry queued locally for replay after reconnect.');
      setAddingObserver(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/institutional/observers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(observer),
      });

      if (!response.ok) {
        throw new Error('observer-submit-failed');
      }

      setPendingObservers((current) => [{ ...pendingEntry, statusFlag: 'submitted' as const }, ...current].slice(0, 10));
      setObserver({ name: '', organization: '', email: '' });
      setNotice('Observer submitted.');
    } catch {
      setDegradedMode(true);
      setError('Live observer submission is unavailable right now.');
      setNotice('Working now: observer entry queued locally for replay after reconnect.');
      setPendingObservers((current) => [pendingEntry, ...current].slice(0, 10));
      setObserver({ name: '', organization: '', email: '' });
    } finally {
      setAddingObserver(false);
    }
  };

  const modeStatus = useMemo(() => (config.enabled ? 'Enabled' : 'Disabled'), [config.enabled]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Institutional Config
            </h1>
            <HoverBubble title="Why this matters" align="right">
              This keeps governance controls stable across outages via hardcopy sync.
            </HoverBubble>
          </div>
          <p className="text-[color:rgba(246,212,203,0.82)]">Core governance controls and observer access.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading institutional config…</div> : null}

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

        <div className="grid gap-3 md:grid-cols-3">
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Mode</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{modeStatus}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Quorum</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{config.quorum_min}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Source</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{sourceLabel(source)}</p>
            <p className="text-xs text-[color:rgba(246,212,203,0.62)]">{formatSync(lastSyncAt)}</p>
          </article>
        </div>

        <section className="card-civic space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Config toggles
              </h2>
              <HoverBubble title="Declutter mode" align="left">
                Keep only key toggles visible. Details are in queued logs below.
              </HoverBubble>
            </div>
            <button
              className="btn-pill btn-pill-outline text-xs"
              onClick={() => void syncConfig({ manual: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <label className="flex items-center gap-2 text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))}
              />
              Enable institutional mode
            </label>
            <label className="flex items-center gap-2 text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={config.external_observer_enabled}
                onChange={(event) => setConfig((current) => ({ ...current, external_observer_enabled: event.target.checked }))}
              />
              Enable external observer seat
            </label>
            <label className="flex items-center gap-2 text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={config.extended_audit_logging}
                onChange={(event) => setConfig((current) => ({ ...current, extended_audit_logging: event.target.checked }))}
              />
              Enable extended audit log
            </label>
            <label className="flex items-center gap-2 text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={config.worm_audit_suggestion}
                onChange={(event) => setConfig((current) => ({ ...current, worm_audit_suggestion: event.target.checked }))}
              />
              Enable WORM audit hint
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--color-foreground)]">Quorum minimum</label>
            <input
              className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              type="number"
              value={config.quorum_min}
              onChange={(event) => setConfig((current) => ({ ...current, quorum_min: Number(event.target.value) || 0 }))}
            />
          </div>

          <button className="btn-pill btn-pill-primary" onClick={() => void saveConfig()} disabled={saving}>
            {saving ? 'Saving…' : 'Save config'}
          </button>
        </section>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Add observer
            </h2>
            <HoverBubble title="Queue behavior" align="left">
              If live submit fails, this observer entry is queued locally for replay.
            </HoverBubble>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              placeholder="Name"
              value={observer.name}
              onChange={(event) => setObserver((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              placeholder="Organization"
              value={observer.organization}
              onChange={(event) => setObserver((current) => ({ ...current, organization: event.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              placeholder="Email"
              value={observer.email}
              onChange={(event) => setObserver((current) => ({ ...current, email: event.target.value }))}
            />
          </div>

          <button className="btn-pill btn-pill-secondary" onClick={() => void addObserver()} disabled={addingObserver}>
            {addingObserver ? 'Submitting…' : 'Add observer'}
          </button>

          {pendingObservers.length > 0 ? (
            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3" open>
              <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">
                Pending / recent observers ({pendingObservers.length})
              </summary>
              <div className="mt-3 space-y-2">
                {pendingObservers.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-2 text-sm">
                    <span className="font-semibold text-[var(--color-foreground)]">{entry.name}</span>
                    <span className="ml-2 text-[color:rgba(246,212,203,0.78)]">{entry.email}</span>
                    <span className="ml-2 text-[color:rgba(246,212,203,0.65)]">
                      {entry.statusFlag === 'pending_sync' ? 'pending sync' : 'submitted'} · {new Date(entry.queuedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>
    </div>
  );
}
