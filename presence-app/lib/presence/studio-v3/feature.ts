import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";

export const STUDIO_V3_BROWSER_PILOT_FLAG = "presence-studio-v3:bbb-pilot";

export interface StudioV3FeatureInput {
  roomId: number;
  slug?: string | null;
  rendererKey?: string | null;
  config?: PresenceEditableConfig | null;
  node?: PresenceNode | null;
}

export function shouldUsePresenceStudioV3Editor(input: StudioV3FeatureInput): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (!isStudioV3PilotEnabled()) return false;
  if (input.roomId === 29) return true;
  return String(input.slug || input.node?.slug || "").trim().toLowerCase() === "bbbvision";
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
