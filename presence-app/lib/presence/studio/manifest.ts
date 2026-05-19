// Presence Studio manifest — human-facing types and local fallback.
//
// The Studio UI consumes this typed shape. The adapter (`adapter.ts`)
// fetches `GET /api/presence/customisation/manifest` and normalises it
// into this shape; when the backend is unavailable it returns this
// local fallback unchanged.
//
// Internal IDs (chamber_walk, orbit_constellation, object_tableau,
// portal_cascade, rooms-gallery-painter, etc.) live in `backendId`
// fields only. UI code reads `id` and `label` — never `backendId`.

export interface StudioIdentity {
  id: string;                     // human id e.g. "artist", "sound"
  label: string;                  // "Artist", "Sound artist"
  tagline: string;
  plain: string;
  practices: string[];
  recommended_world: string;      // human id
  recommended_movement: string;   // human id
  recommended_mood: string;
  recommended_pace: string;
  recommended_material: string;
  recommended_contact: string;
  /** Backend archetype identifier (the value submitted to the API). */
  backendId: string;
}

export interface StudioWorld {
  id: string;                     // human id e.g. "gallery"
  label: string;                  // "The Quiet Gallery"
  oneLine: string;
  bestFor: string[];
  rooms: string[];
  mood: string;
  tone: string;
  accent: string;
  /** Optional live demo URL inside the app. */
  demoHref?: string;
  /** Backend room_world identifier. */
  backendId: string;
}

export interface StudioMovement {
  id: string;                     // "rooms" | "orbit" | "bench" | "doors"
  label: string;
  sub: string;
  bestFor: string[];
  first10s: string;
  feelsLike: string;
  verbs: string[];
  /** Optional live demo URL. */
  demoHref?: string;
  /** Backend engagement_dynamic id (chamber_walk / orbit_constellation / etc.). */
  backendId: string;
}

export interface StudioMood {
  id: string;
  label: string;
  sub: string;
  swatches: string[];
  wash: string;
  /** Backend atmosphere_pack id. */
  backendId: string;
}

export interface StudioPace {
  id: string;
  label: string;
  hint: string;
  ease: string;
  strength: number;
  /** Backend motion_profile id. */
  backendId: string;
}

export interface StudioMaterial {
  id: string;
  label: string;
  sub: string;
  swatches: string[];
  /** Backend object_skin_pack id. */
  backendId: string;
}

export interface StudioContactStyle {
  id: string;
  label: string;
  sub: string;
  bestFor: string[];
  previewFields: string[];
  /** Backend contact_style id. */
  backendId: string;
}

export interface StudioManifest {
  version: string;
  identities: StudioIdentity[];
  worlds: StudioWorld[];
  movements: StudioMovement[];
  moods: StudioMood[];
  paces: StudioPace[];
  materials: StudioMaterial[];
  contacts: StudioContactStyle[];
  /** Provenance — "backend" when fetched from the API, "local" when the
   * fallback was used. UI reads this to show a small "saved locally"
   * indicator when offline. */
  source: "backend" | "local";
}

// ---------------------------------------------------------------------------
// Local fallback — identical shape to the backend response.
// Used when /api/presence/customisation/manifest is unavailable.
// ---------------------------------------------------------------------------
export const LOCAL_STUDIO_MANIFEST: StudioManifest = {
  version: "studio-v1-local-fallback",
  source: "local",
  identities: [
    {
      id: "artist", backendId: "artist", label: "Artist",
      tagline: "I make things people look at.",
      plain: "Painters, photographers, sculptors, illustrators — anyone whose work hangs on a wall, sits on a plinth, or lives on a screen.",
      practices: ["Painter", "Photographer", "Sculptor", "Illustrator", "Mixed media"],
      recommended_world: "gallery",
      recommended_movement: "rooms",
      recommended_mood: "north-light",
      recommended_pace: "still",
      recommended_material: "paper-wall",
      recommended_contact: "enquiry",
    },
    {
      id: "sound", backendId: "sound", label: "Sound artist",
      tagline: "I work in sound — performance, recording, programming.",
      plain: "DJs, producers, performers, labels, programmers. People whose practice happens at night, in venues, on records.",
      practices: ["DJ", "Producer", "Performer", "Label", "Programmer"],
      recommended_world: "sound",
      recommended_movement: "orbit",
      recommended_mood: "nocturnal",
      recommended_pace: "cinematic",
      recommended_material: "signal-tile",
      recommended_contact: "booking",
    },
    {
      id: "maker", backendId: "maker", label: "Maker",
      tagline: "I make things people hold.",
      plain: "Carpenters, ceramicists, leatherworkers, glassblowers, jewellers. Practices with a bench, materials, tools, commissions.",
      practices: ["Carpenter", "Ceramicist", "Jeweller", "Leather", "Builder"],
      recommended_world: "studio",
      recommended_movement: "bench",
      recommended_mood: "warm-workshop",
      recommended_pace: "tactile",
      recommended_material: "wood-grain",
      recommended_contact: "commission",
    },
    {
      id: "practitioner", backendId: "practitioner", label: "Practitioner",
      tagline: "I help people. I do this for a living.",
      plain: "Consultants, coaches, healers, strategists, therapists. Practices made of services, proof, and relationships.",
      practices: ["Consultant", "Coach", "Healer", "Therapist", "Strategist"],
      recommended_world: "gallery",
      recommended_movement: "orbit",
      recommended_mood: "north-light",
      recommended_pace: "cinematic",
      recommended_material: "ceramic",
      recommended_contact: "calendar",
    },
    {
      id: "venue", backendId: "venue", label: "Venue or programme",
      tagline: "We run a space. We programme things.",
      plain: "Venues, festivals, residencies, labels, collectives. Identities that hold many other identities.",
      practices: ["Venue", "Festival", "Residency", "Collective", "Label"],
      recommended_world: "sound",
      recommended_movement: "doors",
      recommended_mood: "cinematic",
      recommended_pace: "cinematic",
      recommended_material: "signal-tile",
      recommended_contact: "booking",
    },
  ],
  worlds: [
    {
      id: "gallery", backendId: "rooms-gallery-painter", label: "The Quiet Gallery",
      oneLine: "Works on walls. North light. The room steps back so the work can step forward.",
      bestFor: ["Artists", "Practitioners with a body of work", "Anyone selling something to look at"],
      rooms: ["Wall I", "Wall II", "Archive", "Studio"],
      mood: "north-light", tone: "paper", accent: "#b94522",
      demoHref: "/p/rooms-gallery-painter",
    },
    {
      id: "sound", backendId: "rooms-underground-dj", label: "The Sound Room",
      oneLine: "Booth, signal wall, archive of nights. Low light, low frequency, present.",
      bestFor: ["DJs & producers", "Venues & programmes", "Practices that happen at night"],
      rooms: ["The Booth", "Signal Wall", "Archive of Nights", "Booking"],
      mood: "nocturnal", tone: "stage", accent: "#d8a44a",
      demoHref: "/p/rooms-underground-dj",
    },
    {
      id: "studio", backendId: "rooms-material-carpenter", label: "The Material Studio",
      oneLine: "A bench, a shelf, materials, a commissions desk. Every object has been touched.",
      bestFor: ["Makers", "Commission-led practices", "Anyone whose work has a grain"],
      rooms: ["The Bench", "Finished Shelf", "Materials", "Commissions Desk"],
      mood: "warm-workshop", tone: "workshop", accent: "#c47a3a",
      demoHref: "/p/rooms-material-carpenter",
    },
  ],
  movements: [
    {
      id: "rooms", backendId: "chamber_walk", label: "Walk the Rooms",
      sub: "Room to room, one step at a time.",
      bestFor: ["Bodies of work", "Sequenced thinking", "Practices with phases"],
      first10s: "Visitors arrive in your first room. They move forward to the next. The room ahead is already visible, faintly.",
      feelsLike: "Walking through a small museum, alone, at the hour after opening.",
      verbs: ["Step forward", "Step back", "Inspect", "Retreat"],
      demoHref: "/p/rooms-gallery-painter",
    },
    {
      id: "orbit", backendId: "orbit_constellation", label: "Orbit the Work",
      sub: "A central mark. Everything else moves around it.",
      bestFor: ["DJs, consultants, multidisciplinary practices", "Networks of work", "Identities held together by one centre"],
      first10s: "Visitors face your name. Around it, work and services orbit. They turn the orbit; one satellite pulls forward.",
      feelsLike: "A small planetarium with a single lit centre.",
      verbs: ["Turn left", "Turn right", "Focus", "Retreat"],
      demoHref: "/dynamics/orbit",
    },
    {
      id: "bench", backendId: "object_tableau", label: "Approach the Bench",
      sub: "A surface. Things on it. Lean in.",
      bestFor: ["Makers, healers, food, craft, local practices", "Work you can hold", "Practices that show their materials"],
      first10s: "Visitors face a bench from a slight angle. They tilt to see deeper. Objects sit in clusters — bench, shelf, materials, desk.",
      feelsLike: "Standing at someone's worktable while they take a phone call.",
      verbs: ["Tilt", "Approach", "Shift cluster", "Inspect"],
      demoHref: "/dynamics/tableau",
    },
    {
      id: "doors", backendId: "portal_cascade", label: "Open the Doors",
      sub: "Layered doors. Step through one, the next opens.",
      bestFor: ["Venues, festivals, performers, launches", "Editorial programmes", "Practices that unfold in chapters"],
      first10s: "Visitors see the first door, large. They open it; the next stands behind. Each door is a chapter — season, night, work, ticket.",
      feelsLike: "A theatre foyer where each curtain reveals the next.",
      verbs: ["Step through", "Branch", "Fold back", "Inspect"],
      demoHref: "/dynamics/cascade",
    },
  ],
  moods: [
    { id: "north-light", backendId: "north-light", label: "North Light", sub: "Daylight from a high window. Quiet.", swatches: ["#fbfaf6","#ece6d8","#1a1814"], wash: "linear-gradient(180deg,#ffffff,#ece6d8)" },
    { id: "warm-workshop", backendId: "warm-workshop", label: "Warm Workshop", sub: "Amber bench-light, sawdust, low ceiling.", swatches: ["#2d1f12","#c47a3a","#f3e6cf"], wash: "radial-gradient(circle at 22% 28%,rgba(224,164,85,0.22),transparent 50%),linear-gradient(135deg,#1c1109,#2d1f12 60%,#23170d)" },
    { id: "nocturnal", backendId: "nocturnal", label: "Nocturnal", sub: "Bioluminescent dark. Bass present.", swatches: ["#06060b","#ffd84d","#7dd0ff"], wash: "radial-gradient(circle at 18% 20%,rgba(255,216,77,0.18),transparent 36%),linear-gradient(160deg,#06060b,#0e0f1a 55%,#07070b)" },
    { id: "cinematic", backendId: "cinematic", label: "Cinematic", sub: "Black room. One warm key light.", swatches: ["#0e0e10","#d8a44a","#f0eee9"], wash: "radial-gradient(circle at 30% 18%,rgba(216,164,74,0.22),transparent 40%),linear-gradient(140deg,#08080a,#181820 60%,#0e0e10)" },
    { id: "editorial", backendId: "editorial", label: "Editorial", sub: "Newsprint, sharp greys, paper-thin.", swatches: ["#fbfbfb","#0d0d0d","#b8b8b6"], wash: "linear-gradient(180deg,#fbfbfb,#e9e7e2)" },
  ],
  paces: [
    { id: "still", backendId: "still", label: "Still", hint: "Almost no movement. Gallery-quiet.", ease: "cubic-bezier(0.2, 0.7, 0.1, 1)", strength: 0.18 },
    { id: "tactile", backendId: "tactile", label: "Tactile", hint: "Weighted. Things have mass.", ease: "cubic-bezier(0.32, 0.72, 0, 1)", strength: 0.32 },
    { id: "cinematic", backendId: "cinematic", label: "Cinematic", hint: "Camera-like. Slow, deliberate.", ease: "cubic-bezier(0.45, 0, 0.15, 1)", strength: 0.5 },
    { id: "drifting", backendId: "drifting", label: "Drifting", hint: "Slow rotational ease. Hypnotic.", ease: "cubic-bezier(0.5, 0.0, 0.2, 1)", strength: 0.65 },
  ],
  materials: [
    { id: "paper-wall", backendId: "paper-wall", label: "Paper & Wall", sub: "Rag paper, matte black, plaster.", swatches: ["#f8f4ec","#0d0c0a","#b94522"] },
    { id: "wood-grain", backendId: "wood-grain", label: "Wood Grain", sub: "Oak, walnut, maple. Honest grain.", swatches: ["#3a2818","#e0a455","#f3e6cf"] },
    { id: "ceramic", backendId: "ceramic", label: "Ceramic", sub: "Matte glaze, slip, soft edges.", swatches: ["#efe6d8","#a7896a","#2a1f15"] },
    { id: "signal-tile", backendId: "signal-tile", label: "Signal Tile", sub: "Lithographic ink, screen print, neon.", swatches: ["#0e0d0b","#d8a44a","#efe9da"] },
    { id: "ferrous", backendId: "ferrous", label: "Ferrous", sub: "Raw steel, oiled iron, lead grey.", swatches: ["#1a1814","#7a6f5a","#cdbfa3"] },
    { id: "textile", backendId: "textile", label: "Textile", sub: "Linen, leather, brass, thread.", swatches: ["#d6c7a8","#5a3a1d","#8e7146"] },
  ],
  contacts: [
    { id: "enquiry", backendId: "enquiry", label: "Open Enquiry", sub: "A short note. You reply when you can.", bestFor: ["Artists", "Practitioners early-stage"], previewFields: ["Their name", "What they're after", "A few lines"] },
    { id: "booking", backendId: "booking", label: "Direct Booking", sub: "Date, fee, brief. Routed straight to your studio.", bestFor: ["DJs, performers, venues"], previewFields: ["Date", "Venue / context", "Fee window", "Brief"] },
    { id: "calendar", backendId: "calendar", label: "Calendar Slot", sub: "Pick a time. Show up.", bestFor: ["Coaches, consultants, therapists"], previewFields: ["Their name", "Time", "What it's for"] },
    { id: "commission", backendId: "commission", label: "Commission Card", sub: "Brief, budget, lead time. A start of a thread.", bestFor: ["Makers, builders, custom work"], previewFields: ["Their project", "Budget window", "When they need it"] },
  ],
};

// ---------------------------------------------------------------------------
// Convenience lookups (used by the chooser + preview)
// ---------------------------------------------------------------------------
export function findIdentity(m: StudioManifest, id: string | null) {
  return id ? m.identities.find((x) => x.id === id) : undefined;
}
export function findWorld(m: StudioManifest, id: string | null) {
  return id ? m.worlds.find((x) => x.id === id) : undefined;
}
export function findMovement(m: StudioManifest, id: string | null) {
  return id ? m.movements.find((x) => x.id === id) : undefined;
}
export function findMood(m: StudioManifest, id: string | null) {
  return id ? m.moods.find((x) => x.id === id) : undefined;
}
export function findPace(m: StudioManifest, id: string | null) {
  return id ? m.paces.find((x) => x.id === id) : undefined;
}
export function findMaterial(m: StudioManifest, id: string | null) {
  return id ? m.materials.find((x) => x.id === id) : undefined;
}
export function findContact(m: StudioManifest, id: string | null) {
  return id ? m.contacts.find((x) => x.id === id) : undefined;
}
