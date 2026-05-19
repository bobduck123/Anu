// RoomWorld registry. Documents which world types, navigation models,
// atmospheres, and mobile nav modes are implemented vs scaffolded in
// this pass. Used by the renderer to fall back safely.

import type { WorldType, WorldNavigationModel, WorldAtmosphere, MobileRoomNavMode } from "./types";

export interface WorldEntry<T extends string> {
  id: T;
  summary: string;
  implemented: boolean;
}

export const WORLD_REGISTRY: Record<WorldType, WorldEntry<WorldType>> = {
  gallery_room:        { id: "gallery_room",        summary: "Quiet gallery with works hanging on a wall. Pass 3.", implemented: true },
  sound_room:          { id: "sound_room",          summary: "Nocturnal sonic chambers — booth, signal wall, archive, booking. Pass 3.", implemented: true },
  material_studio:     { id: "material_studio",     summary: "Workbench / shelf / pathway / commission desk surface. Pass 3.", implemented: true },
  trust_workshop:      { id: "trust_workshop",      summary: "Front-of-shop trust signals, job board, quote desk. Falls back to existing TrustConversion blueprint.", implemented: false },
  care_sanctuary:      { id: "care_sanctuary",      summary: "Care pathway sanctuary. Falls back to existing ProgramCare blueprint.", implemented: false },
  consultation_office: { id: "consultation_office", summary: "Editorial consulting office. Falls back to existing EditorialIdentity blueprint.", implemented: false },
  archive_room:        { id: "archive_room",        summary: "Archive with openable drawers. Scaffolded.", implemented: false },
  venue_foyer:         { id: "venue_foyer",         summary: "Venue foyer with program portals. Scaffolded.", implemented: false },
  field_room:          { id: "field_room",          summary: "Field/documentary chambers. Scaffolded.", implemented: false },
  map_room:            { id: "map_room",            summary: "Floor-plan map navigation. Scaffolded.", implemented: false },
  club_wall:           { id: "club_wall",           summary: "Club wall variation of sound_room. Scaffolded — resolves to sound_room.", implemented: false },
  commission_studio:   { id: "commission_studio",   summary: "Commission-led studio. Resolves to material_studio for now.", implemented: false },
};

export const NAVIGATION_REGISTRY: Record<WorldNavigationModel, WorldEntry<WorldNavigationModel>> = {
  spatial_chambers:   { id: "spatial_chambers",   summary: "Named chambers with scroll-snap + keyboard + nav rail.", implemented: true },
  wall_panels:        { id: "wall_panels",        summary: "Horizontal wall of frames/panels with pointer-drag.", implemented: true },
  desk_surface:       { id: "desk_surface",       summary: "Tilted tactile surface with placed objects.", implemented: true },
  archive_drawers:    { id: "archive_drawers",    summary: "Drawers that pull out to reveal content. Scaffolded — falls back to spatial_chambers.", implemented: false },
  portal_cards:       { id: "portal_cards",       summary: "Portal cards as room destinations. Scaffolded.", implemented: false },
  object_orbit:       { id: "object_orbit",       summary: "Objects floating around an anchor. Scaffolded.", implemented: false },
  floorplan:          { id: "floorplan",          summary: "Overhead floorplan view. Scaffolded.", implemented: false },
  horizontal_gallery: { id: "horizontal_gallery", summary: "Pure horizontal gallery scroll. Scaffolded — falls back to wall_panels.", implemented: false },
  radial_index:       { id: "radial_index",       summary: "Radial index. Scaffolded.", implemented: false },
  scene_stack:        { id: "scene_stack",        summary: "Stacked scenes with snap. Scaffolded.", implemented: false },
};

export const ATMOSPHERE_REGISTRY: Record<WorldAtmosphere, WorldEntry<WorldAtmosphere>> = {
  nocturnal:            { id: "nocturnal",            summary: "Bioluminescent particle field, dark.", implemented: true },
  quiet_gallery:        { id: "quiet_gallery",        summary: "Paper-grain gallery wall light.", implemented: true },
  warm_material:        { id: "warm_material",        summary: "Workshop dust + amber light.", implemented: true },
  paper_archive:        { id: "paper_archive",        summary: "Archive-room paper texture. Scaffolded — resolves to quiet_gallery.", implemented: false },
  soft_care:            { id: "soft_care",            summary: "Soft gradient sanctuary light. Scaffolded — resolves to quiet_gallery.", implemented: false },
  industrial_editorial: { id: "industrial_editorial", summary: "Monochrome editorial office light. Scaffolded — resolves to quiet_gallery.", implemented: false },
  civic_field:          { id: "civic_field",          summary: "Civic noticeboard field. Scaffolded.", implemented: false },
  ritual:               { id: "ritual",               summary: "Cultural ritual room. Scaffolded.", implemented: false },
  cinematic:            { id: "cinematic",            summary: "Cinematic dark room. Scaffolded — resolves to nocturnal.", implemented: false },
};

export const MOBILE_NAV_REGISTRY: Record<MobileRoomNavMode, WorldEntry<MobileRoomNavMode>> = {
  room_dock:       { id: "room_dock",       summary: "Bottom dock that moves between chambers/objects.", implemented: true },
  portal_sheet:    { id: "portal_sheet",    summary: "Bottom sheet that presents the room as destinations.", implemented: true },
  floating_index:  { id: "floating_index",  summary: "Pass 1 floating index pill. Retained for legacy rooms.", implemented: true },
  none:            { id: "none",            summary: "No mobile nav rendered (rooms with own nav).", implemented: true },
};

export function isImplementedWorld(id: WorldType): boolean {
  return Boolean(WORLD_REGISTRY[id]?.implemented);
}

export function fallbackAtmosphere(id: WorldAtmosphere): WorldAtmosphere {
  if (ATMOSPHERE_REGISTRY[id]?.implemented) return id;
  switch (id) {
    case "paper_archive":        return "quiet_gallery";
    case "soft_care":            return "quiet_gallery";
    case "industrial_editorial": return "quiet_gallery";
    case "civic_field":          return "warm_material";
    case "ritual":               return "warm_material";
    case "cinematic":            return "nocturnal";
    default:                     return "quiet_gallery";
  }
}
