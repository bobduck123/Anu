"use client";

// AtmosphereLayer — the air of the room. Renders the background
// atmosphere appropriate to the world's atmosphere descriptor. Sits
// behind all chamber content, aria-hidden.

import { useMemo } from "react";
import BioluminescentField from "./BioluminescentField";
import { fallbackAtmosphere } from "@/lib/presence/world/registry";
import type { WorldAtmosphere } from "@/lib/presence/world/types";

interface AtmosphereLayerProps {
  atmosphere: WorldAtmosphere;
}

export default function AtmosphereLayer({ atmosphere }: AtmosphereLayerProps) {
  const resolved = useMemo(() => fallbackAtmosphere(atmosphere), [atmosphere]);

  if (resolved === "nocturnal") {
    return (
      <div className="presence-atmo presence-atmo-nocturnal" aria-hidden>
        <div className="atmo-veil" />
        <div className="atmo-grid" />
        <BioluminescentField density="moderate" hue="rgba(255, 216, 77, 1)" />
      </div>
    );
  }

  if (resolved === "quiet_gallery") {
    return (
      <div className="presence-atmo presence-atmo-quiet-gallery" aria-hidden>
        <div className="atmo-wall" />
        <div className="atmo-paper-grain" />
      </div>
    );
  }

  if (resolved === "warm_material") {
    return (
      <div className="presence-atmo presence-atmo-warm-material" aria-hidden>
        <div className="atmo-warm-wash" />
        <div className="atmo-dust" />
      </div>
    );
  }

  // Defensive default — quiet gallery
  return (
    <div className="presence-atmo presence-atmo-quiet-gallery" aria-hidden>
      <div className="atmo-wall" />
      <div className="atmo-paper-grain" />
    </div>
  );
}
