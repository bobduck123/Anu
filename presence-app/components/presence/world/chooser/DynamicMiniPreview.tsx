"use client";

// DynamicMiniPreview — animated micro-preview of each engagement
// dynamic. Used by the customisation chooser so users see the
// interaction model before selecting it. All previews are CSS-only,
// SSR-safe, and reduced-motion aware.

import type { DynamicId } from "@/lib/presence/world/dynamicRegistry";

export default function DynamicMiniPreview({ id }: { id: DynamicId }) {
  switch (id) {
    case "chamber_walk":
      return <ChamberWalkPreview />;
    case "orbit_constellation":
      return <OrbitPreview />;
    case "object_tableau":
      return <TableauPreview />;
    case "portal_cascade":
      return <CascadePreview />;
    default:
      return null;
  }
}

function ChamberWalkPreview() {
  return (
    <div className="mini-preview mini-preview-chamber" aria-hidden>
      <div className="chamber-room">
        <div className="chamber-wall left" />
        <div className="chamber-wall right" />
        <div className="chamber-floor" />
        <span className="chamber-marker" />
        <span className="chamber-arrow chamber-arrow-fwd">↑</span>
      </div>
      <p className="mini-caption">Walk through rooms</p>
    </div>
  );
}

function OrbitPreview() {
  return (
    <div className="mini-preview mini-preview-orbit" aria-hidden>
      <div className="orbit-ring r1">
        <span className="orbit-sat" />
        <span className="orbit-sat" />
        <span className="orbit-sat" />
        <span className="orbit-sat" />
      </div>
      <div className="orbit-ring r2">
        <span className="orbit-sat" />
        <span className="orbit-sat" />
        <span className="orbit-sat" />
      </div>
      <span className="orbit-centre" />
      <p className="mini-caption">Satellites around a centre</p>
    </div>
  );
}

function TableauPreview() {
  return (
    <div className="mini-preview mini-preview-tableau" aria-hidden>
      <div className="tableau-surface">
        <span className="tableau-obj t1" />
        <span className="tableau-obj t2" />
        <span className="tableau-obj t3" />
        <span className="tableau-obj t4" />
        <span className="tableau-obj t5" />
      </div>
      <p className="mini-caption">Objects on a surface</p>
    </div>
  );
}

function CascadePreview() {
  return (
    <div className="mini-preview mini-preview-cascade" aria-hidden>
      <span className="cascade-portal p1" />
      <span className="cascade-portal p2" />
      <span className="cascade-portal p3" />
      <span className="cascade-portal p4" />
      <p className="mini-caption">Portals fold in depth</p>
    </div>
  );
}
