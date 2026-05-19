"use client";

// PortalPanel — the inspect overlay.
//
// Renders a content surface when a RoomObject is selected. Focus is
// trapped softly (initial focus on the close button); Escape closes
// the panel; clicking the backdrop closes the panel. The panel is
// scrollable internally for long content (work detail, statements).
//
// Pass 4 — frosted-saturated-borders pattern (from
// `frosted-saturated-borders` CodePen) adapted into the panel's edge.

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

interface PortalPanelProps {
  object: RoomObjectDef;
  onClose: () => void;
  children: ReactNode;
}

export default function PortalPanel({ object, onClose, children }: PortalPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the close button on open, restore focus to the previously-
  // focused element on close.
  useEffect(() => {
    const previouslyFocused = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Lock body scroll while panel is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="presence-portal-panel-root" role="dialog" aria-modal="true" aria-label={object.title}>
      <button
        type="button"
        className="presence-portal-backdrop"
        aria-label="Step back into the room"
        onClick={onClose}
        tabIndex={-1}
      />
      <article ref={panelRef} className="presence-portal-panel" data-kind={object.kind}>
        <header className="portal-panel-head">
          <div>
            <p className="portal-eyebrow">{object.kind}</p>
            <h2 className="portal-title">{object.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="portal-close"
            onClick={onClose}
            aria-label="Close — step back"
          >
            <X className="h-4 w-4" aria-hidden />
            <span>Esc</span>
          </button>
        </header>
        <div className="portal-panel-body">{children}</div>
      </article>
    </div>
  );
}
