export const PRESENCE_STUDIO_ROOM_SCHEMA_VERSION = "presence-studio-room-v1" as const;

export type StudioRoomSchemaVersion = typeof PRESENCE_STUDIO_ROOM_SCHEMA_VERSION;
export type RoomState = "draft" | "published" | "archived";
export type ChamberType =
  | "threshold"
  | "entrance"
  | "gallery"
  | "works"
  | "story"
  | "statement"
  | "services"
  | "proof"
  | "testimonials"
  | "invitation"
  | "contact"
  | "enquiry"
  | "portal"
  | "links";
export type RoomObjectType =
  | "text"
  | "headline"
  | "image"
  | "media"
  | "work"
  | "work-card"
  | "service"
  | "service-card"
  | "testimonial"
  | "proof"
  | "proof-card"
  | "cta"
  | "link"
  | "link-card"
  | "portal"
  | "contact"
  | "credential"
  | "badge"
  | "metadata"
  | "note";

export interface MobileVariant {
  hidden?: boolean;
  order?: number;
  layout?: "stack" | "compact" | "carousel";
  label?: string;
  aspectRatio?: "square" | "portrait" | "landscape";
}

export interface ThemeTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  radius: "soft" | "round" | "sharp";
  fontHeading: string;
  fontBody: string;
  motion: "still" | "gentle" | "living";
  spacing: "compact" | "comfortable" | "gallery";
}

export interface MoodPreset {
  id: string;
  label: string;
  description: string;
  tokens: Partial<ThemeTokens>;
}

export interface TemplateKit {
  id: string;
  label: string;
  description: string;
  chamberTypes: ChamberType[];
  objectTypes: RoomObjectType[];
  defaultMoodPresetId: string;
}

export type TemplateKitSupportState = "primary" | "candidate" | "deferred";

export interface TemplateKitSourceCandidate {
  id: string;
  slug: string;
  label: string;
  source: string;
  notes?: string;
}

export interface TemplateKitCtaStrategy {
  label: string;
  target: "commission" | "quote" | "booking" | "project" | "contact";
  primaryChamberId: string;
  appearsEarlyOnMobile: boolean;
}

export interface TemplateKitCopyScaffold {
  field: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

export interface TemplateKitValidationExpectation {
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface StudioRoomTemplateKit extends TemplateKit {
  name: string;
  intendedUserTypes: string[];
  sourceCandidate: TemplateKitSourceCandidate;
  defaultRoom: Room;
  themeTokens: ThemeTokens;
  moodPreset: MoodPreset;
  orderedChambers: ChamberType[];
  roomObjects: RoomObjectType[];
  ctaStrategy: TemplateKitCtaStrategy;
  requiredFields: string[];
  optionalFields: string[];
  copyScaffolds: TemplateKitCopyScaffold[];
  validationExpectations: TemplateKitValidationExpectation[];
  publicSafeDefaults: string[];
  schemaVersion: StudioRoomSchemaVersion;
  supportState: TemplateKitSupportState;
  deferredFields?: string[];
  previewNotes?: string[];
}

export interface RendererConfig {
  renderer: "studio-room-basic";
  layout: "single-scroll" | "chamber-tabs";
  mobileLayout: "stacked" | "bottom-sheet-nav";
  reducedMotion: boolean;
  objectOpenMode: "inline" | "sheet" | "dialog";
}

export interface StudioImage {
  src: string;
  alt: string;
  focalPoint?: { x: number; y: number };
}

export interface RoomObjectContent {
  title?: string;
  body?: string;
  priceLabel?: string;
  durationLabel?: string;
  quote?: string;
  attribution?: string;
  source?: string;
  issuer?: string;
  detail?: string;
  url?: string;
  linkType?: string;
  image?: StudioImage;
  action?: {
    label: string;
    href: string;
  };
}

export interface RoomObject {
  id: string;
  type: RoomObjectType;
  label: string;
  content: RoomObjectContent;
  required?: boolean;
  mobile?: MobileVariant;
  editorOnly?: {
    editablePaths?: string[];
    notes?: string;
  };
  internal?: Record<string, unknown>;
}

export interface Chamber {
  id: string;
  type: ChamberType;
  title: string;
  summary?: string;
  objects: RoomObject[];
  mobile?: MobileVariant;
  editorOnly?: {
    locked?: boolean;
    staffNotes?: string;
  };
  internal?: Record<string, unknown>;
}

export interface Room {
  schemaVersion: StudioRoomSchemaVersion;
  id: string;
  slug: string;
  title: string;
  state: RoomState;
  entryChamberId: string;
  theme: ThemeTokens;
  rendererConfig: RendererConfig;
  moodPresetId?: string;
  templateKitId?: string;
  chambers: Chamber[];
  migration?: {
    from?: string;
    migratedAt?: string;
  };
  editorOnly?: {
    draftNotes?: string;
    lastSelectedObjectId?: string;
  };
  internal?: Record<string, unknown>;
}

export interface EditorDraft {
  id: string;
  roomId: string;
  basePublishedVersion: number;
  room: Room;
  updatedAt: string;
  hasUnsavedChanges: boolean;
  editorOnly?: Record<string, unknown>;
}

export interface PublishState {
  roomId: string;
  version: number;
  room: Room;
  publishedAt: string;
  previousVersion?: number;
}

export interface StudioRoomState {
  published: PublishState;
  draft?: EditorDraft;
}
