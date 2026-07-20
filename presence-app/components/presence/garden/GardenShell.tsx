"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PresenceBrandmark } from "./primitives";
import { TeleportMenu } from "./TeleportMenu";

export function GardenShell({
  eyebrow = "Gardens · Observer",
  children,
  showTeleport = true,
  topRight,
}: {
  eyebrow?: ReactNode;
  children: ReactNode;
  showTeleport?: boolean;
  topRight?: ReactNode;
}) {
  return (
    <div className="garden-shell">
      <header className="garden-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PresenceBrandmark />
          {eyebrow && (
            <span
              className="presence-eyebrow"
              style={{ display: "none", paddingLeft: 14, borderLeft: "1px solid var(--presence-rule)" }}
              data-show-on-md
            >
              {eyebrow}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {topRight}
          {showTeleport && <TeleportMenu />}
        </div>
      </header>
      <main>{children}</main>
      <footer
        style={{
          borderTop: "1px solid var(--presence-rule)",
          padding: "32px 24px",
          background: "var(--presence-paper-2)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--presence-f-display)", fontSize: 20, letterSpacing: "-0.01em", color: "var(--presence-ink)" }}>
              Presence
            </div>
            <p className="presence-eyebrow" style={{ marginTop: 8 }}>
              Not a profile · a place people can enter
            </p>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "var(--presence-on-paper-mute)" }}>
            <Link href="/observer/garden" style={{ color: "inherit" }}>Garden</Link>
            <Link href="/observer/passport" style={{ color: "inherit" }}>Passport</Link>
            <Link href="/observer/mood-boards" style={{ color: "inherit" }}>Mood Boards</Link>
            <Link href="/halls" style={{ color: "inherit" }}>Halls</Link>
            <Link href="/world" style={{ color: "inherit" }}>World</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
