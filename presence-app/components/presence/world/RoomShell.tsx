"use client";

// RoomShell — the inhabitable room environment that wraps every
// DNA-driven world (Pass 3).
//
// Responsibilities:
// - viewport-aware room environment (no global scroll on desktop)
// - atmosphere layer in the background
// - chamber navigation (desktop rail + chosen mobile nav)
// - chamber content area with scroll-snap on desktop
// - CTA portal slot
// - reduced-motion fallback that flattens to a semantic stack
// - SSR-safe (active chamber initialised from props, IntersectionObserver
//   only attached after mount)

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CSSProperties as CSS } from "react";
import type { RoomWorld } from "@/lib/presence/world/types";
import type { ThemeGenome } from "@/lib/presence/dna/types";
import { themeStyle, themeClasses } from "@/lib/presence/theme/genome";
import AtmosphereLayer from "./AtmosphereLayer";
import ChamberNav from "./ChamberNav";
import RoomDock from "./RoomDock";
import PortalSheet from "./PortalSheet";

interface ChamberRenderProps {
  activeChamberId: string;
  setActiveChamber: (id: string) => void;
}

interface RoomShellProps {
  world: RoomWorld;
  theme: ThemeGenome;
  // Rooms render their chamber content via this callback so the shell
  // owns chamber state, scroll-snap, and IO observation.
  children: (props: ChamberRenderProps) => ReactNode;
  // Optional badge in the threshold corner: the display name and a
  // short eyebrow that identifies the world.
  displayName: string;
  worldEyebrow: string;
  // Optional CTA slot rendered as a floating portal on desktop and
  // pinned above the dock on mobile.
  ctaSlot?: ReactNode;
}

export default function RoomShell({
  world,
  theme,
  children,
  displayName,
  worldEyebrow,
  ctaSlot,
}: RoomShellProps) {
  const [activeId, setActiveId] = useState<string>(world.chambers[0]?.id ?? "");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const setActiveChamber = useCallback((id: string) => {
    setActiveId(id);
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = scroller.querySelector<HTMLElement>(`[data-chamber-id="${id}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const sections = Array.from(scroller.querySelectorAll<HTMLElement>("[data-chamber-id]"));
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.chamberId;
            if (id) setActiveId(id);
          }
        }
      },
      { root: scroller, rootMargin: "-40% 0px -50% 0px", threshold: 0.01 },
    );
    sections.forEach((sec) => obs.observe(sec));
    return () => obs.disconnect();
  }, [world.chambers]);

  const style = {
    ...(themeStyle(theme) as CSSProperties),
    "--room-spatial-depth": world.spatial_depth,
  } as CSS;

  return (
    <main
      className={`${themeClasses(theme)} presence-room-shell`}
      style={style}
      data-presence-world={world.world_type}
      data-presence-nav={world.navigation_model}
      data-presence-atmosphere={world.atmosphere}
      data-presence-depth={world.spatial_depth}
      aria-label={`${world.semantic_fallback_label} — ${worldEyebrow}`}
    >
      <AtmosphereLayer atmosphere={world.atmosphere} />

      <header className="presence-room-threshold">
        <p className="threshold-eyebrow">{worldEyebrow}</p>
        <h1 className="threshold-name">{displayName}</h1>
      </header>

      {/* Desktop: side chamber rail */}
      {world.navigation_model === "spatial_chambers" || world.navigation_model === "wall_panels" || world.navigation_model === "desk_surface" ? (
        <ChamberNav chambers={world.chambers} activeId={activeId} onSelect={setActiveChamber} side="right" />
      ) : null}

      {/* The chamber scroller. Rooms supply their content as children
          functions to receive (activeChamberId, setActiveChamber). */}
      <div ref={scrollerRef} className="presence-room-scroller" data-nav={world.navigation_model}>
        {children({ activeChamberId: activeId, setActiveChamber })}
      </div>

      {/* CTA slot sits in the bottom-right on desktop. */}
      {ctaSlot && <div className="presence-room-cta-slot">{ctaSlot}</div>}

      {/* Mobile nav — chosen by the world */}
      {world.mobile_nav_mode === "room_dock" && (
        <div className="md:hidden">
          <RoomDock chambers={world.chambers} activeId={activeId} onSelect={setActiveChamber} />
        </div>
      )}
      {world.mobile_nav_mode === "portal_sheet" && (
        <div className="md:hidden">
          <PortalSheet chambers={world.chambers} activeId={activeId} onSelect={setActiveChamber} triggerLabel="Room" />
        </div>
      )}
    </main>
  );
}
