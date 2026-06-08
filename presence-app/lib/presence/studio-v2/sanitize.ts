import type { StudioV2PublicRoom, StudioV2State } from "./model.ts";

export const STUDIO_V2_PUBLIC_RESTRICTED_KEYS = [
  "scene_config",
  "style_dna",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "owner",
  "owner_user_id",
  "draft",
  "draft_config",
  "locked",
  "pinned",
  "hiddenPublic",
  "hiddenMobile",
  "selected",
  "editor",
  "editorOnly",
  "internal",
  "auth",
  "session",
  "token",
  "preview_token",
  "signed_url",
  "storage_key",
  "draft_storage_key",
  "published_storage_key",
] as const;

const restrictedKeySet = new Set(STUDIO_V2_PUBLIC_RESTRICTED_KEYS.map((key) => key.toLowerCase()));

const restrictedValueFragments = [
  "WILD TRANSFORM SUSPENDED",
  "/studio/",
  "/api/presence/owner",
  "preview_token",
  "service_role",
  "bearer ",
] as const;

export function sanitizeStudioV2PublicPayload<T>(value: T, options: { allowDemoTraces?: boolean } = {}): T {
  return sanitizeValue(value, options) as T;
}

export function findStudioV2PublicPayloadLeaks(value: unknown, options: { allowDemoTraces?: boolean } = {}): string[] {
  const found = new Set<string>();
  visit(value, (key, entry) => {
    if (key && restrictedKeySet.has(key.toLowerCase())) found.add(key);
    if (typeof entry === "string") {
      for (const fragment of restrictedValueFragments) {
        if (entry.includes(fragment)) found.add(fragment);
      }
      if (!options.allowDemoTraces && entry.includes("Demo traces")) {
        found.add("Demo traces");
      }
    }
  });
  return [...found].sort();
}

export function assertStudioV2PublicRoomClean(room: StudioV2PublicRoom): StudioV2PublicRoom {
  const leaks = findStudioV2PublicPayloadLeaks(room, { allowDemoTraces: room.traces?.demo === true });
  if (leaks.length > 0) {
    throw new Error(`Studio V2 public room contains restricted payload keys or values: ${leaks.join(", ")}`);
  }
  return room;
}

export function stripEditorStateFromStudioV2(state: StudioV2State): StudioV2PublicRoom {
  const publicRoom: StudioV2PublicRoom = {
    schemaVersion: state.schemaVersion,
    rendererKey: state.rendererKey,
    roomId: state.roomId,
    slug: state.slug,
    title: state.title,
    tagline: state.tagline,
    worldId: state.worldId,
    publicStylePreset: state.publicStylePreset,
    skin: state.skin,
    cta: state.cta,
    chambers: state.chambers.map((chamber) => ({
      id: chamber.id,
      label: chamber.label,
      objects: chamber.objects
        .filter((object) => object.visibility.public)
        .map((object) => ({
          id: object.id,
          type: object.type,
          role: object.role,
          title: object.title,
          meta: object.meta,
          detail: object.detail,
          link: object.link,
          image: object.image,
          mobileVisible: object.visibility.mobile,
          transform: state.mobileRecovery.transformsSuspendedOnMobile
            ? { x: 0, y: 0, scale: 1, rotation: 0, zIndex: object.transform.zIndex }
            : object.transform,
        })),
    })),
    moodboardRefs: state.moodboardRefs,
    traces: state.traces.enabled && state.traces.demo
      ? { ...state.traces, disclosure: state.traces.disclosure || "Demo traces" }
      : undefined,
    mobileRecovery: state.mobileRecovery,
  };

  return assertStudioV2PublicRoomClean(
    sanitizeStudioV2PublicPayload(publicRoom, { allowDemoTraces: publicRoom.traces?.demo === true }),
  );
}

function sanitizeValue(value: unknown, options: { allowDemoTraces?: boolean }): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValue(entry, options))
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== "object") {
    return sanitizeString(value, options);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !restrictedKeySet.has(key.toLowerCase()))
      .map(([key, entry]) => [key, sanitizeValue(entry, options)])
      .filter(([, entry]) => entry !== undefined),
  );
}

function sanitizeString(value: unknown, options: { allowDemoTraces?: boolean }): unknown {
  if (typeof value !== "string") return value;
  if (!options.allowDemoTraces && value.includes("Demo traces")) return undefined;
  for (const fragment of restrictedValueFragments) {
    if (value.includes(fragment)) return undefined;
  }
  if (looksLikeLocalPath(value)) return undefined;
  return value;
}

function looksLikeLocalPath(value: string): boolean {
  return /^[a-z]:\\/i.test(value) || value.startsWith("\\\\") || value.startsWith("file:");
}

function visit(value: unknown, visitor: (key: string | null, value: unknown) => void, key: string | null = null) {
  visitor(key, value);
  if (Array.isArray(value)) {
    value.forEach((entry) => visit(entry, visitor, null));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [entryKey, entry] of Object.entries(value as Record<string, unknown>)) {
    visit(entry, visitor, entryKey);
  }
}
