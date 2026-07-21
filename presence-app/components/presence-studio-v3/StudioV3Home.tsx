"use client";

import type { PresenceNode } from "@/lib/api/types";

export default function StudioV3Home({
  node,
  status,
  onEdit,
  onTestVisitor,
}: {
  node: PresenceNode;
  status: string;
  onEdit: () => void;
  onTestVisitor: () => void;
}) {
  return (
    <section className="studio-v3-home" data-testid="presence-studio-v3-home" aria-labelledby="studio-v3-home-title">
      <div>
        <p className="studio-v3-kicker">Local BBB pilot</p>
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
      <p className="studio-v3-home-next">Select a Piece, open the Shelf, or try Soft Editorial.</p>
    </section>
  );
}
