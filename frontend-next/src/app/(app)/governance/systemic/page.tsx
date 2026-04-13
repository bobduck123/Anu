'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type ModeData = {
  mode: string;
  activated_at?: string | null;
  expiry_at?: string | null;
  resilience_score?: number;
  recommended_mode?: string | null;
};

type ResilienceData = {
  submetrics?: {
    liquidity_score?: number;
    capture_score?: number;
    overload_score?: number;
  };
};

type DigestData = {
  summary?: {
    runway_months?: number;
    relief_backlog?: number;
    critical_alerts?: number;
    warning_alerts?: number;
  };
};

const FALLBACK_MODE: ModeData = {
  mode: 'Fallback watch',
  resilience_score: 0.52,
  recommended_mode: 'Observe + stabilize',
};

const FALLBACK_RESILIENCE: ResilienceData = {
  submetrics: {
    liquidity_score: 0.5,
    capture_score: 0.48,
    overload_score: 0.61,
  },
};

const FALLBACK_DIGEST: DigestData = {
  summary: {
    runway_months: 3.2,
    relief_backlog: 0,
    critical_alerts: 0,
    warning_alerts: 1,
  },
};

export default function SystemicShockPage() {
  const [mode, setMode] = useState<ModeData | null>(null);
  const [resilience, setResilience] = useState<ResilienceData | null>(null);
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      setNotice(null);
      setDegraded(false);

      try {
        const [modeRes, resRes, digestRes] = await Promise.all([
          fetch(`${API_BASE}/api/systemic/mode`, { headers: await getAuthHeaders() }),
          fetch(`${API_BASE}/api/systemic/resilience`, { headers: await getAuthHeaders() }),
          fetch(`${API_BASE}/api/systemic/digest`, { headers: await getAuthHeaders() }),
        ]);

        let hasIssue = false;
        let nextMode: ModeData | null = null;
        let nextResilience: ResilienceData | null = null;
        let nextDigest: DigestData | null = null;

        if (modeRes.ok) {
          const modeData = (await modeRes.json()) as { data?: ModeData | null };
          nextMode = modeData.data ?? null;
        } else {
          hasIssue = true;
        }

        if (resRes.ok) {
          const resData = (await resRes.json()) as { data?: ResilienceData | null };
          nextResilience = resData.data ?? null;
        } else {
          hasIssue = true;
        }

        if (digestRes.ok) {
          const digestData = (await digestRes.json()) as { data?: { digest?: DigestData | null } };
          nextDigest = digestData.data?.digest ?? null;
        } else {
          hasIssue = true;
        }

        if (!active) return;

        setMode(nextMode ?? FALLBACK_MODE);
        setResilience(nextResilience ?? FALLBACK_RESILIENCE);
        setDigest(nextDigest ?? FALLBACK_DIGEST);

        if (hasIssue) {
          setDegraded(true);
          setNotice(
            'Live systemic telemetry is partially unavailable. Working now: governance routes and public trust docs remain available while status feeds recover.',
          );
        }
      } catch {
        if (!active) return;

        setDegraded(true);
        setError('Failed to load systemic status.');
        setNotice(
          'Working now: use governance index, transparency, and docs while systemic status feeds recover.',
        );
        setMode(FALLBACK_MODE);
        setResilience(FALLBACK_RESILIENCE);
        setDigest(FALLBACK_DIGEST);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const activeAlerts =
    (digest?.summary?.critical_alerts || 0) + (digest?.summary?.warning_alerts || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Systemic Shock Preparedness
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">
            Mode engine, resilience score, and crisis digest for compound shocks.
          </p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading systemic status…</div>
        ) : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">Open governance index</Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">Open transparency</Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">Open docs</Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card-civic space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Current Mode
            </h2>
            <div className="text-2xl font-semibold text-[var(--color-foreground)]">{mode?.mode || 'n/a'}</div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Activated: {mode?.activated_at ? new Date(mode.activated_at).toLocaleString() : 'n/a'}
            </div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Expires: {mode?.expiry_at ? new Date(mode.expiry_at).toLocaleDateString() : 'n/a'}
            </div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Recommended: {mode?.recommended_mode || 'n/a'}
            </div>
          </div>

          <div className="card-civic space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Resilience Score
            </h2>
            <div className="text-2xl font-semibold text-[var(--color-institutional)]">
              {typeof mode?.resilience_score === 'number' ? mode.resilience_score.toFixed(2) : 'n/a'}
            </div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Liquidity: {resilience?.submetrics?.liquidity_score?.toFixed?.(2) ?? 'n/a'}
            </div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Capture: {resilience?.submetrics?.capture_score?.toFixed?.(2) ?? 'n/a'}
            </div>
            <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
              Overload: {resilience?.submetrics?.overload_score?.toFixed?.(2) ?? 'n/a'}
            </div>
          </div>

          <div className="card-civic space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Crisis Digest
            </h2>
            {digest ? (
              <>
                <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
                  Runway (months): {digest.summary?.runway_months?.toFixed?.(1) ?? 'n/a'}
                </div>
                <div className="text-sm text-[color:rgba(246,212,203,0.72)]">
                  Relief backlog: {digest.summary?.relief_backlog ?? 'n/a'}
                </div>
                <div className="text-sm text-[color:rgba(246,212,203,0.72)]">Active alerts: {activeAlerts}</div>
              </>
            ) : (
              <div className="text-sm text-[color:rgba(246,212,203,0.72)]">No active digest.</div>
            )}
          </div>
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Operational Guardrails
          </h2>
          <ul className="text-sm text-[color:rgba(246,212,203,0.74)] list-disc pl-5 space-y-1">
            <li>Black Swan freezes privilege escalation and featured amplification.</li>
            <li>Onboarding is restricted to observer tier in Black Swan mode.</li>
            <li>Emergency allocation prioritizes relief and liquidity pathways.</li>
          </ul>
          {degraded ? (
            <p className="text-xs text-[color:rgba(246,212,203,0.62)]">
              Running in fallback mode: values are safety placeholders until live telemetry is restored.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}




