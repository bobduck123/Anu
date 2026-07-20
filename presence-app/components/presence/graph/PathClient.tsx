"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Loader2, MapPin, Route } from "lucide-react";
import { choosePathFork, getPath, getPathFromMoodBoard, getPathFromRoom, recordPathTrace, startPathWalk } from "@/lib/api/presenceGraph";
import { getPathFromHall } from "@/lib/api/halls";
import { createClient } from "@/lib/supabase/client";
import { buildSignInHref } from "@/lib/auth/returnTo";
import { PRESENCE_GRAPH_COPY, pathDirectionLabel } from "@/lib/presence/graph/copy";
import type { PathChoice, PathWaypoint, PresencePath } from "@/lib/api/types";

type PathMode =
  | { type: "id"; id: number }
  | { type: "room"; id: number }
  | { type: "mood_board"; id: number }
  | { type: "hall"; id: number };

export function PathClient({ mode }: { mode: PathMode }) {
  const [path, setPath] = useState<PresencePath | null>(null);
  const [activeWaypointId, setActiveWaypointId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setToken(session?.access_token ?? null);
      try {
        const result =
          mode.type === "room"
            ? await getPathFromRoom(mode.id)
            : mode.type === "mood_board"
              ? await getPathFromMoodBoard(mode.id)
              : mode.type === "hall"
                ? await getPathFromHall(mode.id)
                : await getPath(mode.id);
        if (!cancelled) {
          setPath(result);
          setActiveWaypointId(result.waypoints?.[0]?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Path.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode.id, mode.type]);

  async function startWalk() {
    if (!token || !path) {
      setStatus("Create an Observer Mask to save and walk this Path.");
      return;
    }
    try {
      await startPathWalk(path.id, token);
      setStatus("Path walk started.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not start this Path.");
    }
  }

  async function choose(choice: PathChoice) {
    if (!path) return;
    const next = path.waypoints?.find((waypoint) => waypoint.id === choice.next_waypoint_id) ?? path.waypoints?.find((waypoint) => waypoint.id !== activeWaypointId);
    if (next) setActiveWaypointId(next.id);
    if (token) {
      choosePathFork(path.id, choice.id, token).catch(() => {});
    }
  }

  async function traceWaypoint(waypoint: PathWaypoint) {
    setActiveWaypointId(waypoint.id);
    if (token && path) {
      recordPathTrace(path.id, { trace_type: waypoint.waypoint_type === "room" ? "enter_room" : "view", waypoint_id: waypoint.id }, token).catch(() => {});
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-950 text-stone-50">
        <Loader2 className="h-7 w-7 animate-spin text-orange-300" />
      </main>
    );
  }

  if (error || !path) {
    return (
      <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
        <div className="mx-auto max-w-lg rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <h1 className="text-2xl font-semibold">Path unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-stone-300">{error || "This Path could not be loaded."}</p>
        </div>
      </main>
    );
  }

  const waypoints = path.waypoints ?? [];
  const active = waypoints.find((waypoint) => waypoint.id === activeWaypointId) ?? waypoints[0];
  const activeIndex = active ? waypoints.findIndex((waypoint) => waypoint.id === active.id) : -1;
  const choices = (path.choices ?? []).filter((choice) => !active || choice.from_waypoint_id === active.id);
  const visibleChoices = choices.length > 0 ? choices : (path.choices ?? []).slice(0, 6);

  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-200">
          Presence
        </Link>
        <header className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">{PRESENCE_GRAPH_COPY.paths}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{path.title}</h1>
            {path.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">{path.description}</p>}
            <button type="button" onClick={() => void startWalk()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
              <Route className="h-4 w-4" />
              Start Path
            </button>
            {!token && (
              <Link href={buildSignInHref(`/paths/${path.id}`)} className="ml-3 inline-flex text-sm font-semibold text-stone-300 underline underline-offset-4">
                Save with Observer Mask
              </Link>
            )}
            {status && <p className="mt-3 text-sm text-stone-300">{status}</p>}
          </section>

          {active && (
            <section className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_20%_10%,rgba(251,146,60,0.22),transparent_32%),#1c1917] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                {activeIndex === 0 ? "Trailhead" : `Waypoint ${activeIndex + 1} of ${waypoints.length}`}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{active.title || active.waypoint_type}</h2>
              {active.reason_shown && <p className="mt-3 text-sm leading-6 text-stone-300">{active.reason_shown}</p>}
              {active.waypoint_type === "room" && active.waypoint_id && (
                <Link href={String(active.metadata?.public_url || "#")} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-100">
                  Enter Room
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </section>
          )}
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-orange-300" />
              Waypoints
            </h2>
            <div className="mt-4 grid gap-2">
              {waypoints.map((waypoint) => (
                <button
                  key={waypoint.id}
                  type="button"
                  onClick={() => void traceWaypoint(waypoint)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    waypoint.id === active?.id
                      ? "border-orange-300 bg-orange-300 text-stone-950"
                      : "border-stone-800 bg-stone-950/60 text-stone-100 hover:border-stone-600"
                  }`}
                >
                  <p className="text-sm font-semibold">{waypoint.title || waypoint.waypoint_type}</p>
                  {waypoint.reason_shown && <p className="mt-1 text-xs opacity-80">{waypoint.reason_shown}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Compass className="h-4 w-4 text-orange-300" aria-hidden />
              {PRESENCE_GRAPH_COPY.paths}
            </h2>
            {visibleChoices.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-stone-800 bg-stone-950/40 p-4 text-sm text-stone-400">
                Path end — no further forks. Return later, or walk a new Path from a Room or Mood Board.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {visibleChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => void choose(choice)}
                    className="group rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-left transition hover:border-orange-300/70"
                  >
                    {/* Direction label uses humanised text; raw label sits as the secondary line if different */}
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
                      {pathDirectionLabel(choice.direction_type)}
                    </p>
                    <p className="mt-2 font-semibold text-stone-50">{choice.label || pathDirectionLabel(choice.direction_type)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-stone-500 transition group-hover:text-orange-200">
                      Walk this way <ArrowRight className="h-3 w-3" aria-hidden />
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

