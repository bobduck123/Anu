export const PRESENCE_GRAPH_COPY = {
  roomEntry: "You’ve entered this Room.",
  observerUpgrade: "Create an Observer Mask to remember this Room.",
  observerExplainer:
    "Observer mode lets you save Rooms, build Mood Boards, leave Field Notes, and walk Paths without turning yourself into a public profile.",
  selfPromotionGuardrail:
    "Observer mode is for moving through Rooms. To appear publicly as yourself, your business, your practice, or your project, create a Presence Room.",
  selfPromotionMaskGuardrail:
    "This looks like a Presence. Your Mask is for moving through Gardens and Rooms. Open a Presence Room to be found, booked, contacted, and shared in person.",
  presencePass:
    "Your Presence Pass opens your Room from NFC, QR, badge, sticker, poster, or direct share.",
  moodBoard: "Mood Boards are maps of taste.",
  paths: "Choose a direction.",
  world:
    "The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist.",
  worldForming:
    "Presence is collecting Rooms, Encounters, Mood Boards, Field Notes, and Paths. The map opens only when the graph is dense enough to feel useful.",
  passportEmpty:
    "Your Passport is empty. Enter Rooms, save what matters, and your path through the world will begin to appear.",
  garden:
    "Your Garden grows from Rooms, Halls, Paths, and people you share space with.",
  gardenEmpty:
    "Your Garden is fallow. Save Rooms, walk Paths, and enter Halls — Seeds will appear here as you move.",
  observations: "Observations are what you notice along the way.",
  observationsCompose: "Share an Observation.",
  seedNurture: "Nurture this Seed.",
  seedPrune: "Prune this Seed.",
  seedWilting: "This Seed is fading.",
  seedComposted: "This Seed has composted.",
  rooms: "Rooms are storefronts.",
  halls: "Halls are where we gather.",
  hallsEmpty:
    "Halls are shared spaces where Masks, Rooms, and communities gather. None are open yet from your Seeds.",
  hallJoin: "Join Hall",
  hallLeave: "Leave Hall",
  pathsCompass: "Choose a direction.",
} as const;

export const SEED_STATE_LABELS: Record<string, string> = {
  active: "Active",
  recently_watered: "Recently watered",
  wilting: "Wilting",
  composted: "Composted",
  pruned: "Pruned",
  blocked: "Blocked",
};

export const SEED_STATE_DESCRIPTIONS: Record<string, string> = {
  active: "This Seed is part of your living Garden.",
  recently_watered: "Nurtured recently — it’s growing.",
  wilting: "This Seed is fading. Nurture or prune.",
  composted: "This Seed has composted. Old, but the soil keeps the trace.",
  pruned: "You pruned this Seed. It won’t grow in your Garden.",
  blocked: "Blocked — not shown in your Garden.",
};

export const SEED_KIND_LABELS: Record<string, string> = {
  mask: "Mask",
  room: "Room",
  hall: "Hall",
  path: "Path",
  mood_board: "Mood Board",
  field: "Field Note",
};

export const HALL_TYPE_LABELS: Record<string, string> = {
  town_hall: "Town Hall",
  market_hall: "Market Hall",
  studio_hall: "Studio Hall",
  listening_hall: "Listening Hall",
  learning_hall: "Learning Hall",
  salon: "Salon",
  lobby: "Lobby",
  guild_hall: "Guild Hall",
  afterparty: "Afterparty",
};

export const HALL_TYPE_DESCRIPTIONS: Record<string, string> = {
  town_hall: "Open assembly. Anyone can attend, anyone can listen.",
  market_hall: "Rooms as stalls. Browse, enter, and enquire.",
  studio_hall: "A practitioner's studio opens its doors.",
  listening_hall: "A stage for music, talks, and broadcasts.",
  learning_hall: "Sessions, workshops, and shared learning.",
  salon: "Smaller. Quieter. Discussion at tables.",
  lobby: "A waiting space — pre-event, soft entry.",
  guild_hall: "Practitioners gather around a craft or practice.",
  afterparty: "Post-event quiet. Stay if it suits.",
};

export const HALL_ZONE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  stage: "Stage",
  table: "Table",
  stall: "Stall",
  noticeboard: "Noticeboard",
  portal: "Portal",
};

export const HALL_ZONE_BLURBS: Record<string, string> = {
  lobby: "Where Masks arrive. Quiet introductions and a glance around.",
  stage: "Talks, performances, announcements. One signal at a time.",
  table: "Smaller conversation. Lean in.",
  stall: "A Room storefront inside the Hall. Step in.",
  noticeboard: "Pinned Observations and calls. Read what's already been said.",
  portal: "A doorway out — into a Room, a Garden, a Path, or another Hall.",
};

export const OBSERVATION_KIND_LABELS: Record<string, string> = {
  text: "Note",
  room: "Room",
  path: "Path",
  field: "Field",
  mood: "Mood",
  echo: "Echo",
  find: "Find",
  walk_log: "Walk",
  guestbook: "Guestbook",
  hall: "Hall",
};

export function seedStateLabel(state: string | null | undefined): string {
  if (!state) return SEED_STATE_LABELS.active!;
  return SEED_STATE_LABELS[state] ?? state.replace(/_/g, " ");
}

export function hallTypeLabel(type: string | null | undefined): string {
  if (!type) return "Hall";
  return HALL_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function hallZoneLabel(kind: string | null | undefined): string {
  if (!kind) return "Zone";
  return HALL_ZONE_LABELS[kind] ?? kind.replace(/_/g, " ");
}

export function observationKindLabel(kind: string | null | undefined): string {
  if (!kind) return "Observation";
  return OBSERVATION_KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}

// Human-facing translations for backend enum values. Studio + public copy
// must NEVER show raw IDs like "chamber_walk" or "nfc_card"; the dictionaries
// below render the warm UI form.

/** Direction-type labels used on Path forks and Path direction cards.
 * The backend emits enum-style ids; the visitor sees these warm phrases. */
export const PATH_DIRECTION_LABELS: Record<string, string> = {
  place: "Follow the place",
  mood: "Follow the mood",
  influence: "Follow the influences",
  influences: "Follow the influences",
  similar_rooms: "Follow similar Rooms",
  similar: "Follow similar Rooms",
  people: "Follow people who saved this",
  saved_by: "Follow people who saved this",
  surprise: "Surprise me",
  random: "Surprise me",
};

export function pathDirectionLabel(directionType: string | null | undefined): string {
  if (!directionType) return "Choose a direction";
  const key = directionType.toLowerCase().replace(/[\s-]/g, "_");
  return PATH_DIRECTION_LABELS[key] ?? directionType.replace(/_/g, " ");
}

/** Room Key / Pass type labels — what the visitor sees as the "source chip"
 * on /r/[token] and what the owner sees in the Studio Passes manager. */
export const ROOM_KEY_TYPE_LABELS: Record<string, string> = {
  nfc: "NFC Card",
  nfc_card: "NFC Card",
  qr: "QR Code",
  qr_poster: "QR Poster",
  poster: "QR Poster",
  badge: "Event Badge",
  event_badge: "Event Badge",
  sticker: "Sticker",
  business_card: "Business Card",
  short_link: "Direct Share",
  direct: "Direct Share",
  wallet: "Wallet",
};

export function roomKeyTypeLabel(keyType: string | null | undefined): string {
  if (!keyType) return "Direct Share";
  const key = keyType.toLowerCase().replace(/-/g, "_");
  return ROOM_KEY_TYPE_LABELS[key] ?? keyType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Per-key practical microcopy shown in the Studio Passes manager. Tells
 * the owner where this URL belongs in the physical world. */
export const ROOM_KEY_USE_HINTS: Record<string, string> = {
  nfc: "Write this URL to an NFC sticker, card, or wristband. Tap a phone to open the Room.",
  nfc_card: "Write this URL to an NFC sticker, card, or wristband. Tap a phone to open the Room.",
  qr: "Print this URL as a QR on a poster, table card, badge, or sticker.",
  qr_poster: "Print this URL as a QR on a poster, table card, badge, or sticker.",
  poster: "Print this URL as a QR on a poster, table card, or sign.",
  badge: "Print on conference, festival, or event badges for in-room scanning.",
  event_badge: "Print on conference, festival, or event badges for in-room scanning.",
  sticker: "Add this URL to a sticker on packaging, vehicles, or studio doors.",
  business_card: "Replace the website URL on your business card with this link.",
  short_link: "Share this URL directly via DM, text, email, or anywhere a link can go.",
  direct: "Share this URL directly via DM, text, email, or anywhere a link can go.",
  wallet: "Add to Apple/Google Wallet to keep your Room one tap away.",
};

export function roomKeyUseHint(keyType: string | null | undefined): string {
  if (!keyType) return ROOM_KEY_USE_HINTS.short_link;
  const key = keyType.toLowerCase().replace(/-/g, "_");
  return ROOM_KEY_USE_HINTS[key] ?? "Share this URL physically or digitally. Each key gives clean per-channel analytics.";
}

