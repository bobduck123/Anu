'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Layers3, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { MapResource } from '@/lib/api/educationMaps';
import { EducationMapUniverseExplainer } from './EducationMapUniverseExplainer';
import { EducationMapUniverseScene } from './EducationMapUniverseScene';
import { mapResourceToUniversePacket } from './educationMapUniverseAdapter';
import {
  countLabel,
  searchStarsLabel,
  starIndexLabel,
  universeIndexLabel,
  universePresentationTerms,
} from './universe/presentationTerms';
import type { UniversePacket, UniverseRelation, UniverseStar } from './universe/types';
import { AnuNarrativeBriefPanel } from '@/ui-system/anu/narrativePrimitives';
import {
  formatNumber,
  formatPercent,
  statusBadgeClass,
  summarizeMap,
} from './presentation';

interface FalakMapViewerProps {
  map?: MapResource | null;
  packet?: UniversePacket | null;
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
    <div className="flex items-center justify-between text-sm text-[color:rgba(246,212,203,0.84)]">
      <span className="text-[color:rgba(246,212,203,0.64)]">{label}</span>
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
    <div className="rounded-[1.75rem] border border-dashed border-[#1e0227] bg-[color:rgba(30,2,39,0.7)] p-8 text-center">
      <h2 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h2>
      <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.64)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#1e0227] px-4 py-2 text-sm font-medium text-[color:rgba(246,212,203,0.92)] transition hover:border-[#7c413c] hover:text-[#7c413c]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

type ImmersivePanel = 'controls' | 'index' | 'inspector';

function starSearchText(star: UniverseStar): string {
  return [
    star.label,
    star.explainer.summary,
    star.explainer.longDescription ?? '',
    star.explainer.categoryLabel ?? '',
    star.explainer.starTypeLabel,
    star.explainer.domainLabel ?? '',
    star.explainer.scopeLabel ?? '',
    ...star.explainer.tags,
    ...star.explainer.aliases,
  ]
    .join(' ')
    .toLowerCase();
}

function sortStarsByImportance(stars: UniverseStar[]): UniverseStar[] {
  return [...stars].sort((left, right) => {
    const importanceDelta = right.explainer.metrics.importance - left.explainer.metrics.importance;
    if (Math.abs(importanceDelta) > 0.0001) {
      return importanceDelta;
    }

    const evidenceDelta = right.explainer.metrics.evidence - left.explainer.metrics.evidence;
    if (Math.abs(evidenceDelta) > 0.0001) {
      return evidenceDelta;
    }

    return left.label.localeCompare(right.label);
  });
}

function packetStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'published':
      return statusBadgeClass('published');
    case 'reviewed':
      return statusBadgeClass('reviewed');
    case 'demo':
      return 'bg-[#7c413c] text-[#7c413c]';
    case 'read_only':
      return 'bg-[#e0b115] text-[#e0b115]';
    default:
      return 'bg-[#f6d4cb] text-[#1e0227]';
  }
}

function packetSummary(packet: UniversePacket): string {
  return (
    packet.packetMeta?.sourceSummary ??
    `${packet.stars.length} ${universePresentationTerms.stars.toLowerCase()} / ${packet.constellations.length} ${universePresentationTerms.constellations.toLowerCase()}`
  );
}

function starCategoryKey(star: UniverseStar): string {
  if (typeof star.metadata.categoryKey === 'string' && star.metadata.categoryKey.trim().length > 0) {
    return star.metadata.categoryKey;
  }

  if (star.constellationIds[0]) {
    return star.constellationIds[0];
  }

  return star.type;
}

function starCategoryLabelForPacket(packet: UniversePacket, star: UniverseStar): string {
  if (star.explainer.categoryLabel) {
    return star.explainer.categoryLabel;
  }

  const firstConstellationId = star.constellationIds[0];
  if (firstConstellationId) {
    return packet.constellations.find((constellation) => constellation.id === firstConstellationId)?.name ?? star.explainer.starTypeLabel;
  }

  return star.explainer.starTypeLabel;
}

function packetCategoryOptions(packet: UniversePacket): Array<{ key: string; label: string }> {
  const options = new Map<string, string>();

  packet.stars.forEach((star) => {
    const key = starCategoryKey(star);
    if (!options.has(key)) {
      options.set(key, starCategoryLabelForPacket(packet, star));
    }
  });

  return Array.from(options.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function fallbackRelationsForStar(star: UniverseStar): UniverseRelation[] {
  return star.connections.map((targetId, index) => ({
    id: `${star.id}::fallback-relation-${index + 1}`,
    sourceId: star.id,
    targetId,
    relation: 'linked',
  }));
}

export function FalakMapViewer({
  map = null,
  packet: packetProp = null,
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
  const [activePanel, setActivePanel] = useState<ImmersivePanel | null>(null);
  const deferredSearch = useDeferredValue(search);
  const packet = useMemo(() => {
    if (packetProp) {
      return packetProp;
    }

    return map
      ? mapResourceToUniversePacket(map, {
          surface: titlePrefix?.toLowerCase().includes('cosmos') ? 'universe' : 'education',
        })
      : null;
  }, [map, packetProp, titlePrefix]);

  const filteredStars = useMemo(() => {
    if (!packet) {
      return [];
    }

    const searchTerm = deferredSearch.trim().toLowerCase();

    return sortStarsByImportance(
      packet.stars.filter((star) => {
        const matchesCategory = categoryFilter === 'all' || starCategoryKey(star) === categoryFilter;
        const matchesSearch = searchTerm.length < 1 || starSearchText(star).includes(searchTerm);
        return matchesCategory && matchesSearch;
      }),
    );
  }, [categoryFilter, deferredSearch, packet]);

  const availableStarIds = useMemo(
    () => new Set((packet?.stars ?? []).map((star) => star.id)),
    [packet],
  );
  const filteredStarIds = useMemo(
    () => new Set(filteredStars.map((star) => star.id)),
    [filteredStars],
  );
  const visibleCompareNodeIds = useMemo(
    () => compareNodeIds.filter((nodeId) => availableStarIds.has(nodeId)),
    [availableStarIds, compareNodeIds],
  );
  const resolvedActiveNodeId = useMemo(() => {
    if (!packet) {
      return null;
    }

    if (activeNodeId && filteredStarIds.has(activeNodeId)) {
      return activeNodeId;
    }

    return immersive ? null : filteredStars[0]?.id ?? sortStarsByImportance(packet.stars)[0]?.id ?? null;
  }, [activeNodeId, filteredStarIds, filteredStars, immersive, packet]);
  const resolvedActivePanel = immersive ? activePanel : null;

  const openInspectorForNode = (nodeId: string) => {
    setActiveNodeId(nodeId);
    if (immersive) {
      setActivePanel('inspector');
    }
  };

  const activeStar = useMemo(() => {
    if (!packet || !resolvedActiveNodeId) {
      return null;
    }

    return packet.stars.find((star) => star.id === resolvedActiveNodeId) ?? null;
  }, [packet, resolvedActiveNodeId]);

  const compareStars = useMemo(
    () => packet?.stars.filter((star) => visibleCompareNodeIds.includes(star.id)) ?? [],
    [packet, visibleCompareNodeIds],
  );
  const starLookup = useMemo(
    () => new Map((packet?.stars ?? []).map((star) => [star.id, star])),
    [packet],
  );
  const categoryOptions = useMemo(
    () => (map ? map.categories.map((category) => ({ key: category.key, label: category.label })) : packet ? packetCategoryOptions(packet) : []),
    [map, packet],
  );
  const displayTitle = packet?.title ?? map?.definition.title ?? null;
  const displayDescription =
    packet?.description ??
    map?.definition.description ??
    `A source-linked ${universePresentationTerms.universe.toLowerCase()} generated from semantic relationships, evidence, and curation signals.`;
  const displayStatus = packet?.packetMeta?.status ?? map?.definition.status ?? null;
  const displayVersion = packet?.packetMeta?.version ?? map?.definition.version ?? null;
  const displayCoverage = packet?.packetMeta?.coverage ?? map?.definition.confidence.coverage ?? null;
  const displaySummary = packet ? packetSummary(packet) : summarizeMap(map);
  const adminTopicKey = packet?.packetMeta?.adminTopicKey ?? map?.definition.topicKey ?? null;
  const packetSnapshots = packet?.snapshots ?? [];

  const controlsPanelOpen = resolvedActivePanel === 'controls';
  const indexPanelOpen = resolvedActivePanel === 'index';
  const inspectorPanelOpen = resolvedActivePanel === 'inspector' && Boolean(activeStar);

  const toggleCompareNode = (nodeId: string) => {
    setCompareNodeIds((current) => {
      const nextCurrent = current.filter((entry) => availableStarIds.has(entry));
      if (nextCurrent.includes(nodeId)) {
        return nextCurrent.filter((entry) => entry !== nodeId);
      }

      return [...nextCurrent, nodeId].slice(-3);
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

  if (!packet) {
    return (
      <EmptyViewerState
        title="No universe selected"
        message="Choose a topic to open its learning universe, source constellation, and explainer surfaces."
      />
    );
  }

  if (immersive) {
    const activeOutgoingRelations = activeStar
      ? (packet.relations?.filter((relation) => relation.sourceId === activeStar.id) ?? fallbackRelationsForStar(activeStar)).slice(0, 6)
      : [];
    const showSelectionHint = !activeStar && !controlsPanelOpen && !indexPanelOpen;
    const edgeDockButtonClass =
      'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(30,2,39,0.45)] text-[color:rgba(246,212,203,0.92)] shadow-[0_18px_36px_-24px_rgba(30,2,39,0.85)] backdrop-blur-xl transition-colors hover:bg-[color:rgba(30,2,39,0.6)]';

    const togglePanel = (panel: ImmersivePanel) => {
      setActivePanel((current) => (current === panel ? null : panel));
    };

    const toggleInspectorPanel = () => {
      if (!activeStar) {
        return;
      }

      if (inspectorPanelOpen) {
        setActivePanel(null);
        setActiveNodeId(null);
        return;
      }

      setActivePanel('inspector');
    };

    return (
      <section className="relative h-full min-h-[calc(100dvh-4rem)] overflow-hidden border border-[color:rgba(30,2,39,0.7)] bg-[#1e0227] md:rounded-[1.3rem]">
        <EducationMapUniverseScene
          packet={packet}
          activeNodeId={resolvedActiveNodeId}
          compareNodeIds={visibleCompareNodeIds}
          visibleNodeIds={filteredStars.map((star) => star.id)}
          immersive
          onSelectNodeId={openInspectorForNode}
        />

        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="pointer-events-auto absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex">
            <button
              type="button"
              onClick={() => togglePanel('controls')}
              className={edgeDockButtonClass}
              aria-label={controlsPanelOpen ? 'Hide universe controls' : 'Show universe controls'}
              title={controlsPanelOpen ? 'Hide universe controls' : 'Show universe controls'}
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={() => togglePanel('index')}
              className={edgeDockButtonClass}
              aria-label={indexPanelOpen ? 'Hide star index' : 'Show star index'}
              title={indexPanelOpen ? 'Hide star index' : 'Show star index'}
            >
              <Layers3 className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={toggleInspectorPanel}
              disabled={!activeStar}
              className={`${edgeDockButtonClass} ${!activeStar ? 'cursor-not-allowed opacity-45' : ''}`}
              aria-label={`${inspectorPanelOpen ? 'Hide' : 'Show'} ${universePresentationTerms.explainer.toLowerCase()}`}
              title={
                activeStar
                  ? `${inspectorPanelOpen ? 'Hide' : 'Show'} ${universePresentationTerms.explainer.toLowerCase()}`
                  : `Select a ${universePresentationTerms.star.toLowerCase()} first`
              }
            >
              <Sparkles className="h-4.5 w-4.5" />
            </button>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className={edgeDockButtonClass}
                aria-label={`Refresh ${universePresentationTerms.universe.toLowerCase()}`}
                title={`Refresh ${universePresentationTerms.universe.toLowerCase()}`}
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            ) : null}
          </div>

          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex items-center justify-center md:hidden">
            <div className="inline-flex items-center gap-1 rounded-xl border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(30,2,39,0.45)] px-1.5 py-1.5 backdrop-blur-xl shadow-[0_18px_36px_-24px_rgba(30,2,39,0.85)]">
              <button
                type="button"
                onClick={() => togglePanel('controls')}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.92)]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Controls
              </button>
              <button
                type="button"
                onClick={() => togglePanel('index')}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.92)]"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Index
              </button>
              <button
                type="button"
                onClick={toggleInspectorPanel}
                disabled={!activeStar}
                className={`inline-flex min-h-10 items-center gap-1 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.92)] ${
                  !activeStar ? 'opacity-45' : ''
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {universePresentationTerms.explainer}
              </button>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-2 text-[color:rgba(246,212,203,0.92)]"
                  aria-label={`Refresh ${universePresentationTerms.universe.toLowerCase()}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {controlsPanelOpen ? (
            <div className="pointer-events-auto absolute inset-x-3 bottom-16 max-h-[62vh] overflow-y-auto rounded-[1.2rem] border border-[color:rgba(246,212,203,0.14)] bg-[linear-gradient(160deg,rgba(30,2,39,0.95),rgba(30,2,39,0.92))] p-4 text-[color:rgba(246,212,203,0.92)] shadow-[0_28px_70px_-24px_rgba(30,2,39,0.88)] backdrop-blur-xl md:bottom-auto md:left-3 md:right-auto md:top-16 md:max-h-[calc(100%-6rem)] md:w-[min(36rem,56vw)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.8)]">{eyebrowLabel}</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {titlePrefix ? `${titlePrefix}: ` : ''}
                    {displayTitle}
                  </p>
                </div>
                {displayStatus ? (
                  <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${packetStatusBadgeClass(displayStatus)}`}>
                    {displayStatus}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.35)] px-3 text-sm text-[color:rgba(246,212,203,0.84)]"
                  aria-label={searchStarsLabel()}
                >
                  <Search className="h-4 w-4 text-[color:rgba(246,212,203,0.64)]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchStarsLabel()}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#7c413c]"
                  />
                  {search.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-xs text-[color:rgba(246,212,203,0.64)] transition-colors hover:text-[color:rgba(246,212,203,0.92)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.35)] px-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                  <SlidersHorizontal className="h-4 w-4 text-[color:rgba(246,212,203,0.64)]" />
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="bg-transparent text-sm outline-none"
                  >
                    <option value="all">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(246,212,203,0.76)]">
                <span className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.06)] px-3 py-1">
                  {countLabel(filteredStars.length, universePresentationTerms.star, universePresentationTerms.stars)} / {countLabel(packet.stars.length, universePresentationTerms.star, universePresentationTerms.stars)} visible
                </span>
                <span className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.06)] px-3 py-1">
                  {countLabel(visibleCompareNodeIds.length, 'comparison anchor')}
                </span>
                {displayCoverage !== null ? (
                  <span className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.06)] px-3 py-1">Coverage {formatPercent(displayCoverage)}</span>
                ) : null}
              </div>

              {headerActions ? <div className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-3">{headerActions}</div> : null}
            </div>
          ) : null}

          {indexPanelOpen ? (
            <aside className="pointer-events-auto absolute inset-x-3 bottom-16 max-h-[62vh] overflow-hidden rounded-[1.3rem] border border-[color:rgba(246,212,203,0.14)] bg-[linear-gradient(180deg,rgba(30,2,39,0.95),rgba(30,2,39,0.94))] shadow-[0_28px_70px_-24px_rgba(30,2,39,0.9)] backdrop-blur-xl md:bottom-3 md:left-3 md:top-[4.5rem] md:w-[min(30rem,42vw)] md:max-h-none">
              <div className="flex items-center justify-between border-b border-[color:rgba(246,212,203,0.1)] px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.64)]">{universeIndexLabel()}</p>
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{starIndexLabel()}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePanel((current) => (current === 'index' ? null : current))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.06)] text-[color:rgba(246,212,203,0.76)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)] hover:text-[var(--color-foreground)]"
                  aria-label={`Close ${starIndexLabel().toLowerCase()}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-[calc(100%-3.7rem)] space-y-4 overflow-y-auto px-3 py-3">
                {filteredStars.map((star) => {
                  const isActive = star.id === activeStar?.id;
                  const isCompared = visibleCompareNodeIds.includes(star.id);

                  return (
                    <article
                      key={star.id}
                      className={`rounded-[1rem] border p-3 text-left transition ${
                        isActive
                          ? 'border-[color:rgba(124,65,60,0.7)] bg-[color:rgba(124,65,60,0.1)]'
                          : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] hover:border-[color:rgba(246,212,203,0.2)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-foreground)]">{star.label}</p>
                          <p className="mt-1 text-[11px] text-[color:rgba(246,212,203,0.64)]">{starCategoryLabelForPacket(packet, star)}</p>
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: star.color }} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[color:rgba(246,212,203,0.76)]">{star.explainer.summary || 'Summary pending.'}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openInspectorForNode(star.id)}
                          className="rounded-lg border border-[color:rgba(246,212,203,0.16)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.92)] transition-colors hover:border-[#7c413c] hover:text-[#7c413c]"
                        >
                          {isActive ? 'Selected' : 'Inspect'}
                        </button>
                        <button
                          type="button"
                          aria-pressed={isCompared}
                          onClick={() => toggleCompareNode(star.id)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                            isCompared
                              ? 'bg-[#e0b115] text-[#1e0227]'
                              : 'border border-[color:rgba(246,212,203,0.16)] text-[color:rgba(246,212,203,0.92)] hover:border-[#e0b115] hover:text-[#e0b115]'
                          }`}
                        >
                          {isCompared ? 'Compared' : 'Compare'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {compareStars.length > 1 ? (
                  <section className="rounded-[1rem] border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.03)] p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.64)]">Compare</h3>
                    <div className="mt-2 space-y-2">
                      {compareStars.map((star) => (
                        <div key={star.id} className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[var(--color-foreground)]">{star.label}</p>
                            <button
                              type="button"
                              onClick={() => toggleCompareNode(star.id)}
                              className="text-[11px] text-[color:rgba(246,212,203,0.64)] transition-colors hover:text-[#f6d4cb]"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-2 space-y-1">
                            <NodeMetricRow label="Importance" value={star.explainer.metrics.importance} />
                            <NodeMetricRow label="Evidence" value={star.explainer.metrics.evidence} />
                            <NodeMetricRow label="Controversy" value={star.explainer.metrics.controversy} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[1rem] border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.03)] p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.64)]">Snapshots</h3>
                  <div className="mt-2 space-y-2">
                    {packetSnapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className={`rounded-xl border px-3 py-2 ${
                          snapshot.current
                            ? 'border-[color:rgba(124,65,60,0.7)] bg-[color:rgba(124,65,60,0.1)]'
                            : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)]'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[var(--color-foreground)]">{snapshot.name}</p>
                        <p className="text-[11px] text-[color:rgba(246,212,203,0.64)]">
                          v{snapshot.version ?? 1} / {snapshot.starCount ?? 0} stars
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          ) : null}

          {inspectorPanelOpen ? (
            <aside className="pointer-events-auto absolute inset-x-3 bottom-16 max-h-[68vh] overflow-hidden rounded-[1.3rem] border border-[color:rgba(246,212,203,0.16)] bg-[linear-gradient(180deg,rgba(30,2,39,0.96),rgba(30,2,39,0.94))] shadow-[0_30px_80px_-24px_rgba(30,2,39,0.9)] backdrop-blur-xl md:inset-y-3 md:left-auto md:right-3 md:w-[min(32rem,33vw)] md:max-h-none">
              <div className="h-full overflow-y-auto">
                <EducationMapUniverseExplainer
                  star={activeStar}
                  onClose={() => {
                    setActivePanel(null);
                    setActiveNodeId(null);
                  }}
                  className="rounded-none border-0 shadow-none"
                />

                {activeStar ? (
                  <div className="border-t border-[color:rgba(246,212,203,0.1)] px-4 py-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.64)]">Outgoing relations</h3>
                    {activeOutgoingRelations.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {activeOutgoingRelations.map((relation) => {
                          const target = starLookup.get(relation.targetId);
                          return (
                            <div key={relation.id} className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-3 py-2">
                              <p className="text-sm font-medium text-[var(--color-foreground)]">{target?.label || relation.targetId}</p>
                              <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                                {relation.relation.replace(/_/g, ' ')}
                                {typeof relation.weight === 'number' ? ` / weight ${formatNumber(relation.weight)}` : ''}
                                {typeof relation.confidence === 'number' ? ` / confidence ${formatPercent(relation.confidence)}` : ''}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[color:rgba(246,212,203,0.64)]">No outgoing semantic relations on this node.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}

          {showSelectionHint ? (
            <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-xl border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(30,2,39,0.45)] px-4 py-2 text-xs text-[color:rgba(246,212,203,0.84)] backdrop-blur-xl md:bottom-5">
              {`Select a ${universePresentationTerms.star.toLowerCase()} to open the floating ${universePresentationTerms.explainer.toLowerCase()}.`}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="rounded-[1.75rem] border border-[#1e0227] bg-[radial-gradient(circle_at_top_left,_rgba(246,212,203,0.22),_transparent_42%),linear-gradient(135deg,_rgba(30,2,39,0.98),_rgba(30,2,39,0.98))] p-6 text-[color:rgba(246,212,203,0.97)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:rgba(124,65,60,0.8)]">{eyebrowLabel}</p>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)] md:text-4xl">
              {titlePrefix ? `${titlePrefix}: ` : ''}
              {displayTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:rgba(246,212,203,0.76)]">
              {displayDescription}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-[color:rgba(246,212,203,0.76)]">
            {displayStatus ? (
              <span className={`inline-flex items-center rounded-lg px-3 py-1 font-semibold ${packetStatusBadgeClass(displayStatus)}`}>
                {displayStatus}
              </span>
            ) : null}
            <span>{displaySummary}</span>
            {displayVersion !== null ? <span>Version {displayVersion}</span> : null}
            {displayCoverage !== null ? <span>Coverage {formatPercent(displayCoverage)}</span> : null}
          </div>
        </div>
        {headerActions ? <div className="mt-5">{headerActions}</div> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(124,65,60,0.8)]">{`1. Read the ${universePresentationTerms.universe.toLowerCase()}`}</p>
            <p className="mt-2 leading-6 text-[color:rgba(246,212,203,0.76)]">{`Each ${universePresentationTerms.star.toLowerCase()} is anchored by source recency, evidence, source density, and semantic placement.`}</p>
          </div>
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(124,65,60,0.8)]">{`2. Open the ${universePresentationTerms.explainer.toLowerCase()}`}</p>
            <p className="mt-2 leading-6 text-[color:rgba(246,212,203,0.76)]">{`Selection syncs the scene, the ${starIndexLabel().toLowerCase()}, and the side ${universePresentationTerms.explainer.toLowerCase()} without opening a popup.`}</p>
          </div>
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(124,65,60,0.8)]">{`3. Compare ${universePresentationTerms.constellations.toLowerCase()}`}</p>
            <p className="mt-2 leading-6 text-[color:rgba(246,212,203,0.76)]">{`Use filters and comparison to see how themes cluster across the wider ${universePresentationTerms.platformName} ${universePresentationTerms.universe.toLowerCase()}.`}</p>
          </div>
        </div>
      </header>

      <AnuNarrativeBriefPanel
        eyebrow="Route reading"
        title={`How to read this ${universePresentationTerms.universe.toLowerCase()} output`}
        description={`This viewer is a narrative output of the shared packet contract. It should make packet mode, source state, and fallback truth inspectable before someone starts navigating ${universePresentationTerms.stars.toLowerCase()} and relations.`}
        signals={[
          {
            label: 'Output mode',
            value: packet.fallbackState?.active ? packet.fallbackState.label : displayStatus ?? 'Live packet',
            detail: packet.fallbackState?.active
              ? packet.fallbackState.message ??
                `This ${universePresentationTerms.universe.toLowerCase()} is currently rendering a non-live packet path and should say so directly.`
              : `The viewer is rendering the current packet through the shared scene, ${starIndexLabel().toLowerCase()}, and ${universePresentationTerms.explainer.toLowerCase()}.`,
            tone: packet.fallbackState?.active ? 'accent' : 'signal',
            icon: Sparkles,
          },
          {
            label: 'Source state',
            value: displaySummary,
            detail:
              displayCoverage !== null
                ? `Coverage ${formatPercent(displayCoverage)} and packet status ${displayStatus ?? 'unlabeled'} are part of the readable contract, not hidden implementation details.`
                : 'Packet summaries, versions, and relations should stay visible enough to support inspection.',
            tone: 'muted',
            icon: Layers3,
          },
          {
            label: 'Fallback truth',
            value: packet.fallbackState?.active ? 'Declared packet fallback' : 'Inspectable live packet',
            detail: packet.fallbackState?.active
              ? 'If live or authored state is unavailable, this viewer should say exactly what kind of packet replaced it rather than silently degrading.'
              : `If packet inputs degrade later, the same viewer should move into an explicit read-only or demo state rather than hiding the contract.`,
            tone: packet.fallbackState?.active ? 'accent' : 'signal',
            icon: RefreshCw,
          },
        ]}
        whyItMatters={`Knowledge surfaces are only trustworthy when people can tell whether they are reading a live packet, a reviewed packet, or a fallback ${universePresentationTerms.readOnlyPacket.toLowerCase()}.`}
        compact
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label
                className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] px-4 py-2 text-sm text-[color:rgba(246,212,203,0.76)]"
                aria-label={searchStarsLabel('aliases, tags, summaries...')}
              >
                <Search className="h-4 w-4 text-[#7c413c]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchStarsLabel('aliases, tags, summaries...')}
                  className="w-full bg-transparent outline-none placeholder:text-[#7c413c]"
                />
                {search.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="ml-2 text-xs text-[color:rgba(246,212,203,0.64)] hover:text-[color:rgba(246,212,203,0.84)]"
                  >
                    Clear
                  </button>
                ) : null}
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] px-4 py-2 text-sm text-[color:rgba(246,212,203,0.76)]">
                <SlidersHorizontal className="h-4 w-4 text-[#7c413c]" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <EducationMapUniverseScene
              packet={packet}
              activeNodeId={resolvedActiveNodeId}
              compareNodeIds={visibleCompareNodeIds}
              visibleNodeIds={filteredStars.map((star) => star.id)}
              onSelectNodeId={setActiveNodeId}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:rgba(246,212,203,0.64)]">
              <span>{countLabel(filteredStars.length, universePresentationTerms.star, universePresentationTerms.stars)} of {countLabel(packet.stars.length, universePresentationTerms.star, universePresentationTerms.stars)} visible</span>
              <span>{visibleCompareNodeIds.length} marked for comparison</span>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.7)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{starIndexLabel()}</h2>
                <p className="text-sm text-[color:rgba(246,212,203,0.64)]">{`Search, filter, select, and compare persisted ${universePresentationTerms.universe.toLowerCase()} entities.`}</p>
              </div>
              {showAdminLink && adminTopicKey ? (
                <Link
                  href={`/admin/maps?topic=${encodeURIComponent(adminTopicKey)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#1e0227] px-3 py-2 text-xs font-medium text-[color:rgba(246,212,203,0.84)] transition hover:border-[#7c413c] hover:text-[#7c413c]"
                >
                  Open admin tools
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredStars.map((star) => {
                const isActive = star.id === activeStar?.id;
                const isCompared = visibleCompareNodeIds.includes(star.id);
                return (
                  <article
                    key={star.id}
                    className={`rounded-[1.25rem] border p-4 text-left transition ${
                      isActive
                        ? 'border-[#7c413c] bg-[color:rgba(124,65,60,0.1)]'
                        : 'border-[#1e0227] bg-[color:rgba(30,2,39,0.6)] hover:border-[#1e0227]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--color-foreground)]">{star.label}</p>
                        <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.64)]">{starCategoryLabelForPacket(packet, star)}</p>
                      </div>
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: star.color }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.76)]">{star.explainer.summary || 'Summary pending.'}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      {star.explainer.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-md bg-[#1e0227] px-2 py-1 text-[color:rgba(246,212,203,0.76)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#7c413c]">Importance {formatPercent(star.explainer.metrics.importance)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveNodeId(star.id)}
                          className="rounded-lg border border-[#1e0227] px-3 py-1.5 text-xs font-medium text-[color:rgba(246,212,203,0.84)] transition hover:border-[#7c413c] hover:text-[#7c413c]"
                        >
                          {isActive ? 'Selected' : 'Inspect'}
                        </button>
                        <button
                          type="button"
                          aria-pressed={isCompared}
                          onClick={() => toggleCompareNode(star.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            isCompared
                              ? 'bg-[#e0b115] text-[#1e0227]'
                              : 'border border-[#1e0227] text-[color:rgba(246,212,203,0.84)] hover:border-[#e0b115] hover:text-[#e0b115]'
                          }`}
                        >
                          {isCompared ? 'Compared' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {filteredStars.length < 1 ? (
                <div className="rounded-[1.25rem] border border-dashed border-[#1e0227] p-6 text-sm text-[color:rgba(246,212,203,0.64)]">
                  {`No ${universePresentationTerms.stars.toLowerCase()} match the current filters.`}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] p-4">
            <div className="flex items-center gap-2 text-[var(--color-foreground)]">
              <Layers3 className="h-4 w-4 text-[#7c413c]" />
              <h2 className="text-lg font-semibold">{universePresentationTerms.explainer}</h2>
            </div>
            {activeStar ? (
              <div className="mt-4">
                <EducationMapUniverseExplainer star={activeStar} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.64)]">{`Select a ${universePresentationTerms.star.toLowerCase()} in the ${universePresentationTerms.universe.toLowerCase()} or ${starIndexLabel().toLowerCase()}.`}</p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Compare</h2>
            {compareStars.length > 1 ? (
              <div className="mt-4 space-y-3">
                {compareStars.map((star) => (
                  <div key={star.id} className="rounded-[1.25rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.6)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">{star.label}</p>
                      <button
                        type="button"
                        onClick={() => toggleCompareNode(star.id)}
                        className="text-xs text-[color:rgba(246,212,203,0.64)] hover:text-[#f6d4cb]"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.64)]">{starCategoryLabelForPacket(packet, star)}</p>
                    <div className="mt-3 space-y-1">
                      <NodeMetricRow label="Importance" value={star.explainer.metrics.importance} />
                      <NodeMetricRow label="Evidence" value={star.explainer.metrics.evidence} />
                      <NodeMetricRow label="Controversy" value={star.explainer.metrics.controversy} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.64)]">
                Add at least two entities from the index to compare their metrics and axis placement.
              </p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.8)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Relations and snapshots</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.25rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.6)] p-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7c413c]">Outgoing relations</p>
                {activeStar ? (
                  (packet.relations?.filter((relation) => relation.sourceId === activeStar.id) ?? fallbackRelationsForStar(activeStar))
                    .slice(0, 6)
                    .map((relation) => {
                      const target = starLookup.get(relation.targetId);
                      return (
                        <div key={relation.id} className="mt-2 rounded-xl border border-[#1e0227] p-2">
                          <p className="text-sm text-[var(--color-foreground)]">{target?.label || relation.targetId}</p>
                          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                            {relation.relation.replace(/_/g, ' ')}
                            {typeof relation.weight === 'number' ? ` / weight ${formatNumber(relation.weight)}` : ''}
                            {typeof relation.confidence === 'number' ? ` / confidence ${formatPercent(relation.confidence)}` : ''}
                          </p>
                        </div>
                      );
                    })
                ) : (
                  <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.64)]">{`Select a ${universePresentationTerms.star.toLowerCase()} to inspect its semantic links.`}</p>
                )}
              </div>

              <div className="rounded-[1.25rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.6)] p-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7c413c]">Snapshots</p>
                <div className="mt-2 space-y-2">
                  {packetSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className={`rounded-xl border px-3 py-2 ${
                        snapshot.current
                          ? 'border-[#7c413c] bg-[color:rgba(124,65,60,0.1)]'
                          : 'border-[#1e0227]'
                      }`}
                    >
                      <p className="text-sm text-[var(--color-foreground)]">{snapshot.name}</p>
                      <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                        v{snapshot.version ?? 1} / {snapshot.starCount ?? 0} stars{snapshot.createdAt ? ` / ${new Date(snapshot.createdAt).toLocaleString()}` : ''}
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
        <div className="rounded-[1.5rem] border border-[#1e0227] bg-[color:rgba(30,2,39,0.7)] p-4">{footerActions}</div>
      ) : null}
    </section>
  );
}
