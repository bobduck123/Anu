import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import { PRESENCE_STUDIO_V2_RENDERER_KEY } from "./model.ts";
import { isStudioV2PresenceConfig } from "./adapters.ts";

export interface PresenceStudioV2FeatureEnv {
  NEXT_PUBLIC_PRESENCE_STUDIO_V2?: string;
  NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS?: string;
  PRESENCE_STUDIO_V2_ENABLED?: string;
  PRESENCE_STUDIO_V2_PILOT_IDS?: string;
}

export interface PresenceStudioV2EligibilityInput {
  roomId?: string | number | null;
  slug?: string | null;
  rendererKey?: string | null;
  config?: PresenceEditableConfig | null;
  node?: PresenceNode | null;
}

export function isPresenceStudioV2GloballyEnabled(
  env: PresenceStudioV2FeatureEnv = process.env as PresenceStudioV2FeatureEnv,
): boolean {
  return flagEnabled(env.NEXT_PUBLIC_PRESENCE_STUDIO_V2) || flagEnabled(env.PRESENCE_STUDIO_V2_ENABLED);
}

export function isPresenceStudioV2PilotEligible(
  input: PresenceStudioV2EligibilityInput,
  env: PresenceStudioV2FeatureEnv = process.env as PresenceStudioV2FeatureEnv,
): boolean {
  const ids = new Set([
    ...parseList(env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS),
    ...parseList(env.PRESENCE_STUDIO_V2_PILOT_IDS),
  ]);
  if (ids.size === 0) {
    // Production must require explicit pilot IDs unless there is an explicit override.
    // Dev/test can remain flexible (empty list = all eligible).
    const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
    const explicitOverride = flagEnabled(env.PRESENCE_STUDIO_V2_ENABLED) && nodeEnv === "production";
    if (nodeEnv === "production" && !explicitOverride) return false;
    return true;
  }

  const candidates = [
    input.roomId == null ? "" : String(input.roomId),
    input.slug ?? "",
    input.node?.id == null ? "" : String(input.node.id),
    input.node?.slug ?? "",
  ].filter(Boolean);

  return candidates.some((candidate) => ids.has(candidate));
}

export function shouldUsePresenceStudioV2(
  input: PresenceStudioV2EligibilityInput,
  env: PresenceStudioV2FeatureEnv = process.env as PresenceStudioV2FeatureEnv,
): boolean {
  const rendererKey = input.rendererKey ?? input.config?.renderer_key ?? input.node?.renderer_key;
  const isV2Room = rendererKey === PRESENCE_STUDIO_V2_RENDERER_KEY || isStudioV2PresenceConfig(input.config);
  return isPresenceStudioV2GloballyEnabled(env) && isV2Room && isPresenceStudioV2PilotEligible(input, env);
}

export function parsePresenceStudioV2PilotIds(
  env: PresenceStudioV2FeatureEnv = process.env as PresenceStudioV2FeatureEnv,
): string[] {
  return [
    ...parseList(env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS),
    ...parseList(env.PRESENCE_STUDIO_V2_PILOT_IDS),
  ];
}

function flagEnabled(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
