'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();
const FORMULA_HARDCOPY_CACHE_KEY = 'governance-formula-ruleset-hardcopy-v1';
const AUTO_RESYNC_MS = 90_000;

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type FormulaDefinition = {
  key: string;
  version: number;
};

type FormulaHardcopy = {
  definitions: FormulaDefinition[];
  stamp: string;
  syncedAt: string;
};

const BASELINE_FORMULAS: FormulaDefinition[] = [
  { key: 'commons_allocation_weighting', version: 3 },
  { key: 'relief_priority_scoring', version: 2 },
  { key: 'trust_reserve_dampener', version: 4 },
];

function computeFormulaStamp(definitions: FormulaDefinition[]): string {
  return [...definitions]
    .sort((a, b) => a.key.localeCompare(b.key) || a.version - b.version)
    .map((definition) => `${definition.key}@${definition.version}`)
    .join('|');
}

function readFormulaHardcopy(): FormulaHardcopy | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(FORMULA_HARDCOPY_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as FormulaHardcopy;
    if (!Array.isArray(parsed.definitions) || typeof parsed.stamp !== 'string' || typeof parsed.syncedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeFormulaHardcopy(payload: FormulaHardcopy) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(FORMULA_HARDCOPY_CACHE_KEY, JSON.stringify(payload));
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
  if (source === 'live') return 'Live rule set';
  if (source === 'hardcopy') return 'Hardcopy rule set';
  return 'Baseline rule set';
}

export default function FormulaRegistryPage() {
  const [definitions, setDefinitions] = useState<FormulaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [source, setSource] = useState<'live' | 'hardcopy' | 'baseline'>('baseline');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [activation, setActivation] = useState({ key: '', version: 1, params: '{}' });

  const applyFallback = useCallback((reason: 'offline' | 'empty') => {
    const hardcopy = readFormulaHardcopy();

    if (hardcopy && hardcopy.definitions.length > 0) {
      setDefinitions(hardcopy.definitions);
      setSource('hardcopy');
      setLastSyncAt(hardcopy.syncedAt);
      setDegradedMode(true);
      setNotice(
        reason === 'offline'
          ? 'Live formula service is unavailable. Running the last synced hardcopy rule set and auto-resyncing every 90 seconds.'
          : 'No live formulas were returned. Running the last synced hardcopy rule set.',
      );
      return;
    }

    setDefinitions(BASELINE_FORMULAS);
    setSource('baseline');
    setLastSyncAt(null);
    setDegradedMode(true);
    setNotice('No synced hardcopy exists yet. Using baseline formulas until a live rule set can be synced.');
  }, []);

  const syncDefinitions = useCallback(
    async ({ manual = false, silent = false }: { manual?: boolean; silent?: boolean } = {}) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        const response = await fetch(`${API_BASE}/api/formulas/`, { headers: getAuthHeaders() });

        if (!response.ok) {
          throw new Error('formula-registry-unavailable');
        }

        const data = await parseJsonSafe<{ data?: { definitions?: FormulaDefinition[] } }>(response);
        const liveDefinitions = data?.data?.definitions || [];

        if (liveDefinitions.length < 1) {
          setError('');
          applyFallback('empty');
          return;
        }

        const syncedAt = new Date().toISOString();
        const stamp = computeFormulaStamp(liveDefinitions);
        const previousHardcopy = readFormulaHardcopy();

        if (!previousHardcopy || previousHardcopy.stamp !== stamp) {
          writeFormulaHardcopy({ definitions: liveDefinitions, stamp, syncedAt });
        }

        const recovered = degradedMode;
        setDefinitions(liveDefinitions);
        setSource('live');
        setLastSyncAt(syncedAt);
        setDegradedMode(false);
        setError('');

        if (!silent) {
          setNotice(recovered ? 'Live formulas reconnected. Hardcopy rule set refreshed.' : 'Live formulas loaded.');
        }
      } catch {
        if (!silent) {
          setError('Live formula registry is unavailable in this environment.');
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
    void syncDefinitions();

    const timer = window.setInterval(() => {
      void syncDefinitions({ silent: true });
    }, AUTO_RESYNC_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncDefinitions]);

  const activateFormula = async () => {
    setError('');
    setNotice(null);

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(activation.params || '{}') as Record<string, unknown>;
    } catch {
      setError('Formula params must be valid JSON.');
      return;
    }

    setActivating(true);

    try {
      const response = await fetch(`${API_BASE}/api/formulas/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          key: activation.key,
          version: activation.version,
          params: parsedParams,
        }),
      });

      if (!response.ok) {
        throw new Error('activate-failed');
      }

      setNotice('Formula activation submitted. Syncing the current agreed rule set…');
      await syncDefinitions({ silent: true });
    } catch {
      setDegradedMode(true);
      setError('Live formula activation is unavailable right now.');
      setNotice('Keep your activation draft and retry after auto-resync pulls the latest live rule set.');
    } finally {
      setActivating(false);
    }
  };

  const latestVersion = useMemo(
    () => (definitions.length > 0 ? Math.max(...definitions.map((definition) => definition.version)) : 0),
    [definitions],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Formula Registry
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Governance-controlled formula versions and defaults.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading formula registry…</div>
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Definitions visible</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{definitions.length}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Latest version</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">v{latestVersion || 'n/a'}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Rule source</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{sourceLabel(source)}</p>
            <p className="text-xs text-[color:rgba(246,212,203,0.62)]">
              {lastSyncAt ? `Synced ${new Date(lastSyncAt).toLocaleString()}` : 'Awaiting first live sync'}
            </p>
          </div>
        </div>

        <div className="card-civic space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Formula Definitions
            </h2>
            <button
              className="btn-pill btn-pill-outline text-xs"
              onClick={() => void syncDefinitions({ manual: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>

          {definitions.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No formulas found.</p>
          ) : (
            <div className="space-y-2">
              {definitions.map((definition) => (
                <div
                  key={`${definition.key}-${definition.version}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-[var(--color-foreground)]">{definition.key}</span>
                  <span className="ml-2 text-[color:rgba(246,212,203,0.76)]">v{definition.version}</span>
                  {degradedMode ? (
                    <span className="ml-3 text-xs text-[color:rgba(246,212,203,0.62)]">fallback hardcopy</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Activate Formula
          </h2>
          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
            placeholder="Formula key"
            value={activation.key}
            onChange={(event) => setActivation((current) => ({ ...current, key: event.target.value }))}
          />
          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
            type="number"
            placeholder="Version"
            value={activation.version}
            onChange={(event) => setActivation((current) => ({ ...current, version: Number(event.target.value) || 1 }))}
          />
          <textarea
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono-data bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
            placeholder='{"cert_weight": 10.0}'
            value={activation.params}
            onChange={(event) => setActivation((current) => ({ ...current, params: event.target.value }))}
          />
          <button className="btn-pill btn-pill-primary" onClick={() => void activateFormula()} disabled={activating}>
            {activating ? 'Activating…' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
