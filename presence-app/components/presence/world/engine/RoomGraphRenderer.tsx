"use client";

// RoomGraphRenderer — Presence Room Engine v2 (Pass 5).
//
// Adds:
// - pre-mounted adjacent chambers via the new RoomCameraRig (current +
//   forward + back + left + right slots)
// - `is-inspecting` class on the shell so the camera scene can recede
//   when a portal panel is open
// - audio registry wired to the active chamber change

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  ChamberSlotRenderer,
  RoomGraph,
  RoomObjectDef,
} from "@/lib/presence/world/graph";
import { findChamber, findObject } from "@/lib/presence/world/graph";
import type { ThemeGenome } from "@/lib/presence/dna/types";
import { themeStyle, themeClasses } from "@/lib/presence/theme/genome";
import { useRoomNavigator } from "@/lib/presence/world/useRoomNavigator";
import { setActiveChamber as audioSetActiveChamber } from "@/lib/presence/world/audioRegistry";

import SpatialNavHud from "./SpatialNavHud";
import MobileRoomDock from "./MobileRoomDock";
import RoomCameraRig, { type CameraSlot } from "./RoomCameraRig";
import ChamberStage from "./ChamberStage";
import PortalPanel from "./PortalPanel";
import ReducedMotionRoomFallback from "./ReducedMotionRoomFallback";
import RoomOnboardingHint from "./RoomOnboardingHint";

export type PortalContentRenderer = (object: RoomObjectDef) => React.ReactNode;

interface RoomGraphRendererProps {
  graph: RoomGraph;
  renderSlot: ChamberSlotRenderer;
  renderPortal: PortalContentRenderer;
  theme: ThemeGenome;
  worldLabel: string;
  worldEyebrow: string;
  shellClassName?: string;
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

  // Audio registry — pause iframes when chamber changes
  useEffect(() => {
    audioSetActiveChamber(state.activeChamberId);
  }, [state.activeChamberId]);

  const activeChamber = useMemo(
    () => findChamber(graph, state.activeChamberId) ?? graph.chambers[0],
    [graph, state.activeChamberId],
  );

  const inspectingObject = useMemo<RoomObjectDef | null>(() => {
    if (!state.inspectingObjectId) return null;
    return findObject(activeChamber, state.inspectingObjectId) ?? null;
  }, [activeChamber, state.inspectingObjectId]);

  const style = themeStyle(theme) as CSSProperties;
  const isInspecting = Boolean(inspectingObject);

  if (reducedMotion) {
    return (
      <div className={`${themeClasses(theme)} presence-engine-shell presence-engine-shell-fallback`} style={style}>
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
      className={`${themeClasses(theme)} presence-engine-shell ${shellClassName ?? ""} ${isInspecting ? "is-inspecting" : ""}`}
      style={style}
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

      <RoomCameraRig
        graph={graph}
        activeChamberId={activeChamber.id}
        direction={state.lastDirection}
        renderChamber={(chamber, slot: CameraSlot) => (
          <ChamberStage
            chamber={chamber}
            renderSlot={renderSlot}
            inspectingObjectId={slot === "current" ? state.inspectingObjectId : null}
            onInspect={slot === "current" ? actions.inspect : () => {}}
            isCurrent={slot === "current"}
          />
        )}
      />

      <MobileRoomDock chamber={activeChamber} state={state} actions={actions} />

      {inspectingObject && (
        <PortalPanel object={inspectingObject} onClose={actions.closeInspect}>
          {renderPortal(inspectingObject)}
        </PortalPanel>
      )}

      <RoomOnboardingHint
        worldId={graph.id}
        forwardLabel="Enter / forward"
        leftLabel="Turn left"
        rightLabel="Turn right"
        backLabel="Step back"
        inspectLabel="any object"
      />
    </main>
  );
}
