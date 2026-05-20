"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, Share2 } from "lucide-react";
import { resolveRoomKey } from "@/lib/api/presenceGraph";
import { PresenceApiError } from "@/lib/api/client";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { RoomKeyEntryPayload } from "@/lib/api/types";
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
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-300" />
          <p className="text-sm text-stone-300">Opening Room...</p>
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
            <AlertCircle className="mb-4 h-8 w-8 text-orange-300" />
            <h1 className="text-2xl font-semibold">This Room Key is no longer active.</h1>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {error || "We could not open this Room Key. Ask the Room owner for a new link or QR code."}
            </p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-300 px-4 py-3 text-sm font-semibold text-stone-950">
              Return to Presence
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const room = payload.room;
  const hero = room.hero_image_url || room.cover_image_url || room.profile_image_url;

  return (
    <main className="min-h-dvh bg-stone-950 text-stone-50">
      <section className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:py-10">
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
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={`/presence/${room.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
                Enter Room
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(payload.public_url)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100"
              >
                <Share2 className="h-4 w-4" />
                Copy/share
              </button>
            </div>
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
        } as React.CSSProperties}
      >
        <PresenceGraphActions node={room} />
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

