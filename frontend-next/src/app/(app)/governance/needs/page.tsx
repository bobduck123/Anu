'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type NeedsSignal = {
  id: number | string;
  severity_0_100?: number;
  reason_codes?: string[];
};

const FALLBACK_SIGNALS: NeedsSignal[] = [
  {
    id: 'NS-9001',
    severity_0_100: 78,
    reason_codes: ['housing_pressure', 'care_queue_growth', 'coordination_gap'],
  },
  {
    id: 'NS-9002',
    severity_0_100: 62,
    reason_codes: ['local_supply_drop', 'skills_shortage'],
  },
  {
    id: 'NS-9003',
    severity_0_100: 47,
    reason_codes: ['transport_delay'],
  },
];

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function NeedsSignalsPage() {
  const [signals, setSignals] = useState<NeedsSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSignals = async () => {
      setLoading(true);
      setError('');
      setNotice(null);
      setDegradedMode(false);

      try {
        const response = await fetch(`${API_BASE}/api/needs-signals/`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('needs service unavailable');
        }

        const data = await parseJsonSafe<{ data?: { signals?: NeedsSignal[] } }>(response);
        const liveSignals = data?.data?.signals || [];

        if (!active) return;

        if (liveSignals.length < 1) {
          setSignals(FALLBACK_SIGNALS);
          setDegradedMode(true);
          setNotice('No active live needs signals are published yet. Running fallback signal preview for continuity.');
          return;
        }

        setSignals(liveSignals);
      } catch {
        if (!active) return;

        setSignals(FALLBACK_SIGNALS);
        setDegradedMode(true);
        setError('Live needs signal feed is unavailable in this environment.');
        setNotice('Working now: governance review and public trust routes remain available while live needs telemetry recovers.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSignals();

    return () => {
      active = false;
    };
  }, []);

  const highSeverityCount = useMemo(
    () => signals.filter((signal) => (signal.severity_0_100 || 0) >= 70).length,
    [signals],
  );

  const averageSeverity = useMemo(() => {
    if (signals.length < 1) return 0;
    const total = signals.reduce((sum, signal) => sum + (signal.severity_0_100 || 0), 0);
    return Math.round(total / signals.length);
  }, [signals]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Needs Signals
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Governance view of emerging capacity gaps.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading needs telemetry…</div>
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
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Signals visible</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{signals.length}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">High severity</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{highSeverityCount}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Average severity</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{averageSeverity}</p>
          </div>
        </div>

        <div className="card-civic space-y-2">
          {signals.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No active signals.</p>
          ) : (
            <div className="space-y-2">
              {signals.map((signal) => (
                <div key={signal.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--color-foreground)]">Signal {signal.id}</p>
                  <p className="text-[color:rgba(246,212,203,0.8)]">
                    Severity {signal.severity_0_100 ?? 'n/a'} · {(signal.reason_codes || []).join(', ') || 'no reason codes'}
                  </p>
                  {degradedMode ? (
                    <p className="text-xs text-[color:rgba(246,212,203,0.62)]">Fallback signal preview</p>
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
