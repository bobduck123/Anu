"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { AlertCircle, ArrowRight, Loader2, Radio, Share2 } from "lucide-react";
import { resolveRoomKey } from "@/lib/api/presenceGraph";
import { PresenceApiError } from "@/lib/api/client";
import { PRESENCE_GRAPH_COPY, roomKeyTypeLabel } from "@/lib/presence/graph/copy";
import type { RoomKeyEntryPayload } from "@/lib/api/types";
import { isGgmFaithfulRoom } from "@/lib/presence/ggm/activate";
import GgmFaithfulRoom from "@/components/presence/ggm/GgmFaithfulRoom";
import { PresenceGraphActions } from "./PresenceGraphActions";

export function RoomKeyEntry({ token }: { token: string }) {
  const [payload, setPayload] = useState<RoomKeyEntryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveRoomKey(token)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) setError(roomKeyError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-950 px-4 text-stone-50">
        <div className="flex flex-col items-center gap-5 text-center" aria-live="polite">
          {/* A pulsing door-glow rather than a generic spinner — the visitor should feel a Room opening */}
          <div className="relative h-16 w-16">
            <span className="absolute inset-0 animate-ping rounded-full bg-orange-300/30" aria-hidden />
            <span className="absolute inset-2 rounded-full bg-orange-300/70" aria-hidden />
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-stone-950" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Opening Room…</p>
        </div>
      </main>
    );
  }

  if (error || !payload?.room) {
    return (
      <main className="min-h-dvh bg-stone-950 px-4 py-10 text-stone-50">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            Presence
          </Link>
          <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
            <AlertCircle className="mb-4 h-8 w-8 text-orange-300" aria-hidden />
            <h1 className="text-2xl font-semibold">This Room Key is no longer active.</h1>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {error || "We couldn’t open this Room Key. Ask the Room owner for a new link, NFC tap, or QR code."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-4 py-3 text-sm font-semibold text-stone-950">
                Return to Presence
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/presence-chooser" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-100">
                Create a Room
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const room = payload.room;
  const hero = room.hero_image_url || room.cover_image_url || room.profile_image_url;
  const sourceLabel = roomKeyTypeLabel(payload.room_key?.key_type ?? null);
  const campaign = payload.room_key?.campaign_label ?? null;

  // GGM RoomKey entry — render the faithful Room with an "Opened via …"
  // chip at the top instead of the generic dark stone shell. The visitor
  // should immediately see Christina's work, not a Presence-system page.
  if (isGgmFaithfulRoom(room)) {
    return <GgmFaithfulRoom node={room} roomKeySourceLabel={sourceLabel} />;
  }

  return (
    <main className="min-h-dvh bg-stone-950 pb-28 text-stone-50 sm:pb-0">
      <section className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:py-10">
        {/* Source-context chip — the visitor should immediately see WHY they're here */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-orange-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Opened via {sourceLabel}
          </span>
          {campaign && (
            <span className="inline-flex items-center rounded-full border border-stone-700 bg-stone-900/60 px-3 py-1.5 text-xs font-medium text-stone-300">
              {campaign}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
          {PRESENCE_GRAPH_COPY.roomEntry}
        </p>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{room.display_name}</h1>
            {(room.headline || room.short_bio || room.bio) && (
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
                {room.headline || room.short_bio || room.bio}
              </p>
            )}
            {/* Desktop / tablet primary actions — sticky mobile version mirrors these below */}
            <div className="mt-6 hidden flex-col gap-3 sm:flex sm:flex-row">
              <Link
                href={`/presence/${room.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-200"
              >
                Enter Room
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(payload.public_url)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:border-stone-500"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Copy & share
              </button>
            </div>
            <p className="mt-5 text-xs text-stone-500">
              You can enter as a Guest. Saving, Field Notes, and Paths invite you to create an Observer Mask only when you’re ready.
            </p>
          </div>
          <div className="min-h-64 overflow-hidden rounded-3xl border border-stone-800 bg-stone-900">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={room.display_name} className="h-full min-h-64 w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.25),transparent_35%),#1c1917]">
                <span className="text-sm text-stone-400">Room preview</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Action layer — saves, follows, mood boards, field notes, signals, observer prompt */}
      <div
        style={{
          "--room-bg": "#0c0a09",
          "--room-surface": "#1c1917",
          "--room-elevated": "#292524",
          "--room-text": "#fafaf9",
          "--room-muted": "#d6d3d1",
          "--room-border": "#44403c",
          "--room-accent": "#fdba74",
          "--room-accent-text": "#1c1917",
          "--room-soft": "#292524",
        } as CSSProperties}
      >
        <PresenceGraphActions
          node={room}
          captureOnMount={!payload.encounter}
          entryContextOverride={{
            source: payload.room_key?.key_type || "short_link",
            roomKeyToken: token,
            contextLabel: payload.room_key?.campaign_label || null,
          }}
        />
      </div>

      {/* Mobile-only sticky CTA — phones are the main NFC/QR surface; the primary action must always be in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(payload.public_url)}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-stone-700 px-4 text-sm font-semibold text-stone-100"
            aria-label="Copy Room link"
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
          <Link
            href={`/presence/${room.slug}`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 text-sm font-semibold text-stone-950"
          >
            Enter Room
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </main>
  );
}

function roomKeyError(err: unknown) {
  if (err instanceof PresenceApiError) {
    if (err.status === 404 || err.status === 410 || err.status === 423) {
      return "This Room Key is no longer active.";
    }
    return err.message;
  }
  return "This Room Key is no longer active.";
}
