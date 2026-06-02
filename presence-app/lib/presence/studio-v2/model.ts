export const PRESENCE_STUDIO_V2_SCHEMA_VERSION = "presence-studio-v2-v1" as const;
export const PRESENCE_STUDIO_V2_RENDERER_KEY = "presence-studio-v2-room" as const;

export type PresenceStudioV2SchemaVersion = typeof PRESENCE_STUDIO_V2_SCHEMA_VERSION;
export type PresenceStudioV2RendererKey = typeof PRESENCE_STUDIO_V2_RENDERER_KEY;

export type StudioV2WorldId =
  | "gallery"
  | "zine"
  | "dj"
  | "healing"
  | "market"
  | "archive"
  | "carpenter"
  | "consultant";

export type StudioV2ObjectType =
  | "text"
  | "note"
  | "image"
  | "link"
  | "portal"
  | "cta"
  | "testimonial"
  | "proof"
  | "event"
  | "service"
  | "shop"
  | "media"
  | "credential"
  | "moodboard";

export type StudioV2Texture = "none" | "paper" | "grain" | "scan" | "linen" | "timber" | "ledger";
export type StudioV2BorderStyle = "none" | "hairline" | "framed" | "taped" | "ledger";
export type StudioV2MotionIntensity = "still" | "gentle" | "living";

export interface StudioV2Skin {
  background: string;
  texture: StudioV2Texture;
  auraIntensity: number;
  motionIntensity: StudioV2MotionIntensity;
  displayFont: string;
  headingWeight: number;
  objectRadius: number;
  borderStyle: StudioV2BorderStyle;
  shadowDepth: number;
  accentColor: string;
}

export interface StudioV2Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface StudioV2ObjectVisibility {
  public: boolean;
  mobile: boolean;
}

export interface StudioV2Object {
  id: string;
  type: StudioV2ObjectType;
  role?: string;
  title: string;
  meta?: string;
  detail?: string;
  link?: string;
  image?: {
    src: string;
    alt: string;
  };
  visibility: StudioV2ObjectVisibility;
  transform: StudioV2Transform;
  locked: boolean;
  pinned: boolean;
}

export interface StudioV2Chamber {
  id: string;
  label: string;
  objects: StudioV2Object[];
}

export interface StudioV2MoodboardReference {
  id: string;
  type: string;
  label: string;
  detail?: string;
  url?: string;
  dot?: string;
}

export interface StudioV2TraceConfig {
  enabled: boolean;
  demo: boolean;
  disclosure: string;
  entries?: number;
  seeds?: number;
  guestbook?: number;
  guestbookEntries?: string[];
  // Future: eventBeacon and portal sub-objects can be added here when
  // the adapter actually reads/writes them. Do not add orphaned fields.
}

export interface StudioV2MobileRecovery {
  transformsSuspendedOnMobile: boolean;
  safeRecoveryAppliedAt?: string;
  strategy: "preserve" | "suspend-mobile-transforms" | "clear-mobile-danger";
}

export interface StudioV2Cta {
  label: string;
  href?: string;
}

export interface StudioV2State {
  schemaVersion: PresenceStudioV2SchemaVersion;
  rendererKey: PresenceStudioV2RendererKey;
  roomId: string;
  slug: string;
  title: string;
  tagline?: string;
  worldId: StudioV2WorldId;
  skin: StudioV2Skin;
  cta: StudioV2Cta;
  chambers: StudioV2Chamber[];
  moodboardRefs: StudioV2MoodboardReference[];
  traces: StudioV2TraceConfig;
  mobileRecovery: StudioV2MobileRecovery;
}

export interface StudioV2PublicObject {
  id: string;
  type: StudioV2ObjectType;
  role?: string;
  title: string;
  meta?: string;
  detail?: string;
  link?: string;
  image?: {
    src: string;
    alt: string;
  };
  mobileVisible: boolean;
  transform: StudioV2Transform;
}

export interface StudioV2PublicChamber {
  id: string;
  label: string;
  objects: StudioV2PublicObject[];
}

export interface StudioV2PublicRoom {
  schemaVersion: PresenceStudioV2SchemaVersion;
  rendererKey: PresenceStudioV2RendererKey;
  roomId: string;
  slug: string;
  title: string;
  tagline?: string;
  worldId: StudioV2WorldId;
  skin: StudioV2Skin;
  cta: StudioV2Cta;
  chambers: StudioV2PublicChamber[];
  moodboardRefs: StudioV2MoodboardReference[];
  traces?: StudioV2TraceConfig;
  mobileRecovery: StudioV2MobileRecovery;
}

export const STUDIO_V2_WORLD_IDS: readonly StudioV2WorldId[] = [
  "gallery",
  "zine",
  "dj",
  "healing",
  "market",
  "archive",
  "carpenter",
  "consultant",
];

export const DEFAULT_STUDIO_V2_SKIN: StudioV2Skin = {
  background: "#f7f3ea",
  texture: "paper",
  auraIntensity: 0.45,
  motionIntensity: "gentle",
  displayFont: "system",
  headingWeight: 600,
  objectRadius: 10,
  borderStyle: "hairline",
  shadowDepth: 0.35,
  accentColor: "#8f6f3f",
};

export const DEFAULT_STUDIO_V2_TRANSFORM: StudioV2Transform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  zIndex: 1,
};

