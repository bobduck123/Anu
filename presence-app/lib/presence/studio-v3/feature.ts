import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";

export const STUDIO_V3_BROWSER_PILOT_FLAG = "presence-studio-v3:bbb-pilot";
export const STUDIO_V3_HOSTED_HUMAN_TEST_FLAG = "NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST";
export const STUDIO_V3_ALLOWED_ROOMS_ENV = "NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS";

export interface StudioV3FeatureInput {
  roomId: number;
  slug?: string | null;
  rendererKey?: string | null;
  config?: PresenceEditableConfig | null;
  node?: PresenceNode | null;
}

export interface StudioV3GateDecision {
  enabled: boolean;
  source: "hosted-human-test" | "local-bbb-pilot" | "disabled";
  reason:
    | "hosted-human-test-allowed-room"
    | "hosted-human-test-allowlist-missing"
    | "hosted-human-test-room-not-allowed"
    | "production-without-hosted-human-test"
    | "local-pilot-flag-off"
    | "local-pilot-allowed-room"
    | "local-pilot-room-not-allowed";
  roomId: number;
  slug: string;
  nodeEnv: string;
}

export function shouldUsePresenceStudioV3Editor(input: StudioV3FeatureInput): boolean {
  return getPresenceStudioV3GateDecision(input).enabled;
}

export function getPresenceStudioV3GateDecision(input: StudioV3FeatureInput): StudioV3GateDecision {
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();
  const slug = studioV3RoomSlug(input);
  const base = { roomId: input.roomId, slug, nodeEnv };
  const hostedFlagEnabled = flagEnabled(process.env[STUDIO_V3_HOSTED_HUMAN_TEST_FLAG]);

  if (hostedFlagEnabled) {
    const allowlist = parseStudioV3AllowedRooms(process.env[STUDIO_V3_ALLOWED_ROOMS_ENV]);
    if (allowlist.ids.size === 0 || allowlist.slugs.size === 0) {
      return {
        ...base,
        enabled: false,
        source: "disabled",
        reason: "hosted-human-test-allowlist-missing",
      };
    }
    if (isStudioV3AllowedRoom(input, allowlist)) {
      return {
        ...base,
        enabled: true,
        source: "hosted-human-test",
        reason: "hosted-human-test-allowed-room",
      };
    }
    return {
      ...base,
      enabled: false,
      source: "disabled",
      reason: "hosted-human-test-room-not-allowed",
    };
  }

  if (nodeEnv === "production") {
    return {
      ...base,
      enabled: false,
      source: "disabled",
      reason: "production-without-hosted-human-test",
    };
  }

  if (!isStudioV3PilotEnabled()) {
    return {
      ...base,
      enabled: false,
      source: "disabled",
      reason: "local-pilot-flag-off",
    };
  }

  if (isStudioV3DefaultBbbRoom(input)) {
    return {
      ...base,
      enabled: true,
      source: "local-bbb-pilot",
      reason: "local-pilot-allowed-room",
    };
  }

  return {
    ...base,
    enabled: false,
    source: "disabled",
    reason: "local-pilot-room-not-allowed",
  };
}

export function isStudioV3PilotEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STUDIO_V3_BROWSER_PILOT_FLAG) === "1";
  } catch {
    return false;
  }
}

export function reportPresenceStudioV3GateDecision(decision: StudioV3GateDecision): void {
  if (typeof console === "undefined" || typeof console.info !== "function") return;
  console.info("[presence-studio-v3] editor gate", {
    enabled: decision.enabled,
    source: decision.source,
    reason: decision.reason,
    roomId: decision.roomId,
    slug: decision.slug,
    nodeEnv: decision.nodeEnv,
  });
}

function studioV3RoomSlug(input: StudioV3FeatureInput): string {
  return String(input.slug || input.node?.slug || "").trim().toLowerCase();
}

function isStudioV3DefaultBbbRoom(input: StudioV3FeatureInput): boolean {
  return input.roomId === 29 || studioV3RoomSlug(input) === "bbbvision";
}

function isStudioV3AllowedRoom(
  input: StudioV3FeatureInput,
  allowlist: { ids: Set<number>; slugs: Set<string> },
): boolean {
  return allowlist.ids.has(input.roomId) && allowlist.slugs.has(studioV3RoomSlug(input));
}

function parseStudioV3AllowedRooms(value: string | undefined): { ids: Set<number>; slugs: Set<string> } {
  const ids = new Set<number>();
  const slugs = new Set<string>();
  for (const rawEntry of (value ?? "").split(",")) {
    const entry = rawEntry.trim().toLowerCase();
    if (!entry || entry === "*" || entry === "all") continue;
    if (/^[1-9][0-9]*$/.test(entry)) {
      ids.add(Number(entry));
    } else if (/^[a-z0-9][a-z0-9-]{0,120}$/.test(entry)) {
      slugs.add(entry);
    }
  }
  return { ids, slugs };
}

function flagEnabled(value: string | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
