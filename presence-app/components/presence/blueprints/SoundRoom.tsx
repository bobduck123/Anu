"use client";

// SoundRoom — the DJ's SpatialChambers world (Pass 3).
//
// Not a performer page. The user enters a nocturnal signal room:
//   THRESHOLD → BOOTH → SIGNAL WALL → ARCHIVE → BOOKING
//
// Audio embeds are objects in the booth. Works (sets, residencies)
// hang as glitch tiles on the signal wall. Long story sits in the
// archive as field-recordings prose. Booking is a direct portal.

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld, RoomObject } from "@/lib/presence/world/types";
import RoomShell from "@/components/presence/world/RoomShell";
import MagneticHover from "@/components/presence/world/MagneticHover";
import InvitationPortal from "@/components/presence/world/InvitationPortal";
import ControlledGlitch from "@/components/presence/behaviours/ControlledGlitch";

interface SoundRoomProps {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  world: RoomWorld;
  ctaLabel: string;
}

function isHttp(src: string) {
  try {
    const u = new URL(src);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function chamberObjects(world: RoomWorld, chamberId: string): RoomObject[] {
  return world.room_objects.filter((o) => o.chamber === chamberId);
}

function mediaSrc(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }
    if (host === "open.spotify.com") return `https://open.spotify.com/embed${url.pathname}`;
    if (host === "soundcloud.com") return `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%23ffd84d`;
  } catch {
    return null;
  }
  return null;
}

export default function SoundRoom({ node, theme, world, ctaLabel }: SoundRoomProps) {
  const boothObjects = chamberObjects(world, "booth");
  const wallObjects = chamberObjects(world, "signal-wall");
  const story = node.long_story || node.bio || "";

  return (
    <RoomShell
      world={world}
      theme={theme}
      displayName={node.display_name}
      worldEyebrow="Nocturnal signal room"
      ctaSlot={
        <InvitationPortal
          node={node}
          label={ctaLabel}
          invitationCopy="Direct enquiries for sets, residencies, takeovers, and recordings."
          variant="door"
          className="sound-cta"
        />
      }
    >
      {({ setActiveChamber }) => (
        <>
          {/* THRESHOLD */}
          <section className="presence-chamber chamber-threshold sound-threshold" data-chamber-id="threshold" aria-label="Threshold">
            <div className="sound-threshold-floor">
              <p className="threshold-eyebrow-line">// signal — booking — room</p>
              <ControlledGlitch intensity={theme.motion_intensity} chroma>
                <h2 className="sound-threshold-name">{node.display_name.toLowerCase()}</h2>
              </ControlledGlitch>
              {node.hero_subtitle && <p className="sound-threshold-line">{node.hero_subtitle}</p>}
              {node.location_label && <p className="sound-threshold-locale">/ {node.location_label}</p>}
              <div className="sound-threshold-actions">
                <button
                  type="button"
                  className="sound-enter"
                  onClick={() => setActiveChamber("booth")}
                >
                  Enter the booth <ArrowUpRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </section>

          {/* BOOTH — audio objects */}
          {boothObjects.length > 0 && (
            <section className="presence-chamber chamber-booth" data-chamber-id="booth" aria-label="Booth">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">// 01 — booth</p>
                <h2 className="chamber-h sound-h">Listen back</h2>
              </div>
              <div className="booth-rack">
                {boothObjects.map((obj) => {
                  const src = obj.audioUrl ? mediaSrc(obj.audioUrl) : null;
                  return (
                    <article key={obj.id} className="booth-deck">
                      <header className="deck-head">
                        <span className="deck-led" aria-hidden />
                        <span className="deck-label">{obj.label}</span>
                      </header>
                      {src ? (
                        <iframe
                          title={obj.label ?? "Media"}
                          src={src}
                          loading="lazy"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          className="deck-frame"
                        />
                      ) : obj.audioUrl ? (
                        <a href={obj.audioUrl} target="_blank" rel="noopener noreferrer" className="deck-link">
                          Open in source ↗
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* SIGNAL WALL — works tiled with glitch shimmer */}
          {wallObjects.length > 0 && (
            <section className="presence-chamber chamber-signal-wall" data-chamber-id="signal-wall" aria-label="Signal wall">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">// 02 — signal wall</p>
                <h2 className="chamber-h sound-h">Rooms played</h2>
              </div>
              <div className="signal-wall-grid">
                {wallObjects.map((tile, i) => (
                  <MagneticHover key={tile.id} strength={0.16} maxOffset={8} tilt>
                    <a href={tile.href ?? "#"} className="signal-tile" data-index={i}>
                      <div className="tile-screen">
                        {tile.imageUrl ? (
                          <Image
                            src={tile.imageUrl}
                            alt={tile.label ?? "Set"}
                            fill
                            sizes="(max-width: 768px) 80vw, 30vw"
                            className="tile-img"
                            unoptimized={isHttp(tile.imageUrl)}
                          />
                        ) : (
                          <div className="tile-empty" />
                        )}
                        <span className="tile-scan" aria-hidden />
                      </div>
                      <div className="tile-meta">
                        <span className="tile-idx">{String(i + 1).padStart(2, "0")}</span>
                        <span className="tile-title">{tile.label}</span>
                        {tile.caption && <span className="tile-sub">{tile.caption}</span>}
                      </div>
                    </a>
                  </MagneticHover>
                ))}
              </div>
            </section>
          )}

          {/* ARCHIVE */}
          {story && (
            <section className="presence-chamber chamber-archive sound-archive" data-chamber-id="archive" aria-label="Archive">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">// 03 — archive</p>
                <h2 className="chamber-h sound-h">Field notes</h2>
              </div>
              <p className="archive-prose">{story}</p>
            </section>
          )}

          {/* BOOKING */}
          <section className="presence-chamber chamber-booking sound-booking" data-chamber-id="booking" aria-label="Booking">
            <div className="chamber-cap">
              <p className="chamber-eyebrow">// 04 — booking</p>
              <h2 className="chamber-h sound-h">Book the room</h2>
            </div>
            <InvitationPortal
              node={node}
              label={ctaLabel}
              invitationCopy="Direct enquiries for sets, residencies, takeovers, and recordings."
              variant="ribbon"
              className="sound-cta-inline"
            />
          </section>
        </>
      )}
    </RoomShell>
  );
}
