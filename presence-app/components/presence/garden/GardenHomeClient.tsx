"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, Sprout } from "lucide-react";
import { getGardenHome } from "@/lib/api/gardens";
import { PresenceApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { buildSignInHref } from "@/lib/auth/returnTo";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { GardenHome, GardenSeed, Observation, SharedSpace } from "@/lib/api/types";
import { GardenShell } from "./GardenShell";
import { ObservationCard } from "./ObservationCard";
import { ObservationComposer } from "./ObservationComposer";
import { SeedCard } from "./SeedCard";
import {
  PresenceButton,
  PresenceChip,
  PresenceEmpty,
  PresenceEyebrow,
  PresenceSectionHead,
} from "./primitives";

type SectionViewMode = "observations" | "seeds" | "shared_spaces" | "rooms";

const SECTION_VIEW: Record<string, SectionViewMode> = {
  new_growth: "observations",
  recently_watered: "seeds",
  crossed_paths: "shared_spaces",
  from_rooms: "observations",
  from_mood_boards: "observations",
  quiet_shoots: "seeds",
  wilting_seeds: "seeds",
  compost: "seeds",
};

const SECTION_NUMBERS: Record<string, string> = {
  new_growth: "01",
  recently_watered: "02",
  crossed_paths: "03",
  from_rooms: "04",
  from_mood_boards: "05",
  quiet_shoots: "06",
  wilting_seeds: "07",
  compost: "08",
};

function fallbackSections(): GardenHome["sections"] {
  return [
    {
      id: "new_growth",
      title: "New Growth",
      blurb: "Fresh Observations from strong Seeds in your Garden.",
      observations: [],
    },
    {
      id: "recently_watered",
      title: "Recently Watered",
      blurb: "Seeds you’ve nurtured this week.",
      seeds: [],
    },
    {
      id: "crossed_paths",
      title: "Crossed Paths",
      blurb: "Masks, Rooms, Halls, and Paths from your recent shared spaces.",
      shared_spaces: [],
    },
    {
      id: "from_rooms",
      title: "From Rooms You Entered",
      blurb: "Observations rooted in places you’ve walked through.",
      observations: [],
    },
    {
      id: "from_mood_boards",
      title: "From Your Mood Boards",
      blurb: "Growth from your maps of taste.",
      observations: [],
    },
    {
      id: "quiet_shoots",
      title: "Quiet Shoots",
      blurb: "Resonant but underexposed Rooms and Masks worth a look.",
      seeds: [],
    },
    {
      id: "wilting_seeds",
      title: "Wilting Seeds",
      blurb: "Fading unless nurtured. Decide what stays in your Garden.",
      seeds: [],
    },
    {
      id: "compost",
      title: "Compost",
      blurb: "Old traces. They keep the soil rich for new growth.",
      seeds: [],
    },
  ];
}

export function GardenHomeClient() {
  const [home, setHome] = useState<GardenHome | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setToken(session.access_token);
    try {
      const result = await getGardenHome(session.access_token);
      setHome(result);
    } catch (err) {
      if (
        err instanceof PresenceApiError &&
        (err.status === 404 || err.code === "endpoint_unavailable" || err.code === "network_error")
      ) {
        // Backend not yet wired — render structural empty so UX is testable.
        setHome({
          observer: {
            id: 0,
            alias: "you",
            visibility: "public_mask",
            self_promotion_locked: false,
            status: "active",
          },
          sections: fallbackSections(),
        });
      } else {
        setError(err instanceof Error ? err.message : "Could not open your Garden.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <GardenShell>
        <div style={{ display: "flex", minHeight: 320, alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={28} className="animate-spin" aria-label="Loading Garden" />
        </div>
      </GardenShell>
    );
  }

  if (authRequired) {
    return (
      <GardenShell>
        <section className="presence-section" style={{ paddingTop: 56 }}>
          <PresenceEyebrow>Gardens · Observer</PresenceEyebrow>
          <h1 className="presence-display" style={{ fontSize: "clamp(40px, 6vw, 72px)", margin: "16px 0 18px" }}>
            Create an Observer Mask<br /><em>to open your Garden.</em>
          </h1>
          <p style={{ maxWidth: "56ch", color: "var(--presence-on-paper-mute)", fontSize: 16, lineHeight: 1.55 }}>
            {PRESENCE_GRAPH_COPY.observerExplainer}
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PresenceButton href={buildSignInHref("/observer/garden")} tone="accent">
              Sign in <ArrowRight size={14} />
            </PresenceButton>
            <PresenceButton href="/gallery" variant="ghost">
              Walk through Rooms first
            </PresenceButton>
          </div>
        </section>
      </GardenShell>
    );
  }

  const sections = home?.sections?.length ? home.sections : fallbackSections();
  const hasAnyContent = sections.some(
    (s) =>
      (s.observations && s.observations.length > 0) ||
      (s.seeds && s.seeds.length > 0) ||
      (s.shared_spaces && s.shared_spaces.length > 0),
  );

  return (
    <GardenShell eyebrow="Gardens · Observer">
      <section className="presence-section" style={{ paddingTop: 56 }}>
        <PresenceEyebrow>Gardens · {home?.observer?.alias ?? "Observer"}</PresenceEyebrow>
        <h1 className="presence-display" style={{ fontSize: "clamp(40px, 6vw, 80px)", margin: "14px 0 16px" }}>
          A Garden, <em>not a feed.</em>
        </h1>
        <p style={{ maxWidth: "56ch", color: "var(--presence-on-paper-mute)", fontSize: 16, lineHeight: 1.55 }}>
          {PRESENCE_GRAPH_COPY.garden}
        </p>
        <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PresenceChip tone="accent">{home?.observer?.alias ?? "you"}</PresenceChip>
          <PresenceChip>Eight sections</PresenceChip>
          <PresenceChip>{home?.observer?.visibility === "public_mask" ? "Public Mask" : "Private"}</PresenceChip>
        </div>
      </section>

      <div className="presence-section" style={{ paddingTop: 0 }}>
        <ObservationComposer token={token} />
      </div>

      {!hasAnyContent && (
        <div className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceEmpty
            eyebrow="Your Garden is fallow"
            title={PRESENCE_GRAPH_COPY.gardenEmpty}
            body="Enter Rooms, walk Paths, save what matters — Seeds will appear here and grow as you tend them."
            actions={
              <>
                <PresenceButton href="/gallery" tone="accent">
                  Find Rooms
                </PresenceButton>
                <PresenceButton href="/halls" variant="ghost">
                  Browse Halls
                </PresenceButton>
              </>
            }
          />
        </div>
      )}

      {error && (
        <div className="presence-section" style={{ paddingTop: 0 }}>
          <p
            role="status"
            style={{
              margin: 0,
              padding: 12,
              border: "1px solid color-mix(in oklab, var(--presence-vermilion) 40%, transparent)",
              background: "color-mix(in oklab, var(--presence-vermilion) 8%, transparent)",
              color: "var(--presence-vermilion)",
              borderRadius: 2,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {sections.map((section) => {
        const view = SECTION_VIEW[section.id] ?? "observations";
        const num = SECTION_NUMBERS[section.id] ?? "··";
        const observations = section.observations ?? [];
        const seeds = section.seeds ?? [];
        const sharedSpaces = section.shared_spaces ?? [];

        const totalItems =
          view === "observations" ? observations.length : view === "shared_spaces" ? sharedSpaces.length : seeds.length;

        return (
          <section className="presence-section" style={{ paddingTop: 0 }} key={section.id} data-section={section.id}>
            <PresenceSectionHead
              num={num}
              label={view === "observations" ? "Observations" : view === "shared_spaces" ? "Crossed paths" : "Seeds"}
              title={section.title}
              blurb={section.blurb}
              aside={
                section.id === "wilting_seeds" && totalItems > 0 ? (
                  <PresenceChip>Nurture or prune</PresenceChip>
                ) : section.id === "compost" && totalItems > 0 ? (
                  <PresenceChip>Old soil</PresenceChip>
                ) : null
              }
            />

            {totalItems === 0 ? (
              <PresenceEmpty
                title={emptyTitleFor(section.id)}
                body={emptyBodyFor(section.id)}
                actions={emptyActionsFor(section.id)}
              />
            ) : view === "observations" ? (
              <div className="garden-grid">
                {observations.map((obs) => (
                  <ObservationCard key={obs.id} observation={obs} token={token} />
                ))}
              </div>
            ) : view === "seeds" ? (
              <div className="garden-grid">
                {seeds.map((seed) => (
                  <SeedCard key={seed.id} seed={seed} token={token} />
                ))}
              </div>
            ) : (
              <div className="garden-grid">
                {sharedSpaces.map((space) => (
                  <SharedSpaceCard key={space.id} space={space} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </GardenShell>
  );
}

function emptyTitleFor(id: string): string {
  switch (id) {
    case "new_growth": return "Nothing new growing yet.";
    case "recently_watered": return "No watered Seeds this week.";
    case "crossed_paths": return "No Crossed Paths yet.";
    case "from_rooms": return "No Rooms entered yet.";
    case "from_mood_boards": return "No Mood Boards shaping growth yet.";
    case "quiet_shoots": return "No quiet shoots to surface.";
    case "wilting_seeds": return "Nothing wilting. Good tending.";
    case "compost": return "Compost is empty.";
    default: return "Quiet.";
  }
}

function emptyBodyFor(id: string): string {
  switch (id) {
    case "new_growth": return "Enter Rooms, walk Paths, and the freshest Observations from your Seeds will appear here.";
    case "recently_watered": return "Nurture Seeds when you find them and they’ll show up here.";
    case "crossed_paths": return "Rooms, Halls, and Masks you keep brushing past will collect here.";
    case "from_rooms": return "Save Rooms in your Passport and their Observations will surface here.";
    case "from_mood_boards": return "Build a Mood Board, and content shaped by your taste will appear here.";
    case "quiet_shoots": return "Resonant but underexposed Rooms and Masks will surface here once they exist.";
    case "wilting_seeds": return "When a Seed starts fading without care, it’ll show here.";
    case "compost": return "Old, paused, or pruned Seeds compost here. The soil keeps the trace.";
    default: return "";
  }
}

function emptyActionsFor(id: string) {
  if (id === "from_rooms" || id === "new_growth") {
    return (
      <>
        <PresenceButton href="/gallery" variant="ghost" size="small">Find Rooms</PresenceButton>
        <PresenceButton href="/halls" variant="ghost" size="small">Browse Halls</PresenceButton>
      </>
    );
  }
  if (id === "from_mood_boards") {
    return <PresenceButton href="/observer/mood-boards" variant="ghost" size="small">Mood Boards</PresenceButton>;
  }
  return null;
}

function SharedSpaceCard({ space }: { space: SharedSpace }) {
  const href = (() => {
    if (space.other_kind === "mask" && space.other_slug) return `/m/${space.other_slug}`;
    if (space.other_kind === "room" && space.other_slug) return `/presence/${space.other_slug}`;
    if (space.other_kind === "hall" && space.other_slug) return `/halls/${space.other_slug}`;
    if (space.other_kind === "path") return `/paths/${space.other_id}`;
    return null;
  })();

  return (
    <article className="presence-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <PresenceEyebrow>{space.other_kind === "mask" ? "Mask" : space.other_kind === "room" ? "Room" : space.other_kind === "hall" ? "Hall" : "Path"}</PresenceEyebrow>
      <p
        className="presence-display"
        style={{ margin: 0, fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.01em" }}
      >
        {href ? (
          <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
            {space.other_label}
          </Link>
        ) : (
          space.other_label
        )}
      </p>
      {space.context_label && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--presence-on-paper-mute)", lineHeight: 1.55 }}>
          {space.context_label}
        </p>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
        {href && (
          <Link href={href} className="observation-action">
            <Sprout size={14} aria-hidden /> Open
          </Link>
        )}
      </div>
    </article>
  );
}
