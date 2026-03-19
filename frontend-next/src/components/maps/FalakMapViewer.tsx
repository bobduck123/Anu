'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Layers3, Search, SlidersHorizontal } from 'lucide-react';
import { MapResource } from '@/lib/api/educationMaps';
import { EducationMapUniverseExplainer } from './EducationMapUniverseExplainer';
import { EducationMapUniverseScene } from './EducationMapUniverseScene';
import { mapResourceToUniversePacket } from './educationMapUniverseAdapter';
import { universePresentationTerms } from './universe/presentationTerms';
import {
  categoryColor,
  categoryLabel,
  formatNumber,
  formatPercent,
  nodeSearchText,
  relationLabel,
  sortNodesByImportance,
  statusBadgeClass,
  summarizeMap,
} from './presentation';

interface FalakMapViewerProps {
  map: MapResource | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  headerActions?: ReactNode;
  footerActions?: ReactNode;
  titlePrefix?: string;
  eyebrowLabel?: string;
  showAdminLink?: boolean;
}

function NodeMetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono">{formatNumber(value)}</span>
    </div>
  );
}

function EmptyViewerState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-100"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function FalakMapViewer({
  map,
  loading = false,
  error,
  onRetry,
  headerActions,
  footerActions,
  titlePrefix,
  eyebrowLabel = 'Manara Learning Universe',
  showAdminLink = true,
}: FalakMapViewerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [compareNodeIds, setCompareNodeIds] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!map) {
      setActiveNodeId(null);
      setCompareNodeIds([]);
      return;
    }

    const fallbackNodeId = sortNodesByImportance(map.nodes)[0]?.id ?? null;
    setActiveNodeId((current) => (current && map.nodes.some((node) => node.id === current) ? current : fallbackNodeId));
    setCompareNodeIds((current) => current.filter((nodeId) => map.nodes.some((node) => node.id === nodeId)));
  }, [map]);

  const filteredNodes = useMemo(() => {
    if (!map) {
      return [];
    }

    return sortNodesByImportance(
      map.nodes.filter((node) => {
        const matchesCategory = categoryFilter === 'all' || node.categoryKey === categoryFilter;
        const matchesSearch = deferredSearch.trim().length < 1 || nodeSearchText(node).includes(deferredSearch.trim().toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    );
  }, [categoryFilter, deferredSearch, map]);

  useEffect(() => {
    if (!filteredNodes.some((node) => node.id === activeNodeId)) {
      setActiveNodeId(filteredNodes[0]?.id ?? null);
    }
  }, [activeNodeId, filteredNodes]);

  const activeNode = useMemo(
    () => map?.nodes.find((node) => node.id === activeNodeId) ?? filteredNodes[0] ?? null,
    [activeNodeId, filteredNodes, map],
  );
  const compareNodes = useMemo(
    () => map?.nodes.filter((node) => compareNodeIds.includes(node.id)) ?? [],
    [compareNodeIds, map],
  );
  const packet = useMemo(
    () =>
      map
        ? mapResourceToUniversePacket(map, {
            surface: titlePrefix?.toLowerCase().includes('cosmos') ? 'universe' : 'education',
          })
        : null,
    [map, titlePrefix],
  );
  const activeStar = useMemo(
    () => packet?.stars.find((star) => star.id === activeNode?.id) ?? null,
    [activeNode?.id, packet],
  );

  const toggleCompareNode = (nodeId: string) => {
    setCompareNodeIds((current) => {
      if (current.includes(nodeId)) {
        return current.filter((entry) => entry !== nodeId);
      }

      return [...current, nodeId].slice(-3);
    });
  };

  if (loading) {
    return (
      <EmptyViewerState
        title={`Loading ${universePresentationTerms.universe.toLowerCase()}`}
        message="Calibrating constellations, sources, and semantic axes for the selected domain."
      />
    );
  }

  if (error) {
    return <EmptyViewerState title="Universe unavailable" message={error} onRetry={onRetry} />;
  }

  if (!map || !packet) {
    return (
      <EmptyViewerState
        title="No universe selected"
        message="Choose a topic to open its learning universe, source constellation, and explainer surfaces."
      />
    );
  }

  return (
    <section className="space-y-5">
      <header className="rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_42%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-6 text-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">{eyebrowLabel}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {titlePrefix ? `${titlePrefix}: ` : ''}
              {map.definition.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              {map.definition.description || 'A source-linked universe generated from semantic relationships, evidence, and curation signals.'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-slate-300">
            <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${statusBadgeClass(map.definition.status)}`}>
              {map.definition.status}
            </span>
            <span>{summarizeMap(map)}</span>
            <span>Version {map.definition.version}</span>
            <span>Coverage {formatPercent(map.definition.confidence.coverage)}</span>
          </div>
        </div>
        {headerActions ? <div className="mt-5">{headerActions}</div> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">1. Read the universe</p>
            <p className="mt-2 leading-6 text-slate-300">Each star is anchored by source recency, evidence, source density, and semantic placement.</p>
          </div>
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">2. Open the explainer</p>
            <p className="mt-2 leading-6 text-slate-300">Selection syncs the scene, the star index, and the side explainer without opening a popup.</p>
          </div>
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">3. Compare constellations</p>
            <p className="mt-2 leading-6 text-slate-300">Use filters and comparison to see how themes cluster across the wider Manara learning universe.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-300" aria-label="Search map stars">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search stars, aliases, tags, summaries..."
                  className="w-full bg-transparent outline-none placeholder:text-slate-500"
                />
                {search.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="ml-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                ) : null}
              </label>
              <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="all">All categories</option>
                  {map.categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <EducationMapUniverseScene
              packet={packet}
              activeNodeId={activeNode?.id ?? null}
              compareNodeIds={compareNodeIds}
              visibleNodeIds={filteredNodes.map((node) => node.id)}
              onSelectNodeId={setActiveNodeId}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>{filteredNodes.length} of {map.nodes.length} stars visible</span>
              <span>{compareNodeIds.length} marked for comparison</span>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Star index</h2>
                <p className="text-sm text-slate-400">Search, filter, select, and compare persisted universe entities.</p>
              </div>
              {showAdminLink ? (
                <Link
                  href={`/admin/maps?topic=${encodeURIComponent(map.definition.topicKey)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
                >
                  Open admin tools
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredNodes.map((node) => {
                const isActive = node.id === activeNode?.id;
                const isCompared = compareNodeIds.includes(node.id);
                return (
                  <article
                    key={node.id}
                    className={`rounded-[1.25rem] border p-4 text-left transition ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{node.label}</p>
                        <p className="mt-1 text-xs text-slate-400">{categoryLabel(map.categories, node.categoryKey)}</p>
                      </div>
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: categoryColor(map.categories, node.categoryKey) }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{node.summary || 'Summary pending.'}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      {node.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Importance {formatPercent(node.metrics.importance)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveNodeId(node.id)}
                          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100"
                        >
                          {isActive ? 'Selected' : 'Inspect'}
                        </button>
                        <button
                          type="button"
                          aria-pressed={isCompared}
                          onClick={() => toggleCompareNode(node.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            isCompared
                              ? 'bg-amber-300 text-slate-950'
                              : 'border border-slate-700 text-slate-200 hover:border-amber-300 hover:text-amber-200'
                          }`}
                        >
                          {isCompared ? 'Compared' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {filteredNodes.length < 1 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                  No stars match the current filters.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center gap-2 text-white">
              <Layers3 className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold">{universePresentationTerms.explainer}</h2>
            </div>
            {activeStar ? (
              <div className="mt-4">
                <EducationMapUniverseExplainer star={activeStar} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Select a star in the universe or star index.</p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="text-lg font-semibold text-white">Compare</h2>
            {compareNodes.length > 1 ? (
              <div className="mt-4 space-y-3">
                {compareNodes.map((node) => (
                  <div key={node.id} className="rounded-[1.25rem] border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{node.label}</p>
                      <button
                        type="button"
                        onClick={() => toggleCompareNode(node.id)}
                        className="text-xs text-slate-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{categoryLabel(map.categories, node.categoryKey)}</p>
                    <div className="mt-3 space-y-1">
                      <NodeMetricRow label="Importance" value={node.metrics.importance} />
                      <NodeMetricRow label="Evidence" value={node.metrics.evidence} />
                      <NodeMetricRow label="Controversy" value={node.metrics.controversy} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Add at least two entities from the index to compare their metrics and axis placement.
              </p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="text-lg font-semibold text-white">Relations and snapshots</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.25rem] border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Outgoing relations</p>
                {activeNode ? (
                  map.edges
                    .filter((edge) => edge.sourceId === activeNode.id)
                    .slice(0, 6)
                    .map((edge) => {
                      const target = map.nodes.find((node) => node.id === edge.targetId);
                      return (
                        <div key={edge.id} className="mt-2 rounded-xl border border-slate-800 p-2">
                          <p className="text-sm text-white">{target?.label || edge.targetId}</p>
                          <p className="text-xs text-slate-400">
                            {relationLabel(edge.relation)} / weight {formatNumber(edge.weight)} / confidence {formatPercent(edge.confidence)}
                          </p>
                        </div>
                      );
                    })
                ) : (
                  <p className="mt-2 text-sm text-slate-400">Select a star to inspect its semantic links.</p>
                )}
              </div>

              <div className="rounded-[1.25rem] border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Snapshots</p>
                <div className="mt-2 space-y-2">
                  {map.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className={`rounded-xl border px-3 py-2 ${
                        snapshot.id === map.definition.currentSnapshotId
                          ? 'border-cyan-400 bg-cyan-400/10'
                          : 'border-slate-800'
                      }`}
                    >
                      <p className="text-sm text-white">{snapshot.name}</p>
                      <p className="text-xs text-slate-400">
                        v{snapshot.version} / {snapshot.nodes.length} nodes / {new Date(snapshot.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {footerActions ? (
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">{footerActions}</div>
      ) : null}
    </section>
  );
}
