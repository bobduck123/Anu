"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, DoorOpen, Loader2, LogOut, MapPin, Users } from "lucide-react";
import {
  getHall,
  getHallObservations,
  getHallParticipants,
  joinHall,
  joinHallAsGuest,
  leaveHall,
} from "@/lib/api/halls";
import { PresenceApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import {
  HALL_TYPE_DESCRIPTIONS,
  PRESENCE_GRAPH_COPY,
  hallTypeLabel,
} from "@/lib/presence/graph/copy";
import type { HallParticipant, Observation, PresenceHall } from "@/lib/api/types";
import { ObservationCard } from "../garden/ObservationCard";
import { ObservationComposer } from "../garden/ObservationComposer";
import { PresenceButton, PresenceChip, PresenceEmpty, PresenceEyebrow, PresenceSectionHead } from "../garden/primitives";
import { HallShell } from "./HallShell";
import { HallPortalCard, HallStallCard, HallZoneGrid } from "./HallZoneCards";

const POLL_INTERVAL_MS = 18_000;

export function HallDetailClient({ slug }: { slug: string }) {
  const [hall, setHall] = useState<PresenceHall | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [participants, setParticipants] = useState<HallParticipant[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const tokenRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const fetchAll = useCallback(async (initial = false) => {
    try {
      const result = await getHall(slug, tokenRef.current);
      if (mountedRef.current) {
        setHall(result);
        if (result.recent_observations) setObservations(result.recent_observations);
      }
    } catch (err) {
      if (err instanceof PresenceApiError && err.status === 404) {
        if (mountedRef.current) setMissing(true);
      } else if (err instanceof PresenceApiError && err.status === 403) {
        if (mountedRef.current) setAccessDenied(true);
      } else if (
        err instanceof PresenceApiError &&
        (err.code === "endpoint_unavailable" || err.code === "network_error") &&
        initial
      ) {
        if (mountedRef.current) {
          setHall(buildPlaceholderHall(slug));
          setObservations([]);
        }
      } else if (initial && mountedRef.current) {
        setError(err instanceof Error ? err.message : "Could not open this Hall.");
      }
      return;
    }
    try {
      const ps = await getHallParticipants(slug, tokenRef.current);
      if (mountedRef.current) setParticipants(ps.items);
    } catch {
      // best effort
    }
    try {
      const os = await getHallObservations(slug, tokenRef.current);
      if (mountedRef.current && os.items.length > 0) setObservations(os.items);
    } catch {
      // best effort
    }
  }, [slug]);

  useEffect(() => {
    mountedRef.current = true;
    async function bootstrap() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      tokenRef.current = session?.access_token ?? null;
      if (mountedRef.current) setToken(tokenRef.current);
      await fetchAll(true);
      if (mountedRef.current) setLoading(false);
    }
    void bootstrap();
    const id = setInterval(() => {
      void fetchAll(false);
    }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAll]);

  async function handleJoin() {
    setJoinBusy(true);
    setError(null);
    try {
      // The contract allows guest joins on public / unlisted Halls. We try
      // an Observer-Mask join first if we have a token, otherwise fall back
      // to a guest join. Persistent social actions still require the Mask.
      const status = token
        ? await joinHall(slug, token)
        : await joinHallAsGuest(slug);
      setJoined(status.joined);
      void fetchAll(false);
    } catch (err) {
      if (err instanceof PresenceApiError && (err.code === "endpoint_unavailable" || err.code === "network_error")) {
        setJoined(true);
      } else if (err instanceof PresenceApiError && err.status === 401 && !token) {
        // Some hosts may refuse guest joins; tell the visitor to create a Mask.
        setError("Create an Observer Mask to join this Hall.");
      } else {
        setError(err instanceof Error ? err.message : "Could not join this Hall.");
      }
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleLeave() {
    if (!token) return;
    setJoinBusy(true);
    try {
      const status = await leaveHall(slug, token);
      setJoined(status.joined);
      void fetchAll(false);
    } catch {
      setJoined(false);
    } finally {
      setJoinBusy(false);
    }
  }

  if (loading) {
    return (
      <HallShell eyebrow={`Hall · ${slug}`}>
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={28} className="animate-spin" />
        </div>
      </HallShell>
    );
  }

  if (missing) {
    return (
      <HallShell eyebrow="Hall · unknown">
        <section className="presence-section">
          <PresenceEyebrow onStage>Not found</PresenceEyebrow>
          <h1 className="presence-display" style={{ color: "var(--presence-on-stage)", fontSize: "clamp(32px, 5vw, 56px)", margin: "16px 0 12px" }}>
            No Hall by that door.
          </h1>
          <PresenceButton href="/halls" variant="ghost" onStage>Back to all Halls</PresenceButton>
        </section>
      </HallShell>
    );
  }

  if (accessDenied) {
    return (
      <HallShell eyebrow="Hall · private">
        <section className="presence-section">
          <PresenceEyebrow onStage>Invite only</PresenceEyebrow>
          <h1 className="presence-display" style={{ color: "var(--presence-on-stage)", fontSize: "clamp(32px, 5vw, 56px)", margin: "16px 0 12px" }}>
            This Hall is closed to outsiders.
          </h1>
          <p style={{ color: "var(--presence-on-stage-mute)", maxWidth: "52ch" }}>
            Ask the host for an invite to step inside.
          </p>
          <PresenceButton href="/halls" variant="ghost" onStage>Browse other Halls</PresenceButton>
        </section>
      </HallShell>
    );
  }

  if (!hall) return null;

  const zones = hall.zones ?? [];
  const stalls = hall.stalls ?? [];
  const portals = hall.portals ?? [];
  const noticeboard = hall.noticeboard ?? [];
  const sessions = hall.sessions ?? [];
  const isLive = hall.status === "live";
  const youJoined = joined; // mirror state; backend will return true on re-fetch

  return (
    <HallShell
      eyebrow={`Hall · ${hallTypeLabel(hall.hall_type)}`}
      topRight={
        // Top-bar Join lives at md+ widths; the sticky mobile action bar at
        // the foot of the page handles small viewports so the top frame
        // doesn't overflow on phones.
        <div className="hall-top-join" style={{ display: "none", gap: 8 }}>
          {youJoined ? (
            <button type="button" className="presence-btn is-ghost on-stage" onClick={handleLeave} disabled={joinBusy}>
              <LogOut size={14} aria-hidden />
              {joinBusy ? "Leaving…" : PRESENCE_GRAPH_COPY.hallLeave}
            </button>
          ) : (
            <button type="button" className="presence-btn is-halls" onClick={handleJoin} disabled={joinBusy}>
              <DoorOpen size={14} aria-hidden />
              {joinBusy ? "Joining…" : PRESENCE_GRAPH_COPY.hallJoin}
            </button>
          )}
        </div>
      }
    >
      <header className="presence-section" style={{ paddingTop: 56 }}>
        <PresenceEyebrow onStage>
          {hallTypeLabel(hall.hall_type)}
          {hall.host_room_display_name && (
            <>
              {" · Hosted by "}
              {hall.host_room_slug ? (
                <Link href={`/presence/${hall.host_room_slug}`} style={{ color: "var(--halls-accent)", textDecoration: "none" }}>
                  {hall.host_room_display_name}
                </Link>
              ) : (
                hall.host_room_display_name
              )}
            </>
          )}
        </PresenceEyebrow>
        <h1
          className="presence-display"
          style={{
            margin: "16px 0 14px",
            fontSize: "clamp(40px, 6vw, 80px)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "var(--presence-on-stage)",
            textWrap: "balance",
          }}
        >
          {hall.title}
        </h1>
        {hall.description && (
          <p style={{ maxWidth: "60ch", color: "var(--presence-on-stage-mute)", fontSize: 16, lineHeight: 1.55 }}>
            {hall.description}
          </p>
        )}
        <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PresenceChip tone="halls" live={isLive}>{isLive ? "Live" : hall.status === "scheduled" ? "Soon" : hall.status === "ended" ? "Ended" : hall.status}</PresenceChip>
          <PresenceChip tone="dark"><Users size={10} aria-hidden /> {hall.participants_count ?? participants.length} present</PresenceChip>
          <PresenceChip tone="dark">{hall.visibility === "public" ? "Open" : hall.visibility === "unlisted" ? "Unlisted" : "Invite"}</PresenceChip>
        </div>
        <p
          style={{
            marginTop: 14,
            fontStyle: "italic",
            color: "var(--presence-on-stage-mute)",
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: "56ch",
          }}
        >
          {HALL_TYPE_DESCRIPTIONS[hall.hall_type] ?? "Shared space"}
        </p>
      </header>

      {error && (
        <div className="presence-section" style={{ paddingTop: 0 }}>
          <p
            role="status"
            style={{
              padding: 12,
              border: "1px solid color-mix(in oklab, var(--halls-accent) 40%, transparent)",
              background: "color-mix(in oklab, var(--halls-accent) 8%, transparent)",
              color: "var(--presence-on-stage)",
              borderRadius: 2,
            }}
          >
            {error}
          </p>
        </div>
      )}

      <section className="presence-section" style={{ paddingTop: 0 }}>
        <PresenceSectionHead
          num="01"
          label="Hall map"
          title="Zones."
          blurb="Where you can stand in this Hall. Teleport between Lobby, Stage, Tables, Stalls, Noticeboard, and Portals."
        />
        <HallZoneGrid zones={zones} hallSlug={slug} />
      </section>

      {stalls.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }} id="zone-stalls">
          <PresenceSectionHead
            num="02"
            label="Market"
            title="Stalls."
            blurb="Each Stall is a Presence Room you can step into without leaving the Hall."
          />
          <div className="garden-grid is-wide">
            {stalls.map((stall) => (
              <HallStallCard key={stall.id} stall={stall} hallSlug={slug} />
            ))}
          </div>
        </section>
      )}

      {portals.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }} id="zone-portals">
          <PresenceSectionHead num="03" label="Portals" title="Where you can go next." blurb="Doors out of this Hall — into Rooms, Gardens, Paths, or other Halls." />
          <div className="garden-grid">
            {portals.map((portal) => (
              <HallPortalCard key={portal.id} portal={portal} hallSlug={slug} />
            ))}
          </div>
        </section>
      )}

      <section className="presence-section" style={{ paddingTop: 0 }} id="zone-noticeboard">
        <PresenceSectionHead
          num="04"
          label="Noticeboard"
          title="What's being said."
          blurb={PRESENCE_GRAPH_COPY.observations}
        />
        {youJoined && (
          <div style={{ marginBottom: 18 }}>
            <ObservationComposer
              token={token}
              contextLabel={hall.title}
              hallId={hall.id}
              source={{ source_kind: "hall", source_id: hall.id, source_slug: hall.slug }}
              defaultKind="hall"
              onPosted={(obs) => setObservations((prev) => [obs, ...prev])}
            />
          </div>
        )}
        {!youJoined && (
          <p
            style={{
              margin: "0 0 18px",
              padding: "12px 14px",
              border: "1px dashed var(--presence-rule-dark)",
              borderRadius: 2,
              color: "var(--presence-on-stage-mute)",
              fontSize: 13,
              background: "var(--presence-stage-2)",
            }}
          >
            Join the Hall to post on the Noticeboard.
          </p>
        )}
        {noticeboard.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {noticeboard.map((obs) => (
              <div key={`pin-${obs.id}`} style={{ marginBottom: 10 }}>
                <ObservationCard observation={obs} token={token} variant="pinned" />
              </div>
            ))}
          </div>
        )}
        {observations.length === 0 ? (
          <PresenceEmpty
            title="Nothing pinned yet."
            body={youJoined ? "Share the first Observation about this gathering." : "Once Observers in the Hall start talking, you'll see what was noticed here."}
          />
        ) : (
          <div className="garden-grid is-wide">
            {observations.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} token={token} />
            ))}
          </div>
        )}
      </section>

      {sessions.length > 0 && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <PresenceSectionHead num="05" label="Sessions" title="Programme." blurb="What is scheduled to happen in this Hall, in order." />
          <div className="garden-grid">
            {sessions.map((s) => (
              <article key={s.id} className="hall-zone" data-kind="stage">
                <span className="zone-eyebrow">Session</span>
                <h3 className="zone-title">{s.title}</h3>
                {s.description && <p className="zone-blurb">{s.description}</p>}
                {s.starts_at && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--presence-on-stage-dim)", fontFamily: "var(--presence-f-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {new Date(s.starts_at).toLocaleString()}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="presence-section" style={{ paddingTop: 0 }}>
        <PresenceSectionHead num="06" label="Currently here" title="Masks in the Hall." blurb={youJoined ? "These Masks have joined this gathering." : "Join to see who's here."} />
        {participants.length === 0 ? (
          <PresenceEmpty title="Quiet so far." body="The Hall is empty. Be the first to step in." />
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {participants.slice(0, 24).map((p) => (
              <Link
                key={p.id}
                href={p.alias ? `/m/${p.alias}` : "#"}
                className="participant-pill"
                style={{ textDecoration: "none" }}
                aria-label={`${p.mask_name || p.alias || "Mask"} — ${p.role}`}
              >
                <span className="avatar">{(p.mask_name || p.alias || "·").slice(0, 1).toUpperCase()}</span>
                <span>{p.mask_name || p.alias || "Mask"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {hall.host_room_slug && (
        <section className="presence-section" style={{ paddingTop: 0 }}>
          <div
            className="hall-card"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <PresenceEyebrow onStage>Hall to Room</PresenceEyebrow>
            <p className="presence-display" style={{ color: "var(--presence-on-stage)", margin: 0, fontSize: "clamp(22px, 3vw, 32px)" }}>
              Visit the Room behind this Hall.
            </p>
            <p style={{ color: "var(--presence-on-stage-mute)", margin: 0, fontSize: 14 }}>
              {hall.host_room_display_name} hosts this gathering. Step into the Room to learn more.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/presence/${hall.host_room_slug}`} className="presence-btn is-halls">
                <MapPin size={14} aria-hidden /> Enter {hall.host_room_display_name ?? "Room"}
              </Link>
              <Link href={`/paths/from-hall/${hall.id}`} className="presence-btn is-ghost on-stage">
                <ArrowRight size={14} aria-hidden /> Walk a Path from this Hall
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky action bar */}
      <div
        className="presence-actionbar"
        style={{ display: "flex", position: "sticky", bottom: 0 }}
        role="region"
        aria-label="Hall actions"
      >
        {youJoined ? (
          <button type="button" className="presence-btn is-ghost on-stage" onClick={handleLeave} disabled={joinBusy}>
            <LogOut size={14} aria-hidden /> Leave
          </button>
        ) : (
          <button type="button" className="presence-btn is-halls" onClick={handleJoin} disabled={joinBusy}>
            <DoorOpen size={14} aria-hidden /> Join
          </button>
        )}
        {hall.host_room_slug && (
          <Link href={`/presence/${hall.host_room_slug}`} className="presence-btn is-ghost on-stage">
            Room
          </Link>
        )}
      </div>
    </HallShell>
  );
}

function buildPlaceholderHall(slug: string): PresenceHall {
  return {
    id: 0,
    slug,
    title: "Hall is preparing",
    description: "This Hall's backend is wiring up. Zones, Stalls, and the Noticeboard will appear as data arrives.",
    hall_type: "town_hall",
    status: "scheduled",
    visibility: "public",
    participants_count: 0,
    observations_count: 0,
    zones: [
      { id: -1, hall_id: 0, zone_kind: "lobby", title: "Lobby", blurb: "A soft entry. Look around.", order_index: 0 },
      { id: -2, hall_id: 0, zone_kind: "stage", title: "Stage", blurb: "Where the talk happens.", order_index: 1 },
      { id: -3, hall_id: 0, zone_kind: "table", title: "A Table", blurb: "Smaller conversation.", order_index: 2 },
      { id: -4, hall_id: 0, zone_kind: "noticeboard", title: "Noticeboard", blurb: "Pinned Observations and calls.", order_index: 3 },
    ],
  };
}
