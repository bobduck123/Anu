'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter, Layers, RefreshCw } from 'lucide-react';
import {
  FusedEvent,
  StoryCluster,
  fetchFusedEvents,
  fetchStoryClusters,
} from '@/lib/api/culturalIntelligence';

export default function IntelFeedPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<FusedEvent[]>([]);
  const [clusters, setClusters] = useState<StoryCluster[]>([]);
  const [eventType, setEventType] = useState('');
  const [region, setRegion] = useState('');
  const [showIntelHeat, setShowIntelHeat] = useState(true);
  const [showEducationLayer, setShowEducationLayer] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [eventRows, clusterRows] = await Promise.all([
        fetchFusedEvents({ eventType: eventType || undefined, region: region || undefined, limit: 120 }),
        fetchStoryClusters({ limit: 80 }),
      ]);
      setEvents(eventRows);
      setClusters(clusterRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avgScore = useMemo(() => {
    if (!events.length) return 0;
    return events.reduce((sum, item) => sum + item.total_score, 0) / events.length;
  }, [events]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Intel Feed</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Fused, corroborated signal stream with cluster-level prioritization.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary-foreground)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1"><Filter className="h-4 w-4" />Event Type</span>
            <input
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="environment.alert"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Region</span>
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="AU-NSW-SYDNEY"
            />
          </label>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
            <p className="text-[var(--color-muted-foreground)]">Fused events</p>
            <p className="text-lg font-semibold">{events.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
            <p className="text-[var(--color-muted-foreground)]">Average score</p>
            <p className="text-lg font-semibold">{avgScore.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-[var(--color-muted-foreground)]">
            <Layers className="h-4 w-4" />
            Map layers
          </span>
          <button
            onClick={() => setShowIntelHeat((value) => !value)}
            className={`rounded-full px-3 py-1 ${showIntelHeat ? 'bg-[#665700] text-[#665700]' : 'bg-[var(--color-muted)]'}`}
          >
            Intel Heat {showIntelHeat ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setShowEducationLayer((value) => !value)}
            className={`rounded-full px-3 py-1 ${showEducationLayer ? 'bg-[#7c413c] text-[#7c413c]' : 'bg-[var(--color-muted)]'}`}
          >
            Education Links {showEducationLayer ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">Fused Events</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading events...</p>
          ) : (
            <div className="mt-3 space-y-3">
              {events.map((event) => (
                <article key={event.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{event.canonical_title}</h3>
                    <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">{event.event_type}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{event.summary || 'No summary.'}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted-foreground)] md:grid-cols-4">
                    <span>score {event.total_score.toFixed(2)}</span>
                    <span>confidence {event.confidence.toFixed(2)}</span>
                    <span>sources {event.source_count}</span>
                    <span>{event.region || 'region: n/a'}</span>
                  </div>
                </article>
              ))}
              {events.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No events found.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">Story Clusters</h2>
          <div className="mt-3 space-y-2">
            {clusters.map((cluster) => (
              <article key={cluster.id} className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-sm font-medium">{cluster.label}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  anchor {cluster.entity_anchor || 'global'} · events {cluster.event_count}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">score {cluster.score.toFixed(2)}</p>
              </article>
            ))}
            {clusters.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No clusters yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
