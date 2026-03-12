'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export default function SystemicShockPage() {
  const [mode, setMode] = useState<ModeData | null>(null);
  const [resilience, setResilience] = useState<ResilienceData | null>(null);
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [modeRes, resRes, digestRes] = await Promise.all([
          fetch(`${API_BASE}/api/systemic/mode`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/systemic/resilience`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/systemic/digest`, { headers: getAuthHeaders() }),
        ]);
        const modeData = (await modeRes.json()) as { data?: ModeData | null };
        const resData = (await resRes.json()) as { data?: ResilienceData | null };
        const digestData = (await digestRes.json()) as { data?: { digest?: DigestData | null } };
        if (!active) return;
        setMode(modeData.data ?? null);
        setResilience(resData.data ?? null);
        setDigest(digestData.data?.digest ?? null);
      } catch {
        if (active) setError('Failed to load systemic status');
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Systemic Shock Preparedness
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Mode engine, resilience score, and crisis digest for compound shocks.
          </p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card-civic space-y-2">
            <h2 className="text-lg font-semibold">Current Mode</h2>
            <div className="text-2xl font-bold">{mode?.mode || 'n/a'}</div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Activated: {mode?.activated_at ? new Date(mode.activated_at).toLocaleString() : 'n/a'}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Expires: {mode?.expiry_at ? new Date(mode.expiry_at).toLocaleDateString() : 'n/a'}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Recommended: {mode?.recommended_mode || 'n/a'}
            </div>
          </div>

          <div className="card-civic space-y-2">
            <h2 className="text-lg font-semibold">Resilience Score</h2>
            <div className="text-2xl font-bold">
              {typeof mode?.resilience_score === 'number' ? mode.resilience_score.toFixed(2) : 'n/a'}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Liquidity: {resilience?.submetrics?.liquidity_score?.toFixed?.(2) ?? 'n/a'}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Capture: {resilience?.submetrics?.capture_score?.toFixed?.(2) ?? 'n/a'}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Overload: {resilience?.submetrics?.overload_score?.toFixed?.(2) ?? 'n/a'}
            </div>
          </div>

          <div className="card-civic space-y-2">
            <h2 className="text-lg font-semibold">Crisis Digest</h2>
            {digest ? (
              <>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  Runway (months): {digest.summary?.runway_months?.toFixed?.(1) ?? 'n/a'}
                </div>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  Relief Backlog: {digest.summary?.relief_backlog ?? 'n/a'}
                </div>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  Active Alerts: {(digest.summary?.critical_alerts || 0) + (digest.summary?.warning_alerts || 0)}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-muted-foreground)]">No active digest.</div>
            )}
          </div>
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-lg font-semibold">Operational Guardrails</h2>
          <ul className="text-sm text-[var(--color-muted-foreground)] list-disc pl-5">
            <li>Black Swan freezes privilege escalation and featured amplification.</li>
            <li>Onboarding restricted to observer tier in Black Swan mode.</li>
            <li>Emergency allocation prioritizes relief and liquidity.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
