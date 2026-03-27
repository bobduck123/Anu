'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { educationMapsApi } from '@/lib/api/educationMaps';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';

export function EducationMapsAdminPage() {
  const queryClient = useQueryClient();
  const mapsQuery = useQuery({
    queryKey: ['education-maps-admin'],
    queryFn: () => educationMapsApi.listMaps(),
  });

  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [pinned, setPinned] = useState(false);
  const [edgeWeight, setEdgeWeight] = useState('0.50');
  const [edgeEvidence, setEdgeEvidence] = useState('');

  useEffect(() => {
    if (!selectedTopicKey && mapsQuery.data?.length) {
      setSelectedTopicKey(mapsQuery.data[0].topicKey);
    }
  }, [mapsQuery.data, selectedTopicKey]);

  const mapQuery = useQuery({
    queryKey: ['education-map-admin', selectedTopicKey],
    queryFn: () => educationMapsApi.getMap(selectedTopicKey),
    enabled: Boolean(selectedTopicKey),
  });

  const selectedNode = useMemo(
    () => mapQuery.data?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [mapQuery.data?.nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => mapQuery.data?.edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [mapQuery.data?.edges, selectedEdgeId],
  );
  const latestSnapshot = mapQuery.data?.snapshots[0] ?? null;
  const pinnedNodeCount = mapQuery.data?.nodes.filter((node) => node.pinned).length ?? 0;
  const maps = mapsQuery.data ?? [];

  useEffect(() => {
    if (selectedNode) {
      setSummaryDraft(selectedNode.summary ?? '');
      setPinned(selectedNode.pinned);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeWeight(selectedEdge.weight.toFixed(2));
      setEdgeEvidence(selectedEdge.evidence ?? '');
    }
  }, [selectedEdge]);

  const publishMutation = useMutation({
    mutationFn: (status: 'draft' | 'reviewed' | 'published') => educationMapsApi.updateStatus(selectedTopicKey, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['education-maps-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['education-map-admin', selectedTopicKey] }),
      ]);
    },
  });

  const rerunLayoutMutation = useMutation({
    mutationFn: () => educationMapsApi.rerunLayout(selectedTopicKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['education-map-admin', selectedTopicKey] }),
  });

  const updateNodeMutation = useMutation({
    mutationFn: () => educationMapsApi.updateNode(selectedTopicKey, selectedNodeId, { summary: summaryDraft, pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['education-map-admin', selectedTopicKey] }),
  });

  const updateEdgeMutation = useMutation({
    mutationFn: () =>
      educationMapsApi.updateEdge(selectedTopicKey, selectedEdgeId, {
        weight: Number(edgeWeight),
        evidence: edgeEvidence,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['education-map-admin', selectedTopicKey] }),
  });
  const latestMutationError =
    publishMutation.error ?? rerunLayoutMutation.error ?? updateNodeMutation.error ?? updateEdgeMutation.error;
  const hasPersistedChange =
    publishMutation.isSuccess || rerunLayoutMutation.isSuccess || updateNodeMutation.isSuccess || updateEdgeMutation.isSuccess;

  if (mapsQuery.isLoading) {
    return <LoadingState message="Loading map admin..." />;
  }

  if (mapsQuery.error) {
    return <ErrorState message={mapsQuery.error instanceof Error ? mapsQuery.error.message : 'Unable to load admin maps'} />;
  }

  return (
    <section className="space-y-6">
      <header className="edu-card p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--edu-accent)]">Admin · Education maps</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Curate map drafts into published resources</h1>
      </header>

      {maps.length === 0 && (
        <div className="edu-card p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">No map drafts available</h2>
          <p className="mt-3 text-sm text-slate-500">
            Generate an Education Resource Library map first, then return here to refine taxonomy, relations, and layout.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="edu-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Maps</h2>
          <div className="mt-4 space-y-2">
            {maps.map((map) => (
              <button
                key={map.id}
                type="button"
                onClick={() => setSelectedTopicKey(map.topicKey)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedTopicKey === map.topicKey
                    ? 'border-[var(--edu-accent)]/30 bg-[var(--edu-accent-light)]'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-slate-900">{map.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{map.status}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {mapQuery.isLoading && <LoadingState message="Loading map details..." />}
          {mapQuery.error && (
            <ErrorState message={mapQuery.error instanceof Error ? mapQuery.error.message : 'Unable to load selected map'} />
          )}
          {mapQuery.data && (
            <>
              <div className="edu-card grid gap-4 p-6 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{mapQuery.data.definition.archetype}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{mapQuery.data.definition.title}</h2>
                  <p className="mt-3 text-sm text-slate-600">{mapQuery.data.definition.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      Status {mapQuery.data.definition.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      Version {mapQuery.data.definition.version}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {mapQuery.data.snapshots.length} snapshots
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {pinnedNodeCount} pinned nodes
                    </span>
                  </div>
                  {latestSnapshot && (
                    <p className="mt-3 text-sm text-slate-500">
                      Latest snapshot: {latestSnapshot.name} (v{latestSnapshot.version})
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate('draft')}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate('reviewed')}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Reviewed
                  </button>
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate('published')}
                    className="rounded-full border border-emerald-300/40 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                  >
                    {publishMutation.isPending ? 'Saving status...' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={rerunLayoutMutation.isPending}
                    onClick={() => rerunLayoutMutation.mutate()}
                    className="rounded-full border border-[var(--edu-accent)]/25 bg-[var(--edu-accent-light)] px-4 py-2 text-sm font-semibold text-[var(--edu-accent)]"
                  >
                    {rerunLayoutMutation.isPending ? 'Re-running layout...' : 'Re-run layout'}
                  </button>
                </div>
              </div>

              {hasPersistedChange && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Latest admin change persisted successfully.
                </div>
              )}
              {latestMutationError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {latestMutationError instanceof Error
                    ? latestMutationError.message
                    : 'Unable to persist the latest admin change'}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="edu-card p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Node editing</h3>
                  <select
                    value={selectedNodeId}
                    onChange={(event) => setSelectedNodeId(event.target.value)}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select node</option>
                    {mapQuery.data.nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                  {selectedNode && (
                    <div className="mt-4 space-y-4">
                      <textarea
                        value={summaryDraft}
                        onChange={(event) => setSummaryDraft(event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                      <label className="flex items-center gap-3 text-sm text-slate-700">
                        <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
                        Pin current node position
                      </label>
                      <button
                        type="button"
                        disabled={updateNodeMutation.isPending}
                        onClick={() => updateNodeMutation.mutate()}
                        className="rounded-full border border-[var(--edu-accent)]/25 bg-[var(--edu-accent-light)] px-4 py-2 text-sm font-semibold text-[var(--edu-accent)]"
                      >
                        {updateNodeMutation.isPending ? 'Saving node...' : 'Save node changes'}
                      </button>
                    </div>
                  )}
                  {!selectedNode && (
                    <p className="mt-4 text-sm text-slate-500">
                      Select a node to edit its summary or pin its current semantic position before re-running layout.
                    </p>
                  )}
                </div>

                <div className="edu-card p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Relation editing</h3>
                  <select
                    value={selectedEdgeId}
                    onChange={(event) => setSelectedEdgeId(event.target.value)}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select relation</option>
                    {mapQuery.data.edges.map((edge) => {
                      const source = mapQuery.data.nodes.find((node) => node.id === edge.sourceId)?.label ?? edge.sourceId;
                      const target = mapQuery.data.nodes.find((node) => node.id === edge.targetId)?.label ?? edge.targetId;
                      return (
                        <option key={edge.id} value={edge.id}>
                          {source} → {target} ({edge.relation})
                        </option>
                      );
                    })}
                  </select>
                  {selectedEdge && (
                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-600">Weight</span>
                        <input
                          value={edgeWeight}
                          onChange={(event) => setEdgeWeight(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-600">Evidence</span>
                        <textarea
                          value={edgeEvidence}
                          onChange={(event) => setEdgeEvidence(event.target.value)}
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={updateEdgeMutation.isPending}
                        onClick={() => updateEdgeMutation.mutate()}
                        className="rounded-full border border-[var(--edu-accent)]/25 bg-[var(--edu-accent-light)] px-4 py-2 text-sm font-semibold text-[var(--edu-accent)]"
                      >
                        {updateEdgeMutation.isPending ? 'Saving relation...' : 'Save relation changes'}
                      </button>
                    </div>
                  )}
                  {!selectedEdge && (
                    <p className="mt-4 text-sm text-slate-500">
                      Select a typed relation to refine its weight or attach clearer supporting evidence.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
