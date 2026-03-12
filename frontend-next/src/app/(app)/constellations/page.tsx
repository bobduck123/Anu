'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { constellationsApi, ConstellationSummary } from '@/lib/api/endpoints';
import { Loader2, Sparkles, MapPin, Layers } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function ConstellationsPage() {
  const [items, setItems] = useState<ConstellationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await constellationsApi.list();
        setItems(res.constellations || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load constellations'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Sparkles className="w-4 h-4" />
            Constellations
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Coordination Constellations
          </h1>
          <p className="text-[var(--color-earth-medium)] max-w-2xl">
            A shared performance map for microcosms. See featured coordination patterns, drift alerts, and weekly briefings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)] mb-8">
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/constellations/${item.id}`}
                className="card-civic group transition-transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      className="text-xl font-semibold text-[var(--color-earth-dark)] mb-2"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {item.name}
                    </h3>
                    <p className="text-sm text-[var(--color-earth-medium)] mb-3">
                      {item.description || 'Regional coordination constellation'}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-earth-medium)]">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[var(--color-sage)]" />
                        {item.domain || 'general'}
                      </span>
                      {item.geoLabel && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--color-sage)]" />
                          {item.geoLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-forest)]">
                    {item.active ? 'Active' : 'Paused'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
