'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Layers3, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
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
  immersive?: boolean;
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
  immersive = false,
}: FalakMapViewerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [compareNodeIds, setCompareNodeIds] = useState<string[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [showIndexPanel, setShowIndexPanel] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!map) {
      setActiveNodeId(null);
      setCompareNodeIds([]);
      return;
    }

    const fallbackNodeId = immersive ? null : sortNodesByImportance(map.nodes)[0]?.id ?? null;
    setActiveNodeId((current) => (current && map.nodes.some((node) => node.id === current) ? current : fallbackNodeId));
    setCompareNodeIds((current) => current.filter((nodeId) => map.nodes.some((node) => node.id === nodeId)));
  }, [map, immersive]);

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
      setActiveNodeId(immersive ? null : filteredNodes[0]?.id ?? null);
    }
  }, [activeNodeId, filteredNodes, immersive]);

  const openInspectorForNode = (nodeId: string) => {
    setActiveNodeId(nodeId);
    if (immersive) {
      setShowInspector(true);
    }
  };

  const activeNode = useMemo(() => {
    if (!map) {
      return null;
    }

    if (activeNodeId) {
      return map.nodes.find((node) => node.id === activeNodeId) ?? null;
    }

    return immersive ? null : filteredNodes[0] ?? null;
  }, [activeNodeId, filteredNodes, immersive, map]);

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

  if (immersive) {
    const activeOutgoingEdges = activeNode
      ? map.edges.filter((edge) => edge.sourceId === activeNode.id).slice(0, 6)
      : [];

    return (
      <section className="relative h-full min-h-[calc(100dvh-4rem)] overflow-hidden border border-slate-900/70 bg-[#02060d] md:rounded-[1.3rem]">
        <EducationMapUniverseScene
          packet={packet}
          activeNodeId={activeNode?.id ?? null}
          compareNodeIds={compareNodeIds}
          visibleNodeIds={filteredNodes.map((node) => node.id)}
          immersive
          onSelectNodeId={openInspectorForNode}
        />

        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="pointer-events-auto absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowControls((value) => !value)}
              className="inline-flex min-h-10 items-center rounded-full border border-white/16 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-xl transition-colors hover:bg-black/50"
            >
              {showControls ? 'Hide controls' : 'Universe controls'}
            </button>
            <button
              type="button"
              onClick={() => setShowIndexPanel((value) => !value)}
              className="inline-flex min-h-10 items-center rounded-full border border-white/16 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-xl transition-colors hover:bg-black/50"
            >
              {showIndexPanel ? 'Hide index' : 'Star index'}
            </button>
            {activeNode ? (
              <button
                type="button"
                onClick={() => {
                  setShowInspector((value) => !value);
                  if (showInspector) {
                    setActiveNodeId(null);
                  }
                }}
                className="inline-flex min-h-10 items-center rounded-full border border-white/16 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-xl transition-colors hover:bg-black/50"
              >
                {showInspector ? 'Hide explainer' : 'Open explainer'}
              </button>
            ) : null}
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/16 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-xl transition-colors hover:bg-black/50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            ) : null}
          </div>

          {showControls ? (
            <div className="pointer-events-auto absolute left-3 top-16 w-[min(36rem,92vw)] space-y-3 rounded-[1.2rem] border border-white/14 bg-[linear-gradient(160deg,rgba(6,12,24,0.95),rgba(5,10,19,0.92))] p-4 text-slate-100 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.88)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300/80">{eyebrowLabel}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {titlePrefix ? `${titlePrefix}: ` : ''}
                    {map.definition.title}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(map.definition.status)}`}>
                  {map.definition.status}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 text-sm text-slate-200" aria-label="Search map stars">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search stars, aliases, tags..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                  {search.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-xs text-slate-400 transition-colors hover:text-slate-100"
                    >
                      Clear
                    </button>
                  ) : null}
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 text-sm text-slate-200">
                  <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="bg-transparent text-sm outline-none"
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

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">{filteredNodes.length} / {map.nodes.length} stars visible</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">{compareNodeIds.length} comparison anchors</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">Coverage {formatPercent(map.definition.confidence.coverage)}</span>
              </div>

              {headerActions ? <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3">{headerActions}</div> : null}
            </div>
          ) : null}

          {showIndexPanel ? (
            <aside className="pointer-events-auto absolute bottom-3 left-3 top-[4.5rem] w-[min(30rem,92vw)] overflow-hidden rounded-[1.3rem] border border-white/14 bg-[linear-gradient(180deg,rgba(6,11,22,0.95),rgba(4,8,16,0.94))] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Universe index</p>
                  <h2 className="text-sm font-semibold text-white">Star index</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndexPanel(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/6 text-slate-300 transition-colors hover:bg-white/12 hover:text-white"
                  aria-label="Close star index"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-[calc(100%-3.7rem)] space-y-4 overflow-y-auto px-3 py-3">
                {filteredNodes.map((node) => {
                  const isActive = node.id === activeNode?.id;
                  const isCompared = compareNodeIds.includes(node.id);

                  return (
                    <article
                      key={node.id}
                      className={`rounded-[1rem] border p-3 text-left transition ${
                        isActive
                          ? 'border-cyan-300/70 bg-cyan-300/10'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{node.label}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{categoryLabel(map.categories, node.categoryKey)}</p>
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(map.categories, node.categoryKey) }} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-300">{node.summary || 'Summary pending.'}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openInspectorForNode(node.id)}
                          className="rounded-full border border-white/16 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-100 transition-colors hover:border-cyan-300 hover:text-cyan-100"
                        >
                          {isActive ? 'Selected' : 'Inspect'}
                        </button>
                        <button
                          type="button"
                          aria-pressed={isCompared}
                          onClick={() => toggleCompareNode(node.id)}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                            isCompared
                              ? 'bg-amber-300 text-slate-950'
                              : 'border border-white/16 text-slate-100 hover:border-amber-300 hover:text-amber-100'
                          }`}
                        >
                          {isCompared ? 'Compared' : 'Compare'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {compareNodes.length > 1 ? (
                  <section className="rounded-[1rem] border border-white/12 bg-white/[0.03] p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Compare</h3>
                    <div className="mt-2 space-y-2">
                      {compareNodes.map((node) => (
                        <div key={node.id} className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-white">{node.label}</p>
                            <button
                              type="button"
                              onClick={() => toggleCompareNode(node.id)}
                              className="text-[11px] text-slate-400 transition-colors hover:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-2 space-y-1">
                            <NodeMetricRow label="Importance" value={node.metrics.importance} />
                            <NodeMetricRow label="Evidence" value={node.metrics.evidence} />
                            <NodeMetricRow label="Controversy" value={node.metrics.controversy} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[1rem] border border-white/12 bg-white/[0.03] p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Snapshots</h3>
                  <div className="mt-2 space-y-2">
                    {map.snapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className={`rounded-xl border px-3 py-2 ${
                          snapshot.id === map.definition.currentSnapshotId
                            ? 'border-cyan-400/70 bg-cyan-400/10'
                            : 'border-white/10 bg-black/20'
                        }`}
                      >
                        <p className="text-xs font-semibold text-white">{snapshot.name}</p>
                        <p className="text-[11px] text-slate-400">
                          v{snapshot.version} / {snapshot.nodes.length} nodes
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          ) : null}

          {showInspector && activeStar ? (
            <aside className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[58vh] overflow-hidden rounded-[1.3rem] border border-white/16 bg-[linear-gradient(180deg,rgba(5,10,20,0.96),rgba(3,8,15,0.94))] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:inset-y-3 md:left-auto md:right-3 md:w-[min(32rem,33vw)] md:max-h-none">
              <div className="h-full overflow-y-auto">
                <EducationMapUniverseExplainer
                  star={activeStar}
                  onClose={() => {
                    setShowInspector(false);
                    setActiveNodeId(null);
                  }}
                  className="rounded-none border-0 shadow-none"
                />

                {activeNode ? (
                  <div className="border-t border-white/10 px-4 py-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Outgoing relations</h3>
                    {activeOutgoingEdges.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {activeOutgoingEdges.map((edge) => {
                          const target = map.nodes.find((node) => node.id === edge.targetId);
                          return (
                            <div key={edge.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                              <p className="text-sm font-medium text-white">{target?.label || edge.targetId}</p>
                              <p className="text-xs text-slate-400">
                                {relationLabel(edge.relation)} · weight {formatNumber(edge.weight)} · confidence {formatPercent(edge.confidence)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No outgoing semantic relations on this node.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}

          {!activeNode ? (
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/14 bg-black/45 px-4 py-2 text-xs text-slate-200 backdrop-blur-xl">
              Select a star to open the floating explainer.
            </div>
          ) : null}
        </div>
      </section>
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
