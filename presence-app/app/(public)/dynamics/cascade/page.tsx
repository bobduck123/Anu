"use client";

// Live demo of the PortalCascade engagement dynamic.

import { useState } from "react";
import PortalCascade, { type CascadeBranch } from "@/components/presence/world/dynamics/PortalCascade";
import PortalPanel from "@/components/presence/world/engine/PortalPanel";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

const BRANCHES: CascadeBranch[] = [
  {
    id: "tour",
    label: "Tour",
    layers: [
      {
        id: "front",
        label: "Tonight",
        caption: "The current show.",
        objects: [
          { id: "t1", kind: "audio", title: "Set — Säule, 02:40", summary: "Live", action: { kind: "play" } },
          { id: "t2", kind: "audio", title: "Opening / Pickle Factory", summary: "Recording", action: { kind: "play" } },
        ],
      },
      {
        id: "winter",
        label: "Winter residency",
        caption: "Floe — Berlin.",
        objects: [
          { id: "w1", kind: "work", title: "Floe Resident — Winter 23/24", summary: "Residency", action: { kind: "open_panel" } },
          { id: "w2", kind: "work", title: "Berghain Säule — second visit", summary: "Live set", action: { kind: "open_panel" } },
        ],
      },
      {
        id: "press",
        label: "Press",
        caption: "What gets written about it.",
        objects: [
          { id: "p1", kind: "memory", title: "Resident Advisor", summary: "Profile, 2024", action: { kind: "open_panel" } },
          { id: "p2", kind: "memory", title: "Mixmag", summary: "Cover, 2023", action: { kind: "open_panel" } },
        ],
      },
    ],
  },
  {
    id: "studio",
    label: "Studio",
    layers: [
      {
        id: "in-progress",
        label: "In progress",
        caption: "Currently being made.",
        objects: [
          { id: "s1", kind: "audio", title: "Untitled / weightless", summary: "Sketch", action: { kind: "play" } },
        ],
      },
      {
        id: "archive",
        label: "Archive",
        caption: "Field notes and the rooms held.",
        objects: [
          { id: "a1", kind: "memory", title: "Notes on the room", summary: "Long writing", action: { kind: "open_panel" } },
        ],
      },
    ],
  },
  {
    id: "booking",
    label: "Booking",
    layers: [
      {
        id: "open",
        label: "Open",
        caption: "Direct enquiries.",
        objects: [
          { id: "cta", kind: "booking", title: "Book the room", summary: "Q4 + winter residency", action: { kind: "open_panel" } },
        ],
      },
    ],
  },
];

export default function CascadeDemoPage() {
  const [inspecting, setInspecting] = useState<RoomObjectDef | null>(null);
  return (
    <main className="presence-dynamic-demo">
      <PortalCascade
        title="Mira K."
        eyebrow="Portal Cascade · live demo"
        branches={BRANCHES}
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
