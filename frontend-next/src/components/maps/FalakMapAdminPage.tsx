'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getEducationMap,
  listEducationMaps,
  MapRelation,
  MapResource,
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

function toNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    label: '',
    colorToken: '',
    description: '',
    order: '0',
  });
  const [nodeForm, setNodeForm] = useState<NodeFormState>({
    categoryKey: '',
    summary: '',
    longDescription: '',
    pinned: false,
    x: '0',
    y: '0',
    z: '0',
  });
  const [edgeForm, setEdgeForm] = useState<EdgeFormState>({
    relation: 'influences',
    weight: '0.6',
    confidence: '0.6',
    evidence: '',
  });

  const loadList = () => {
    setLoadingList(true);
    listEducationMaps({}, actorId || null)
      .then((response) => {
        setMaps(response);
        if (!selectedTopic && response[0]) {
          setSelectedTopic(response[0].topicKey);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load editable maps.');
      })
      .finally(() => {
        setLoadingList(false);
      });
  };

  const loadMap = (topicKey: string) => {
    if (!topicKey) {
      setMap(null);
      return;
    }

    setLoadingMap(true);
    setError(null);
    getEducationMap(topicKey, actorId || null)
      .then((response) => {
        setMap(response);
        setSelectedCategoryKey(response.categories[0]?.key ?? '');
        setSelectedNodeId(response.nodes[0]?.id ?? '');
        setSelectedEdgeId(response.edges[0]?.id ?? '');
        setSelectedSnapshotId(response.definition.currentSnapshotId ?? response.snapshots[0]?.id ?? '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load editable map.');
      })
      .finally(() => {
        setLoadingMap(false);
      });
  };

  useEffect(() => {
    loadList();
  }, [actorId]);

  useEffect(() => {
    if (!selectedTopic) {
      return;
    }

    loadMap(selectedTopic);
  }, [actorId, selectedTopic]);

  useEffect(() => {
    setFalakSandboxActorIdentity(actorId);
  }, [actorId]);

  useEffect(() => {
    if (initialTopicKey && initialTopicKey !== selectedTopic) {
      setSelectedTopic(initialTopicKey);
    }
  }, [initialTopicKey, selectedTopic]);

  const selectedCategory = useMemo(
    () => map?.categories.find((entry) => entry.key === selectedCategoryKey) ?? null,
    [map, selectedCategoryKey],
  );
  const selectedNode = useMemo(
    () => map?.nodes.find((entry) => entry.id === selectedNodeId) ?? null,
    [map, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => map?.edges.find((entry) => entry.id === selectedEdgeId) ?? null,
    [map, selectedEdgeId],
  );

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    setCategoryForm({
      label: selectedCategory.label,
      colorToken: selectedCategory.colorToken,
      description: selectedCategory.description ?? '',
      order: String(selectedCategory.order),
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    setNodeForm({
      categoryKey: selectedNode.categoryKey ?? '',
      summary: selectedNode.summary ?? '',
      longDescription: selectedNode.longDescription ?? '',
      pinned: selectedNode.pinned,
      x: String(selectedNode.position.x),
      y: String(selectedNode.position.y),
      z: String(selectedNode.position.z),
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedEdge) {
      return;
    }

    setEdgeForm({
      relation: selectedEdge.relation,
      weight: String(selectedEdge.weight),
      confidence: String(selectedEdge.confidence),
      evidence: selectedEdge.evidence ?? '',
    });
  }, [selectedEdge]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const preferredSnapshotId = map.definition.currentSnapshotId ?? map.snapshots[0]?.id ?? '';
    if (!selectedSnapshotId || !map.snapshots.some((snapshot) => snapshot.id === selectedSnapshotId) || preferredSnapshotId !== selectedSnapshotId) {
      setSelectedSnapshotId(preferredSnapshotId);
    }
  }, [map, selectedSnapshotId]);

  const applyMutation = async (work: () => Promise<MapResource>, successMessage: string) => {
    setMutationMessage(null);
    setError(null);
    try {
      const next = await work();
      setMap(next);
      setMutationMessage(successMessage);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falak admin mutation failed.');
    }
  };

  const currentStatus = map?.definition.status ?? 'draft';

  return (
    <div className="mx-auto max-w-[98rem] px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-300/80">Falak Admin Sandbox</p>
            <h1 className="mt-3 text-4xl font-semibold">Map autopilot editor</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Edit taxonomy, nodes, edges, publishing state, and layout snapshots against the real Falak persistence
              path without touching the hosted environments.
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
            <h2 className="text-lg font-semibold text-slate-900">Taxonomy</h2>
            <select
              value={selectedCategoryKey}
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
                onChange={(event) => setCategoryForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Category label"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={categoryForm.colorToken}
                onChange={(event) => setCategoryForm((current) => ({ ...current, colorToken: event.target.value }))}
                placeholder="Color token"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Category description"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={categoryForm.order}
                onChange={(event) => setCategoryForm((current) => ({ ...current, order: event.target.value }))}
                inputMode="numeric"
                placeholder="Order"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                disabled={!map || !selectedCategory}
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
                              order: toNumber(categoryForm.order),
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
            <h2 className="text-lg font-semibold text-slate-900">Node editor</h2>
            <select
              value={selectedNodeId}
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
                onChange={(event) => setNodeForm((current) => ({ ...current, categoryKey: event.target.value }))}
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
                onChange={(event) => setNodeForm((current) => ({ ...current, summary: event.target.value }))}
                rows={3}
                placeholder="Summary"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={nodeForm.longDescription}
                onChange={(event) => setNodeForm((current) => ({ ...current, longDescription: event.target.value }))}
                rows={4}
                placeholder="Long description"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <label className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={nodeForm.pinned}
                  onChange={(event) => setNodeForm((current) => ({ ...current, pinned: event.target.checked }))}
                />
                Pinned node
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={nodeForm.x}
                  onChange={(event) => setNodeForm((current) => ({ ...current, x: event.target.value }))}
                  placeholder="X"
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <input
                  value={nodeForm.y}
                  onChange={(event) => setNodeForm((current) => ({ ...current, y: event.target.value }))}
                  placeholder="Y"
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <input
                  value={nodeForm.z}
                  onChange={(event) => setNodeForm((current) => ({ ...current, z: event.target.value }))}
                  placeholder="Z"
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                disabled={!map || !selectedNode}
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
                                x: toNumber(nodeForm.x) ?? 0,
                                y: toNumber(nodeForm.y) ?? 0,
                                z: toNumber(nodeForm.z) ?? 0,
                              },
                            },
                            actorId,
                          ),
                        'Node override persisted.',
                      )
                    : undefined
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Save node
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Relation editor</h2>
            <select
              value={selectedEdgeId}
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
                onChange={(event) => setEdgeForm((current) => ({ ...current, relation: event.target.value as MapRelation }))}
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
                onChange={(event) => setEdgeForm((current) => ({ ...current, weight: event.target.value }))}
                placeholder="Weight"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={edgeForm.confidence}
                onChange={(event) => setEdgeForm((current) => ({ ...current, confidence: event.target.value }))}
                placeholder="Confidence"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <textarea
                value={edgeForm.evidence}
                onChange={(event) => setEdgeForm((current) => ({ ...current, evidence: event.target.value }))}
                rows={3}
                placeholder="Evidence note"
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                disabled={!map || !selectedEdge}
                onClick={() =>
                  map && selectedEdge
                    ? applyMutation(
                        () =>
                          updateEducationMapEdge(
                            map.definition.topicKey,
                            selectedEdge.id,
                            {
                              relation: edgeForm.relation,
                              weight: toNumber(edgeForm.weight),
                              confidence: toNumber(edgeForm.confidence),
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
            <h2 className="text-lg font-semibold text-slate-900">Layout control</h2>
            <p className="mt-1 text-sm text-slate-500">Re-run the layout compiler or restore an earlier snapshot.</p>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                disabled={!map}
                onClick={() =>
                  map
                    ? applyMutation(
                        () => rerunEducationMapLayout(map.definition.topicKey, actorId),
                        'Layout rerun persisted. Pinned nodes should remain fixed.',
                      )
                    : undefined
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Rerun layout
              </button>
              <select
                value={selectedSnapshotId}
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
                disabled={!map || !selectedSnapshotId}
                onClick={() =>
                  map && selectedSnapshotId
                    ? applyMutation(
                        () => restoreEducationMapSnapshot(map.definition.topicKey, selectedSnapshotId, actorId),
                        'Layout snapshot restored.',
                      )
                    : undefined
                }
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
            eyebrowLabel="Falak admin sandbox"
            footerActions={
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span>Actor: {actorId || 'public'}</span>
                <span>Route guard: trusted local sandbox actor headers</span>
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
