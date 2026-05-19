// RoomWorld — the layer above blueprints (Pass 3).
//
// A Presence Room is no longer a page composed of sections. It is an
// inhabitable environment composed of chambers and room objects. The
// blueprint chooses HOW to compose; the RoomWorld declares WHAT the
// room IS — its world type, atmosphere, navigation model, and the
// inventory of objects placed inside it.
//
// Resolution order in `selectRoomWorld(dna)`:
//   1. dna.signature/composition signals (most specific)
//   2. dna.practice/personality (atmosphere)
//   3. fallback to the legacy blueprint path
//
// Existing Pass 1/2 architecture is preserved. Rooms without a
// resolvable RoomWorld continue to render through PresenceDnaRenderer's
// blueprint dispatch.

import type { PresenceDna } from "@/lib/presence/dna/types";

// ---------------------------------------------------------------------------
// World type — the metaphor the room embodies
// ---------------------------------------------------------------------------
export type WorldType =
  | "gallery_room"
  | "sound_room"
  | "material_studio"
  | "trust_workshop"
  | "care_sanctuary"
  | "archive_room"
  | "field_room"
  | "consultation_office"
  | "venue_foyer"
  | "map_room"
  | "club_wall"
  | "commission_studio";

// ---------------------------------------------------------------------------
// Navigation model — how the inhabitant moves through the world
// ---------------------------------------------------------------------------
export type WorldNavigationModel =
  | "spatial_chambers"   // discrete named rooms; user moves between them
  | "object_orbit"        // single chamber, objects floating around an anchor
  | "wall_panels"         // horizontal wall of frames/panels
  | "desk_surface"        // tactile surface with placed objects
  | "archive_drawers"     // drawers that open to reveal content
  | "portal_cards"        // portal cards as room destinations
  | "floorplan"           // overhead floorplan view
  | "horizontal_gallery"  // scroll-driven horizontal gallery
  | "radial_index"        // radial/orbit index
  | "scene_stack";        // stacked scenes with snap

// ---------------------------------------------------------------------------
// Atmosphere — the air of the room
// ---------------------------------------------------------------------------
export type WorldAtmosphere =
  | "nocturnal"
  | "quiet_gallery"
  | "warm_material"
  | "paper_archive"
  | "soft_care"
  | "industrial_editorial"
  | "civic_field"
  | "ritual"
  | "cinematic";

// ---------------------------------------------------------------------------
// Spatial depth — how dimensional the room feels
// ---------------------------------------------------------------------------
export type WorldSpatialDepth =
  | "flat_art_directed"
  | "layered_2d"
  | "pseudo_3d"
  | "immersive";

// ---------------------------------------------------------------------------
// Transition style — how chambers/objects change state
// ---------------------------------------------------------------------------
export type WorldTransitionStyle =
  | "fade"
  | "slide"
  | "fold"
  | "glitch"
  | "curtain"
  | "zoom"
  | "snap"
  | "drawer"
  | "parallax";

// ---------------------------------------------------------------------------
// Room object — a thing inside the room
// ---------------------------------------------------------------------------
export type RoomObjectType =
  | "artwork"
  | "quote"
  | "audio"
  | "material"
  | "testimonial"
  | "case_study"
  | "service"
  | "availability"
  | "archive_fragment"
  | "map_pin"
  | "cta_portal"
  | "portrait"
  | "program_card";

export type RoomObjectRole =
  | "hero_object"
  | "wall_object"
  | "table_object"
  | "drawer_object"
  | "floating_object"
  | "portal_object";

export type RoomObjectInteraction =
  | "inspect"
  | "expand"
  | "drag"
  | "slide"
  | "hover_reveal"
  | "tap_reveal"
  | "play"
  | "compare"
  | "open_portal";

export interface RoomObject {
  id: string;
  type: RoomObjectType;
  role: RoomObjectRole;
  interaction: RoomObjectInteraction;
  // Display payload — varies by type
  label?: string;
  caption?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  href?: string | null;
  meta?: string | null;
  // Spatial hint — chamber index or position label
  chamber?: string;
  // Free-form props for the room renderer to consume
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// A chamber — a named region inside the room
// ---------------------------------------------------------------------------
export interface RoomChamber {
  id: string;
  label: string;        // "Wall", "Booth", "Desk", "Archive"
  glyph?: string;       // 1–2 char index glyph
  summary?: string;     // short subtitle for nav
}

// ---------------------------------------------------------------------------
// Mobile nav modes (Pass 3 ships RoomDock + PortalSheet; floating_index
// from Pass 1 remains available for legacy/anchor rooms)
// ---------------------------------------------------------------------------
export type MobileRoomNavMode = "room_dock" | "portal_sheet" | "floating_index" | "none";

// ---------------------------------------------------------------------------
// RoomWorld — the top-level world descriptor
// ---------------------------------------------------------------------------
export interface RoomWorld {
  world_type: WorldType;
  navigation_model: WorldNavigationModel;
  mobile_nav_mode: MobileRoomNavMode;
  chambers: RoomChamber[];      // chamber_count = chambers.length
  atmosphere: WorldAtmosphere;
  spatial_depth: WorldSpatialDepth;
  transition_style: WorldTransitionStyle;
  room_objects: RoomObject[];
  // For SEO and accessibility fallback, a room can present its content
  // semantically when JS/motion is unavailable. This flag is honoured by
  // RoomShell.
  semantic_fallback_label: string;
}
