"use client";

// PresenceDnaRenderer
//
// The DNA-driven rendering authority. Resolves Presence DNA from the
// node, picks a blueprint, derives the theme genome, and dispatches to
// the chosen blueprint component. Profession is an input signal only —
// it never directly selects the final layout.

import { useMemo } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { resolvePresenceDna } from "@/lib/presence/dna/overlay";
import { deriveThemeGenome } from "@/lib/presence/theme/genome";
import { ctaLabel, selectBlueprint } from "@/lib/presence/blueprints/select";
import { fallbackBlueprint } from "@/lib/presence/blueprints/registry";

import NocturnalSonicRoom from "./blueprints/NocturnalSonicRoom";
import EditorialIdentityRoom from "./blueprints/EditorialIdentityRoom";
import MaterialStudioRoom from "./blueprints/MaterialStudioRoom";
import TrustConversionRoom from "./blueprints/TrustConversionRoom";
import ProgramCareRoom from "./blueprints/ProgramCareRoom";
import GlitchGalleryRoom from "./blueprints/GlitchGalleryRoom";

interface PresenceDnaRendererProps {
  node: PresenceNode;
  // When provided, overrides the blueprint selection. Used by Studio
  // preview / Phase 8 admin once that lands.
  forceBlueprint?: string;
}

export default function PresenceDnaRenderer({ node, forceBlueprint }: PresenceDnaRendererProps) {
  const { dna, theme, blueprint } = useMemo(() => {
    const dnaResolved = resolvePresenceDna(node);
    const themeResolved = deriveThemeGenome(dnaResolved, node.accent_color ?? null);
    const selected = forceBlueprint ?? selectBlueprint(dnaResolved);
    const safe = fallbackBlueprint(selected as ReturnType<typeof selectBlueprint>);
    return { dna: dnaResolved, theme: themeResolved, blueprint: safe };
  }, [node, forceBlueprint]);

  const cta = ctaLabel(dna);
  const props = { node, dna, theme: theme as ThemeGenome, ctaLabel: cta };

  switch (blueprint) {
    case "nocturnal_sonic":
      return <NocturnalSonicRoom {...props} />;
    case "material_studio":
      return <MaterialStudioRoom {...props} />;
    case "trust_conversion":
      return <TrustConversionRoom {...props} />;
    case "program":
      return <ProgramCareRoom {...props} />;
    case "glitch_gallery":
      return <GlitchGalleryRoom {...props} />;
    case "editorial_identity":
    default:
      return <EditorialIdentityRoom {...props} />;
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
