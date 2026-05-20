export const PRESENCE_GRAPH_COPY = {
  roomEntry: "You’ve entered this Room.",
  observerUpgrade: "Create an Observer Mask to remember this Room.",
  observerExplainer:
    "Observer mode lets you save Rooms, build Mood Boards, leave Field Notes, and walk Paths without turning yourself into a public profile.",
  selfPromotionGuardrail:
    "Observer mode is for moving through Rooms. To appear publicly as yourself, your business, your practice, or your project, create a Presence Room.",
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
} as const;

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

