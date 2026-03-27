'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { educationMapsApi, type MapCompileMode } from '@/lib/api/educationMaps';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';

const QUICK_TOPICS = [
  'consciousness theories',
  'ancient levantine deities',
  'software architecture patterns',
];

export function MapLibraryIndex() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<MapCompileMode>('auto_seed');

  const mapsQuery = useQuery({
    queryKey: ['education-maps'],
    queryFn: () => educationMapsApi.listMaps(),
  });

  const createMapMutation = useMutation({
    mutationFn: () => educationMapsApi.resolveMap({ topic, mode }),
    onSuccess: async ({ map }) => {
      await queryClient.invalidateQueries({ queryKey: ['education-maps'] });
      router.push(`/education/resource-library/maps/${map.definition.topicKey}`);
    },
  });

  if (mapsQuery.isLoading) {
    return <LoadingState message="Loading map library..." />;
  }

  if (mapsQuery.error) {
    return <ErrorState message={mapsQuery.error instanceof Error ? mapsQuery.error.message : 'Failed to load map library'} />;
  }

  const maps = mapsQuery.data ?? [];

  return (
    <section className="space-y-8">
      <header className="edu-card overflow-hidden">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),rgba(15,23,42,0.95)_38%,rgba(2,6,23,1)_100%)] px-6 py-8 text-white lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/75">Education → Resource Library → Maps</p>
            <h1 className="mt-3 text-4xl font-semibold">Falak Map Autopilot</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Request a topic, retrieve an existing knowledge constellation if it already exists, or compile a new draft map through deterministic Falak pipelines.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_TOPICS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setTopic(entry)}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 transition hover:bg-white/14"
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-200" />
              <h2 className="text-lg font-semibold">Generate a new map</h2>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-300">Topic request</span>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="ancient levantine deities"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-300/40"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-300">Compile mode</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as MapCompileMode)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
                >
                  <option value="auto_seed">auto_seed</option>
                  <option value="auto_expand">auto_expand</option>
                  <option value="curated_refine">curated_refine</option>
                </select>
              </label>
              <button
                type="button"
                disabled={!topic.trim() || createMapMutation.isPending}
                onClick={() => createMapMutation.mutate()}
                className="w-full rounded-full border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300/40 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMapMutation.isPending ? 'Compiling draft map...' : 'Resolve or compile topic'}
              </button>
              {createMapMutation.error && (
                <p className="text-sm text-rose-200">
                  {createMapMutation.error instanceof Error ? createMapMutation.error.message : 'Map generation failed'}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {maps.map((map) => (
          <Link
            key={map.id}
            href={`/education/resource-library/maps/${map.topicKey}`}
            className="edu-card group p-5 transition hover:-translate-y-1 hover:shadow-[0_28px_90px_-40px_rgba(15,23,42,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--edu-accent)]">{map.archetype}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{map.title}</h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-[var(--edu-accent)] transition group-hover:border-[var(--edu-accent)]/30 group-hover:bg-[var(--edu-accent-light)]">
                <Compass className="h-5 w-5" />
              </div>
            </div>
            {map.description && <p className="mt-3 text-sm leading-6 text-slate-600">{map.description}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coverage</p>
                <p className="mt-2 text-lg font-semibold">{Math.round(map.confidence.coverage * 100)}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Relationships</p>
                <p className="mt-2 text-lg font-semibold">{Math.round(map.confidence.relationships * 100)}%</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>{map.status}</span>
              <span>v{map.version}</span>
            </div>
          </Link>
        ))}

        {maps.length === 0 && (
          <div className="edu-card col-span-full flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
            <Sparkles className="h-10 w-10 text-[var(--edu-accent)]/60" />
            <h2 className="mt-4 text-xl font-semibold">No maps yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Request a topic above to let Falak Map Autopilot compile the first draft constellation.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
