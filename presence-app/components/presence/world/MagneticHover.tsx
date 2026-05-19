"use client";

// MagneticHover — adapted from `digital-character-hover` and the cursor-
// reveal pattern in `romantic-cs-portfolio-...-cursor-reveal-...`. The
// hovered object pulls toward the cursor, with a soft spring back. The
// underlying object stays at its layout position so we don't break flow.
//
// Reduced-motion: no transform applied; the element behaves like a
// normal child.
// Mobile: pointer-fine check skips the effect on touch-only devices.

import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";

interface MagneticHoverProps {
  children: ReactNode;
  /** 0..1 — how strongly the child follows the pointer. 0.25 is calm. */
  strength?: number;
  /** Pixels the child can drift from origin. Caps the displacement. */
  maxOffset?: number;
  className?: string;
  /** When true, also tilts the child slightly toward the cursor. */
  tilt?: boolean;
  style?: CSSProperties;
}

export default function MagneticHover({
  children,
  strength = 0.25,
  maxOffset = 18,
  className,
  tilt = false,
  style,
}: MagneticHoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !fine) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let active = false;

    function onMove(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.min(1, Math.hypot(dx, dy) / Math.max(rect.width, rect.height));
      const pull = strength * (1 - distance * 0.6);
      targetX = Math.max(-maxOffset, Math.min(maxOffset, dx * pull));
      targetY = Math.max(-maxOffset, Math.min(maxOffset, dy * pull));
      if (!active) {
        active = true;
        loop();
      }
    }
    function onLeave() {
      targetX = 0;
      targetY = 0;
    }
    function loop() {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      if (!el) return;
      if (tilt) {
        const tx = (currentX / maxOffset) * 4;
        const ty = (currentY / maxOffset) * -4;
        el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) rotateX(${ty.toFixed(2)}deg) rotateY(${tx.toFixed(2)}deg)`;
      } else {
        el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      if (Math.abs(targetX - currentX) < 0.05 && Math.abs(targetY - currentY) < 0.05 && targetX === 0 && targetY === 0) {
        el.style.transform = "";
        active = false;
        return;
      }
      raf = window.requestAnimationFrame(loop);
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) window.cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [strength, maxOffset, tilt]);

  return (
    <div
      ref={ref}
      className={`presence-magnetic ${className ?? ""}`}
      style={{ willChange: "transform", ...(style ?? {}) }}
    >
      {children}
    </div>
  );
}
