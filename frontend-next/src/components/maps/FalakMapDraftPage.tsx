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
      setError(err instanceof Error ? err.message : 'Failed to resolve education universe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[#1e0227] bg-[radial-gradient(circle_at_top_left,_rgba(124,65,60,0.18),_transparent_40%),linear-gradient(155deg,_rgba(30,2,39,0.98),_rgba(30,2,39,0.98))] p-8 text-[var(--color-foreground)]">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:rgba(124,65,60,0.8)]">Manara Atlas Compiler</p>
        <h1 className="mt-3 text-4xl font-semibold">Request a missing learning universe</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:rgba(246,212,203,0.76)]">
          This route hits the live `POST /v1/education/maps/resolve` compiler endpoint. Missing topics are persisted
          as draft learning universes through the same schema and layout pipeline used online.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. regenerative finance ontologies"
            className="rounded-[1.25rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none placeholder:text-[#7c413c]"
            required
          />
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
            className="rounded-[1.25rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none"
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
            className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#7c413c] px-4 py-3 text-sm font-semibold text-[#1e0227] transition hover:bg-[#7c413c] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <WandSparkles className="h-4 w-4" />
            {loading ? 'Compiling...' : 'Resolve topic'}
          </button>
        </form>
        {error ? <p className="mt-4 text-sm text-[#f6d4cb]">{error}</p> : null}
        {createdMap ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[color:rgba(246,212,203,0.84)]">
            <span className="rounded-full bg-[color:rgba(30,2,39,0.8)] px-4 py-2">
              {jobCreated ? 'Draft created and persisted' : 'Existing universe returned'}
            </span>
            <Link
              href={`/education/maps/${encodeURIComponent(createdMap.definition.topicKey)}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#1e0227] px-4 py-2 transition hover:border-[#7c413c] hover:text-[#7c413c]"
            >
              Open universe detail
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/admin/maps?topic=${encodeURIComponent(createdMap.definition.topicKey)}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#1e0227] px-4 py-2 transition hover:border-[#7c413c] hover:text-[#7c413c]"
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
          titlePrefix={jobCreated ? 'Generated draft' : 'Resolved universe'}
          eyebrowLabel="Manara compiler preview"
        />
      </div>
    </div>
  );
}
