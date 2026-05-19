// Signature module registry. Marks what is implemented in this pass
// versus scaffolded for the next pass. The renderer uses the registry
// to pick a safe fallback module.

import type { SignatureModule } from "@/lib/presence/dna/types";

export interface SignatureEntry {
  id: SignatureModule;
  summary: string;
  implemented: boolean;
}

export const SIGNATURE_REGISTRY: Record<SignatureModule, SignatureEntry> = {
  glitch_gallery: { id: "glitch_gallery", summary: "Asymmetric image wall with controlled glitch bursts.", implemented: true },
  materials_board: { id: "materials_board", summary: "Tactile pinboard of materials, finishes, and origins.", implemented: true },
  before_after_slider: { id: "before_after_slider", summary: "Draggable before/after image pairs for trust rooms.", implemented: true },

  gallery_wall: { id: "gallery_wall", summary: "Museum-curated quiet hanging with paper-edged frames and museum-label captions.", implemented: true },
  audio_strip: { id: "audio_strip", summary: "Persistent audio strip with media embeds. Scaffolded.", implemented: false },
  availability_panel: { id: "availability_panel", summary: "Live availability + next openings. Scaffolded.", implemented: false },
  press_wall: { id: "press_wall", summary: "Press logos and quotes wall. Scaffolded.", implemented: false },
  project_timeline: { id: "project_timeline", summary: "Project timeline with phases and outcomes. Scaffolded.", implemented: false },
  map_memory: { id: "map_memory", summary: "Map of places worked / performed / exhibited. Scaffolded.", implemented: false },
  ritual_booking_panel: { id: "ritual_booking_panel", summary: "Care-pathway booking panel. Scaffolded.", implemented: false },
  impact_counter: { id: "impact_counter", summary: "Aggregate impact counters. Scaffolded.", implemented: false },
  quote_oracle: { id: "quote_oracle", summary: "Single hero-sized rotating editorial quote with selectable attribution strip.", implemented: true },
  process_reel: { id: "process_reel", summary: "Process reel — frame-by-frame studio steps. Scaffolded.", implemented: false },
  program_grid: { id: "program_grid", summary: "Program grid for civic/cultural rooms. Scaffolded.", implemented: false },
  commission_pathway: { id: "commission_pathway", summary: "Commission pathway ladder. Scaffolded.", implemented: false },
  archive_wall: { id: "archive_wall", summary: "Archive index wall. Scaffolded.", implemented: false },
  mobile_room_switcher: { id: "mobile_room_switcher", summary: "Mobile-only room/section switcher. Scaffolded.", implemented: false },
};

export function isImplementedSignature(id: SignatureModule): boolean {
  return Boolean(SIGNATURE_REGISTRY[id]?.implemented);
}

// Choose a safe implemented fallback when DNA picks an unimplemented
// signature module. The fallback should still be intentional — pick
// the closest implemented module by category.
export function fallbackSignature(id: SignatureModule): SignatureModule {
  if (SIGNATURE_REGISTRY[id]?.implemented) return id;
  switch (id) {
    case "audio_strip":
      return "glitch_gallery";
    case "gallery_wall":
    case "press_wall":
    case "archive_wall":
      return "glitch_gallery";
    case "process_reel":
    case "commission_pathway":
      return "materials_board";
    case "availability_panel":
    case "ritual_booking_panel":
    case "program_grid":
      return "before_after_slider";
    case "project_timeline":
    case "impact_counter":
    case "quote_oracle":
    case "map_memory":
    case "mobile_room_switcher":
      return "before_after_slider";
    default:
      return "glitch_gallery";
  }
}
