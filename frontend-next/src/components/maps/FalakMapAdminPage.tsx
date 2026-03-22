'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getEducationMap,
  listEducationMapImportActivity,
  listEducationMaps,
  MapImportActivityEntry,
  MapRelation,
  MapResource,
  MapSeedImportPreview,
  MapSeedImportSeedCorpus,
  persistEducationMapSeedImport,
  previewEducationMapSeedImport,
  rerunEducationMapLayout,
  restoreEducationMapSnapshot,
  updateEducationMapCategory,
  updateEducationMapEdge,
  updateEducationMapNode,
  updateEducationMapStatus,
} from '@/lib/api/educationMaps';
import {
  FALAK_SANDBOX_ACTORS,
  getFalakSandboxActorIdentity,
  setFalakSandboxActorIdentity,
} from '@/lib/maps/sandbox';
import { FalakMapViewer } from './FalakMapViewer';
import { MAP_RELATION_OPTIONS, MAP_STATUS_OPTIONS } from './presentation';

interface CategoryFormState {
  label: string;
  colorToken: string;
  description: string;
  order: string;
}

interface NodeFormState {
  categoryKey: string;
  summary: string;
  longDescription: string;
  pinned: boolean;
  x: string;
  y: string;
  z: string;
}

interface EdgeFormState {
  relation: MapRelation;
  weight: string;
  confidence: string;
  evidence: string;
}

interface ImportFormState {
  mode: 'curated_refine' | 'auto_seed' | 'auto_expand';
  status: 'draft' | 'reviewed' | 'published';
  force: boolean;
  importNote: string;
  seedJson: string;
}

function toNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  label: '',
  colorToken: '',
  description: '',
  order: '0',
};

const EMPTY_NODE_FORM: NodeFormState = {
  categoryKey: '',
  summary: '',
  longDescription: '',
  pinned: false,
  x: '0',
  y: '0',
  z: '0',
};

const EMPTY_EDGE_FORM: EdgeFormState = {
  relation: 'influences',
  weight: '0.6',
  confidence: '0.6',
  evidence: '',
};

const LEFT_THOUGHT_IMPORT_SEED_JSON = JSON.stringify(
  {
    topicKey: 'left-thought-graph-atlas',
    title: 'Left Thought Graph Atlas',
    archetype: 'theory',
    description:
      'Starter template for left-thought import workflows. Replace/extend with the full left-thought corpus JSON before persisting.',
    seedQueries: ['left thought graph atlas', 'left political philosophy lineage'],
    suppliedUrls: ['https://plato.stanford.edu/contents.html'],
    documents: [
      {
        id: 'left-thought-template-doc',
        url: 'https://example.org/left-thought-template',
        title: 'Left thought import template source',
        type: 'source_pack',
        sections: [
          {
            heading: 'Summary',
            kind: 'summary',
            lines: ['Starter left-thought import template with SEP-linked entities and mapped relations.'],
          },
        ],
      },
    ],
    entities: [
      {
        label: 'Karl Marx',
        aliases: ['Marx'],
        entityType: 'thinker',
        categoryKey: 'classical-marxism',
        tags: ['left-thought', 'thinker', 'classical-marxism'],
        summary: 'Foundational theorist of historical materialism and critique of political economy.',
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/marx/',
            title: 'Karl Marx (SEP)',
            domain: 'plato.stanford.edu',
          },
        ],
        relations: [
          {
            target: 'Capital',
            relation: 'derived_from',
            confidence: 0.92,
            evidence: 'Template relation: authored-by semantics mapped to derived_from.',
          },
        ],
      },
      {
        label: 'Capital',
        entityType: 'work',
        categoryKey: 'works',
        tags: ['left-thought', 'work'],
        summary: 'Major work of critique of political economy.',
      },
      {
        label: 'Historical Materialism',
        entityType: 'topic',
        categoryKey: 'topics',
        tags: ['left-thought', 'topic'],
        summary: 'Methodological framework centered on material conditions and class dynamics.',
      },
    ],
  },
  null,
  2,
);

const GENERIC_IMPORT_SEED_JSON = JSON.stringify(
  {
    topicKey: 'new-map-topic-key',
    title: 'New Map Title',
    archetype: 'theory',
    description: 'Generic seed import template. Replace all placeholder fields before preview/persist.',
    documents: [
      {
        id: 'doc-1',
        url: 'https://example.org/source',
        title: 'Primary source',
        type: 'source_pack',
        sections: [
          {
            heading: 'Summary',
            kind: 'summary',
            lines: ['Describe the source context here.'],
          },
        ],
      },
    ],
    entities: [
      {
        label: 'Entity Name',
        entityType: 'topic',
        categoryKey: 'topics',
        tags: ['tag-1'],
        summary: 'Entity summary.',
      },
    ],
  },
  null,
  2,
);

const DEFAULT_IMPORT_FORM: ImportFormState = {
  mode: 'curated_refine',
  status: 'draft',
  force: false,
  importNote: '',
  seedJson: LEFT_THOUGHT_IMPORT_SEED_JSON,
};

function buildCategoryFormState(category: MapResource['categories'][number]): CategoryFormState {
  return {
    label: category.label,
    colorToken: category.colorToken,
    description: category.description ?? '',
    order: String(category.order),
  };
}

function buildNodeFormState(node: MapResource['nodes'][number]): NodeFormState {
  return {
    categoryKey: node.categoryKey ?? '',
    summary: node.summary ?? '',
    longDescription: node.longDescription ?? '',
    pinned: node.pinned,
    x: String(node.position.x),
    y: String(node.position.y),
    z: String(node.position.z),
  };
}

function buildEdgeFormState(edge: MapResource['edges'][number]): EdgeFormState {
  return {
    relation: edge.relation,
    weight: String(edge.weight),
    confidence: String(edge.confidence),
    evidence: edge.evidence ?? '',
  };
}

interface FalakMapAdminPageProps {
  initialTopicKey?: string;
}

export function FalakMapAdminPage({ initialTopicKey = '' }: FalakMapAdminPageProps) {
  const router = useRouter();
  const [actorId, setActorId] = useState(getFalakSandboxActorIdentity());
  const [maps, setMaps] = useState<MapResource['definition'][]>([]);
  const [selectedTopic, setSelectedTopic] = useState(initialTopicKey);
  const [map, setMap] = useState<MapResource | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryFormState>>({});
  const [nodeDrafts, setNodeDrafts] = useState<Record<string, NodeFormState>>({});
  const [edgeDrafts, setEdgeDrafts] = useState<Record<string, EdgeFormState>>({});
  const [importForm, setImportForm] = useState<ImportFormState>(DEFAULT_IMPORT_FORM);
  const [importPreview, setImportPreview] = useState<MapSeedImportPreview | null>(null);
  const [importChecksum, setImportChecksum] = useState<string | null>(null);
  const [importActivity, setImportActivity] = useState<MapImportActivityEntry[]>([]);
  const [loadingImportActivity, setLoadingImportActivity] = useState(false);

  const applyLoadedMap = useCallback((nextMap: MapResource) => {
    setMap(nextMap);
    setCategoryDrafts({});
    setNodeDrafts({});
    setEdgeDrafts({});
    setSelectedSnapshotId((current) =>
      current && nextMap.snapshots.some((snapshot) => snapshot.id === current)
        ? current
        : nextMap.definition.currentSnapshotId ?? nextMap.snapshots[0]?.id ?? '',
    );
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await listEducationMaps({}, actorId || null);
      setMaps(response);
      if (response.length < 1) {
        setMap(null);
        setCategoryDrafts({});
        setNodeDrafts({});
        setEdgeDrafts({});
        setSelectedSnapshotId('');
      }
      setSelectedTopic((current) => {
        if (current && response.some((entry) => entry.topicKey === current)) {
          return current;
        }
        if (initialTopicKey && response.some((entry) => entry.topicKey === initialTopicKey)) {
          return initialTopicKey;
        }
        return response[0]?.topicKey ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load editable maps.');
    } finally {
      setLoadingList(false);
    }
  }, [actorId, initialTopicKey]);

  const loadImportActivity = useCallback(
    async (topicKey: string) => {
      if (!topicKey) {
        setImportActivity([]);
        return;
      }

      setLoadingImportActivity(true);
      try {
        const entries = await listEducationMapImportActivity(topicKey, actorId);
        setImportActivity(entries);
      } catch {
        setImportActivity([]);
      } finally {
        setLoadingImportActivity(false);
      }
    },
    [actorId],
  );

  const loadMap = useCallback(
    async (topicKey: string) => {
      if (!topicKey) {
        setMap(null);
        setCategoryDrafts({});
        setNodeDrafts({});
        setEdgeDrafts({});
        setSelectedSnapshotId('');
        setImportActivity([]);
        return;
      }

      setLoadingMap(true);
      setError(null);
      try {
        const response = await getEducationMap(topicKey, actorId || null);
        applyLoadedMap(response);
        await loadImportActivity(topicKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load editable map.');
      } finally {
        setLoadingMap(false);
      }
    },
    [actorId, applyLoadedMap, loadImportActivity],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadList();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!selectedTopic) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadMap(selectedTopic);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadMap, selectedTopic]);

  useEffect(() => {
    setFalakSandboxActorIdentity(actorId);
  }, [actorId]);

  const selectedCategory = useMemo(
    () => map?.categories.find((entry) => entry.key === selectedCategoryKey) ?? map?.categories[0] ?? null,
    [map, selectedCategoryKey],
  );
  const selectedNode = useMemo(
    () => map?.nodes.find((entry) => entry.id === selectedNodeId) ?? map?.nodes[0] ?? null,
    [map, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => map?.edges.find((entry) => entry.id === selectedEdgeId) ?? map?.edges[0] ?? null,
    [map, selectedEdgeId],
  );

  const categoryForm = useMemo(
    () =>
      selectedCategory
        ? categoryDrafts[selectedCategory.key] ?? buildCategoryFormState(selectedCategory)
        : EMPTY_CATEGORY_FORM,
    [categoryDrafts, selectedCategory],
  );
  const nodeForm = useMemo(
    () => (selectedNode ? nodeDrafts[selectedNode.id] ?? buildNodeFormState(selectedNode) : EMPTY_NODE_FORM),
    [nodeDrafts, selectedNode],
  );
  const edgeForm = useMemo(
    () => (selectedEdge ? edgeDrafts[selectedEdge.id] ?? buildEdgeFormState(selectedEdge) : EMPTY_EDGE_FORM),
    [edgeDrafts, selectedEdge],
  );
  const activeSnapshotId = useMemo(() => {
    if (!map) {
      return '';
    }

    if (selectedSnapshotId && map.snapshots.some((snapshot) => snapshot.id === selectedSnapshotId)) {
      return selectedSnapshotId;
    }

    return map.definition.currentSnapshotId ?? map.snapshots[0]?.id ?? '';
  }, [map, selectedSnapshotId]);

  const updateCategoryForm = (patch: Partial<CategoryFormState>) => {
    if (!selectedCategory) {
      return;
    }

    setCategoryDrafts((current) => ({
      ...current,
      [selectedCategory.key]: {
        ...(current[selectedCategory.key] ?? buildCategoryFormState(selectedCategory)),
        ...patch,
      },
    }));
  };

  const updateNodeForm = (patch: Partial<NodeFormState>) => {
    if (!selectedNode) {
      return;
    }

    setNodeDrafts((current) => ({
      ...current,
      [selectedNode.id]: {
        ...(current[selectedNode.id] ?? buildNodeFormState(selectedNode)),
        ...patch,
      },
    }));
  };

  const updateEdgeForm = (patch: Partial<EdgeFormState>) => {
    if (!selectedEdge) {
      return;
    }

    setEdgeDrafts((current) => ({
      ...current,
      [selectedEdge.id]: {
        ...(current[selectedEdge.id] ?? buildEdgeFormState(selectedEdge)),
        ...patch,
      },
    }));
  };

  const updateImportForm = (patch: Partial<ImportFormState>) => {
    setImportForm((current) => ({
      ...current,
      ...patch,
    }));
  };

  const parseImportSeed = (): MapSeedImportSeedCorpus => {
    try {
      const parsed = JSON.parse(importForm.seedJson) as {
        topicKey?: string;
        title?: string;
        documents?: unknown[];
        entities?: unknown[];
      };

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Import seed JSON must decode to an object payload.');
      }
      if (!parsed.topicKey || !parsed.title) {
        throw new Error('Import seed JSON must include topicKey and title.');
      }
      if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.entities) || parsed.entities.length < 1) {
        throw new Error('Import seed JSON must include documents[] and a non-empty entities[] array.');
      }

      return parsed as MapSeedImportSeedCorpus;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unable to parse import seed JSON.');
    }
  };

  const applyMutation = async (work: () => Promise<MapResource>, successMessage: string) => {
    setMutationMessage(null);
    setError(null);
    try {
      const next = await work();
      applyLoadedMap(next);
      setMutationMessage(successMessage);
      void loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin mutation failed.');
    }
  };

  const runImportPreview = async () => {
    setError(null);
    setMutationMessage(null);
    try {
      const seed = parseImportSeed();
      const response = await previewEducationMapSeedImport(
        {
          mode: importForm.mode,
          seed,
        },
        actorId,
      );
      setImportPreview(response.preview);
      setMutationMessage(
        `Import preview ready for ${response.preview.topicKey}: ${response.preview.nodeCount} nodes / ${response.preview.edgeCount} edges.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import preview failed.');
    }
  };

  const runImportPersist = async () => {
    setError(null);
    setMutationMessage(null);
    try {
      const seed = parseImportSeed();
      const response = await persistEducationMapSeedImport(
        {
          mode: importForm.mode,
          status: importForm.status,
          force: importForm.force,
          importNote: importForm.importNote || undefined,
          seed,
        },
        actorId,
      );

      applyLoadedMap(response.map);
      setImportPreview(response.preview);
      setImportChecksum(response.checksum);
      setSelectedTopic(response.map.definition.topicKey);
      await loadImportActivity(response.map.definition.topicKey);
      setMutationMessage(
        response.idempotentReuse
          ? `Import reused checksum ${response.checksum.slice(0, 12)} without recompiling.`
          : `Import persisted ${response.map.definition.topicKey} (checksum ${response.checksum.slice(0, 12)}).`,
      );
      void loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import persist failed.');
    }
  };

  const currentStatus = map?.definition.status ?? 'draft';
  const categoryOrderValue = toNumber(categoryForm.order);
  const categoryOrderInvalid = categoryForm.order.trim().length > 0 && categoryOrderValue === undefined;
  const nodeXValue = toNumber(nodeForm.x);
  const nodeYValue = toNumber(nodeForm.y);
  const nodeZValue = toNumber(nodeForm.z);
  const nodePositionInvalid = [nodeXValue, nodeYValue, nodeZValue].some((value) => value === undefined);
  const edgeWeightValue = toNumber(edgeForm.weight);
  const edgeConfidenceValue = toNumber(edgeForm.confidence);
  const edgeMetricsInvalid = edgeWeightValue === undefined || edgeConfidenceValue === undefined;

  return (
    <div className="mx-auto max-w-[98rem] px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-300/80">Manara Atlas Admin Sandbox</p>
            <h1 className="mt-3 text-4xl font-semibold">Learning universe editor</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Edit taxonomy, stars, relations, publishing state, and layout snapshots against the live persistence
              path without touching hosted environments.
            </p>
          </div>
          <div className="grid gap-3">
            <label className="rounded-[1.25rem] border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Sandbox actor</span>
              <select
                value={actorId}
                onChange={(event) => setActorId(event.target.value)}
                className="w-full bg-transparent text-white outline-none"
              >
                {FALAK_SANDBOX_ACTORS.map((actor) => (
                  <option key={actor.id || 'public'} value={actor.id}>
                    {actor.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                This identity drives policy checks, audit logging, and admin-only mutation permissions inside the sandbox.
              </span>
            </label>
            <Link
              href="/sandbox/maps"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
            >
              Sandbox home
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}
      {mutationMessage ? (
        <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {mutationMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Target map</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a persisted topic key and route edits through the sandbox actor.</p>
            <label className="mt-4 block">
              <select
                value={selectedTopic}
                onChange={(event) => {
                  const topicKey = event.target.value;
                  setSelectedTopic(topicKey);
                  router.replace(`/admin/maps?topic=${encodeURIComponent(topicKey)}`);
                }}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                {loadingList ? <option>Loading maps...</option> : null}
                {!loadingList
                  ? maps.map((entry) => (
                      <option key={entry.id} value={entry.topicKey}>
                        {entry.title} ({entry.status})
                      </option>
                    ))
                  : null}
              </select>
            </label>
            {maps.length > 0 ? (
              <div className="mt-3 text-xs text-slate-500">{maps.length} editable maps available for this tenant.</div>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Publication</h2>
            <div className="mt-4 grid gap-2">
              {MAP_STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={!map}
                  onClick={() =>
                    map
                      ? applyMutation(
                          () => updateEducationMapStatus(map.definition.topicKey, status, actorId),
                          `Map status updated to ${status}.`,
                        )
                      : undefined
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    currentStatus === status
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-700 hover:border-cyan-300 hover:text-cyan-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Phase C seed import</h2>
            <p className="mt-1 text-sm text-slate-500">
              Starts with the left-thought template. Use Create new for a generic blank template, then preview/persist via privileged import routes.
            </p>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Mode
                  <select
                    value={importForm.mode}
                    onChange={(event) => updateImportForm({ mode: event.target.value as ImportFormState['mode'] })}
                    className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none"
                  >
                    <option value="curated_refine">curated_refine</option>
                    <option value="auto_expand">auto_expand</option>
                    <option value="auto_seed">auto_seed</option>
                  </select>
                </label>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Status
                  <select
                    value={importForm.status}
                    onChange={(event) => updateImportForm({ status: event.target.value as ImportFormState['status'] })}
                    className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none"
                  >
                    <option value="draft">draft</option>
                    <option value="reviewed">reviewed</option>
                    <option value="published">published</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={importForm.force}
                  onChange={(event) => updateImportForm({ force: event.target.checked })}
                />
                Force re-import even when checksum matches
              </label>
              <input
                value={importForm.importNote}
                onChange={(event) => updateImportForm({ importNote: event.target.value })}
                placeholder="Optional governance note"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={importForm.seedJson}
                onChange={(event) => updateImportForm({ seedJson: event.target.value })}
                rows={10}
                spellCheck={false}
                placeholder="Paste seed corpus JSON"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700 outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void runImportPreview();
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                >
                  Preview import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runImportPersist();
                  }}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Persist import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportForm((current) => ({
                      ...current,
                      seedJson: LEFT_THOUGHT_IMPORT_SEED_JSON,
                    }));
                    setImportPreview(null);
                    setImportChecksum(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                >
                  Use left-thought template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportForm((current) => ({
                      ...current,
                      seedJson: GENERIC_IMPORT_SEED_JSON,
                    }));
                    setImportPreview(null);
                    setImportChecksum(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                >
                  Create new
                </button>
              </div>
              {importPreview ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Preview · {importPreview.topicKey}</p>
                  <p className="mt-1">
                    {importPreview.nodeCount} nodes · {importPreview.edgeCount} edges · {importPreview.sepLinkedNodeCount} SEP-linked nodes
                  </p>
                  {importChecksum ? <p className="mt-1">Checksum: {importChecksum}</p> : null}
                  {importPreview.warnings.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700">
                      {importPreview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-700">Recent import activity</p>
                  <button
                    type="button"
                    onClick={() => {
                      void loadImportActivity(selectedTopic || map?.definition.topicKey || '');
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
                  >
                    Refresh
                  </button>
                </div>
                {loadingImportActivity ? <p className="mt-2 text-slate-500">Loading activity…</p> : null}
                {!loadingImportActivity && importActivity.length < 1 ? (
                  <p className="mt-2 text-slate-500">No recorded imports for this topic yet.</p>
                ) : null}
                {!loadingImportActivity && importActivity.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {importActivity.slice(0, 5).map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
                        <p className="font-semibold text-slate-700">
                          {entry.importSource} · {entry.importMode} · {entry.importChecksum.slice(0, 12)}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {entry.nodeCount} nodes · {entry.edgeCount} edges · {entry.sepLinkedNodeCount} SEP
                        </p>
                        {entry.importNote ? <p className="mt-1 text-slate-600">Note: {entry.importNote}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Taxonomy</h2>
            <select
              value={selectedCategory?.key ?? ''}
              onChange={(event) => setSelectedCategoryKey(event.target.value)}
              className="mt-4 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {map?.categories.map((category) => (
                <option key={category.id} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3">
              <input
                value={categoryForm.label}
                onChange={(event) => updateCategoryForm({ label: event.target.value })}
                placeholder="Category label"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={categoryForm.colorToken}
                onChange={(event) => updateCategoryForm({ colorToken: event.target.value })}
                placeholder="Color token"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={categoryForm.description}
                onChange={(event) => updateCategoryForm({ description: event.target.value })}
                rows={3}
                placeholder="Category description"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={categoryForm.order}
                onChange={(event) => updateCategoryForm({ order: event.target.value })}
                inputMode="numeric"
                placeholder="Order"
                aria-invalid={categoryOrderInvalid}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              {categoryOrderInvalid ? (
                <p className="text-xs text-rose-600">Order must be numeric before the taxonomy override can be saved.</p>
              ) : null}
              <button
                type="button"
                disabled={!map || !selectedCategory || categoryOrderInvalid}
                onClick={() =>
                  map && selectedCategory
                    ? applyMutation(
                        () =>
                          updateEducationMapCategory(
                            map.definition.topicKey,
                            selectedCategory.key,
                            {
                              label: categoryForm.label,
                              colorToken: categoryForm.colorToken,
                              description: categoryForm.description || null,
                              order: categoryOrderValue,
                            },
                            actorId,
                          ),
                        'Category override persisted.',
                      )
                    : undefined
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Save taxonomy
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Star editor</h2>
            <select
              value={selectedNode?.id ?? ''}
              onChange={(event) => setSelectedNodeId(event.target.value)}
              className="mt-4 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {map?.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3">
              <select
                value={nodeForm.categoryKey}
                onChange={(event) => updateNodeForm({ categoryKey: event.target.value })}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="">Uncategorized</option>
                {map?.categories.map((category) => (
                  <option key={category.id} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
              <textarea
                value={nodeForm.summary}
                onChange={(event) => updateNodeForm({ summary: event.target.value })}
                rows={3}
                placeholder="Summary"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={nodeForm.longDescription}
                onChange={(event) => updateNodeForm({ longDescription: event.target.value })}
                rows={4}
                placeholder="Long description"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <label className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={nodeForm.pinned}
                  onChange={(event) => updateNodeForm({ pinned: event.target.checked })}
                />
                Pinned star
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={nodeForm.x}
                  onChange={(event) => updateNodeForm({ x: event.target.value })}
                  placeholder="X"
                  aria-invalid={nodePositionInvalid}
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <input
                  value={nodeForm.y}
                  onChange={(event) => updateNodeForm({ y: event.target.value })}
                  placeholder="Y"
                  aria-invalid={nodePositionInvalid}
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <input
                  value={nodeForm.z}
                  onChange={(event) => updateNodeForm({ z: event.target.value })}
                  placeholder="Z"
                  aria-invalid={nodePositionInvalid}
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
              {nodePositionInvalid ? (
                <p className="text-xs text-rose-600">X, Y, and Z must all be numeric before the star position can be saved.</p>
              ) : null}
              <button
                type="button"
                disabled={!map || !selectedNode || nodePositionInvalid}
                onClick={() =>
                  map && selectedNode
                    ? applyMutation(
                        () =>
                          updateEducationMapNode(
                            map.definition.topicKey,
                            selectedNode.id,
                            {
                              categoryKey: nodeForm.categoryKey || undefined,
                              summary: nodeForm.summary,
                              longDescription: nodeForm.longDescription,
                              pinned: nodeForm.pinned,
                              position: {
                                x: nodeXValue ?? 0,
                                y: nodeYValue ?? 0,
                                z: nodeZValue ?? 0,
                              },
                            },
                            actorId,
                          ),
                        'Star override persisted.',
                      )
                    : undefined
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Save star
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Constellation relation editor</h2>
            <select
              value={selectedEdge?.id ?? ''}
              onChange={(event) => setSelectedEdgeId(event.target.value)}
              className="mt-4 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {map?.edges.map((edge) => (
                <option key={edge.id} value={edge.id}>
                  {edge.sourceId.slice(0, 4)} {'->'} {edge.targetId.slice(0, 4)} ({edge.relation})
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3">
              <select
                value={edgeForm.relation}
                onChange={(event) => updateEdgeForm({ relation: event.target.value as MapRelation })}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                {MAP_RELATION_OPTIONS.map((relation) => (
                  <option key={relation} value={relation}>
                    {relation}
                  </option>
                ))}
              </select>
              <input
                value={edgeForm.weight}
                onChange={(event) => updateEdgeForm({ weight: event.target.value })}
                placeholder="Weight"
                aria-invalid={edgeMetricsInvalid}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={edgeForm.confidence}
                onChange={(event) => updateEdgeForm({ confidence: event.target.value })}
                placeholder="Confidence"
                aria-invalid={edgeMetricsInvalid}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={edgeForm.evidence}
                onChange={(event) => updateEdgeForm({ evidence: event.target.value })}
                rows={3}
                placeholder="Evidence note"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              {edgeMetricsInvalid ? (
                <p className="text-xs text-rose-600">Weight and confidence must both be numeric before the relation can be saved.</p>
              ) : null}
              <button
                type="button"
                disabled={!map || !selectedEdge || edgeMetricsInvalid}
                onClick={() =>
                  map && selectedEdge
                    ? applyMutation(
                        () =>
                          updateEducationMapEdge(
                            map.definition.topicKey,
                            selectedEdge.id,
                            {
                              relation: edgeForm.relation,
                              weight: edgeWeightValue,
                              confidence: edgeConfidenceValue,
                              evidence: edgeForm.evidence,
                            },
                            actorId,
                          ),
                        'Relation override persisted.',
                      )
                    : undefined
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Save relation
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Universe control</h2>
            <p className="mt-1 text-sm text-slate-500">Re-run the layout compiler or restore an earlier constellation snapshot.</p>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                disabled={!map}
                onClick={() => {
                  if (!map || !window.confirm('Re-run the universe layout? Pinned stars will stay fixed, but the rest of the constellation may shift.')) {
                    return;
                  }

                  void applyMutation(
                    () => rerunEducationMapLayout(map.definition.topicKey, actorId),
                    'Layout rerun persisted. Pinned stars should remain fixed.',
                  );
                }}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Rerun layout
              </button>
              <select
                value={activeSnapshotId}
                onChange={(event) => setSelectedSnapshotId(event.target.value)}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                {map?.snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!map || !activeSnapshotId}
                onClick={() => {
                  if (
                    !map ||
                    !activeSnapshotId ||
                    !window.confirm('Restore this saved snapshot? Current star positions will be replaced by the selected constellation layout.')
                  ) {
                    return;
                  }

                  void applyMutation(
                    () => restoreEducationMapSnapshot(map.definition.topicKey, activeSnapshotId, actorId),
                    'Layout snapshot restored.',
                  );
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-60"
              >
                Restore snapshot
              </button>
            </div>
          </section>
        </aside>

        <div>
          <FalakMapViewer
            map={map}
            loading={loadingMap}
            error={error}
            onRetry={() => (selectedTopic ? loadMap(selectedTopic) : undefined)}
            titlePrefix="Admin"
            eyebrowLabel="Manara atlas admin sandbox"
            footerActions={
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span>Actor: {actorId || 'public'}</span>
                <span>Route guard: local sandbox actor headers</span>
                {map ? (
                  <Link
                    href={`/education/maps/${encodeURIComponent(map.definition.topicKey)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 transition hover:border-cyan-400 hover:text-cyan-100"
                  >
                    View public detail
                  </Link>
                ) : null}
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
