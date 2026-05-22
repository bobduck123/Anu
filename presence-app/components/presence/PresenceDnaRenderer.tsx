"use client";

// PresenceDnaRenderer
//
// The DNA-driven rendering authority. Pass 3 introduces RoomWorlds: when
// the resolved DNA maps to a world type implemented as a room (gallery,
// sound, material studio), the renderer dispatches to a chamber-based
// room. Otherwise it falls back to the Pass 1/2 blueprint chain so we
// don't break any existing rooms.

import { useMemo } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { resolvePresenceDna } from "@/lib/presence/dna/overlay";
import { deriveThemeGenome } from "@/lib/presence/theme/genome";
import { ctaLabel, selectBlueprint } from "@/lib/presence/blueprints/select";
import { fallbackBlueprint } from "@/lib/presence/blueprints/registry";
import { selectRoomWorld } from "@/lib/presence/world/select";
import { isImplementedWorld } from "@/lib/presence/world/registry";
import { GGM_RENDERER_KEY, resolveCustomRendererKey } from "@/lib/presence/ggm/activate";

import NocturnalSonicRoom from "./blueprints/NocturnalSonicRoom";
import EditorialIdentityRoom from "./blueprints/EditorialIdentityRoom";
import MaterialStudioRoom from "./blueprints/MaterialStudioRoom";
import TrustConversionRoom from "./blueprints/TrustConversionRoom";
import ProgramCareRoom from "./blueprints/ProgramCareRoom";
import GlitchGalleryRoom from "./blueprints/GlitchGalleryRoom";

// Pass 3 room worlds
import GalleryRoom from "./blueprints/GalleryRoom";
import SoundRoom from "./blueprints/SoundRoom";
import MaterialStudioDesk from "./blueprints/MaterialStudioDesk";

// Custom (per-pilot) faithful renderers — these short-circuit the DNA chain.
import GgmFaithfulRoom from "./ggm/GgmFaithfulRoom";

interface PresenceDnaRendererProps {
  node: PresenceNode;
  // When provided, overrides the blueprint selection. Used by Studio
  // preview / future admin.
  forceBlueprint?: string;
  // When true, skip the Pass 3 room-world dispatch and use the Pass 1/2
  // blueprint chain only. Reserved for fallback / debugging.
  forceLegacyBlueprints?: boolean;
}

export default function PresenceDnaRenderer({
  node,
  forceBlueprint,
  forceLegacyBlueprints = false,
}: PresenceDnaRendererProps) {
  const plan = useMemo(() => {
    const dnaResolved = resolvePresenceDna(node);
    const themeResolved = deriveThemeGenome(dnaResolved, node.accent_color ?? null);
    const world = selectRoomWorld(node, dnaResolved);
    const selected = forceBlueprint ?? selectBlueprint(dnaResolved);
    const safe = fallbackBlueprint(selected as ReturnType<typeof selectBlueprint>);
    return { dna: dnaResolved, theme: themeResolved, blueprint: safe, world };
  }, [node, forceBlueprint]);

  // Per-pilot custom renderer dispatch runs AFTER the hook call (rules of
  // hooks) but BEFORE the DNA chain dispatch. This is how GGM (and any
  // future pilot with an authored renderer key) gets a faithful surface
  // while every other Room continues through the existing DNA chain. The
  // `forceBlueprint` escape hatch still bypasses the custom renderer so
  // Studio preview can compare against blueprint variants.
  if (!forceBlueprint) {
    const customKey = resolveCustomRendererKey(node);
    if (customKey === GGM_RENDERER_KEY) {
      return <GgmFaithfulRoom node={node} />;
    }
  }

  const cta = ctaLabel(plan.dna);
  const sharedProps = { node, dna: plan.dna, theme: plan.theme as ThemeGenome, ctaLabel: cta };

  // Pass 3 dispatch — when the world type is implemented as a room,
  // render it. Otherwise fall through to the blueprint chain.
  if (!forceLegacyBlueprints && isImplementedWorld(plan.world.world_type)) {
    switch (plan.world.world_type) {
      case "gallery_room":
        return <GalleryRoom {...sharedProps} world={plan.world} />;
      case "sound_room":
        return <SoundRoom {...sharedProps} world={plan.world} />;
      case "material_studio":
      case "commission_studio":
        return <MaterialStudioDesk {...sharedProps} world={plan.world} />;
    }
  }

  // Pass 1/2 blueprint chain — fallback for unimplemented worlds and
  // for non-converted demo rooms (consultant, healer, local-carpenter).
  switch (plan.blueprint) {
    case "nocturnal_sonic":
      return <NocturnalSonicRoom {...sharedProps} />;
    case "material_studio":
      return <MaterialStudioRoom {...sharedProps} />;
    case "trust_conversion":
      return <TrustConversionRoom {...sharedProps} />;
    case "program":
      return <ProgramCareRoom {...sharedProps} />;
    case "glitch_gallery":
      return <GlitchGalleryRoom {...sharedProps} />;
    case "editorial_identity":
    default:
      return <EditorialIdentityRoom {...sharedProps} />;
  }
}

// Export DNA resolution for callers that need to make decisions before
// render (e.g. metadata, SSR pre-pass).
export function getRenderPlan(node: PresenceNode): {
  dna: PresenceDna;
  theme: ThemeGenome;
  blueprint: ReturnType<typeof selectBlueprint>;
  ctaLabel: string;
} {
  const dna = resolvePresenceDna(node);
  const theme = deriveThemeGenome(dna, node.accent_color ?? null);
  const selected = selectBlueprint(dna);
  return {
    dna,
    theme,
    blueprint: fallbackBlueprint(selected),
    ctaLabel: ctaLabel(dna),
  };
}
