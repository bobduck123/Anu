"use client";

// PresenceWorldChooser — Pass 6.
//
// The visual entry point. Users see all engagement dynamics as cards
// with animated previews, can select one, and step into a live demo.
// Designed to consume a future backend Customisation Manifest v1 but
// runs on local static data today.

import { useState } from "react";
import { dynamicEntries } from "@/lib/presence/world/dynamicRegistry";
import type { DynamicId } from "@/lib/presence/world/dynamicRegistry";
import EngagementDynamicPreviewCard from "./EngagementDynamicPreviewCard";
import AtmospherePreviewStrip from "./AtmospherePreviewStrip";
import MotionProfilePreview from "./MotionProfilePreview";

const DEMO_HREFS: Partial<Record<DynamicId, string>> = {
  chamber_walk: "/p/rooms-gallery-painter",
  orbit_constellation: "/dynamics/orbit",
  object_tableau: "/dynamics/tableau",
  portal_cascade: "/dynamics/cascade",
};

export default function PresenceWorldChooser() {
  const [selected, setSelected] = useState<DynamicId>("chamber_walk");
  const entries = dynamicEntries();

  return (
    <div className="presence-world-chooser">
      <header className="chooser-head">
        <p className="chooser-eyebrow">Choose your world</p>
        <h1 className="chooser-title">How will visitors move through your Presence?</h1>
        <p className="chooser-sub">
          Each dynamic is a different way to be inhabited. Pick one to feel it; live previews
          on every card so you don't have to imagine.
        </p>
      </header>

      <section className="chooser-dynamics" aria-label="Engagement dynamics">
        {entries.map((entry) => (
          <EngagementDynamicPreviewCard
            key={entry.id}
            entry={entry}
            demoHref={DEMO_HREFS[entry.id]}
            selected={selected === entry.id}
            onSelect={setSelected}
          />
        ))}
      </section>

      <section className="chooser-row" aria-label="Atmosphere">
        <header>
          <p className="chooser-row-eyebrow">Atmosphere</p>
          <h2>The air of your room</h2>
        </header>
        <AtmospherePreviewStrip />
      </section>

      <section className="chooser-row" aria-label="Motion profile">
        <header>
          <p className="chooser-row-eyebrow">Motion</p>
          <h2>How the world should move</h2>
        </header>
        <MotionProfilePreview />
      </section>
    </div>
  );
}
