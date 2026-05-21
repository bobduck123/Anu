"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TeleportMenu } from "../garden/TeleportMenu";
import { PresenceBrandmark } from "../garden/primitives";

export function HallShell({
  eyebrow = "Halls",
  children,
  topRight,
  showTeleport = true,
}: {
  eyebrow?: ReactNode;
  children: ReactNode;
  topRight?: ReactNode;
  showTeleport?: boolean;
}) {
  const teleportSections = [
    {
      label: "Hall zones",
      items: [
        { label: "Lobby", href: "#zone-lobby" },
        { label: "Stage", href: "#zone-stage" },
        { label: "Tables", href: "#zone-tables" },
        { label: "Stalls", href: "#zone-stalls" },
        { label: "Noticeboard", href: "#zone-noticeboard" },
        { label: "Portals", href: "#zone-portals" },
      ],
    },
    {
      label: "Move",
      items: [
        { label: "Halls index", href: "/halls", kbd: "H" },
        { label: "My Garden", href: "/observer/garden", kbd: "G" },
        { label: "Passport", href: "/observer/passport", kbd: "P" },
        { label: "World", href: "/world", kbd: "W" },
      ],
    },
  ];

  return (
    <div className="halls-shell">
      <header className="halls-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PresenceBrandmark onDark />
          {eyebrow && (
            <span className="presence-eyebrow on-stage" style={{ paddingLeft: 14, borderLeft: "1px solid var(--presence-rule-dark)" }}>
              {eyebrow}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {topRight}
          {showTeleport && <TeleportMenu sections={teleportSections} />}
        </div>
      </header>
      <main>{children}</main>
      <footer
        style={{
          borderTop: "1px solid var(--presence-rule-dark)",
          padding: "32px 24px",
          background: "var(--presence-stage-2)",
          color: "var(--presence-on-stage-mute)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--presence-f-display)", fontSize: 20, letterSpacing: "-0.01em", color: "var(--presence-on-stage)" }}>
              Presence Halls
            </div>
            <p className="presence-eyebrow on-stage" style={{ marginTop: 8 }}>
              Where we gather. Not a metaverse — a meeting place.
            </p>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
            <Link href="/halls" style={{ color: "inherit" }}>Halls</Link>
            <Link href="/observer/garden" style={{ color: "inherit" }}>Garden</Link>
            <Link href="/gallery" style={{ color: "inherit" }}>Rooms</Link>
            <Link href="/world" style={{ color: "inherit" }}>World</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
