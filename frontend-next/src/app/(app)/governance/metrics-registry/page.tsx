'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();
const METRIC_HARDCOPY_CACHE_KEY = 'governance-metric-ruleset-hardcopy-v1';
const AUTO_RESYNC_MS = 90_000;

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type MetricDefinition = {
  key: string;
  version: number;
  output_units?: string;
};

type MetricHardcopy = {
  metrics: MetricDefinition[];
  stamp: string;
  syncedAt: string;
};

const BASELINE_METRICS: MetricDefinition[] = [
  { key: 'resilience_index', version: 4, output_units: 'score' },
  { key: 'coordination_latency', version: 2, output_units: 'hours' },
  { key: 'care_capacity_ratio', version: 3, output_units: 'ratio' },
];

function computeMetricStamp(metrics: MetricDefinition[]): string {
  return [...metrics]
    .sort((a, b) => a.key.localeCompare(b.key) || a.version - b.version)
    .map((metric) => `${metric.key}@${metric.version}:${metric.output_units || 'n/a'}`)
    .join('|');
}

function readMetricHardcopy(): MetricHardcopy | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(METRIC_HARDCOPY_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as MetricHardcopy;
    if (!Array.isArray(parsed.metrics) || typeof parsed.stamp !== 'string' || typeof parsed.syncedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeMetricHardcopy(payload: MetricHardcopy) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(METRIC_HARDCOPY_CACHE_KEY, JSON.stringify(payload));
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

export default function MetricsRegistryPage() {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [source, setSource] = useState<'live' | 'hardcopy' | 'baseline'>('baseline');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const applyFallback = useCallback((reason: 'offline' | 'empty') => {
    const hardcopy = readMetricHardcopy();

    if (hardcopy && hardcopy.metrics.length > 0) {
      setMetrics(hardcopy.metrics);
      setSource('hardcopy');
      setLastSyncAt(hardcopy.syncedAt);
      setDegradedMode(true);
      setNotice(
        reason === 'offline'
          ? 'Live metrics service is unavailable. Running the last synced hardcopy metric set and auto-resyncing every 90 seconds.'
          : 'No live metrics were returned. Running the last synced hardcopy metric set.',
      );
      return;
    }

    setMetrics(BASELINE_METRICS);
    setSource('baseline');
    setLastSyncAt(null);
    setDegradedMode(true);
    setNotice('No synced metric hardcopy exists yet. Using baseline metrics until live sync becomes available.');
  }, []);

  const syncMetrics = useCallback(
    async ({ manual = false, silent = false }: { manual?: boolean; silent?: boolean } = {}) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        const response = await fetch(`${API_BASE}/api/metrics-registry/`, { headers: getAuthHeaders() });

        if (!response.ok) {
          throw new Error('metrics-registry-unavailable');
        }

        const data = await parseJsonSafe<{ data?: { metrics?: MetricDefinition[] } }>(response);
        const liveMetrics = data?.data?.metrics || [];

        if (liveMetrics.length < 1) {
          setError('');
          applyFallback('empty');
          return;
        }

        const syncedAt = new Date().toISOString();
        const stamp = computeMetricStamp(liveMetrics);
        const previousHardcopy = readMetricHardcopy();

        if (!previousHardcopy || previousHardcopy.stamp !== stamp) {
          writeMetricHardcopy({ metrics: liveMetrics, stamp, syncedAt });
        }

        const recovered = degradedMode;
        setMetrics(liveMetrics);
        setSource('live');
        setLastSyncAt(syncedAt);
        setDegradedMode(false);
        setError('');

        if (!silent) {
          setNotice(recovered ? 'Live metrics reconnected. Hardcopy metric set refreshed.' : 'Live metrics loaded.');
        }
      } catch {
        if (!silent) {
          setError('Live metrics registry is unavailable in this environment.');
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
    void syncMetrics();

    const timer = window.setInterval(() => {
      void syncMetrics({ silent: true });
    }, AUTO_RESYNC_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncMetrics]);

  const latestVersion = useMemo(
    () => (metrics.length > 0 ? Math.max(...metrics.map((metric) => metric.version)) : 0),
    [metrics],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Metrics Registry
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Versioned metrics with required primitives.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading metrics registry…</div>
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
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Metrics visible</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{metrics.length}</p>
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
              Metric Definitions
            </h2>
            <button
              className="btn-pill btn-pill-outline text-xs"
              onClick={() => void syncMetrics({ manual: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>

          {metrics.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No metrics.</p>
          ) : (
            <div className="space-y-2">
              {metrics.map((metric) => (
                <div
                  key={`${metric.key}-${metric.version}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-[var(--color-foreground)]">{metric.key}</span>
                  <span className="ml-2 text-[color:rgba(246,212,203,0.76)]">v{metric.version}</span>
                  <span className="ml-2 text-[color:rgba(246,212,203,0.7)]">{metric.output_units || 'units n/a'}</span>
                  {degradedMode ? (
                    <span className="ml-3 text-xs text-[color:rgba(246,212,203,0.62)]">fallback hardcopy</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
