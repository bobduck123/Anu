"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { hallTypeLabel } from "@/lib/presence/graph/copy";
import type { PresenceHall } from "@/lib/api/types";
import { PresenceChip } from "../garden/primitives";

function formatStartLabel(hall: PresenceHall): string {
  if (hall.status === "live") return "Live now";
  if (hall.status === "ended") return "Ended";
  if (!hall.starts_at) return "Scheduled";
  const date = new Date(hall.starts_at);
  if (Number.isNaN(date.getTime())) return "Scheduled";
  return date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function HallCard({ hall }: { hall: PresenceHall }) {
  const status = hall.status;
  const isLive = status === "live";

  return (
    <Link
      href={`/halls/${hall.slug}`}
      className="hall-card"
      data-status={status}
      data-hall-type={hall.hall_type}
      aria-label={`${hall.title} — ${hallTypeLabel(hall.hall_type)}`}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <PresenceChip tone={isLive ? "halls" : "dark"} live={isLive}>
          {isLive ? "Live" : status === "scheduled" ? "Soon" : status === "ended" ? "Ended" : status}
        </PresenceChip>
        <PresenceChip tone="dark">{hallTypeLabel(hall.hall_type)}</PresenceChip>
      </header>

      <div>
        <p className="presence-eyebrow on-stage" style={{ marginBottom: 6 }}>
          {hall.host_room_display_name ? `Hosted by ${hall.host_room_display_name}` : "Open Hall"}
        </p>
        <h3
          className="presence-display"
          style={{
            margin: 0,
            fontSize: "clamp(22px, 3vw, 30px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--presence-on-stage)",
          }}
        >
          {hall.title}
        </h3>
      </div>

      {hall.description && (
        <p style={{ margin: 0, color: "var(--presence-on-stage-mute)", fontSize: 14, lineHeight: 1.55 }}>
          {hall.description.length > 140 ? `${hall.description.slice(0, 140)}…` : hall.description}
        </p>
      )}

      <footer style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--presence-on-stage-mute)", fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Users size={12} aria-hidden /> {hall.participants_count ?? 0}
          </span>
          <span aria-hidden>·</span>
          <span style={{ fontFamily: "var(--presence-f-mono)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10.5 }}>
            {formatStartLabel(hall)}
          </span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--halls-accent)", fontSize: 13 }}>
          Enter <ArrowRight size={14} aria-hidden />
        </span>
      </footer>
    </Link>
  );
}
