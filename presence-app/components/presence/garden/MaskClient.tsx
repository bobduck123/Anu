"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Compass, Footprints, Loader2, MapPin, Sparkles } from "lucide-react";
import { getPublicMask } from "@/lib/api/gardens";
import { PresenceApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { Observation, PublicMask } from "@/lib/api/types";
import { GardenShell } from "./GardenShell";
import { ObservationCard } from "./ObservationCard";
import { SeedCard } from "./SeedCard";
import {
  PresenceButton,
  PresenceChip,
  PresenceEmpty,
  PresenceEyebrow,
  PresenceSectionHead,
} from "./primitives";

export function MaskClient({ alias }: { alias: string }) {
  const [mask, setMask] = useState<PublicMask | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setToken(session?.access_token ?? null);

      try {
        const result = await getPublicMask(alias);
        if (!cancelled) setMask(result);
      } catch (err) {
        if (err instanceof PresenceApiError && err.status === 404) {
          if (!cancelled) setMissing(true);
        } else if (err instanceof PresenceApiError && (err.code === "endpoint_unavailable" || err.code === "network_error")) {
          // Backend not deployed yet — show a structural empty Mask
          if (!cancelled) {
            setMask({
              observer: {
                id: 0,
                alias,
                mask_name: alias,
                avatar_key: alias.slice(0, 1).toUpperCase(),
                visibility: "public_mask",
                self_promotion_locked: true,
                status: "active",
              },
              recent_observations: [],
              echoes: [],
              public_mood_boards: [],
            });
          }
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open this Mask.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [alias]);

  if (loading) {
    return (
      <GardenShell eyebrow={`Mask · ${alias}`}>
        <div style={{ display: "flex", minHeight: 320, alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={28} className="animate-spin" />
        </div>
      </GardenShell>
    );
  }

  if (missing) {
    return (
      <GardenShell eyebrow="Mask · unknown">
        <section className="presence-section">
          <PresenceEyebrow>This Mask hasn’t been worn yet</PresenceEyebrow>
          <h1 className="presence-display" style={{ fontSize: "clamp(32px, 5vw, 56px)", margin: "16px 0 14px" }}>
            “{alias}” isn’t a Mask we know.
          </h1>
          <p style={{ maxWidth: "52ch", color: "var(--presence-on-paper-mute)" }}>
            Aliases are how Observers move through Gardens. If the link came from someone in your shared space,
            ask them to share their Mask again.
          </p>
          <div style={{ marginTop: 22 }}>
            <PresenceButton href="/observer/garden" tone="accent">Open my Garden</PresenceButton>
          </div>
        </section>
      </GardenShell>
    );
  }

  if (!mask) {
    return (
      <GardenShell>
        <section className="presence-section">
          <PresenceEmpty title="Couldn’t open this Mask." body={error ?? "Try again in a moment."} />
        </section>
      </GardenShell>
    );
  }

  const observer = mask.observer;
  const avatarChar = observer.mask_name?.slice(0, 1).toUpperCase() ?? observer.alias.slice(0, 1).toUpperCase();
  const isPrivate = observer.visibility === "private";

  if (isPrivate) {
    return (
      <GardenShell eyebrow="Mask · private">
        <section className="presence-section">
          <PresenceEyebrow>Private Mask</PresenceEyebrow>
          <h1 className="presence-display" style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "16px 0 12px" }}>
            “{observer.alias}” is moving quietly.
          </h1>
          <p style={{ color: "var(--presence-on-paper-mute)", maxWidth: "50ch" }}>
            This Observer’s Garden isn’t public. Cross paths in a Hall or Room to be seen together.
          </p>
          <div style={{ marginTop: 22 }}>
            <PresenceButton href="/halls" variant="ghost">
              Find Halls
            </PresenceButton>
          </div>
        </section>
      </GardenShell>
    );
  }

  return (
    <GardenShell eyebrow={`Mask · ${observer.alias}`}>
      <header className="mask-header presence-grain">
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 28, gridTemplateColumns: "minmax(0, 1fr)", alignItems: "end" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="mask-avatar" aria-hidden>
              {avatarChar}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <PresenceEyebrow>Mask · Garden</PresenceEyebrow>
              <h1 className="mask-alias presence-display" style={{ margin: "10px 0 8px" }}>
                {observer.mask_name || observer.alias}
              </h1>
              {observer.bio_fragment && <p className="mask-status">“{observer.bio_fragment}”</p>}
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PresenceChip tone="accent">@{observer.alias}</PresenceChip>
                {mask.current_path_label && <PresenceChip>On a Path · {mask.current_path_label}</PresenceChip>}
                {observer.visibility === "public_mask" && <PresenceChip>Public Mask</PresenceChip>}
              </div>
            </div>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--presence-f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--presence-on-paper-dim)",
            }}
            aria-label="Self-promotion guardrail"
          >
            {PRESENCE_GRAPH_COPY.selfPromotionMaskGuardrail.split(".")[0]}.
          </p>
        </div>
      </header>

      {mask.pinned_observation && (
        <section className="presence-section" style={{ paddingTop: 48 }}>
          <PresenceSectionHead num="01" label="Pinned Observation" title="Pinned." blurb="What this Mask wants you to read first." />
          <ObservationCard observation={mask.pinned_observation} token={token} variant="pinned" />
        </section>
      )}

      <section className="presence-section" style={{ paddingTop: mask.pinned_observation ? 0 : 48 }}>
        <PresenceSectionHead
          num={mask.pinned_observation ? "02" : "01"}
          label="Observations"
          title={<>Recent <em>Observations</em>.</>}
          blurb={PRESENCE_GRAPH_COPY.observations}
        />
        {mask.recent_observations.length === 0 ? (
          <PresenceEmpty
            title="Quiet so far."
            body="When this Mask shares an Observation, it will appear here."
          />
        ) : (
          <div className="garden-grid is-wide">
            {mask.recent_observations.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} token={token} />
            ))}
          </div>
        )}
      </section>

      {mask.echoes && mask.echoes.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead
            num="03"
            label="Echoes"
            title="Echoes."
            blurb="What this Mask has carried back into their Garden."
          />
          <div className="garden-grid is-wide">
            {mask.echoes.map((obs: Observation) => (
              <ObservationCard key={obs.id} observation={obs} token={token} />
            ))}
          </div>
        </section>
      )}

      {mask.public_mood_boards && mask.public_mood_boards.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead
            num="04"
            label="Mood Boards"
            title="Maps of taste."
            blurb={PRESENCE_GRAPH_COPY.moodBoard}
          />
          <div className="garden-grid">
            {mask.public_mood_boards.map((board) => (
              <article className="presence-card" key={board.id} style={{ padding: 18 }}>
                <PresenceEyebrow>{board.board_type.replace(/_/g, " ")}</PresenceEyebrow>
                <p
                  className="presence-display"
                  style={{ margin: "8px 0 0", fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.01em" }}
                >
                  <Link href={`/observer/mood-boards/${board.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {board.title}
                  </Link>
                </p>
                {board.description && (
                  <p style={{ margin: "10px 0 0", color: "var(--presence-on-paper-mute)", fontSize: 13, lineHeight: 1.55 }}>
                    {board.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {mask.rooms_returned_to && mask.rooms_returned_to.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead
            num="05"
            label="Rooms returned to"
            title="Rooms this Mask returns to."
            blurb="Storefronts in this Mask's orbit. Visit them — they’ve been seen more than once."
          />
          <div className="garden-grid">
            {mask.rooms_returned_to.map((room) => (
              <Link
                key={room.slug}
                href={`/presence/${room.slug}`}
                className="presence-card is-tappable"
                style={{ display: "flex", flexDirection: "column", gap: 8, padding: 18, textDecoration: "none", color: "inherit" }}
              >
                <PresenceEyebrow>Room</PresenceEyebrow>
                <p
                  className="presence-display"
                  style={{ margin: 0, fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.01em" }}
                >
                  {room.display_name}
                </p>
                <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--rooms-accent)" }}>
                  <MapPin size={12} aria-hidden /> Enter Room <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {mask.seeds_kept_close && mask.seeds_kept_close.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead
            num="06"
            label="Seeds kept close"
            title="Seeds this Mask keeps close."
            blurb="Public Seeds — the people, Rooms, Halls and Paths they tend."
          />
          <div className="garden-grid">
            {mask.seeds_kept_close.map((seed) => (
              <SeedCard key={seed.id} seed={seed} token={token} compact />
            ))}
          </div>
        </section>
      )}

      {mask.guestbook_enabled && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead
            num="07"
            label="Guestbook"
            title="Leave a Field Note."
            blurb="A short, public message for this Mask. Not a DM — a guestbook entry."
          />
          <PresenceEmpty
            title="Guestbook is open."
            body="Field Notes from your Observer Mask can be left here next pass."
            actions={
              <PresenceButton href="/observer/mood-boards" variant="ghost" size="small">
                Start with a Mood Board
              </PresenceButton>
            }
          />
        </section>
      )}

      <section className="presence-section" style={{ paddingTop: 0 }}>
        <p
          style={{
            margin: 0,
            padding: "20px 24px",
            border: "1px dashed var(--presence-rule-strong)",
            borderRadius: "var(--presence-r-2)",
            background: "color-mix(in oklab, var(--garden-accent) 5%, var(--presence-paper))",
            color: "var(--presence-on-paper-mute)",
            fontSize: 13.5,
            lineHeight: 1.55,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <Sparkles size={16} style={{ marginTop: 2, color: "var(--garden-accent)" }} aria-hidden />
          <span style={{ flex: 1, minWidth: 0 }}>
            {PRESENCE_GRAPH_COPY.selfPromotionMaskGuardrail}{" "}
            <Link href="/presence-chooser" style={{ color: "var(--rooms-accent)", fontWeight: 500 }}>
              Open a Presence Room
            </Link>
            .
          </span>
        </p>
      </section>
    </GardenShell>
  );
}
