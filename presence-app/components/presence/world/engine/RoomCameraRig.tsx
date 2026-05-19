"use client";

// RoomCameraRig — Pass 5. Pre-mounted adjacent chambers + direction-
// specific transition grammar.
//
// Architecture:
// - The rig owns a 3D scene with up to 5 chamber slots: current,
//   forward, back, left, right. Each slot is positioned spatially via
//   CSS transforms so the chamber feels placed in a room around the
//   user.
// - On a direction change, the rig animates the WHOLE scene so the
//   new chamber comes to centre. The previous chamber drifts to where
//   the user came from. After the animation settles, the scene
//   reorganises around the new current chamber.
// - Direction grammar (different motion per direction):
//     forward → push-in (z translate inward, scale)
//     back    → pull-back (z translate outward)
//     left    → rotate-Y (user turns left, world rotates clockwise)
//     right   → opposite rotate-Y
//     inspect → chamber recedes + blurs (handled on the engine shell)
//
// Performance: at most 4-5 chambers mounted at once. No rAF loops.
// All transitions are CSS-driven. Cleanup is implicit (React unmounts
// dropped chambers).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RoomChamberDef, RoomDirection, RoomGraph } from "@/lib/presence/world/graph";
import { findChamber, findExit } from "@/lib/presence/world/graph";

export type CameraSlot = "current" | "forward" | "back" | "left" | "right";

interface ChamberWithSlot {
  chamber: RoomChamberDef;
  slot: CameraSlot;
  key: string;
}

interface RoomCameraRigProps {
  graph: RoomGraph;
  activeChamberId: string;
  direction: RoomDirection | null;
  /** Renders the chamber content for any slot. The rig owns positioning. */
  renderChamber: (chamber: RoomChamberDef, slot: CameraSlot) => ReactNode;
}

// Map last-direction to the rig scene transform during transition.
const RIG_FROM: Record<RoomDirection, string> = {
  forward: "translateZ(-26vh) scale(0.92)",
  back: "translateZ(20vh) scale(1.08)",
  left: "rotateY(-22deg) translateX(8vw)",
  right: "rotateY(22deg) translateX(-8vw)",
};

const TRANSITION_MS = 540;

export default function RoomCameraRig({
  graph,
  activeChamberId,
  direction,
  renderChamber,
}: RoomCameraRigProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [transitionToken, setTransitionToken] = useState(0);
  // The previous active id is held for the duration of the animation so we
  // can render it in the "from" slot. Once the transition settles, it goes
  // away and the rig reorganises around the new active id.
  const [previousId, setPreviousId] = useState<string | null>(null);
  const previousDirectionRef = useRef<RoomDirection | null>(null);
  const lastActiveRef = useRef<string>(activeChamberId);

  useEffect(() => {
    if (activeChamberId === lastActiveRef.current) return;
    setPreviousId(lastActiveRef.current);
    previousDirectionRef.current = direction;
    lastActiveRef.current = activeChamberId;
    setTransitionToken((t) => t + 1);
    const t = window.setTimeout(() => {
      setPreviousId(null);
      previousDirectionRef.current = null;
    }, TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [activeChamberId, direction]);

  // Trigger the rig transform — start at the "from" position, animate to neutral.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !direction) {
      scene.style.transform = "";
      return;
    }
    const from = RIG_FROM[direction];
    scene.style.transition = "none";
    scene.style.transform = from;
    // Force layout to commit start state
    void scene.offsetWidth;
    scene.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 0.88, 0.24, 1)`;
    scene.style.transform = "translateZ(0) rotateY(0) translateX(0) scale(1)";
  }, [transitionToken, direction]);

  // Build the slot assignment for the current frame.
  const slots = useMemo<ChamberWithSlot[]>(() => {
    const out: ChamberWithSlot[] = [];
    const current = findChamber(graph, activeChamberId);
    if (!current) return out;
    out.push({ chamber: current, slot: "current", key: `current-${current.id}` });

    // Map exits to slots
    for (const exit of current.exits) {
      const target = findChamber(graph, exit.targetChamberId);
      if (!target) continue;
      const slot: CameraSlot | null =
        exit.direction === "forward" ? "forward"
        : exit.direction === "back" ? "back"
        : exit.direction === "left" ? "left"
        : exit.direction === "right" ? "right"
        : null;
      if (!slot) continue;
      // Don't double-mount the previous chamber if it sits in this slot.
      out.push({ chamber: target, slot, key: `neighbour-${slot}-${target.id}` });
    }

    // During a transition, render the previous chamber in the slot it came from.
    if (previousId && previousId !== activeChamberId) {
      const prev = findChamber(graph, previousId);
      const dir = previousDirectionRef.current;
      if (prev && dir) {
        // If we moved "forward" to here, the previous chamber is now "back" of us.
        const fromSlot: CameraSlot =
          dir === "forward" ? "back"
          : dir === "back" ? "forward"
          : dir === "left" ? "right"
          : "left";
        // Replace any neighbour we already mounted in this slot.
        const existing = out.findIndex((s) => s.slot === fromSlot);
        if (existing >= 0) out.splice(existing, 1);
        out.push({ chamber: prev, slot: fromSlot, key: `previous-${prev.id}` });
      }
    }
    return out;
  }, [graph, activeChamberId, previousId]);

  return (
    <div className="presence-camera-rig" data-direction={direction ?? "none"}>
      <div className="camera-scene" ref={sceneRef}>
        {slots.map(({ chamber, slot, key }) => (
          <div
            key={key}
            className="camera-slot"
            data-slot={slot}
            aria-hidden={slot !== "current"}
            inert={slot !== "current" ? true : undefined}
          >
            {renderChamber(chamber, slot)}
          </div>
        ))}
      </div>
    </div>
  );
}
