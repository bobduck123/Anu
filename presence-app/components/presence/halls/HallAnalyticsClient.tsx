"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { getHallAnalytics } from "@/lib/api/halls";
import { PresenceApiError, isPresenceConnectionError } from "@/lib/api/client";
import type { HallAnalytics } from "@/lib/api/types";

interface Props {
  nodeId: number;
  hallId: number;
  hallSlug?: string | null;
  token: string | null;
}

const HUMAN_LABELS: Array<[keyof HallAnalytics, string, string]> = [
  ["people_gathered", "People gathered", "Total Masks and guests who joined this Hall."],
  ["observers", "Observers", "Of those, how many were known Observer Masks."],
  ["guests", "Guests", "Unauthenticated visitors who stepped in."],
  ["observations_shared", "Observations shared", "What was said on the Noticeboard."],
  ["rooms_entered", "Rooms entered", "How many times someone stepped into a Stall or host Room."],
  ["stall_visits", "Stall visits", "Total clicks into Stalls."],
  ["portal_clicks", "Portals opened", "Walk-throughs into Rooms, Gardens, Paths, or other Halls."],
  ["seeds_created", "Seeds created", "New Seeds that grew out of this Hall."],
  ["paths_opened", "Paths opened", "Paths started from this Hall."],
  ["enquiries", "Enquiries", "Connected commercial enquiries (when wired)."],
];

// Helper: backend serializes the canonical aliases alongside the legacy
// keys. Read the canonical one first, fall back to the legacy.
function resolveMetric(a: HallAnalytics, key: keyof HallAnalytics): number | undefined {
  const aliasMap: Partial<Record<keyof HallAnalytics, keyof HallAnalytics>> = {
    people_gathered: "participants_joined",
    observations_shared: "observations_posted",
    paths_opened: "paths_generated",
  };
  const value = a[key];
  if (typeof value === "number") return value;
  const fallback = aliasMap[key];
  if (fallback) {
    const f = a[fallback];
    if (typeof f === "number") return f;
  }
  return undefined;
}

export function HallAnalyticsClient({ nodeId, hallId, hallSlug, token }: Props) {
  const [analytics, setAnalytics] = useState<HallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDown, setConnectionDown] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getHallAnalytics(hallId, token);
        if (!cancelled) setAnalytics(res);
      } catch (err) {
        // Owner / Studio analytics surface must be honest about a missing
        // backend — silently zero-filling would mask a real outage.
        if (isPresenceConnectionError(err)) {
          if (!cancelled) {
            setConnectionDown(true);
          }
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Hall analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hallId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--p-studio-accent)" }} />
      </div>
    );
  }

  if (connectionDown) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10" role="status">
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">
          <strong className="font-semibold">Backend unreachable.</strong>{" "}
          The Presence backend at <code>{process.env.NEXT_PUBLIC_API_BASE ?? "the configured API base"}</code>{" "}
          did not respond. Hall analytics cannot load. Check the backend is running, then refresh.
        </p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">
          {error ?? "Could not load Hall analytics."}
        </p>
      </div>
    );
  }

  const allZero = HUMAN_LABELS.every(([k]) => !resolveMetric(analytics, k));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
          Hall analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
          What this gathering did.
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--p-studio-muted)" }}>
          Human numbers — not private Observer identities. We never show you who an Observer is unless they reveal.
        </p>
      </header>

      {allZero && (
        <section
          className="rounded-3xl border p-5"
          style={{ borderColor: "var(--p-studio-border)", background: "var(--p-studio-surface)" }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "var(--p-studio-accent)" }} />
          <h2 className="mt-3 text-xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
            Empty Hall — empty data.
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--p-studio-muted)" }}>
            Activate this Hall: share its link, schedule a session, add a Stall, or pin an Observation on the
            Noticeboard. Numbers appear as people step in.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link
              href={`/studio/${nodeId}/halls/${hallId}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            >
              Manage Hall <ArrowRight className="w-4 h-4" />
            </Link>
            {hallSlug && (
              <Link
                href={`/halls/${hallSlug}`}
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
              >
                Public Hall view
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="analytics-grid">
        {HUMAN_LABELS.map(([k, label, hint]) => {
          const value = resolveMetric(analytics, k);
          if (value === undefined) return null;
          return (
            <div
              key={String(k)}
              className="analytics-tile"
              data-metric={String(k)}
              style={{
                background: "var(--p-studio-surface)",
                borderColor: "var(--p-studio-border)",
              }}
            >
              <p className="label" style={{ color: "var(--p-studio-muted)" }}>{label}</p>
              <p
                className="value"
                style={{ color: "var(--p-studio-text)", fontFamily: "var(--p-studio-display, var(--presence-f-display))" }}
              >
                {String(value)}
              </p>
              <p className="text-xs leading-5 mt-2" style={{ color: "var(--p-studio-muted)" }}>
                {hint}
              </p>
            </div>
          );
        })}
      </div>

      {(analytics.most_visited_stall || analytics.most_used_portal) && (
        <section
          className="rounded-3xl border p-5 grid gap-4 sm:grid-cols-2"
          style={{ borderColor: "var(--p-studio-border)", background: "var(--p-studio-surface)" }}
        >
          {analytics.most_visited_stall && (
            <div data-metric="most_visited_stall">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
                Most visited Stall
              </p>
              <p className="mt-3 text-2xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
                {analytics.most_visited_stall.room_display_name}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--p-studio-muted)" }}>
                {analytics.most_visited_stall.visits} visits ·{" "}
                <Link href={`/presence/${analytics.most_visited_stall.room_slug}`} className="underline" style={{ color: "var(--p-studio-accent)" }}>
                  Open Room
                </Link>
              </p>
            </div>
          )}
          {analytics.most_used_portal && (
            <div data-metric="most_used_portal">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
                Most used Portal
              </p>
              <p className="mt-3 text-2xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
                {analytics.most_used_portal.label}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--p-studio-muted)" }}>
                {analytics.most_used_portal.clicks} walk-throughs
                {analytics.most_used_portal.destination_kind &&
                  ` · ${analytics.most_used_portal.destination_kind.replace(/_/g, " ")}`}
              </p>
            </div>
          )}
        </section>
      )}

      {analytics.top_stalls && analytics.top_stalls.length > 0 && (
        <section
          className="rounded-3xl border p-5"
          style={{ borderColor: "var(--p-studio-border)", background: "var(--p-studio-surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            Most visited Stalls
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {analytics.top_stalls.map((s) => (
              <li
                key={s.room_slug}
                className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                style={{ borderColor: "var(--p-studio-border)" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--p-studio-text)" }}>{s.room_display_name}</p>
                  <p className="text-xs" style={{ color: "var(--p-studio-muted)" }}>{s.visits} visits</p>
                </div>
                <Link href={`/presence/${s.room_slug}`} className="text-xs underline" style={{ color: "var(--p-studio-accent)" }}>
                  Open Room
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {analytics.source_breakdown && analytics.source_breakdown.length > 0 && (
        <section
          className="rounded-3xl border p-5"
          style={{ borderColor: "var(--p-studio-border)", background: "var(--p-studio-surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            How people arrived
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {analytics.source_breakdown.map((s) => (
              <li key={s.source} className="flex items-center justify-between" style={{ color: "var(--p-studio-muted)" }}>
                <span>{s.source}</span>
                <span style={{ color: "var(--p-studio-text)" }}>{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
