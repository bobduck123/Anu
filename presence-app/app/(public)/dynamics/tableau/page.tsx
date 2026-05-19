"use client";

// Live demo of the ObjectTableau engagement dynamic.

import { useState } from "react";
import ObjectTableau, { type TableauCluster } from "@/components/presence/world/dynamics/ObjectTableau";
import PortalPanel from "@/components/presence/world/engine/PortalPanel";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

const CLUSTERS: TableauCluster[] = [
  {
    id: "materials",
    label: "Materials",
    caption: "Salvaged hardwoods and finishes.",
    objects: [
      { id: "m1", kind: "memory", title: "Spotted gum", summary: "Hand-rubbed oil", action: { kind: "open_panel" } },
      { id: "m2", kind: "memory", title: "Blackbutt", summary: "Draw-bored mortise", action: { kind: "open_panel" } },
      { id: "m3", kind: "memory", title: "Ironbark", summary: "Leather seat", action: { kind: "open_panel" } },
      { id: "m4", kind: "memory", title: "Jarrah", summary: "Salvaged from Hobart slipway", action: { kind: "open_panel" } },
    ],
  },
  {
    id: "pieces",
    label: "Pieces on the bench",
    caption: "Recent commissions.",
    objects: [
      { id: "p1", kind: "work", title: "Long table for Mongarlowe", summary: "2.8m × 0.95m", action: { kind: "open_panel" } },
      { id: "p2", kind: "work", title: "Six-board cabinet", summary: "Blackbutt", action: { kind: "open_panel" } },
      { id: "p3", kind: "work", title: "Library chair", summary: "Ironbark / leather", action: { kind: "open_panel" } },
      { id: "p4", kind: "work", title: "Reading shelf", summary: "Spotted gum, mitred", action: { kind: "open_panel" } },
    ],
  },
  {
    id: "notes",
    label: "Pinned notes",
    caption: "From the workshop.",
    objects: [
      { id: "n1", kind: "memory", title: "M. & D. Lawler", summary: "We waited five months and it was the best part.", action: { kind: "open_panel" } },
      { id: "n2", kind: "memory", title: "S. Park, Bowral", summary: "Salt & Grain treat the board like it's already part of the house.", action: { kind: "open_panel" } },
    ],
  },
  {
    id: "commission",
    label: "Commission",
    caption: "Begin a piece.",
    objects: [
      { id: "cta", kind: "booking", title: "Begin a commission", summary: "Books open for autumn 2026", action: { kind: "open_panel" } },
    ],
  },
];

export default function TableauDemoPage() {
  const [inspecting, setInspecting] = useState<RoomObjectDef | null>(null);
  return (
    <main className="presence-dynamic-demo">
      <ObjectTableau
        surfaceLabel="Salt & Grain Studio — workbench"
        surfaceEyebrow="Object Tableau · live demo"
        clusters={CLUSTERS}
        onInspect={setInspecting}
      />
      {inspecting && (
        <PortalPanel object={inspecting} onClose={() => setInspecting(null)}>
          <div className="portal-body-text">
            <blockquote className="portal-quote">{inspecting.summary ?? inspecting.title}</blockquote>
            <p className="portal-meta">{inspecting.kind}</p>
          </div>
        </PortalPanel>
      )}
    </main>
  );
}
