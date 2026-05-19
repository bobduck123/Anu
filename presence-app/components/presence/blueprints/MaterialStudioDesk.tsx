"use client";

// MaterialStudioDesk — the carpenter's DeskSurface world (Pass 3).
//
// Not a tradie page. The user is looking at a working studio surface:
//   WORKBENCH → SHELF → PATHWAY → APPRECIATION → COMMISSION
//
// The workbench is an IsometricCardLayer with the materials board
// pinned to it. The shelf is a row of pieces. The pathway is a numbered
// commission walk. Appreciation is a stack of patron notes laid on the
// desk. Commission is the door out.

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld, RoomObject } from "@/lib/presence/world/types";
import RoomShell from "@/components/presence/world/RoomShell";
import MagneticHover from "@/components/presence/world/MagneticHover";
import IsometricCardLayer from "@/components/presence/world/IsometricCardLayer";
import InvitationPortal from "@/components/presence/world/InvitationPortal";
import MaterialsBoard from "@/components/presence/signatures/MaterialsBoard";

interface MaterialStudioDeskProps {
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

export default function MaterialStudioDesk({ node, theme, world, ctaLabel }: MaterialStudioDeskProps) {
  const shelfObjects = chamberObjects(world, "shelf");
  const pathwayObjects = chamberObjects(world, "pathway");
  const appreciationObjects = chamberObjects(world, "appreciation");
  const workbenchWorks = (node.works ?? []).filter((w) => w.is_visible !== false);

  return (
    <RoomShell
      world={world}
      theme={theme}
      displayName={node.display_name}
      worldEyebrow="A working studio surface"
      ctaSlot={
        <InvitationPortal
          node={node}
          label={ctaLabel}
          invitationCopy="A commission begins with a conversation about the room the piece will live in."
          variant="card"
        />
      }
    >
      {({ setActiveChamber }) => (
        <>
          {/* WORKBENCH — materials board on a tilted desk */}
          <section className="presence-chamber chamber-workbench" data-chamber-id="workbench" aria-label="Workbench">
            <div className="workbench-cap">
              <p className="workbench-eyebrow">— Workbench</p>
              <h2 className="workbench-h">{node.display_name}</h2>
              {node.hero_subtitle && <p className="workbench-sub">{node.hero_subtitle}</p>}
              {node.short_bio && <p className="workbench-blurb">{node.short_bio}</p>}
              <div className="workbench-actions">
                <button
                  type="button"
                  className="workbench-enter"
                  onClick={() => setActiveChamber("shelf")}
                >
                  Step around to the bench <ArrowUpRight className="h-4 w-4" aria-hidden />
                </button>
                {node.location_label && <span className="workbench-locale">{node.location_label}</span>}
              </div>
            </div>
            <IsometricCardLayer className="workbench-desk" tiltDeg={20}>
              <MaterialsBoard works={workbenchWorks} />
            </IsometricCardLayer>
          </section>

          {/* SHELF — works in a row, laid out as table objects */}
          {shelfObjects.length > 0 && (
            <section className="presence-chamber chamber-shelf" data-chamber-id="shelf" aria-label="Shelf">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— Shelf</p>
                <h2 className="chamber-h">Recent commissions</h2>
                <p className="chamber-sub">Each piece begins with a board.</p>
              </div>
              <ul className="shelf-row">
                {shelfObjects.map((obj, i) => (
                  <li key={obj.id} className="shelf-card" data-index={i}>
                    <MagneticHover strength={0.14} maxOffset={6} tilt>
                      <a href={obj.href ?? "#"} className="shelf-card-link">
                        <div className="shelf-card-img">
                          {obj.imageUrl ? (
                            <Image
                              src={obj.imageUrl}
                              alt={obj.label ?? "Commission"}
                              fill
                              sizes="(max-width: 768px) 80vw, 30vw"
                              className="shelf-img"
                              unoptimized={isHttp(obj.imageUrl)}
                            />
                          ) : (
                            <div className="shelf-empty" />
                          )}
                        </div>
                        <div className="shelf-card-meta">
                          <p className="shelf-num">{String(i + 1).padStart(2, "0")}</p>
                          <p className="shelf-title">{obj.label}</p>
                          {obj.caption && <p className="shelf-line">{obj.caption}</p>}
                        </div>
                      </a>
                    </MagneticHover>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* PATHWAY — commission steps as numbered walks */}
          {pathwayObjects.length > 0 && (
            <section className="presence-chamber chamber-pathway" data-chamber-id="pathway" aria-label="Pathway">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— Pathway</p>
                <h2 className="chamber-h">How a piece is made</h2>
              </div>
              <ol className="pathway-walk">
                {pathwayObjects.filter((o) => o.type === "service").map((step, i) => (
                  <li key={step.id} className="pathway-step">
                    <span className="pathway-step-num">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.label}</h3>
                      {step.caption && <p className="pathway-desc">{step.caption}</p>}
                      {step.meta && <p className="pathway-meta">{step.meta}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* APPRECIATION — notes from patrons on the desk */}
          {appreciationObjects.length > 0 && (
            <section className="presence-chamber chamber-appreciation" data-chamber-id="appreciation" aria-label="Held by">
              <div className="chamber-cap">
                <p className="chamber-eyebrow">— Held by</p>
                <h2 className="chamber-h">Notes from the workshop</h2>
              </div>
              <div className="appreciation-deck">
                {appreciationObjects.filter((o) => o.type === "testimonial").map((note, i) => (
                  <blockquote
                    key={note.id}
                    className="appreciation-note"
                    style={{ ["--note-tilt" as string]: `${(i % 2 === 0 ? -1.2 : 1) * (0.4 + (i % 3) * 0.4)}deg` }}
                  >
                    <p>"{note.caption}"</p>
                    {(note.label || note.meta) && (
                      <footer>
                        {note.label}
                        {note.meta ? ` — ${note.meta}` : ""}
                      </footer>
                    )}
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* COMMISSION — invitation portal */}
          <section className="presence-chamber chamber-commission" data-chamber-id="commission" aria-label="Commission">
            <InvitationPortal
              node={node}
              label={ctaLabel}
              invitationCopy="Commissions begin with a conversation about the room the piece will live in."
              variant="door"
            />
          </section>
        </>
      )}
    </RoomShell>
  );
}
