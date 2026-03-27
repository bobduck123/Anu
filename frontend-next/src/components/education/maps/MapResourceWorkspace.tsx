'use client';

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import { QuantumCanvas } from '@/ui/patterns/starfield/QuantumCanvas';
import type { MapResource } from '@/lib/api/educationMaps';
import { MapCompareTray } from './MapCompareTray';
import { MapNodeDrawer } from './MapNodeDrawer';
import { relatedNodesForSelection, toKnowledgeUniverse } from './mapToUniverseAdapter';

interface MapResourceWorkspaceProps {
  resource: MapResource;
}

export function MapResourceWorkspace({ resource }: MapResourceWorkspaceProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [showEdges, setShowEdges] = useState(false);
  const [flatten, setFlatten] = useState(false);
  const [spotlight, setSpotlight] = useState(true);
  const [importanceFloor, setImportanceFloor] = useState(0);
  const [evidenceFloor, setEvidenceFloor] = useState(0);
  const deferredSearch = useDeferredValue(searchInput);

  const filteredNodes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return resource.nodes.filter((node) => {
      if (categoryFilter !== 'all' && node.categoryKey !== categoryFilter) {
        return false;
      }
      if (node.metrics.importance < importanceFloor) {
        return false;
      }
      if (node.metrics.evidence < evidenceFloor) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        node.label.toLowerCase().includes(query) ||
        node.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
        node.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [categoryFilter, deferredSearch, evidenceFloor, importanceFloor, resource.nodes]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredResource = useMemo(() => ({
    ...resource,
    nodes: filteredNodes,
    edges: resource.edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)),
  }), [filteredNodes, resource, visibleNodeIds]);

  useEffect(() => {
    if (selectedNodeId && !filteredResource.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [filteredResource.nodes, selectedNodeId]);

  useEffect(() => {
    const availableIds = new Set(resource.nodes.map((node) => node.id));
    setCompareIds((current) => current.filter((id) => availableIds.has(id)));
  }, [resource.nodes]);

  const selectedNode = filteredResource.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const related = selectedNode
    ? relatedNodesForSelection(filteredResource, selectedNode.id).map((entry) => ({
        relation: entry.edge.relation,
        label: entry.node.label,
        confidence: entry.edge.confidence,
      }))
    : [];
  const spotlightNodeIds = useMemo(() => {
    if (!spotlight || !selectedNode) {
      return null;
    }

    const ids = new Set<string>([selectedNode.id]);
    for (const relation of relatedNodesForSelection(filteredResource, selectedNode.id)) {
      ids.add(relation.node.id);
    }
    return ids;
  }, [filteredResource, selectedNode, spotlight]);
  const sceneResource = useMemo(() => ({
    ...filteredResource,
    nodes: spotlightNodeIds
      ? filteredResource.nodes.filter((node) => spotlightNodeIds.has(node.id))
      : filteredResource.nodes,
    edges: spotlightNodeIds
      ? filteredResource.edges.filter((edge) => spotlightNodeIds.has(edge.sourceId) && spotlightNodeIds.has(edge.targetId))
      : filteredResource.edges,
  }), [filteredResource, spotlightNodeIds]);
  const densityFactor = useMemo(() => {
    if (spotlightNodeIds || deferredSearch.trim()) {
      return 1;
    }
    if (sceneResource.nodes.length > 400) {
      return 0.62;
    }
    if (sceneResource.nodes.length > 220) {
      return 0.78;
    }
    return 1;
  }, [deferredSearch, sceneResource.nodes.length, spotlightNodeIds]);
  const universe = useMemo(() => toKnowledgeUniverse(sceneResource), [sceneResource]);
  const compareNodes = resource.nodes.filter((node) => compareIds.includes(node.id));
  const bibliography = useMemo(() => {
    const deduped = new Map<string, { title: string; url: string; domain?: string; count: number }>();
    for (const node of filteredResource.nodes) {
      for (const source of node.sources) {
        const current = deduped.get(source.url);
        if (current) {
          current.count += 1;
          continue;
        }
        deduped.set(source.url, {
          title: source.title ?? source.domain ?? source.url,
          url: source.url,
          domain: source.domain,
          count: 1,
        });
      }
    }
    return Array.from(deduped.values()).sort((a, b) => b.count - a.count);
  }, [filteredResource.nodes]);

  const presets = useMemo(() => {
    const byImportance = [...filteredResource.nodes].sort((a, b) => b.metrics.importance - a.metrics.importance)[0];
    const byEvidence = [...filteredResource.nodes].sort((a, b) => b.metrics.evidence - a.metrics.evidence)[0];
    const byCentrality = [...filteredResource.nodes].sort((a, b) => b.metrics.centrality - a.metrics.centrality)[0];
    return [
      { label: 'Overview', nodeId: null },
      { label: 'Highest importance', nodeId: byImportance?.id ?? null },
      { label: 'Strongest evidence', nodeId: byEvidence?.id ?? null },
      { label: 'Network hub', nodeId: byCentrality?.id ?? null },
    ];
  }, [filteredResource.nodes]);

  const selectedCompared = Boolean(selectedNode && compareIds.includes(selectedNode.id));

  function toggleCompare(nodeId: string) {
    setCompareIds((current) => {
      if (current.includes(nodeId)) {
        return current.filter((id) => id !== nodeId);
      }
      if (current.length >= 4) {
        return [...current.slice(1), nodeId];
      }
      return [...current, nodeId];
    });
  }

  return (
    <section className="space-y-6">
      <header className="edu-card overflow-hidden">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),rgba(15,23,42,0.95)_45%,rgba(2,6,23,1))] px-6 py-8 text-white lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">Education Resource Library Maps</p>
            <h1 className="mt-3 text-4xl font-semibold">{resource.definition.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {resource.definition.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
                {resource.definition.archetype}
              </span>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-violet-100">
                {resource.nodes.length} nodes
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-amber-100">
                {resource.edges.length} typed edges
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-100">
                {sceneResource.nodes.length} visible now
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {Object.entries(resource.definition.confidence).map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
                <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{Math.round(value * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="edu-card p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--edu-accent)]" />
              <h2 className="font-semibold">Search and filters</h2>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-500">Search nodes</span>
                <input
                  value={searchInput}
                  onChange={(event) => {
                    const next = event.target.value;
                    startTransition(() => setSearchInput(next));
                  }}
                  placeholder="Search labels, aliases, tags"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--edu-accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-500">Primary category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--edu-accent)]"
                >
                  <option value="all">All categories</option>
                  {resource.categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-500">Importance floor</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={importanceFloor}
                  onChange={(event) => setImportanceFloor(Number(event.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-500">Evidence floor</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={evidenceFloor}
                  onChange={(event) => setEvidenceFloor(Number(event.target.value))}
                  className="w-full"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlatten((current) => !current)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${flatten ? 'bg-[var(--edu-accent)] text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {flatten ? '3D view' : 'Flatten to 2D'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdges((current) => !current)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${showEdges ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {showEdges ? 'Hide edges' : 'Show edges'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSpotlight((current) => !current)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${spotlight ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {spotlight ? 'Spotlight selected nodes' : 'Show full constellation'}
              </button>
            </div>
          </div>

          <div className="edu-card p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[var(--edu-accent)]" />
              <h2 className="font-semibold">Axes</h2>
            </div>
            <div className="mt-4 space-y-3">
              {resource.axes.map((axis) => (
                <div key={axis.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold">{axis.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{axis.minLabel} to {axis.maxLabel}</p>
                  {axis.description && <p className="mt-2 text-sm text-slate-600">{axis.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="relative min-h-[720px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),rgba(15,23,42,1)_30%,rgba(2,6,23,1)_100%)] shadow-[0_30px_120px_-50px_rgba(15,23,42,0.85)]">
            <QuantumCanvas
              data={universe}
              paletteIndex={2}
              densityFactor={densityFactor}
              layoutMode="semantic"
              flattenFactor={flatten ? 1 : 0}
              showConnections={showEdges || Boolean(selectedNode)}
              focusStarId={selectedNodeId}
              onStarClick={(star) => setSelectedNodeId(star.id)}
              className="absolute inset-0"
            />

            <div className="absolute left-5 top-5 z-20 flex max-w-md flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedNodeId(preset.nodeId)}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl transition hover:bg-white/12"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="absolute bottom-5 left-5 z-20 max-w-sm rounded-[1.5rem] border border-white/10 bg-[rgba(2,6,23,0.82)] px-4 py-4 text-white backdrop-blur-xl">
              <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-300/70">Knowledge constellation</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Semantic axes determine the star system anchor first. Edge forces and category cohesion only refine local spacing around that anchor.
              </p>
              {!selectedNode && (
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                  Select a node to focus the camera, inspect evidence, and reveal its typed neighborhood.
                </p>
              )}
              {selectedNode && spotlight && (
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-200/80">
                  Spotlight mode is isolating the selected node and its typed neighborhood while preserving global coordinates.
                </p>
              )}
            </div>

            {sceneResource.nodes.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
                <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(2,6,23,0.86)] px-8 py-6 text-center text-white">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">No visible nodes</p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                    The current search and filter thresholds hide every node. Relax the evidence or importance floor to restore the constellation.
                  </p>
                </div>
              </div>
            )}

            <MapNodeDrawer
              node={selectedNode}
              related={related}
              onClose={() => setSelectedNodeId(null)}
              onCompareToggle={toggleCompare}
              compared={selectedCompared}
            />
          </div>

          <MapCompareTray
            nodes={compareNodes}
            onRemove={(nodeId) => setCompareIds((current) => current.filter((id) => id !== nodeId))}
          />

          <div className="edu-card p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--edu-accent)]" />
              <h2 className="text-xl font-semibold">Source bibliography</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bibliography.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No bibliography entries are visible for the current filtered constellation.
                </div>
              )}
              {bibliography.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[var(--edu-accent)]/40 hover:bg-white"
                >
                  <p className="font-semibold text-slate-900">{source.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{source.domain ?? source.url}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Referenced by {source.count} node{source.count === 1 ? '' : 's'}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
