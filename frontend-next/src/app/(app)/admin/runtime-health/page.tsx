'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AnuControlButton,
  AnuHeroMetric,
  AnuHeroMetricsRail,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

type EndpointStatus = {
  endpoint: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  payload: unknown;
  latencyMs: number | null;
};

const ENDPOINTS = [
  '/_core/health',
  '/_core/readiness',
  '/_impact/v1/health',
  '/_impact/v1/falak/health',
  '/_impact/v1/falak/readiness',
] as const;

function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export default function AdminRuntimeHealthPage() {
  const [results, setResults] = useState<EndpointStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const failingCount = useMemo(() => results.filter((result) => !result.ok).length, [results]);
  const passCount = useMemo(() => results.filter((result) => result.ok).length, [results]);

  async function refresh() {
    setLoading(true);
    const nextResults: EndpointStatus[] = [];

    for (const endpoint of ENDPOINTS) {
      const start = performance.now();
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = await response.text();
        }

        nextResults.push({
          endpoint,
          ok: response.ok,
          statusCode: response.status,
          statusText: response.statusText,
          payload,
          latencyMs: Math.round((performance.now() - start) * 100) / 100,
        });
      } catch (error) {
        nextResults.push({
          endpoint,
          ok: false,
          statusCode: null,
          statusText: error instanceof Error ? error.message : 'Request failed',
          payload: null,
          latencyMs: Math.round((performance.now() - start) * 100) / 100,
        });
      }
    }

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
        description="Admin contract diagnostics for core and impact runtimes. This route should prioritize scanability, pass/fail clarity, and endpoint truth over decorative treatment."
        actions={
          <AnuControlButton type="button" onClick={() => void refresh()} disabled={loading} tone="active">
            {loading ? 'Refreshing…' : 'Refresh endpoints'}
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
                <span className={result.ok ? 'text-[#f6d4cb]' : 'text-[#f6d4cb]'}>{result.ok ? 'PASS' : 'FAIL'}</span>
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
