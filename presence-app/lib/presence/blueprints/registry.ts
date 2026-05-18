// Room blueprint registry. Each blueprint is a compositional strategy,
// NOT a profession template. Selection is by DNA via `selectBlueprint`.

import type { RoomBlueprint } from "@/lib/presence/dna/types";

export interface BlueprintEntry {
  id: RoomBlueprint;
  summary: string;
  implemented: boolean;
}

export const BLUEPRINT_REGISTRY: Record<RoomBlueprint, BlueprintEntry> = {
  editorial_identity: {
    id: "editorial_identity",
    summary: "Quiet, restrained editorial scroll. Statement hero, work-or-quote, after-story proof.",
    implemented: true,
  },
  trust_conversion: {
    id: "trust_conversion",
    summary: "Trust-led service room. Early proof, service ladder, before/after as hero signature.",
    implemented: true,
  },
  material_studio: {
    id: "material_studio",
    summary: "Material-first craft room. Materials board, collage rhythm, commission CTA.",
    implemented: true,
  },
  program: {
    id: "program",
    summary: "Care/program pathway room. Service-first entry, ritual booking signature, soft conversion.",
    implemented: true,
  },
  glitch_gallery: {
    id: "glitch_gallery",
    summary: "Nocturnal glitch wall. Audio-first entry, glitch gallery signature, kinetic mobile nav.",
    implemented: true,
  },
  nocturnal_sonic: {
    id: "nocturnal_sonic",
    summary: "Performer-led nocturnal room. Booking-pathway-as-hero, audio strip, event archive.",
    implemented: true,
  },
  proof_wall: {
    id: "proof_wall",
    summary: "Case-study heavy room. Proof early and hero-level. Scaffolded — uses trust_conversion fallback.",
    implemented: false,
  },
  atmosphere: {
    id: "atmosphere",
    summary: "Atmosphere-led venue/space room. Scaffolded — uses program fallback.",
    implemented: false,
  },
  craft: {
    id: "craft",
    summary: "Generic craft room. Scaffolded — uses material_studio fallback.",
    implemented: false,
  },
  archive: {
    id: "archive",
    summary: "Index-wall archive room. Scaffolded.",
    implemented: false,
  },
  booking: {
    id: "booking",
    summary: "Booking-led service room. Scaffolded — uses program fallback.",
    implemented: false,
  },
  commission: {
    id: "commission",
    summary: "Commission pathway room. Scaffolded — uses editorial_identity fallback.",
    implemented: false,
  },
  civic: {
    id: "civic",
    summary: "Civic/organisational room. Scaffolded.",
    implemented: false,
  },
  field_record: {
    id: "field_record",
    summary: "Field/documentary room. Scaffolded.",
    implemented: false,
  },
};

export function isImplementedBlueprint(id: RoomBlueprint): boolean {
  return Boolean(BLUEPRINT_REGISTRY[id]?.implemented);
}

// Safe fallback chain for blueprints that are not yet implemented.
// Used by the renderer so unimplemented blueprints still produce a real
// room rather than an empty page.
export function fallbackBlueprint(id: RoomBlueprint): RoomBlueprint {
  if (BLUEPRINT_REGISTRY[id]?.implemented) return id;
  switch (id) {
    case "proof_wall":
      return "trust_conversion";
    case "atmosphere":
      return "program";
    case "craft":
      return "material_studio";
    case "booking":
      return "program";
    case "commission":
      return "editorial_identity";
    case "archive":
      return "glitch_gallery";
    case "civic":
      return "program";
    case "field_record":
      return "editorial_identity";
    default:
      return "editorial_identity";
  }
}
