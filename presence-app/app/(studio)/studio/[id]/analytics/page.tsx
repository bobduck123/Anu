"use client";

import { use, useEffect, useState } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { getAnalytics } from "@/lib/api/owner";
import { getRoomGraphAnalytics } from "@/lib/api/presenceGraph";
import type { PresenceAnalyticsSummary, RoomGraphAnalytics } from "@/lib/api/types";

export default function StudioAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);
  const [analytics, setAnalytics] = useState<PresenceAnalyticsSummary | null>(null);
  const [graphAnalytics, setGraphAnalytics] = useState<RoomGraphAnalytics | null>(null);

  useEffect(() => {
    if (!token) return;
    getAnalytics(nodeId, token).then(setAnalytics).catch(console.error);
    getRoomGraphAnalytics(nodeId, token).then(setGraphAnalytics).catch(console.error);
  }, [nodeId, token]);

  if (loading) return <Loading label="Loading signals..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/analytics`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Signals
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
            Activity and response
          </h2>
        </div>

        {analytics ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Views", value: analytics.total_views },
                { label: "Enquiries", value: analytics.total_enquiries },
                { label: "Rate", value: `${(analytics.conversion_rate * 100).toFixed(1)}%` },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)] text-center">
                  <span className="text-2xl font-semibold text-[var(--p-studio-text)]">{stat.value}</span>
                  <span className="text-xs text-[var(--p-studio-muted)]">{stat.label}</span>
                </div>
              ))}
            </div>

            {analytics.top_sources && analytics.top_sources.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">
                  Top sources
                </h3>
                {analytics.top_sources.map((src, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
                    <span className="text-sm text-[var(--p-studio-text)]">{src.source_type ?? "direct"}</span>
                    <span className="text-sm font-medium text-[var(--p-studio-accent)]">{src.count}</span>
                  </div>
                ))}
              </section>
            )}

            {graphAnalytics && (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">
                  Presence Pass activity
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Room entries", value: graphAnalytics.encounters_count },
                    { label: "Rooms saved", value: graphAnalytics.saved_rooms_count },
                    { label: "Field Notes", value: graphAnalytics.field_notes_count },
                    { label: "Path activity", value: graphAnalytics.path_activity_count },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4">
                      <span className="text-2xl font-semibold text-[var(--p-studio-text)]">{stat.value}</span>
                      <p className="mt-1 text-xs text-[var(--p-studio-muted)]">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {graphAnalytics.room_key_performance.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">
                      Best performing Room Keys
                    </p>
                    {graphAnalytics.room_key_performance.slice(0, 6).map((key) => (
                      <div key={key.id} className="flex items-center justify-between rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-3">
                        <span className="text-sm text-[var(--p-studio-text)]">{key.campaign_label || key.key_type.replace(/_/g, " ")}</span>
                        <span className="text-sm font-medium text-[var(--p-studio-accent)]">{key.encounters_count ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {analytics.recent_events && analytics.recent_events.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">
                  Recent activity
                </h3>
                {analytics.recent_events.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between py-2 border-b border-[var(--p-studio-border)]">
                    <span className="text-xs text-[var(--p-studio-text)]">{ev.event_type}</span>
                    {ev.created_at && (
                      <span className="text-xs text-[var(--p-studio-muted)]">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4 text-sm leading-6 text-[var(--p-studio-muted)]">
            Signals appear after public views, QR scans, NFC source visits, and
            enquiries are recorded.
          </p>
        )}
      </div>
    </StudioShell>
  );
}
