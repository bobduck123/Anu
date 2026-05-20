"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Clock, Footprints, Loader2, MapPin } from "lucide-react";
import { getPassport } from "@/lib/api/presenceGraph";
import { createClient } from "@/lib/supabase/client";
import { buildSignInHref } from "@/lib/auth/returnTo";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { PassportStamp } from "@/lib/api/types";

// Friendly labels for stamp_type so the Passport reads like memory, not a log.
const STAMP_LABELS: Record<string, string> = {
  entered: "Entered",
  saved: "Saved",
  noted: "Field Note",
  crossed_paths: "Crossed paths",
  returned: "Returned",
  followed_path: "Walked a Path",
  enquired: "Reached out",
};

function stampTypeLabel(stampType: string): string {
  return STAMP_LABELS[stampType] ?? stampType.replace(/_/g, " ");
}

// Try to find a public Room slug or URL inside the stamp metadata so we can
// offer a "Return to Room" link. Backend places slug in metadata.room_slug
// (when present) or metadata.public_url.
function stampRoomHref(stamp: PassportStamp): string | null {
  const meta = stamp.metadata ?? {};
  const slug = typeof meta.room_slug === "string" ? meta.room_slug : null;
  const publicUrl = typeof meta.public_url === "string" ? meta.public_url : null;
  if (slug) return `/presence/${slug}`;
  if (publicUrl) return publicUrl;
  return null;
}

function stampPathHref(stamp: PassportStamp): string | null {
  if (stamp.path_id) return `/paths/${stamp.path_id}`;
  return null;
}

export function ObserverPassportClient() {
  const [items, setItems] = useState<PassportStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!cancelled) {
          setAuthRequired(true);
          setLoading(false);
        }
        return;
      }
      try {
        const result = await getPassport(session.access_token);
        if (!cancelled) setItems(result.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Passport.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PassportShell><LoadingState /></PassportShell>;
  if (authRequired) {
    return (
      <PassportShell>
        <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <BookOpen className="mb-4 h-7 w-7 text-orange-300" />
          <h1 className="text-3xl font-semibold">Create an Observer Mask to open your Passport.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-300">{PRESENCE_GRAPH_COPY.observerExplainer}</p>
          <Link href={buildSignInHref("/observer/passport")} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </PassportShell>
    );
  }

  const groups = groupStamps(items);

  return (
    <PassportShell>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Observer Passport</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Memory, not analytics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
          Rooms you entered, saved, returned to, noted, and walked through gather here.
        </p>
      </div>

      {error && <p className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">{error}</p>}

      {items.length === 0 ? (
        <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <BookOpen className="mb-4 h-7 w-7 text-orange-300" aria-hidden />
          <h2 className="text-2xl font-semibold">Your Passport is empty.</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">{PRESENCE_GRAPH_COPY.passportEmpty}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/gallery" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
              Find Rooms
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/observer/mood-boards" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100">
              Start a Mood Board
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-4">
          {Object.entries(groups).map(([label, stamps]) => (
            <section key={label} className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</h2>
              <div className="mt-4 grid gap-3">
                {stamps.map((stamp) => {
                  const roomHref = stampRoomHref(stamp);
                  const pathHref = stampPathHref(stamp);
                  return (
                    <article key={stamp.id} className="flex flex-col gap-3 rounded-2xl bg-stone-950/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-stone-50">{stamp.label || stampTypeLabel(stamp.stamp_type)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{stampTypeLabel(stamp.stamp_type)}</p>
                        {(roomHref || pathHref) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {roomHref && (
                              <Link
                                href={roomHref}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 transition hover:border-orange-300/70 hover:text-orange-200"
                              >
                                <MapPin className="h-3 w-3" aria-hidden />
                                Return to Room
                              </Link>
                            )}
                            {stamp.room_id && (
                              <Link
                                href={`/paths/from-room/${stamp.room_id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 transition hover:border-orange-300/70 hover:text-orange-200"
                              >
                                <Footprints className="h-3 w-3" aria-hidden />
                                Walk a Path
                              </Link>
                            )}
                            {pathHref && (
                              <Link
                                href={pathHref}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 transition hover:border-orange-300/70 hover:text-orange-200"
                              >
                                <Footprints className="h-3 w-3" aria-hidden />
                                Continue Path
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      <time className="flex shrink-0 items-center gap-1 text-xs text-stone-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {stamp.created_at ? new Date(stamp.created_at).toLocaleDateString() : "recent"}
                      </time>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </PassportShell>
  );
}

function PassportShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-200">
          Presence
        </Link>
        {children}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-orange-300" />
    </div>
  );
}

function groupStamps(items: PassportStamp[]) {
  const groups: Record<string, PassportStamp[]> = {
    "Recently entered": [],
    "Saved Rooms": [],
    "Paths walked": [],
    "Field Notes": [],
  };
  for (const item of items) {
    if (item.stamp_type === "saved") groups["Saved Rooms"]!.push(item);
    else if (item.stamp_type === "followed_path" || item.path_id) groups["Paths walked"]!.push(item);
    else if (item.stamp_type === "noted") groups["Field Notes"]!.push(item);
    else groups["Recently entered"]!.push(item);
  }
  return Object.fromEntries(Object.entries(groups).filter(([, value]) => value.length > 0));
}
