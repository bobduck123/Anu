"use client";

// MobileRoomDock — touch-first navigation.
//
// A bottom dock with three arrow buttons (left / forward / right) and a
// retreat button on the side. The retreat button doubles as the panel-
// close action when an object is being inspected. Swipe gestures (left/
// right) are attached to the whole document body when the dock is
// mounted.

import { useEffect } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import type { RoomChamberDef, RoomNavigatorActions, RoomNavigatorState } from "@/lib/presence/world/graph";
import { findExit } from "@/lib/presence/world/graph";

interface MobileRoomDockProps {
  chamber: RoomChamberDef;
  state: RoomNavigatorState;
  actions: RoomNavigatorActions;
}

const SWIPE_THRESHOLD_PX = 60;

export default function MobileRoomDock({ chamber, state, actions }: MobileRoomDockProps) {
  // Swipe gestures attached to the room shell root.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.querySelector(".presence-engine-shell") as HTMLElement | null;
    if (!root) return;
    let startX = 0;
    let startY = 0;
    let active = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = (e.target as HTMLElement) || null;
      // Don't intercept inside panels, dock, or HUD.
      if (t?.closest(".presence-portal-panel, .presence-mobile-dock, .presence-engine-hud, button, a, input, textarea")) {
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      active = true;
    }
    function onTouchEnd(e: TouchEvent) {
      if (!active) return;
      active = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * 0.7) return; // mostly vertical swipe → ignore
      if (dx > 0) {
        actions.move("left"); // swipe right reveals the left wing (turning left)
      } else {
        actions.move("right");
      }
    }
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
    };
  }, [actions]);

  const leftExit = findExit(chamber, "left");
  const forwardExit = findExit(chamber, "forward");
  const rightExit = findExit(chamber, "right");
  const inspecting = Boolean(state.inspectingObjectId);
  const retreatEnabled = inspecting || state.history.length > 0;

  return (
    <nav className="presence-mobile-dock md:hidden" aria-label="Room dock">
      <button
        type="button"
        className="dock-btn dock-retreat"
        onClick={() => actions.retreat()}
        disabled={!retreatEnabled}
        aria-label={inspecting ? "Close panel" : "Step back"}
      >
        {inspecting ? <X className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
        <span>{inspecting ? "Close" : "Back"}</span>
      </button>
      <div className="dock-arrows">
        <button
          type="button"
          className="dock-btn dock-left"
          onClick={() => actions.move("left")}
          disabled={!leftExit}
          aria-label={leftExit?.label ? `Turn left — ${leftExit.label}` : "Turn left"}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          <span>{leftExit?.label ?? "Left"}</span>
        </button>
        <button
          type="button"
          className="dock-btn dock-forward"
          onClick={() => actions.move("forward")}
          disabled={!forwardExit}
          aria-label={forwardExit?.label ? `Forward — ${forwardExit.label}` : "Forward"}
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
          <span>{forwardExit?.label ?? "Enter"}</span>
        </button>
        <button
          type="button"
          className="dock-btn dock-right"
          onClick={() => actions.move("right")}
          disabled={!rightExit}
          aria-label={rightExit?.label ? `Turn right — ${rightExit.label}` : "Turn right"}
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
          <span>{rightExit?.label ?? "Right"}</span>
        </button>
      </div>
    </nav>
  );
}
