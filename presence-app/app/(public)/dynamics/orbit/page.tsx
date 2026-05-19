"use client";

// Live demo of the OrbitConstellation engagement dynamic. Pulls
// satellites from a static fixture so the demo works without a
// backend or a specific PresenceNode.

import { useState } from "react";
import OrbitConstellation from "@/components/presence/world/dynamics/OrbitConstellation";
import PortalPanel from "@/components/presence/world/engine/PortalPanel";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

const SATELLITES: RoomObjectDef[] = [
  { id: "press-1", kind: "memory", title: "FT Weekend feature", summary: "Press, 2024", action: { kind: "open_panel" } },
  { id: "press-2", kind: "memory", title: "Monocle 24 interview", summary: "Press, 2023", action: { kind: "open_panel" } },
  { id: "case-1", kind: "case_study", title: "Notion EU launch", summary: "Market entry, 2022", action: { kind: "open_panel" } },
  { id: "case-2", kind: "case_study", title: "Linear pricing memo", summary: "Strategy, 2023", action: { kind: "open_panel" } },
  { id: "case-3", kind: "case_study", title: "Figma board contribution", summary: "Quarterly, 2024", action: { kind: "open_panel" } },
  { id: "svc-1", kind: "service", title: "Market-entry engagement", summary: "6–12 weeks · €38k+", action: { kind: "open_panel" } },
  { id: "svc-2", kind: "service", title: "Quarterly board contribution", summary: "€18k / quarter", action: { kind: "open_panel" } },
  { id: "svc-3", kind: "service", title: "Acquisition prep (EU)", summary: "6 weeks · €42k fixed", action: { kind: "open_panel" } },
  { id: "memory-1", kind: "memory", title: "Notes from a year on the road", summary: "Writing", action: { kind: "open_panel" } },
  { id: "memory-2", kind: "memory", title: "Berlin / Amsterdam / London", summary: "Locations", action: { kind: "open_panel" } },
  { id: "memory-3", kind: "memory", title: "Index Ventures residency", summary: "2022–2024", action: { kind: "open_panel" } },
  { id: "cta", kind: "booking", title: "Open a project conversation", summary: "Two engagements open Q1 2026", action: { kind: "open_panel" } },
];

export default function OrbitDemoPage() {
  const [inspecting, setInspecting] = useState<RoomObjectDef | null>(null);
  return (
    <main className="presence-dynamic-demo">
      <OrbitConstellation
        centerLabel="Heron Strategy"
        centerSublabel="Independent advisory"
        eyebrow="Orbit Constellation · live demo"
        satellites={SATELLITES}
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
