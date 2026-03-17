'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowRight, WandSparkles } from 'lucide-react';
import { MapResource, resolveEducationMap } from '@/lib/api/educationMaps';
import { FalakMapViewer } from './FalakMapViewer';
import { MAP_COMPILE_MODE_OPTIONS } from './presentation';

export function FalakMapDraftPage() {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<typeof MAP_COMPILE_MODE_OPTIONS[number]>('auto_seed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMap, setCreatedMap] = useState<MapResource | null>(null);
  const [jobCreated, setJobCreated] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await resolveEducationMap({ topic, mode });
      setCreatedMap(response.map);
      setJobCreated(response.jobCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve education map.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_40%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-8 text-white">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Falak Compiler</p>
        <h1 className="mt-3 text-4xl font-semibold">Request a missing map</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          This route hits the real `POST /v1/education/maps/resolve` compiler endpoint. Missing topics are persisted
          as draft maps through the same schema and layout pipeline used online.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. regenerative finance ontologies"
            className="rounded-[1.25rem] border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            required
          />
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
            className="rounded-[1.25rem] border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
          >
            {MAP_COMPILE_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <WandSparkles className="h-4 w-4" />
            {loading ? 'Compiling...' : 'Resolve topic'}
          </button>
        </form>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {createdMap ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <span className="rounded-full bg-slate-900/80 px-4 py-2">
              {jobCreated ? 'Draft created and persisted' : 'Existing map returned'}
            </span>
            <Link
              href={`/education/maps/${encodeURIComponent(createdMap.definition.topicKey)}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-cyan-100"
            >
              Open detail page
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/admin/maps?topic=${encodeURIComponent(createdMap.definition.topicKey)}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-cyan-100"
            >
              Open admin tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-8">
        <FalakMapViewer
          map={createdMap}
          error={error}
          loading={loading}
          titlePrefix={jobCreated ? 'Generated draft' : 'Resolved map'}
        />
      </div>
    </div>
  );
}
