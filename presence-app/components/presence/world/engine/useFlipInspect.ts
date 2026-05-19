"use client";

// useFlipInspect — Pass 6 shared-element / FLIP inspection helper.
//
// Captures the bounding rect of the inspected source element at the
// moment of inspection so the portal panel can animate FROM that
// rect to its final position (and back on close). The hook owns the
// "from rect" only; the portal panel reads it and applies the
// transform itself via CSS variables.
//
// Reduced-motion: the hook still records the rect (useful for focus
// restoration) but exposes a `shouldAnimate=false` flag so the
// portal can skip the FLIP transform.

import { useCallback, useEffect, useRef, useState } from "react";

export interface FlipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlipState {
  fromRect: FlipRect | null;
  shouldAnimate: boolean;
  /** Element to restore focus to on close. */
  triggerEl: HTMLElement | null;
}

export function useFlipInspect() {
  const [state, setState] = useState<FlipState>({
    fromRect: null,
    shouldAnimate: false,
    triggerEl: null,
  });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const onChange = () => {
      reducedMotionRef.current = mql.matches;
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  /** Call from the click handler that opens a portal. */
  const captureFromEvent = useCallback((e: { currentTarget: Element }) => {
    const el = e.currentTarget as HTMLElement | null;
    if (!el) {
      setState({ fromRect: null, shouldAnimate: false, triggerEl: null });
      return;
    }
    const rect = el.getBoundingClientRect();
    setState({
      fromRect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      shouldAnimate: !reducedMotionRef.current,
      triggerEl: el,
    });
  }, []);

  const clear = useCallback(() => {
    setState({ fromRect: null, shouldAnimate: false, triggerEl: null });
  }, []);

  return { ...state, captureFromEvent, clear };
}

/** Convert a FlipRect into CSS custom properties on a style object so
 * the portal panel can read --flip-x / --flip-y / --flip-w / --flip-h
 * and use them in CSS transitions. */
export function flipRectToStyle(rect: FlipRect | null, panelRect: DOMRect | null) {
  if (!rect || !panelRect) return undefined;
  // Translate so the portal panel starts visually placed where the
  // source rect is, then animates back to its natural position.
  const dx = rect.x + rect.width / 2 - (panelRect.left + panelRect.width / 2);
  const dy = rect.y + rect.height / 2 - (panelRect.top + panelRect.height / 2);
  const scale = Math.max(rect.width / panelRect.width, rect.height / panelRect.height);
  return {
    "--flip-dx": `${dx.toFixed(2)}px`,
    "--flip-dy": `${dy.toFixed(2)}px`,
    "--flip-scale": scale.toFixed(3),
  } as React.CSSProperties;
}
