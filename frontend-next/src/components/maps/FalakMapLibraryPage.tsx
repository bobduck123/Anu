'use client';

import Link from 'next/link';
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Compass, GitBranch, Layers3, PlusCircle, RefreshCw, Search } from 'lucide-react';
import {
  getEducationMapsFallbackMessage,
  listEducationMaps,
  MapDefinition,
  MapStatus,
  shouldUseEducationMapsFallback,
} from '@/lib/api/educationMaps';
import { listFallbackEducationMaps } from '@/lib/maps/fallbackMapData';
import { isFalakMapSandbox } from '@/lib/maps/sandbox';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { useAuth } from '@/contexts/AuthContext';
import { formatPercent, statusBadgeClass } from './presentation';

export function FalakMapLibraryPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [maps, setMaps] = useState<MapDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MapStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search);
  const sandbox = isFalakMapSandbox();

  const loadMaps = useCallback(() => {
    setLoading(true);
    setError(null);
    setFallbackActive(false);
    setFallbackMessage(null);
    listEducationMaps(statusFilter === 'all' ? {} : { status: statusFilter })
      .then((response) => {
        setMaps(response);
      })
      .catch((err) => {
        if (shouldUseEducationMapsFallback(err)) {
          console.warn('Education maps API unavailable, using bundled read-only fallback.');
          setMaps(listFallbackEducationMaps(statusFilter === 'all' ? {} : { status: statusFilter }));
          setFallbackActive(true);
          setFallbackMessage(getEducationMapsFallbackMessage(err));
          return;
        }

        const actionableError = toActionableSurfaceError({
          area: 'Education universe library',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/docs',
          fallbackLabel: 'Open documentation',
        });
        setError(`${actionableError.headline}. ${actionableError.detail}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadMaps();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, loadMaps]);

  const filteredMaps = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return maps.filter((map) => {
      if (needle.length < 1) {
        return true;
      }

      return [map.title, map.topicKey, map.archetype, map.entityType, map.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [deferredSearch, maps]);

  const comparedMaps = useMemo(
    () => maps.filter((entry) => compareKeys.includes(entry.topicKey)),
    [compareKeys, maps],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_42%),linear-gradient(160deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Education Resource Library</p>
            <h1 className="mt-3 text-4xl font-semibold">Manara Education Universe</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Open persisted learning universes, compare seeded domains, and generate new draft universes through the live compiler path.
              The sandbox exercises the same route surface, schema, and renderer path used by the hosted system.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            {!fallbackActive ? (
              <>
                <Link
                  href="/education/maps/new"
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
                >
                  <PlusCircle className="h-4 w-4" />
                  Request missing universe
                </Link>
                <Link
                  href="/sandbox/maps"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-cyan-100"
                >
                  <Compass className="h-4 w-4" />
                  Sandbox home
                </Link>
                <Link
                  href="/admin/maps"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-cyan-100"
                >
                  <GitBranch className="h-4 w-4" />
                  Admin tools
                </Link>
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-amber-400/40 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-100">
                Live learning universes are unavailable from the hosted API right now. This page is showing bundled read-only universe packets until the frontend can reach the live service correctly.
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search topics, archetypes, descriptions..."
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => {
              const next = event.target.value as MapStatus | 'all';
              startTransition(() => setStatusFilter(next));
            }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="reviewed">Reviewed</option>
            <option value="draft">Draft</option>
          </select>
          <button
            type="button"
            onClick={loadMaps}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {sandbox ? (
          <p className="mt-3 text-xs text-slate-500">
            Sandbox mode is active. Drafts, reviewed universes, and admin editing flows are safe to exercise locally.
          </p>
        ) : null}
        {fallbackActive ? (
          <p className="mt-3 text-xs text-amber-700">
            {fallbackMessage ?? 'The hosted frontend is using bundled read-only universe packet data because the live universe request did not succeed.'}
          </p>
        ) : null}
      </section>

      {error ? (
        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_23rem]">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              Loading universe library...
            </div>
          ) : null}

          {!loading && filteredMaps.length < 1 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No universes match the current filters.
            </div>
          ) : null}

          {!loading
            ? filteredMaps.map((map) => {
                const compared = compareKeys.includes(map.topicKey);
                return (
                  <article
                    key={map.id}
                    className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(map.status)}`}>
                            {map.status}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {map.archetype}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {map.entityType}
                          </span>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold text-slate-900">{map.title}</h2>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {map.description || 'No curated summary has been published for this universe yet.'}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>domain key: {map.topicKey}</span>
                          <span>version {map.version}</span>
                          <span>coverage {formatPercent(map.confidence.coverage)}</span>
                          <span>taxonomy {formatPercent(map.confidence.taxonomy)}</span>
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <Link
                          href={`/education/maps/${encodeURIComponent(map.topicKey)}`}
                          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
                        >
                          Open universe
                        </Link>
                        {!fallbackActive ? (
                          <Link
                            href={`/admin/maps?topic=${encodeURIComponent(map.topicKey)}`}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                          >
                            Admin edit
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setCompareKeys((current) =>
                              current.includes(map.topicKey)
                                ? current.filter((entry) => entry !== map.topicKey)
                                : [...current, map.topicKey].slice(-3),
                            )
                          }
                          className={`inline-flex items-center justify-center rounded-full px-4 py-2 font-medium transition ${
                            compared
                              ? 'bg-amber-300 text-slate-950'
                              : 'border border-slate-200 text-slate-700 hover:border-amber-300 hover:text-amber-700'
                          }`}
                        >
                          {compared ? 'Compared' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-cyan-600" />
              <h2 className="text-lg font-semibold text-slate-900">Compare universes</h2>
            </div>
            {comparedMaps.length > 0 ? (
              <div className="mt-4 space-y-3">
                {comparedMaps.map((map) => (
                  <div key={map.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{map.title}</p>
                      <button
                        type="button"
                        onClick={() => setCompareKeys((current) => current.filter((entry) => entry !== map.topicKey))}
                        className="text-xs text-slate-500 hover:text-rose-500"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className="font-medium text-slate-900">{map.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Coverage</span>
                        <span className="font-medium text-slate-900">{formatPercent(map.confidence.coverage)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Positions</span>
                        <span className="font-medium text-slate-900">{formatPercent(map.confidence.positions)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Relationships</span>
                        <span className="font-medium text-slate-900">{formatPercent(map.confidence.relationships)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Add up to three universes from the library to compare their readiness and publication state.
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
