"use client";

// IsometricCardLayer — adapted from `isometric-card-grid`. A CSS-only
// tilted (rotateX/rotateZ) plane that hosts placed cards. Used as the
// foundation for DeskSurface so objects feel placed on a table rather
// than stacked in a column.
//
// Tier policy (after muqarnas-kirigami's tier model):
// - on coarse pointers and reduced-motion → no tilt (flat layout)
// - on fine pointers + standard motion → 28° tilt with subtle parallax
//
// The component does NOT animate continuously; tilt is static after
// mount. Cards inside can still use MagneticHover for individual
// interaction.

import { useEffect, useRef, type ReactNode } from "react";

interface IsometricCardLayerProps {
  children: ReactNode;
  tiltDeg?: number;
  className?: string;
}

export default function IsometricCardLayer({
  children,
  tiltDeg = 28,
  className,
}: IsometricCardLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) {
      el.classList.add("is-flat");
      return;
    }
    el.style.setProperty("--iso-tilt", `${tiltDeg}deg`);
    el.classList.add("is-tilted");
  }, [tiltDeg]);

  return (
    <div ref={ref} className={`presence-iso-layer ${className ?? ""}`} data-iso="true">
      <div className="presence-iso-plane">{children}</div>
    </div>
  );
}
