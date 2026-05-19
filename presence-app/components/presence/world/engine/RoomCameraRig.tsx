"use client";

// RoomCameraRig — the cinematic transform layer.
//
// Wraps the chamber stack and applies a transform based on the last
// navigator direction. The actual chambers (current + immediate
// neighbours) are mounted; the rig translates so the chosen direction
// reads as movement.
//
// Reduced-motion: transform is reset and transitions are disabled;
// only the current chamber is displayed without slide.
//
// Performance: a single transform mutation per move. No rAF loop.

import { useEffect, useRef, type ReactNode } from "react";
import type { RoomDirection } from "@/lib/presence/world/graph";

interface RoomCameraRigProps {
  direction: RoomDirection | null;
  activeChamberId: string;
  children: ReactNode;
}

const ENTRY_FROM: Record<RoomDirection, { x: number; y: number; rotateY: number; rotateX: number; scale: number }> = {
  forward: { x: 0,   y: 4,   rotateY: 0,    rotateX: 4,   scale: 1.04 },
  back:    { x: 0,   y: -4,  rotateY: 0,    rotateX: -4,  scale: 0.96 },
  left:    { x: 6,   y: 0,   rotateY: 6,    rotateX: 0,   scale: 1 },
  right:   { x: -6,  y: 0,   rotateY: -6,   rotateX: 0,   scale: 1 },
};

export default function RoomCameraRig({ direction, activeChamberId, children }: RoomCameraRigProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !direction) {
      el.style.transform = "";
      el.style.opacity = "1";
      return;
    }
    const from = ENTRY_FROM[direction];
    // Start from displaced position with zero opacity, then settle.
    el.style.transition = "none";
    el.style.transform = `translate3d(${from.x}vw, ${from.y}vh, 0) rotateY(${from.rotateY}deg) rotateX(${from.rotateX}deg) scale(${from.scale})`;
    el.style.opacity = "0";
    // Force a frame so the browser applies the start state.
    void el.offsetWidth;
    el.style.transition = "transform 520ms cubic-bezier(0.22, 0.88, 0.24, 1), opacity 320ms ease";
    el.style.transform = "translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg) scale(1)";
    el.style.opacity = "1";
  }, [direction, activeChamberId]);

  return (
    <div className="presence-camera-rig" ref={ref}>
      {children}
    </div>
  );
}
