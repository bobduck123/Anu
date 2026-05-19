"use client";

// GalleryRoom — the painter's WallPanels world (Pass 3).
//
// Not a portfolio page. The user enters a quiet gallery:
//   THRESHOLD → WALL → WALL TEXT → COMMISSION → NOTES → INVITATION
//
// The wall is a horizontal-scroll panel that the user pulls through
// with pointer drag, scroll-snap, or chamber nav. Each piece is a
// framed wall object with a museum label. The wall text is genuinely a
// wall text — not "About". The commission and invitation chambers are
// portal-style cards, not service grids.

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld, RoomObject } from "@/lib/presence/world/types";
import RoomShell from "@/components/presence/world/RoomShell";
import MagneticHover from "@/components/presence/world/MagneticHover";
import InvitationPortal from "@/components/presence/world/InvitationPortal";

interface GalleryRoomProps {
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

function chamberObjects(world: RoomWorld, chamberId: string, type?: RoomObject["type"]): RoomObject[] {
  return world.room_objects.filter((o) => o.chamber === chamberId && (!type || o.type === type));
}

function HorizontalWall({ pieces }: { pieces: RoomObject[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let isDragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId: number | null = null;
    function onDown(e: PointerEvent) {
      // Skip when starting on a link / button to preserve clicks.
      const t = e.target as HTMLElement;
      if (t.closest("a, button")) return;
      isDragging = true;
      startX = e.clientX;
      startScroll = rail!.scrollLeft;
      pointerId = e.pointerId;
      rail!.setPointerCapture(e.pointerId);
      rail!.classList.add("is-dragging");
    }
    function onMove(e: PointerEvent) {
      if (!isDragging) return;
      rail!.scrollLeft = startScroll - (e.clientX - startX);
    }
    function onUp(e: PointerEvent) {
      if (!isDragging) return;
      isDragging = false;
      if (pointerId !== null) rail!.releasePointerCapture(pointerId);
      rail!.classList.remove("is-dragging");
    }
    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointerleave", onUp);
    return () => {
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointerleave", onUp);
    };
  }, [pieces.length]);

  return (
    <div ref={railRef} className="gallery-wall-rail" role="region" aria-label="Works on the wall">
      <div className="gallery-wall-track">
        {pieces.map((piece, i) => (
          <article
            key={piece.id}
            className="wall-frame"
            data-index={i}
            data-piece-id={piece.id}
          >
            <MagneticHover strength={0.18} maxOffset={10}>
              <a href={piece.href ?? "#"} className="wall-frame-link">
                <div className="wall-frame-mount">
                  {piece.imageUrl ? (
                    <Image
                      src={piece.imageUrl}
                      alt={piece.label ?? "Work"}
                      fill
                      sizes="(max-width: 768px) 80vw, 28vw"
                      className="wall-frame-img"
                      unoptimized={isHttp(piece.imageUrl)}
                    />
                  ) : (
                    <div className="wall-frame-empty" />
                  )}
                </div>
                <figcaption className="wall-frame-label">
                  <span className="catalog">{String(i + 1).padStart(2, "0")}</span>
                  <span className="title">{piece.label}</span>
                  {piece.caption && <span className="meta">{piece.caption}</span>}
                  {piece.meta && <span className="meta">{piece.meta}</span>}
                  {piece.data?.availability ? (
                    <span className="availability">{String(piece.data.availability)}</span>
                  ) : null}
                </figcaption>
              </a>
            </MagneticHover>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function GalleryRoom({ node, dna, theme, world, ctaLabel }: GalleryRoomProps) {
  const wallPieces = chamberObjects(world, "wall", "artwork");
  const commissionObjects = chamberObjects(world, "commission");
  const noteObjects = chamberObjects(world, "notes");
  const story = node.long_story || node.practice_statement || node.bio || node.short_bio || "";

  return (
    <RoomShell
      world={world}
      theme={theme}
      displayName={node.display_name}
      worldEyebrow="A quiet gallery"
      ctaSlot={
        <InvitationPortal
          node={node}
          label={ctaLabel}
          invitationCopy={
            dna.practice.field === "visual_art"
              ? "One commission per year. Begin with a long visit to the room the piece will live in."
              : "Open a direct conversation about this work."
          }
          variant="card"
        />
      }
    >
      {({ activeChamberId, setActiveChamber }) => (
        <>
          {/* Chamber 1: Threshold */}
          <section className="presence-chamber chamber-threshold" data-chamber-id="threshold" aria-label="Threshold">
            <div className="threshold-card">
              <p className="threshold-eyebrow-line">— You are entering</p>
              <h2 className="threshold-h">{node.display_name}</h2>
              {node.headline && <p className="threshold-headline">{node.headline}</p>}
              {node.short_bio && <p className="threshold-blurb">{node.short_bio}</p>}
              <button
                type="button"
                className="threshold-enter"
                onClick={() => setActiveChamber(world.chambers[1]?.id ?? "wall")}
              >
                Enter the gallery <ArrowUpRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </section>

          {/* Chamber 2: Wall */}
          {wallPieces.length > 0 && (
            <section className="presence-chamber chamber-wall" data-chamber-id="wall" aria-label="Works on the wall">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— ii — wall</p>
                <h2 className="chamber-h">Works hung this season</h2>
                <p className="chamber-sub">Pull the wall along. Tap a piece to see it on its own.</p>
              </div>
              <HorizontalWall pieces={wallPieces} />
            </section>
          )}

          {/* Chamber 3: Wall text (statement) */}
          {story && (
            <section className="presence-chamber chamber-wall-text" data-chamber-id="statement" aria-label="Wall text">
              <article className="wall-text-block">
                <p className="chamber-eyebrow">— iii — wall text</p>
                <p className="wall-text-prose">{story}</p>
              </article>
            </section>
          )}

          {/* Chamber 4: Commission */}
          {commissionObjects.length > 0 && (
            <section className="presence-chamber chamber-commission" data-chamber-id="commission" aria-label="Commission">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— iv — commission</p>
                <h2 className="chamber-h">Begin a commission</h2>
              </div>
              <ul className="commission-stack">
                {commissionObjects.filter((o) => o.type === "service").map((service, i) => (
                  <li key={service.id} className="commission-card">
                    <span className="commission-step">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{service.label}</h3>
                      {service.caption && <p className="commission-desc">{service.caption}</p>}
                      {service.meta && <p className="commission-meta">{service.meta}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Chamber 5: Collector notes */}
          {noteObjects.length > 0 && (
            <section className="presence-chamber chamber-notes" data-chamber-id="notes" aria-label="Collector notes">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— v — collector notes</p>
                <h2 className="chamber-h">Held by</h2>
              </div>
              <div className="notes-pinboard">
                {noteObjects.filter((o) => o.type === "testimonial").map((note, i) => (
                  <blockquote
                    key={note.id}
                    className="note-card"
                    style={{ ["--note-tilt" as string]: `${(i % 2 === 0 ? -1 : 1) * (0.6 + (i % 3) * 0.4)}deg` }}
                  >
                    <p>"{note.caption}"</p>
                    {(note.label || note.meta) && (
                      <footer>
                        {note.label}
                        {note.meta ? ` · ${note.meta}` : ""}
                      </footer>
                    )}
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* Chamber 6: Invitation */}
          <section className="presence-chamber chamber-invitation" data-chamber-id="invitation" aria-label="Invitation">
            <InvitationPortal
              node={node}
              label={ctaLabel}
              invitationCopy="A commission begins with a long, unhurried visit. We make the work after."
              variant="door"
            />
          </section>
        </>
      )}
    </RoomShell>
  );
}
