"use client";

import Link from "next/link";
import { ArrowRight, DoorOpen, MapPin, MessageSquare, Mic, NotebookText, Users } from "lucide-react";
import {
  HALL_ZONE_BLURBS,
  hallZoneLabel,
} from "@/lib/presence/graph/copy";
import { trackPortalClick, trackStallVisit } from "@/lib/api/halls";
import type { HallPortal, HallStall, HallZone } from "@/lib/api/types";
import { PresenceChip } from "../garden/primitives";

const ZONE_ICONS = {
  lobby: DoorOpen,
  stage: Mic,
  table: MessageSquare,
  stall: MapPin,
  noticeboard: NotebookText,
  portal: ArrowRight,
} as const;

export function HallZoneGrid({
  zones,
  hallSlug,
}: {
  zones: HallZone[];
  hallSlug: string;
}) {
  if (zones.length === 0) {
    return (
      <div className="presence-empty">
        <p className="presence-eyebrow on-stage">No zones yet</p>
        <p className="garden-section-title presence-display" style={{ margin: 0, color: "var(--presence-on-stage)" }}>
          This Hall has no shape yet.
        </p>
        <p style={{ color: "var(--presence-on-stage-mute)", fontSize: 14, margin: 0 }}>
          The host can add a Lobby, a Stage, Tables, Stalls, a Noticeboard, and Portals from the Hall Studio.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      }}
    >
      {zones.map((zone) => (
        <HallZoneCard key={zone.id} zone={zone} hallSlug={hallSlug} />
      ))}
    </div>
  );
}

export function HallZoneCard({ zone, hallSlug }: { zone: HallZone; hallSlug: string }) {
  const Icon = (ZONE_ICONS as Record<string, typeof ZONE_ICONS.stage>)[zone.zone_kind] ?? DoorOpen;
  const blurb = zone.blurb ?? HALL_ZONE_BLURBS[zone.zone_kind] ?? "";

  const href = (() => {
    if (zone.links_to_kind === "room" && zone.links_to_slug) return `/presence/${zone.links_to_slug}`;
    if (zone.links_to_kind === "hall" && zone.links_to_slug) return `/halls/${zone.links_to_slug}`;
    if (zone.links_to_kind === "path" && zone.links_to_id) return `/paths/${zone.links_to_id}`;
    if (zone.links_to_kind === "mood_board" && zone.links_to_id) return `/observer/mood-boards/${zone.links_to_id}`;
    if (zone.links_to_kind === "garden" && zone.links_to_slug) return `/m/${zone.links_to_slug}`;
    return null;
  })();

  const content = (
    <>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="zone-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon size={12} aria-hidden /> {hallZoneLabel(zone.zone_kind)}
        </span>
        {typeof zone.participants_here === "number" && zone.participants_here > 0 && (
          <PresenceChip tone="dark">
            <Users size={10} aria-hidden /> {zone.participants_here}
          </PresenceChip>
        )}
      </header>
      <h3 className="zone-title">{zone.title}</h3>
      {blurb && <p className="zone-blurb">{blurb}</p>}
      {href && (
        <p
          style={{
            margin: 0,
            marginTop: "auto",
            fontSize: 12,
            color: "var(--halls-accent)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {zone.links_to_label ?? "Open"}
          <ArrowRight size={12} aria-hidden />
        </p>
      )}
    </>
  );

  if (zone.zone_kind === "portal" && href) {
    return (
      <a
        className="hall-zone"
        data-kind={zone.zone_kind}
        href={href}
        id={`zone-${zone.zone_kind}`}
        onClick={() => trackPortalClick(hallSlug, zone.id)}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </a>
    );
  }

  if (zone.zone_kind === "stall" && href) {
    return (
      <a
        className="hall-zone"
        data-kind={zone.zone_kind}
        href={href}
        id={`zone-${zone.zone_kind}`}
        onClick={() => trackStallVisit(hallSlug, zone.id)}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </a>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className="hall-zone"
        data-kind={zone.zone_kind}
        id={`zone-${zone.zone_kind}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="hall-zone" data-kind={zone.zone_kind} id={`zone-${zone.zone_kind}`}>
      {content}
    </article>
  );
}

export function HallStallCard({ stall, hallSlug }: { stall: HallStall; hallSlug: string }) {
  return (
    <a
      className="hall-zone"
      data-kind="stall"
      href={`/presence/${stall.room_slug}`}
      onClick={() => trackStallVisit(hallSlug, stall.id)}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <span className="zone-eyebrow"><MapPin size={12} aria-hidden /> Stall</span>
      <h3 className="zone-title">{stall.room_display_name}</h3>
      {stall.short_pitch && <p className="zone-blurb">{stall.short_pitch}</p>}
      <p style={{ margin: 0, marginTop: "auto", fontSize: 12, color: "var(--rooms-accent)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        Enter Room <ArrowRight size={12} aria-hidden />
      </p>
    </a>
  );
}

export function HallPortalCard({ portal, hallSlug }: { portal: HallPortal; hallSlug: string }) {
  const href = (() => {
    if (portal.destination_kind === "room" && portal.destination_slug) return `/presence/${portal.destination_slug}`;
    if (portal.destination_kind === "hall" && portal.destination_slug) return `/halls/${portal.destination_slug}`;
    if (portal.destination_kind === "path" && portal.destination_id) return `/paths/${portal.destination_id}`;
    if (portal.destination_kind === "mood_board" && portal.destination_id) return `/observer/mood-boards/${portal.destination_id}`;
    if (portal.destination_kind === "garden" && portal.destination_slug) return `/m/${portal.destination_slug}`;
    return "#";
  })();

  return (
    <a
      className="hall-zone"
      data-kind="portal"
      href={href}
      onClick={() => trackPortalClick(hallSlug, portal.id)}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <span className="zone-eyebrow"><ArrowRight size={12} aria-hidden /> Portal</span>
      <h3 className="zone-title">{portal.label}</h3>
      <p className="zone-blurb">Walk through to a {portal.destination_kind.replace(/_/g, " ")}.</p>
      <p style={{ margin: 0, marginTop: "auto", fontSize: 12, color: "var(--halls-accent)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        Step through <ArrowRight size={12} aria-hidden />
      </p>
    </a>
  );
}
