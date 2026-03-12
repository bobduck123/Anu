'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { constellationsApi, ConstellationDashboard } from '@/lib/api/endpoints';
import { Loader2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const readSummaryMetric = (summary: Record<string, unknown> | null | undefined, key: string): number => {
  const value = summary?.[key];
  return typeof value === 'number' ? value : 0;
};

export default function ConstellationDetailPage() {
  const params = useParams();
  const constellationId = useMemo(() => Number(params?.id), [params]);
  const [data, setData] = useState<ConstellationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!constellationId) return;
    const load = async () => {
      try {
        const res = await constellationsApi.dashboard(constellationId);
        setData(res);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load constellation dashboard'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [constellationId]);

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
        {error || 'Constellation not available'}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Sparkles className="w-4 h-4" />
            Constellation Dashboard
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {data.constellation.name}
          </h1>
          <p className="text-[var(--color-earth-medium)] max-w-3xl">
            {data.constellation.description || 'Weekly coordination insights and anti-capture safeguards.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Members</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              {data.memberCount}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Latest Week</p>
            <p className="text-lg font-semibold text-[var(--color-earth-dark)]">
              {data.latestWeek || 'n/a'}
            </p>
          </div>
          <div className="card-civic">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <p className="text-xs text-[var(--color-earth-medium)]">Active Alerts</p>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-accent)]">{data.activeAlerts}</p>
          </div>
          <div className="card-civic">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-forest)]" />
              <p className="text-xs text-[var(--color-earth-medium)]">Featured Microcosms</p>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-forest)]">{data.featured.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-civic">
            <h3 className="text-lg font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Rankings
            </h3>
            {data.rankings.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-medium)]">No rankings yet. Run scoring to populate.</p>
            ) : (
              <div className="space-y-3">
                {data.rankings.map((r) => (
                  <Link
                    key={`${r.microcosmId}-${r.rank}`}
                    href={`/constellations/${data.constellation.id}/microcosm/${r.microcosmId}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-institutional-light)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono-data text-[var(--color-earth-medium)]">#{r.rank}</span>
                      <span className="text-sm font-medium text-[var(--color-earth-dark)]">
                        Microcosm {r.microcosmId}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-earth-medium)]">
                      Featured score: <span className="font-semibold text-[var(--color-forest)]">{r.featuredScore.toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-civic">
            <h3 className="text-lg font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Latest Brief
            </h3>
            {data.latestBrief?.summary ? (
              <div className="space-y-3 text-sm text-[var(--color-earth-medium)]">
                <p>Featured count: <span className="text-[var(--color-forest)] font-semibold">{readSummaryMetric(data.latestBrief.summary, 'featuredCount')}</span></p>
                <p>Gate blocks: <span className="font-semibold">{readSummaryMetric(data.latestBrief.summary, 'gateBlockedCount')}</span></p>
                <p>Average performance: <span className="font-semibold">{readSummaryMetric(data.latestBrief.summary, 'averagePerf')}</span></p>
                <p>Alert count: <span className="font-semibold">{readSummaryMetric(data.latestBrief.summary, 'alertCount')}</span></p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-earth-medium)]">No brief generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
