import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import type { PresenceEditorConfigInput } from "../../api/editor.ts";
import { studioRoomFromEditableConfig } from "../studio-room/adapters/fromEditableConfig.ts";
import type { RoomObjectType } from "../studio-room/model.ts";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  STUDIO_V2_WORLD_IDS,
  type StudioV2BorderStyle,
  type StudioV2Chamber,
  type StudioV2MobileRecovery,
  type StudioV2MotionIntensity,
  type StudioV2Object,
  type StudioV2ObjectType,
  type StudioV2PublicRoom,
  type StudioV2Skin,
  type StudioV2State,
  type StudioV2Texture,
  type StudioV2Transform,
  type StudioV2WorldId,
} from "./model.ts";
import { stripEditorStateFromStudioV2 } from "./sanitize.ts";

const STUDIO_V2_CONFIG_KEY = "studio_v2";

interface StoredStudioV2ObjectContent {
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
}

interface StoredStudioV2ObjectState {
  chamberId: string;
  visibility: {
    public: boolean;
    mobile: boolean;
  };
  transform: StudioV2Transform;
  locked: boolean;
  pinned: boolean;
}

export function studioV2FromPresenceConfig(
  config: PresenceEditableConfig | null | undefined,
  node?: PresenceNode | null,
): StudioV2State {
  const existing = config ?? undefined;
  if (existing && isStudioV2PresenceConfig(existing)) {
    return studioV2FromStoredConfig(existing, node);
  }
  return studioV2FromLegacyPresenceConfig(existing, node);
}

export function presenceConfigFromStudioV2State(
  studioState: StudioV2State,
  existingConfig: PresenceEditableConfig | null | undefined,
): PresenceEditorConfigInput {
  const existing = existingConfig ?? {};
  const objectEntries = studioState.chambers.flatMap((chamber) =>
    chamber.objects.map((object) => ({ chamberId: chamber.id, object })),
  );

  const objects: StoredStudioV2ObjectContent[] = objectEntries.map(({ object }) => ({
    id: object.id,
    type: object.type,
    role: object.role,
    title: object.title,
    meta: object.meta,
    detail: object.detail,
    link: safePublicUrl(object.link),
    image: object.image ? {
      src: safeAssetPath(object.image.src),
      alt: text(object.image.alt) || object.title,
    } : undefined,
  }));

  const objectState: Record<string, StoredStudioV2ObjectState> = Object.fromEntries(
    objectEntries.map(({ chamberId, object }) => [
      object.id,
      {
        chamberId,
        visibility: object.visibility,
        transform: normalizeTransform(object.transform),
        locked: object.locked,
        pinned: object.pinned,
      },
    ]),
  );

  const sceneV2 = {
    schemaVersion: studioState.schemaVersion,
    worldId: normalizeWorldId(studioState.worldId),
    chambers: studioState.chambers.map((chamber) => ({
      id: chamber.id,
      label: chamber.label,
      objectIds: chamber.objects.map((object) => object.id),
    })),
    objectState,
    mobileRecovery: studioState.mobileRecovery,
  };

  const contentV2 = {
    schemaVersion: studioState.schemaVersion,
    roomId: studioState.roomId,
    slug: studioState.slug,
    title: studioState.title,
    tagline: studioState.tagline,
    objects,
    moodboardRefs: studioState.moodboardRefs.map((reference) => ({
      id: reference.id,
      type: text(reference.type) || "reference",
      label: reference.label,
      detail: reference.detail,
      url: safePublicUrl(reference.url),
      dot: reference.dot,
    })),
    traces: {
      ...studioState.traces,
      disclosure: studioState.traces.disclosure || "Demo traces",
    },
    cta: {
      label: studioState.cta.label,
      href: safePublicUrl(studioState.cta.href),
    },
  };

  return {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: mergeNested(existing.scene_config, STUDIO_V2_CONFIG_KEY, sceneV2),
    style_dna: mergeNested(existing.style_dna, STUDIO_V2_CONFIG_KEY, {
      schemaVersion: studioState.schemaVersion,
      skin: normalizeSkin(studioState.skin),
    }),
    motion_config: mergeNested(existing.motion_config, STUDIO_V2_CONFIG_KEY, {
      motionIntensity: normalizeMotionIntensity(studioState.skin.motionIntensity),
      auraIntensity: clamp(studioState.skin.auraIntensity, 0, 1),
    }),
    asset_config: mergeNested(existing.asset_config, STUDIO_V2_CONFIG_KEY, {
      assets: objects
        .filter((object) => object.image?.src)
        .map((object) => ({
          objectId: object.id,
          src: object.image?.src,
          alt: object.image?.alt,
        })),
    }),
    content_config: mergeNested(existing.content_config, STUDIO_V2_CONFIG_KEY, contentV2),
    roomkey_config: mergeNested(existing.roomkey_config, STUDIO_V2_CONFIG_KEY, {
      portals: objects
        .filter((object) => object.type === "portal" || object.type === "link")
        .map((object) => ({
          objectId: object.id,
          label: object.title,
          url: object.link,
        })),
    }),
    enquiry_config: mergeNested(existing.enquiry_config, STUDIO_V2_CONFIG_KEY, {
      primaryCta: contentV2.cta,
    }),
    locked_fields: existing.locked_fields ? { ...existing.locked_fields } : {},
  };
}

export function publicRoomFromStudioV2State(studioState: StudioV2State): StudioV2PublicRoom {
  return stripEditorStateFromStudioV2(studioState);
}

export function isStudioV2PresenceConfig(config: PresenceEditableConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.renderer_key === PRESENCE_STUDIO_V2_RENDERER_KEY) return true;
  return Boolean(
    record(config.scene_config)[STUDIO_V2_CONFIG_KEY] ||
    record(config.content_config)[STUDIO_V2_CONFIG_KEY] ||
    record(config.style_dna)[STUDIO_V2_CONFIG_KEY],
  );
}

function studioV2FromStoredConfig(
  config: PresenceEditableConfig,
  node?: PresenceNode | null,
): StudioV2State {
  const sceneV2 = record(record(config.scene_config)[STUDIO_V2_CONFIG_KEY]);
  const styleV2 = record(record(config.style_dna)[STUDIO_V2_CONFIG_KEY]);
  const motionV2 = record(record(config.motion_config)[STUDIO_V2_CONFIG_KEY]);
  const contentV2 = record(record(config.content_config)[STUDIO_V2_CONFIG_KEY]);
  const enquiryV2 = record(record(config.enquiry_config)[STUDIO_V2_CONFIG_KEY]);
  const storedObjects = arrayRecords(contentV2.objects).map(storedObjectContent);
  const objectById = new Map(storedObjects.map((object) => [object.id, object]));
  const stateById = record(sceneV2.objectState);
  const chamberLayouts = arrayRecords(sceneV2.chambers);
  const fallbackChamberId = text(chamberLayouts[0]?.id) || "main";

  const chambers = chamberLayouts.length > 0
    ? chamberLayouts.map((layout, index) => {
      const objectIds = Array.isArray(layout.objectIds) ? layout.objectIds.map(text).filter(Boolean) : [];
      return {
        id: text(layout.id) || `chamber-${index + 1}`,
        label: text(layout.label) || `Room section ${index + 1}`,
        objects: objectIds
          .map((id) => objectFromStored(id, objectById.get(id), record(stateById[id])))
          .filter((object): object is StudioV2Object => Boolean(object)),
      };
    })
    : chambersFromStoredObjects(storedObjects, stateById, fallbackChamberId);

  const title = text(contentV2.title) || text(node?.display_name) || "Presence room";
  const ctaRecord = record(contentV2.cta);
  const primaryCta = record(enquiryV2.primaryCta);

  return {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: text(contentV2.roomId) || text(config.room_id) || text(node?.id) || "room",
    slug: text(contentV2.slug) || text(node?.slug) || "presence-room",
    title,
    tagline: text(contentV2.tagline) || text(node?.headline) || text(node?.bio),
    worldId: normalizeWorldId(sceneV2.worldId),
    skin: normalizeSkin({
      ...record(styleV2.skin),
      motionIntensity: motionV2.motionIntensity,
      auraIntensity: motionV2.auraIntensity,
    }),
    cta: {
      label: text(ctaRecord.label) || text(primaryCta.label) || text(node?.primary_cta_label) || "Begin a conversation",
      href: safePublicUrl(ctaRecord.href) || safePublicUrl(primaryCta.href) || safePublicUrl(node?.primary_cta_url),
    },
    chambers: chambers.length > 0 ? chambers : fallbackChambers(title),
    moodboardRefs: arrayRecords(contentV2.moodboardRefs).map((reference, index) => ({
      id: text(reference.id) || `mood-${index + 1}`,
      type: text(reference.type) || "reference",
      label: text(reference.label) || `Reference ${index + 1}`,
      detail: text(reference.detail),
      url: safePublicUrl(reference.url),
      dot: text(reference.dot),
    })),
    traces: normalizeTraces(record(contentV2.traces)),
    mobileRecovery: normalizeMobileRecovery(record(sceneV2.mobileRecovery)),
  };
}

function studioV2FromLegacyPresenceConfig(
  config: PresenceEditableConfig | null | undefined,
  node?: PresenceNode | null,
): StudioV2State {
  const safeNode = node ?? createFallbackNode(config);
  const room = studioRoomFromEditableConfig(config, safeNode, {
    mode: config?.status === "published" ? "published" : "draft",
    roomId: text(safeNode.id) || text(config?.room_id) || "room",
  });
  const chambers: StudioV2Chamber[] = room.chambers.map((chamber, chamberIndex) => ({
    id: chamber.id || `chamber-${chamberIndex + 1}`,
    label: chamber.title || `Room section ${chamberIndex + 1}`,
    objects: chamber.objects.map((object, objectIndex) => ({
      id: object.id || `object-${chamberIndex + 1}-${objectIndex + 1}`,
      type: objectTypeFromLegacy(object.type),
      role: object.type,
      title: text(object.content.title) || object.label || `Object ${objectIndex + 1}`,
      meta: text(object.content.priceLabel) || text(object.content.durationLabel) || text(object.content.source),
      detail: text(object.content.body) || text(object.content.detail) || text(object.content.quote),
      link: safePublicUrl(object.content.action?.href) || safePublicUrl(object.content.url),
      image: object.content.image?.src ? {
        src: safeAssetPath(object.content.image.src),
        alt: text(object.content.image.alt) || object.label,
      } : undefined,
      visibility: {
        public: true,
        mobile: object.mobile?.hidden !== true,
      },
      transform: {
        ...DEFAULT_STUDIO_V2_TRANSFORM,
        zIndex: objectIndex + 1,
      },
      locked: false,
      pinned: false,
    })),
  }));

  const skin = normalizeSkin({
    background: room.theme.background,
    accentColor: room.theme.accent,
    displayFont: room.theme.fontHeading,
    motionIntensity: room.theme.motion,
    objectRadius: room.theme.radius === "sharp" ? 2 : room.theme.radius === "soft" ? 10 : 18,
  });

  return {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: text(room.id) || text(safeNode.id) || "room",
    slug: room.slug || safeNode.slug || "presence-room",
    title: room.title || safeNode.display_name || "Presence room",
    tagline: text(safeNode.headline) || text(safeNode.bio),
    worldId: worldIdFromLegacy(safeNode, config),
    skin,
    cta: {
      label: text(config?.enquiry_config?.cta_label) || text(safeNode.primary_cta_label) || "Begin a conversation",
      href: safePublicUrl(safeNode.primary_cta_url),
    },
    chambers: chambers.length > 0 ? chambers : fallbackChambers(room.title || safeNode.display_name),
    moodboardRefs: legacyMoodboardRefsFromConfig(config),
    traces: normalizeTraces({ enabled: false }),
    mobileRecovery: normalizeMobileRecovery({ transformsSuspendedOnMobile: false, strategy: "preserve" }),
  };
}

function chambersFromStoredObjects(
  storedObjects: StoredStudioV2ObjectContent[],
  stateById: Record<string, unknown>,
  fallbackChamberId: string,
): StudioV2Chamber[] {
  const grouped = new Map<string, StudioV2Object[]>();
  for (const content of storedObjects) {
    const state = record(stateById[content.id]);
    const chamberId = text(state.chamberId) || fallbackChamberId;
    const object = objectFromStored(content.id, content, state);
    if (!object) continue;
    grouped.set(chamberId, [...(grouped.get(chamberId) ?? []), object]);
  }
  return [...grouped.entries()].map(([id, objects], index) => ({
    id,
    label: index === 0 ? "Room" : `Room section ${index + 1}`,
    objects,
  }));
}

function objectFromStored(
  id: string,
  content: StoredStudioV2ObjectContent | undefined,
  state: Record<string, unknown>,
): StudioV2Object | null {
  if (!content) return null;
  const visibility = record(state.visibility);
  return {
    id,
    type: normalizeObjectType(content.type),
    role: content.role,
    title: text(content.title) || "Untitled object",
    meta: text(content.meta),
    detail: text(content.detail),
    link: safePublicUrl(content.link),
    image: content.image?.src ? {
      src: safeAssetPath(content.image.src),
      alt: text(content.image.alt) || text(content.title) || "Room image",
    } : undefined,
    visibility: {
      public: boolean(visibility.public, true),
      mobile: boolean(visibility.mobile, true),
    },
    transform: normalizeTransform(record(state.transform)),
    locked: boolean(state.locked, false),
    pinned: boolean(state.pinned, false),
  };
}

function storedObjectContent(value: Record<string, unknown>, index: number): StoredStudioV2ObjectContent {
  const image = record(value.image);
  return {
    id: text(value.id) || `object-${index + 1}`,
    type: normalizeObjectType(value.type),
    role: text(value.role),
    title: text(value.title) || `Object ${index + 1}`,
    meta: text(value.meta),
    detail: text(value.detail),
    link: safePublicUrl(value.link),
    image: text(image.src) ? {
      src: safeAssetPath(image.src),
      alt: text(image.alt) || text(value.title) || "Room image",
    } : undefined,
  };
}

function legacyMoodboardRefsFromConfig(
  config: PresenceEditableConfig | null | undefined,
): Array<{ id: string; type: string; label: string; detail?: string; url?: string; dot?: string }> {
  if (!config) return [];
  const sources: unknown[] = [];

  const content = record(config.content_config);
  const assets = record(config.asset_config);

  // Tolerate multiple legacy shapes safely.
  if (Array.isArray(content.moodboard)) sources.push(...content.moodboard);
  if (Array.isArray(content.moodboardRefs)) sources.push(...content.moodboardRefs);
  if (Array.isArray(assets.moodboard)) sources.push(...assets.moodboard);
  if (Array.isArray(assets.references)) sources.push(...assets.references);

  const refs = sources
    .map((item, index) => {
      const r = record(item);
      const url = safePublicUrl(r.url ?? r.external_url ?? r.image_url ?? r.link);
      const label = text(r.label ?? r.title ?? r.name ?? `Reference ${index + 1}`);
      if (!label && !url) return null;
      return {
        id: text(r.id) || `mood-legacy-${index + 1}`,
        type: text(r.type) || text(r.item_type) || "reference",
        label,
        detail: text(r.detail ?? r.description ?? r.body),
        url,
        dot: text(r.dot ?? r.tag),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Deduplicate by URL to avoid double-lifting the same reference from multiple sources.
  const seen = new Set<string>();
  return refs.filter((item) => {
    const key = `${item.label}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackChambers(title: string): StudioV2Chamber[] {
  return [{
    id: "main",
    label: "Room",
    objects: [{
      id: "intro",
      type: "text",
      role: "statement",
      title: title || "Presence room",
      detail: "This room is ready for Studio V2 content.",
      visibility: { public: true, mobile: true },
      transform: DEFAULT_STUDIO_V2_TRANSFORM,
      locked: false,
      pinned: false,
    }],
  }];
}

function normalizeSkin(value: unknown): StudioV2Skin {
  const skin = record(value);
  return {
    background: color(skin.background) || DEFAULT_STUDIO_V2_SKIN.background,
    texture: normalizeTexture(skin.texture),
    auraIntensity: clamp(number(skin.auraIntensity, DEFAULT_STUDIO_V2_SKIN.auraIntensity), 0, 1),
    motionIntensity: normalizeMotionIntensity(skin.motionIntensity),
    displayFont: text(skin.displayFont) || DEFAULT_STUDIO_V2_SKIN.displayFont,
    headingWeight: clamp(Math.round(number(skin.headingWeight, DEFAULT_STUDIO_V2_SKIN.headingWeight)), 300, 900),
    objectRadius: clamp(number(skin.objectRadius, DEFAULT_STUDIO_V2_SKIN.objectRadius), 0, 40),
    borderStyle: normalizeBorderStyle(skin.borderStyle),
    shadowDepth: clamp(number(skin.shadowDepth, DEFAULT_STUDIO_V2_SKIN.shadowDepth), 0, 1),
    accentColor: color(skin.accentColor) || DEFAULT_STUDIO_V2_SKIN.accentColor,
  };
}

function normalizeMobileRecovery(value: Record<string, unknown>): StudioV2MobileRecovery {
  const strategy = text(value.strategy);
  return {
    transformsSuspendedOnMobile: boolean(value.transformsSuspendedOnMobile, false),
    safeRecoveryAppliedAt: text(value.safeRecoveryAppliedAt),
    strategy: strategy === "suspend-mobile-transforms" || strategy === "clear-mobile-danger" || strategy === "preserve"
      ? strategy
      : "preserve",
  };
}

function normalizeTraces(value: Record<string, unknown>) {
  return {
    enabled: boolean(value.enabled, false),
    demo: boolean(value.demo, true),
    disclosure: text(value.disclosure) || "Demo traces",
    entries: optionalPositiveInteger(value.entries),
    seeds: optionalPositiveInteger(value.seeds),
    guestbook: optionalPositiveInteger(value.guestbook),
    guestbookEntries: Array.isArray(value.guestbookEntries)
      ? value.guestbookEntries.map(text).filter(Boolean).slice(0, 8)
      : [],
  };
}

export function normalizeTransform(value: unknown): StudioV2Transform {
  const transform = record(value);
  return {
    x: clamp(number(transform.x, DEFAULT_STUDIO_V2_TRANSFORM.x), -2000, 2000),
    y: clamp(number(transform.y, DEFAULT_STUDIO_V2_TRANSFORM.y), -2000, 2000),
    scale: clamp(number(transform.scale, DEFAULT_STUDIO_V2_TRANSFORM.scale), 0.2, 4),
    rotation: clamp(number(transform.rotation, DEFAULT_STUDIO_V2_TRANSFORM.rotation), -360, 360),
    zIndex: clamp(Math.round(number(transform.zIndex, DEFAULT_STUDIO_V2_TRANSFORM.zIndex)), 0, 999),
  };
}

function normalizeWorldId(value: unknown): StudioV2WorldId {
  const candidate = text(value) as StudioV2WorldId;
  return STUDIO_V2_WORLD_IDS.includes(candidate) ? candidate : "gallery";
}

function worldIdFromLegacy(node: PresenceNode, config: PresenceEditableConfig | null | undefined): StudioV2WorldId {
  // Explicit room_type mapping first — deterministic and safe.
  const roomType = text(node.room_type).toLowerCase();
  const explicitMap: Record<string, StudioV2WorldId> = {
    "artist_studio": "gallery",
    "minimal_card": "consultant",
    "practitioner": "healing",
    "performer_music": "dj",
    "organisation": "archive",
  };
  if (explicitMap[roomType]) return explicitMap[roomType];

  // Fallback to substring heuristic on renderer_key, display_mode, or room_type.
  const renderer = text(config?.renderer_key) || text(node.renderer_key) || text(node.display_mode) || roomType;
  const lower = renderer.toLowerCase();
  if (lower.includes("zine")) return "zine";
  if (lower.includes("dj") || lower.includes("music") || lower.includes("performer")) return "dj";
  if (lower.includes("healing") || lower.includes("practitioner")) return "healing";
  if (lower.includes("market") || lower.includes("stall")) return "market";
  if (lower.includes("archive") || lower.includes("evidence") || lower.includes("community")) return "archive";
  if (lower.includes("tradie") || lower.includes("carpenter") || lower.includes("material")) return "carpenter";
  if (lower.includes("consultant") || lower.includes("contractor") || lower.includes("desk")) return "consultant";
  return "gallery";
}

function normalizeObjectType(value: unknown): StudioV2ObjectType {
  const candidate = text(value).toLowerCase();
  const allowed: readonly StudioV2ObjectType[] = [
    "text",
    "note",
    "image",
    "link",
    "portal",
    "cta",
    "testimonial",
    "proof",
    "event",
    "service",
    "shop",
    "media",
    "credential",
    "moodboard",
  ];
  return allowed.includes(candidate as StudioV2ObjectType) ? candidate as StudioV2ObjectType : "text";
}

function objectTypeFromLegacy(value: RoomObjectType): StudioV2ObjectType {
  if (value === "cta") return "cta";
  if (value === "image" || value === "media" || value === "work" || value === "work-card") return "image";
  if (value === "link" || value === "link-card") return "link";
  if (value === "portal") return "portal";
  if (value === "testimonial") return "testimonial";
  if (value === "proof" || value === "proof-card" || value === "credential" || value === "badge") return "proof";
  if (value === "service" || value === "service-card") return "service";
  if (value === "note" || value === "metadata") return "note";
  return "text";
}

function normalizeTexture(value: unknown): StudioV2Texture {
  const candidate = text(value);
  return candidate === "none" ||
    candidate === "paper" ||
    candidate === "grain" ||
    candidate === "scan" ||
    candidate === "linen" ||
    candidate === "timber" ||
    candidate === "ledger"
    ? candidate
    : DEFAULT_STUDIO_V2_SKIN.texture;
}

function normalizeBorderStyle(value: unknown): StudioV2BorderStyle {
  const candidate = text(value);
  return candidate === "none" ||
    candidate === "hairline" ||
    candidate === "framed" ||
    candidate === "taped" ||
    candidate === "ledger"
    ? candidate
    : DEFAULT_STUDIO_V2_SKIN.borderStyle;
}

function normalizeMotionIntensity(value: unknown): StudioV2MotionIntensity {
  const candidate = text(value);
  return candidate === "still" || candidate === "gentle" || candidate === "living"
    ? candidate
    : DEFAULT_STUDIO_V2_SKIN.motionIntensity;
}

function mergeNested(
  existing: Record<string, unknown> | undefined,
  key: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...record(existing),
    [key]: value,
  };
}

function createFallbackNode(config: PresenceEditableConfig | null | undefined): PresenceNode {
  return {
    id: number(config?.room_id, 0),
    slug: "presence-room",
    display_name: "Presence room",
    node_type: "presence",
    display_mode: "studio",
    status: "draft",
    visibility: "private",
    renderer_key: config?.renderer_key ?? null,
    editable_config: config ?? null,
  };
}

function color(value: unknown): string {
  const candidate = text(value);
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate) ||
    /^rgba?\(/i.test(candidate) ||
    /^hsla?\(/i.test(candidate)
    ? candidate
    : "";
}

export function safeAssetPath(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) return isSafePublicPath(candidate) ? candidate : "";
  return safePublicUrl(candidate);
}

export function safePublicUrl(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) {
    return isSafePublicPath(candidate) ? candidate : "";
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "mailto:" && url.protocol !== "tel:") {
    return "";
  }
  if ((url.protocol === "http:" || url.protocol === "https:") && !isSafePublicHost(url.hostname)) {
    return "";
  }
  if (isControlPlanePath(url.pathname)) return "";
  if (!isSafePublicPath(url.pathname)) return "";
  return candidate;
}

function isSafePublicPath(path: string): boolean {
  return !isControlPlanePath(path) && !path.startsWith("//") && !path.startsWith("\\");
}

function isControlPlanePath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return (
    path.startsWith("/api") ||
    path.startsWith("/auth") ||
    path.startsWith("/studio") ||
    path.startsWith("/internal") ||
    path.startsWith("/admin") ||
    path.includes("/dashboard")
  );
}

function isSafePublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return false;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
  return !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record).filter((entry) => Object.keys(entry).length > 0) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function number(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
