'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, MapPinned, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { WorldExplorer } from '@/components/cultural/WorldExplorer';
import {
  FusedEvent,
  LearningModule,
  WorldSnapshotPayload,
  fetchFusedEvents,
  fetchLearningModules,
  fetchWorldSnapshot,
  verifyWorldSnapshotIntegrity,
} from '@/lib/api/culturalIntelligence';

type SceneNode = {
  id: string;
  label?: string;
  entity_name?: string;
};

export default function ExplorePage() {
  const [worldId, setWorldId] = useState('sydney-alpha');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WorldSnapshotPayload | null>(null);
  const [events, setEvents] = useState<FusedEvent[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedNode, setSelectedNode] = useState<SceneNode | null>(null);
  const [clientVerified, setClientVerified] = useState<boolean>(false);
  const [verificationReasons, setVerificationReasons] = useState<string[]>([]);

  const loadWorld = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVerificationReasons([]);
    try {
      const [snapshotData, eventData, moduleData] = await Promise.all([
        fetchWorldSnapshot(worldId),
        fetchFusedEvents({ limit: 50 }),
        fetchLearningModules(),
      ]);
      const integrity = await verifyWorldSnapshotIntegrity(snapshotData);
      if (!integrity.ok) {
        setError(
          `Snapshot integrity checks failed: ${
            integrity.reasons.length > 0 ? integrity.reasons.join(', ') : 'unknown_reason'
          }. Loading paused.`,
        );
      }
      setClientVerified(integrity.ok);
      setVerificationReasons(integrity.reasons);
      setSnapshot(snapshotData);
      setEvents(eventData);
      setModules(moduleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world');
    } finally {
      setLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    loadWorld();
  }, [loadWorld]);

  const relatedEvents = useMemo(() => {
    if (!selectedNode?.entity_name) return events.slice(0, 8);
    const needle = selectedNode.entity_name.toLowerCase();
    return events.filter((event) => {
      const title = event.canonical_title?.toLowerCase() || '';
      const summary = event.summary?.toLowerCase() || '';
      return title.includes(needle) || summary.includes(needle);
    });
  }, [events, selectedNode]);

  const relatedModules = useMemo(() => {
    if (!selectedNode?.entity_name) return modules.slice(0, 6);
    const needle = selectedNode.entity_name.toLowerCase();
    return modules.filter((module) => {
      const title = module.title?.toLowerCase() || '';
      const description = module.description?.toLowerCase() || '';
      return title.includes(needle) || description.includes(needle);
    });
  }, [modules, selectedNode]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Explore</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Runescape-style traversal placeholder with signed snapshot validation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={worldId}
              onChange={(event) => setWorldId(event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="world id"
            />
            <button
              onClick={loadWorld}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary-foreground)]"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-3 py-1">
            <MapPinned className="h-4 w-4" />
            World: {snapshot?.world_id || worldId}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-3 py-1">
            <Eye className="h-4 w-4" />
            Version: {snapshot?.version ?? '-'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
              clientVerified
                ? 'bg-[#665700] text-[#665700]'
                : 'bg-[#7c413c] text-[#7c413c]'
            }`}
          >
            {clientVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
            Integrity: {clientVerified ? 'verified in browser' : 'unverified'}
          </span>
        </div>
        {error && <p className="mt-3 text-sm text-[#7c413c]">{error}</p>}
        {!clientVerified && verificationReasons.length > 0 && (
          <p className="mt-2 text-xs text-[#7c413c]">
            Reasons: {verificationReasons.slice(0, 6).join(', ')}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 md:p-4">
          {loading || !snapshot ? (
            <div className="grid h-[420px] place-items-center text-sm text-[var(--color-muted-foreground)]">
              Loading world snapshot...
            </div>
          ) : !clientVerified ? (
            <div className="grid h-[420px] place-items-center text-center text-sm text-[#7c413c]">
              Snapshot integrity could not be verified in the browser.
              <br />
              World rendering is blocked for safety.
            </div>
          ) : (
            <WorldExplorer
              sceneGraph={snapshot.manifest.scene_graph || {}}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          )}
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            Controls: drag to orbit, scroll to zoom, click nodes to inspect linked intelligence and learning.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-base font-semibold">Node Inspector</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {selectedNode ? `Selected: ${selectedNode.label || selectedNode.id}` : 'Click a node in the world viewer.'}
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Recent Fused Events</h3>
              <ul className="mt-1 space-y-2">
                {relatedEvents.slice(0, 5).map((event) => (
                  <li key={event.id} className="rounded-lg border border-[var(--color-border)] p-2">
                    <p className="text-sm font-medium">{event.canonical_title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      score {event.total_score.toFixed(2)} · confidence {event.confidence.toFixed(2)}
                    </p>
                  </li>
                ))}
                {relatedEvents.length < 1 && (
                  <li className="text-xs text-[var(--color-muted-foreground)]">No linked events yet.</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Linked Learning Modules</h3>
              <ul className="mt-1 space-y-2">
                {relatedModules.slice(0, 4).map((module) => (
                  <li key={module.id} className="rounded-lg border border-[var(--color-border)] p-2">
                    <p className="text-sm font-medium">{module.title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{module.description || 'No description.'}</p>
                  </li>
                ))}
                {relatedModules.length < 1 && (
                  <li className="text-xs text-[var(--color-muted-foreground)]">No linked modules yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
