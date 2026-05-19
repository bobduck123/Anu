"use client";

// RoomGraphRenderer — Presence Room Engine v1.
//
// Mounts the full chamber-graph navigation experience: navigator, HUD,
// camera rig, stage, mobile dock, portal panel, and reduced-motion
// fallback. Rooms supply the RoomGraph + chamber slot renderer +
// portal renderer.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CSSProperties as CSS } from "react";
import type {
  ChamberSlotRenderer,
  RoomGraph,
  RoomObjectDef,
} from "@/lib/presence/world/graph";
import { findChamber, findObject } from "@/lib/presence/world/graph";
import type { ThemeGenome } from "@/lib/presence/dna/types";
import { themeStyle, themeClasses } from "@/lib/presence/theme/genome";
import { useRoomNavigator } from "@/lib/presence/world/useRoomNavigator";

import SpatialNavHud from "./SpatialNavHud";
import MobileRoomDock from "./MobileRoomDock";
import RoomCameraRig from "./RoomCameraRig";
import ChamberStage from "./ChamberStage";
import PortalPanel from "./PortalPanel";
import ReducedMotionRoomFallback from "./ReducedMotionRoomFallback";

export type PortalContentRenderer = (object: RoomObjectDef) => React.ReactNode;

interface RoomGraphRendererProps {
  graph: RoomGraph;
  renderSlot: ChamberSlotRenderer;
  renderPortal: PortalContentRenderer;
  theme: ThemeGenome;
  worldLabel: string;
  worldEyebrow: string;
  /** Optional class on the shell for room-specific styling. */
  shellClassName?: string;
  /** Atmosphere class identifier — drives shell-level CSS variants. */
  atmosphere?: string;
}

export default function RoomGraphRenderer({
  graph,
  renderSlot,
  renderPortal,
  theme,
  worldLabel,
  worldEyebrow,
  shellClassName,
  atmosphere,
}: RoomGraphRendererProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const [state, actions] = useRoomNavigator(graph, {
    enableKeyboard: !reducedMotion,
  });

  const activeChamber = useMemo(
    () => findChamber(graph, state.activeChamberId) ?? graph.chambers[0],
    [graph, state.activeChamberId],
  );

  const inspectingObject = useMemo<RoomObjectDef | null>(() => {
    if (!state.inspectingObjectId) return null;
    return findObject(activeChamber, state.inspectingObjectId) ?? null;
  }, [activeChamber, state.inspectingObjectId]);

  const style = themeStyle(theme) as CSS;

  // Reduced-motion path — flat accessible document, no engine
  if (reducedMotion) {
    return (
      <div className={`${themeClasses(theme)} presence-engine-shell presence-engine-shell-fallback`} style={style as CSSProperties}>
        <ReducedMotionRoomFallback
          graph={graph}
          renderSlot={renderSlot}
          worldLabel={worldLabel}
          worldEyebrow={worldEyebrow}
        />
      </div>
    );
  }

  return (
    <main
      className={`${themeClasses(theme)} presence-engine-shell ${shellClassName ?? ""}`}
      style={style as CSSProperties}
      data-presence-world={atmosphere ?? "default"}
      data-active-chamber={activeChamber.id}
      aria-label={`${worldLabel} — ${worldEyebrow}`}
    >
      <SpatialNavHud
        chamber={activeChamber}
        state={state}
        actions={actions}
        worldLabel={worldLabel}
        worldEyebrow={worldEyebrow}
      />

      <RoomCameraRig direction={state.lastDirection} activeChamberId={activeChamber.id}>
        <ChamberStage
          chamber={activeChamber}
          renderSlot={renderSlot}
          inspectingObjectId={state.inspectingObjectId}
          onInspect={actions.inspect}
        />
      </RoomCameraRig>

      <MobileRoomDock chamber={activeChamber} state={state} actions={actions} />

      {inspectingObject && (
        <PortalPanel object={inspectingObject} onClose={actions.closeInspect}>
          {renderPortal(inspectingObject)}
        </PortalPanel>
      )}
    </main>
  );
}
