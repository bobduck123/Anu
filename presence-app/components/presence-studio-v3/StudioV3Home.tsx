"use client";

import type { PresenceNode } from "@/lib/api/types";
import type { StudioV3ModePreference } from "@/lib/presence/studio-v3";

export default function StudioV3Home({
  node,
  status,
  mode,
  onEdit,
  onTestVisitor,
  onModeChange,
}: {
  node: PresenceNode;
  status: string;
  mode: StudioV3ModePreference;
  onEdit: () => void;
  onTestVisitor: () => void;
  onModeChange: (mode: StudioV3ModePreference) => void;
}) {
  return (
    <section className="studio-v3-home" data-testid="presence-studio-v3-home" aria-labelledby="studio-v3-home-title">
      <div>
        <p className="studio-v3-kicker">BBB pilot</p>
        <h1 id="studio-v3-home-title">{node.display_name}</h1>
        <p className="studio-v3-home-status">{status}</p>
      </div>
      <div className="studio-v3-home-actions">
        <button type="button" className="studio-v3-primary" onClick={onEdit} data-testid="presence-studio-v3-edit">
          Edit Presence
        </button>
        <button type="button" onClick={onTestVisitor} data-testid="presence-studio-v3-home-test-visitor">
          Test as visitor
        </button>
      </div>
      <div className="studio-v3-mode-picker" role="group" aria-label="Studio editing mode" data-testid="presence-studio-v3-mode-picker">
        <button type="button" aria-pressed="true" onClick={() => onModeChange("simple")}>
          <strong>Simple</strong>
          <small>Guided, registered choices</small>
        </button>
        <button
          type="button"
          aria-pressed="false"
          disabled
          title="Advanced transforms and depth/layer controls require a separate bounded implementation gate."
        >
          <strong>Advanced Creative</strong>
          <small>Deferred · bounded transforms not yet available</small>
        </button>
      </div>
      {mode === "advanced-creative" && (
        <p className="studio-v3-home-next">A saved Advanced preference is retained, but M1 is applying safe Simple constraints until bounded transforms are implemented.</p>
      )}
      <p className="studio-v3-home-next">Select a Piece, open the Shelf, or try Soft Editorial.</p>
    </section>
  );
}
