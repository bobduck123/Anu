"use client";

// MobilePreviewDrawer — keeps the live preview visible on mobile.
// A short handle is always visible at the bottom; tapping opens the
// drawer with the same PreviewStage + PreviewSummary used on desktop.

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ResolvedSelection } from "@/lib/presence/studio/useStudioState";
import { PreviewStage, PreviewSummary } from "./PreviewStage";

interface Props {
  resolved: ResolvedSelection;
  open: boolean;
  onToggle: (next: boolean) => void;
}

export default function MobilePreviewDrawer({ resolved, open, onToggle }: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="presence-studio-drawer-scrim"
          aria-label="Close preview drawer"
          onClick={() => onToggle(false)}
        />
      )}
      <aside className={`presence-studio-mobile-drawer ${open ? "is-open" : ""}`} aria-label="Live preview">
        <button
          type="button"
          className="presence-studio-drawer-handle"
          aria-expanded={open}
          onClick={() => onToggle(!open)}
        >
          <span className="handle-grip" aria-hidden />
          <span className="handle-text">
            <span className="handle-dot" style={{ background: resolved.world?.accent ?? "var(--studio-copper)" }} aria-hidden />
            <span className="handle-label">Live preview · {resolved.world?.label ?? "your direction"}</span>
          </span>
          {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
        </button>
        <div className="presence-studio-drawer-body">
          <PreviewStage resolved={resolved} />
          <PreviewSummary resolved={resolved} />
        </div>
      </aside>
    </>
  );
}
