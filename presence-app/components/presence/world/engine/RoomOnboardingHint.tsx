"use client";

// RoomOnboardingHint — Pass 6.
//
// First-visit overlay that tells the user how to operate the room.
// Shows once per worldId (stored in localStorage). Dismissible. Lives
// briefly, then fades. Honours reduced-motion.

import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X, MousePointerClick } from "lucide-react";

interface RoomOnboardingHintProps {
  /** Unique room identifier — used as the storage key. */
  worldId: string;
  /** Label for the forward action; defaults to "Forward". */
  forwardLabel?: string;
  /** Direction-specific labels — optional, defaults to generic. */
  leftLabel?: string;
  rightLabel?: string;
  backLabel?: string;
  /** How to refer to inspectable objects in this world. */
  inspectLabel?: string;
}

const STORAGE_KEY_PREFIX = "presence-onboarded:";

export default function RoomOnboardingHint({
  worldId,
  forwardLabel = "Forward",
  leftLabel = "Turn left",
  rightLabel = "Turn right",
  backLabel = "Step back",
  inspectLabel = "an object",
}: RoomOnboardingHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${STORAGE_KEY_PREFIX}${worldId}`;
    try {
      if (window.localStorage.getItem(key) === "1") return;
    } catch {
      // localStorage blocked — be conservative and skip the overlay.
      return;
    }
    setVisible(true);
  }, [worldId]);

  function dismiss() {
    if (typeof window === "undefined") return;
    const key = `${STORAGE_KEY_PREFIX}${worldId}`;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="presence-onboarding-veil" role="dialog" aria-label="Room navigation hints" aria-modal="false">
      <button type="button" className="onboarding-backdrop" onClick={dismiss} aria-label="Dismiss room hints" />
      <div className="onboarding-card">
        <header>
          <p className="onboarding-eyebrow">You are here</p>
          <h2 className="onboarding-title">Walk this room with five gestures.</h2>
        </header>
        <ul className="onboarding-keys">
          <li>
            <kbd><ArrowUp className="h-3.5 w-3.5" aria-hidden /></kbd>
            <span>{forwardLabel}</span>
          </li>
          <li>
            <kbd><ArrowLeft className="h-3.5 w-3.5" aria-hidden /></kbd>
            <span>{leftLabel}</span>
          </li>
          <li>
            <kbd><ArrowRight className="h-3.5 w-3.5" aria-hidden /></kbd>
            <span>{rightLabel}</span>
          </li>
          <li>
            <kbd><ArrowDown className="h-3.5 w-3.5" aria-hidden /></kbd>
            <span>{backLabel}</span>
          </li>
          <li>
            <kbd><MousePointerClick className="h-3.5 w-3.5" aria-hidden /></kbd>
            <span>Tap {inspectLabel} to inspect — Escape closes.</span>
          </li>
        </ul>
        <p className="onboarding-mobile">On mobile, use the dock at the bottom or swipe left/right to turn.</p>
        <button type="button" className="onboarding-dismiss" onClick={dismiss}>
          <X className="h-3.5 w-3.5" aria-hidden /> Step in
        </button>
      </div>
    </div>
  );
}
