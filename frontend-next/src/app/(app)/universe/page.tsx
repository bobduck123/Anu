'use client';

import { useEffect, useMemo, useState } from 'react';
import { Compass, RefreshCw, Sparkles } from 'lucide-react';
import {
  getEducationMap,
  getEducationMapsFallbackMessage,
  listEducationMaps,
  MapResource,
  shouldUseEducationMapsFallback,
} from '@/lib/api/educationMaps';
import {
  getFallbackEducationMap,
  listFallbackEducationMapResources,
} from '@/lib/maps/fallbackMapData';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { FalakMapViewer } from '@/components/maps/FalakMapViewer';

function average(values: number[]): number {
  if (values.length < 1) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildCanonicalCosmos(resources: MapResource[]): MapResource | null {
  if (resources.length < 1) {
    return null;
  }

  const mapId = 'anu-cosmos-map';
  const createdAt = resources
    .map((resource) => resource.definition.createdAt)
    .sort()[0] ?? new Date().toISOString();
  const updatedAt = resources
    .map((resource) => resource.definition.updatedAt)
    .sort()
    .slice(-1)[0] ?? createdAt;

  const categories: MapResource['categories'] = [];
  const nodes: MapResource['nodes'] = [];
  const edges: MapResource['edges'] = [];
  const aliases: MapResource['aliases'] = [];
  const snapshots: MapResource['snapshots'] = [];

  resources.forEach((resource) => {
    const scope = resource.definition.topicKey;
    const scopedCategoryKeys = new Map<string, string>();
    const scopedNodeIds = new Map<string, string>();

    resource.categories.forEach((category) => {
      const scopedKey = `${scope}::${category.key}`;
      scopedCategoryKeys.set(category.key, scopedKey);
      categories.push({
        ...category,
        id: `${scope}::${category.id}`,
        mapId,
        key: scopedKey,
        parentKey: category.parentKey ? `${scope}::${category.parentKey}` : undefined,
        label: `${resource.definition.title} / ${category.label}`,
      });
    });

    resource.nodes.forEach((node) => {
      const scopedNodeId = `${scope}::${node.id}`;
      scopedNodeIds.set(node.id, scopedNodeId);
      nodes.push({
        ...node,
        id: scopedNodeId,
        mapId,
        categoryKey: node.categoryKey ? scopedCategoryKeys.get(node.categoryKey) : undefined,
        subcategoryKey: node.subcategoryKey ? scopedCategoryKeys.get(node.subcategoryKey) : undefined,
        metadata: {
          ...node.metadata,
          originMapId: resource.definition.id,
          originMapTopicKey: resource.definition.topicKey,
          originMapTitle: resource.definition.title,
          originNodeId: node.id,
        },
      });

      node.aliases.forEach((alias, index) => {
        aliases.push({
          id: `${scopedNodeId}::alias-${index + 1}`,
          mapId,
          nodeId: scopedNodeId,
          alias,
          canonicalLabel: node.label,
        });
      });
    });

    resource.edges.forEach((edge) => {
      const sourceId = scopedNodeIds.get(edge.sourceId) ?? `${scope}::${edge.sourceId}`;
      const targetId = scopedNodeIds.get(edge.targetId) ?? `${scope}::${edge.targetId}`;
      edges.push({
        ...edge,
        id: `${scope}::${edge.id}`,
        mapId,
        sourceId,
        targetId,
      });
    });

    const preferredSnapshot =
      resource.snapshots.find((snapshot) => snapshot.id === resource.definition.currentSnapshotId) ??
      resource.snapshots[0];

    if (preferredSnapshot) {
      snapshots.push({
        ...preferredSnapshot,
        id: `${scope}::${preferredSnapshot.id}`,
        mapId,
        name: `${resource.definition.title} / ${preferredSnapshot.name}`,
        nodes: preferredSnapshot.nodes.map((entry) => ({
          ...entry,
          nodeId: scopedNodeIds.get(entry.nodeId) ?? `${scope}::${entry.nodeId}`,
        })),
      });
    }
  });

  const confidence = {
    coverage: average(resources.map((resource) => resource.definition.confidence.coverage)),
    taxonomy: average(resources.map((resource) => resource.definition.confidence.taxonomy)),
    positions: average(resources.map((resource) => resource.definition.confidence.positions)),
    dedupe: average(resources.map((resource) => resource.definition.confidence.dedupe)),
    relationships: average(resources.map((resource) => resource.definition.confidence.relationships)),
  };

  const canonicalStatus = resources.every((resource) => resource.definition.status === 'published')
    ? 'published'
    : resources.some((resource) => resource.definition.status === 'reviewed')
      ? 'reviewed'
      : 'draft';

  return {
    definition: {
      id: mapId,
      tenantId: resources[0].definition.tenantId,
      topicKey: 'anu-cosmos',
      title: 'Manara Shared Universe',
      archetype: 'anu-unified-learning-universe',
      entityType: 'multi-map-cosmos',
      description:
        'A shared Manara universe built from all available learning domains. Stars remain source-linked and preserve their native semantic coordinates.',
      status: canonicalStatus,
      sizeFormula: resources[0].definition.sizeFormula,
      version: Math.max(...resources.map((resource) => resource.definition.version)),
      currentSnapshotId: snapshots[0]?.id ?? null,
      confidence,
      createdAt,
      updatedAt,
    },
    categories,
    axes: resources[0].axes,
    nodes,
    edges,
    aliases,
    snapshots,
    jobs: [],
  };
}

export default function UniversePage() {
  const [maps, setMaps] = useState<MapResource[]>([]);
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  const loadUniverse = async () => {
    setLoading(true);
    setError(null);
    setFallbackActive(false);
    setFallbackMessage(null);

    try {
      const definitions = await listEducationMaps();
      const preferredDefinitions =
        definitions.filter((definition) => definition.status === 'published').length > 0
          ? definitions.filter((definition) => definition.status === 'published')
          : definitions;
      const targets = preferredDefinitions.slice(0, 10);

      const loadedMaps: MapResource[] = [];
      const fallbackReasons: string[] = [];

      for (const definition of targets) {
        try {
          const map = await getEducationMap(definition.topicKey);
          loadedMaps.push(map);
        } catch (reason) {
          if (shouldUseEducationMapsFallback(reason)) {
            const fallback = getFallbackEducationMap(definition.topicKey);
            if (fallback) {
              loadedMaps.push(fallback);
              fallbackReasons.push(getEducationMapsFallbackMessage(reason));
              continue;
            }
          }

          throw reason;
        }
      }

      if (loadedMaps.length < 1) {
        throw new Error('No Manara learning universes are available yet.');
      }

      setMaps(loadedMaps);
      if (fallbackReasons.length > 0) {
        setFallbackActive(true);
        setFallbackMessage(fallbackReasons[0] ?? null);
      }
    } catch (reason) {
      if (shouldUseEducationMapsFallback(reason)) {
        const fallbackMaps = listFallbackEducationMapResources({ status: 'published' });
        setMaps(fallbackMaps.length > 0 ? fallbackMaps : listFallbackEducationMapResources());
        setFallbackActive(true);
        setFallbackMessage(getEducationMapsFallbackMessage(reason));
      } else {
        const actionableError = toActionableSurfaceError({
          area: 'Universe view',
          rawMessage: reason instanceof Error ? reason.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Open education fallback',
        });
        setError(`${actionableError.headline}. ${actionableError.detail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUniverse();
  }, []);

  useEffect(() => {
    if (selectedTopicKey === 'all') {
      return;
    }

    if (!maps.some((resource) => resource.definition.topicKey === selectedTopicKey)) {
      setSelectedTopicKey('all');
    }
  }, [maps, selectedTopicKey]);

  const displayMap = useMemo(() => {
    if (selectedTopicKey === 'all') {
      return buildCanonicalCosmos(maps);
    }

    return maps.find((resource) => resource.definition.topicKey === selectedTopicKey) ?? null;
  }, [maps, selectedTopicKey]);

  const topicOptions = useMemo(
    () =>
      maps
        .map((resource) => resource.definition)
        .sort((left, right) => left.title.localeCompare(right.title)),
    [maps],
  );

  return (
    <div className="mx-auto max-w-[98rem] px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_40%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-indigo-200/80">Manara canonical cosmos</p>
            <h1 className="mt-3 text-4xl font-semibold">Unified learning universe</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This surface runs through the same live map adapters used by <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/education/maps</code>.
              Use it as the canonical cross-domain cosmos for exploration, inspection, and source-linked reasoning.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="rounded-[1.25rem] border border-white/15 bg-black/30 px-4 py-3 text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Universe scope</span>
              <select
                value={selectedTopicKey}
                onChange={(event) => setSelectedTopicKey(event.target.value)}
                className="w-full bg-transparent text-white outline-none"
              >
                <option value="all">All available domains</option>
                {topicOptions.map((topic) => (
                  <option key={topic.id} value={topic.topicKey}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadUniverse()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-indigo-300 hover:text-indigo-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh universe
            </button>
          </div>
        </div>
      </header>

      {fallbackActive ? (
        <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {fallbackMessage ??
            'The live education universe API is partially unavailable. This view is using bundled read-only constellations where needed.'}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6">
        <FalakMapViewer
          map={displayMap}
          loading={loading}
          error={error}
          onRetry={() => void loadUniverse()}
          eyebrowLabel={selectedTopicKey === 'all' ? 'Manara shared universe' : 'Manara domain universe'}
          titlePrefix={selectedTopicKey === 'all' ? 'Universe' : 'Domain'}
          showAdminLink={selectedTopicKey !== 'all' && !fallbackActive}
          headerActions={
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                {maps.length} source universes loaded
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Compass className="h-3.5 w-3.5 text-cyan-200" />
                Scope: {selectedTopicKey === 'all' ? 'cross-domain' : selectedTopicKey}
              </span>
            </div>
          }
          footerActions={
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-slate-700 px-3 py-1">Universe renderer: QuantumCanvas</span>
              <span className="rounded-full border border-slate-700 px-3 py-1">Detail mode: side inspector</span>
              <span className="rounded-full border border-slate-700 px-3 py-1">Source-linked stars: enabled</span>
            </div>
          }
        />
      </div>
    </div>
  );
}
