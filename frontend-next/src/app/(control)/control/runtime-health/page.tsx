'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AnuControlButton,
  AnuHeroMetric,
  AnuHeroMetricsRail,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import {
  probeControlRuntimeContracts,
  type ControlRuntimeProbeResult,
} from '@/lib/api/controlClient';

function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export default function ControlRuntimeHealthPage() {
  const [results, setResults] = useState<ControlRuntimeProbeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const failingCount = useMemo(() => results.filter((result) => !result.ok).length, [results]);
  const passCount = useMemo(() => results.filter((result) => result.ok).length, [results]);

  async function refresh() {
    setLoading(true);
    const nextResults = await probeControlRuntimeContracts();
    setResults(nextResults);
    setRefreshedAt(new Date().toISOString());
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <AnuPageHero
        eyebrow="Operational observatory"
        title="Runtime health contract"
        description="Control-plane diagnostics for core and impact runtimes. Browser requests in this route flow through /api/control/*."
        actions={
          <AnuControlButton type="button" onClick={() => void refresh()} disabled={loading} tone="active">
            {loading ? 'Refreshing...' : 'Refresh endpoints'}
          </AnuControlButton>
        }
      >
        <AnuHeroMetricsRail columns="three">
          <AnuHeroMetric label="Failing endpoints" value={String(failingCount)} detail="Total endpoints currently not passing contract checks." />
          <AnuHeroMetric label="Passing endpoints" value={String(passCount)} detail="Endpoints currently passing with valid HTTP responses." />
          <AnuHeroMetric label="Last refresh" value={refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : 'never'} detail={refreshedAt ?? 'No diagnostic cycle completed yet.'} />
        </AnuHeroMetricsRail>
      </AnuPageHero>

      <section className="grid gap-4">
        {results.map((result) => (
          <AnuSurfacePanel key={result.endpoint} tone={result.ok ? 'soft' : 'quiet'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--color-foreground)]">{result.endpoint}</h2>
              <div className="text-xs uppercase tracking-[0.12em]">
                <span className="text-[#f6d4cb]">{result.ok ? 'PASS' : 'FAIL'}</span>
                <span className="ml-3 text-[color:rgba(246,212,203,0.8)]">
                  {result.statusCode ?? 'ERR'} {result.statusText}
                </span>
                <span className="ml-3 text-[color:rgba(246,212,203,0.8)]">{result.latencyMs ?? '-'} ms</span>
              </div>
            </div>
            <pre className="mt-3 overflow-auto rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.25)] p-3 text-xs text-[color:rgba(246,212,203,0.86)]">
              {formatPayload(result.payload)}
            </pre>
          </AnuSurfacePanel>
        ))}
      </section>
    </div>
  );
}
