// Backend → friendly label dictionary.
//
// The backend Customisation Manifest v1 returns canonical IDs and
// labels that are accurate but technical-sounding ("Chamber Walk",
// "Underground DJ", "Gallery Frame Pack"). The Presence Studio UI
// keeps warmer, editorial copy ("Walk the Rooms", "The Sound Room",
// "Paper & Wall").
//
// When the adapter consumes a backend manifest, it applies this
// dictionary so the labels the visitor sees never regress to the
// internal vocabulary. Backend IDs whose label is missing here fall
// through to the backend's own `label` field unchanged.

export const FRIENDLY_BACKEND_LABELS: Record<string, string> = {
  // engagement_dynamics (Walk / Orbit / Bench / Doors)
  chamber_walk: "Walk the Rooms",
  orbit_constellation: "Orbit the Work",
  object_tableau: "Approach the Bench",
  portal_cascade: "Open the Doors",

  // room_worlds
  "rooms-gallery-painter": "The Quiet Gallery",
  "rooms-underground-dj": "The Sound Room",
  "rooms-material-carpenter": "The Material Studio",

  // archetypes
  artist: "Artist",
  dj: "Sound artist",
  maker: "Maker",
  practitioner: "Practitioner",
  consultant: "Consultant",
  organisation: "Venue or programme",
  local_business: "Local practice",

  // motion_profiles
  calm: "Still",
  cinematic: "Cinematic",
  kinetic: "Kinetic",
  minimal: "Spare",
  ritual: "Tactile",
  playful: "Playful",

  // atmosphere_packs
  quiet_gallery: "Quiet Gallery",
  nocturnal_signal: "Nocturnal",
  warm_material: "Warm Workshop",

  // object_skin_packs
  gallery_frame_pack: "Paper & Wall",
  signal_tile_pack: "Signal Tile",
  material_studio_pack: "Wood Grain",
};

/** Returns the friendly UI label for a backend ID, falling back to
 * the supplied default (typically the backend's own `label`). Never
 * returns the bare backend ID — if no fallback is supplied and the
 * dictionary is empty, returns an empty string. */
export function friendlyLabelFor(backendId: string | null | undefined, fallback?: string | null): string {
  if (!backendId) return fallback ?? "";
  const mapped = FRIENDLY_BACKEND_LABELS[backendId];
  if (mapped) return mapped;
  if (fallback && fallback.trim().length > 0) return fallback;
  return "";
}
