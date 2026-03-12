'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { constellationsApi, ConstellationExplain } from '@/lib/api/endpoints';
import { Loader2, Target, Layers } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const readContribution = (payload: unknown): string | number => {
  if (typeof payload === 'number' || typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return 'n/a';
  const candidate = (payload as { contribution?: unknown }).contribution;
  return typeof candidate === 'number' || typeof candidate === 'string' ? candidate : 'n/a';
};

export default function ConstellationMicrocosmPage() {
  const params = useParams();
  const constellationId = useMemo(() => Number(params?.id), [params]);
  const microcosmId = useMemo(() => Number(params?.microcosmId), [params]);
  const [data, setData] = useState<ConstellationExplain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!constellationId || !microcosmId) return;
    const load = async () => {
      try {
        const res = await constellationsApi.explain(constellationId, microcosmId);
        setData(res);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load microcosm panel'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [constellationId, microcosmId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-earth-medium)]">
        {error || 'Microcosm panel not available'}
      </div>
    );
  }

  const metrics = data.rawMetrics || {};
  const decomposition = data.decomposition || {};

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Layers className="w-4 h-4" />
            Microcosm Panel
          </span>
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Microcosm {microcosmId} Performance
          </h1>
          <p className="text-[var(--color-earth-medium)] mt-2">
            Explainable scoring with anti-capture safeguards and raw metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Rank</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              #{data.ranking.rank}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Featured Score</p>
            <p className="text-2xl font-semibold text-[var(--color-forest)] font-mono-data">
              {data.ranking.featuredScore.toFixed(2)}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Anti-Capture Weight</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              {data.ranking.antiCaptureWeight?.toFixed(2) ?? 'n/a'}
            </p>
          </div>
        </div>

        <div className="card-civic mb-8">
          <h3 className="text-lg font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
            Raw Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-[var(--color-earth-medium)]">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span>{key}</span>
                <span className="font-semibold text-[var(--color-earth-dark)]">{String(value ?? 'n/a')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-civic">
          <h3 className="text-lg font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
            Contribution Breakdown
          </h3>
          {Object.keys(decomposition).length === 0 ? (
            <p className="text-sm text-[var(--color-earth-medium)]">No decomposition data recorded.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(decomposition).map(([key, payload]) => (
                <div key={key} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-sm">
                  <span className="text-[var(--color-earth-medium)]">{key}</span>
                  <span className="font-semibold text-[var(--color-earth-dark)]">
                    {readContribution(payload)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-[var(--color-earth-medium)] flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[var(--color-sage)]" />
          Deterministic scoring. No auto-enforcement. Governance decisions remain human-led.
        </div>
      </div>
    </div>
  );
}
