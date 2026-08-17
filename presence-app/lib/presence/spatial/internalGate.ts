export const SPATIAL_INTERNAL_PROOF_ENV = "PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL" as const;

export interface SpatialInternalGateDecision {
  enabled: boolean;
  reason: "production-disabled" | "environment-disabled" | "flag-disabled" | "internal-proof-enabled";
  nodeEnv: string;
}

export function getSpatialInternalGateDecision(
  env: Readonly<Record<string, string | undefined>> = process.env,
): SpatialInternalGateDecision {
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  if (nodeEnv === "production") return { enabled: false, reason: "production-disabled", nodeEnv };
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    return { enabled: false, reason: "environment-disabled", nodeEnv };
  }
  if (!flagEnabled(env[SPATIAL_INTERNAL_PROOF_ENV])) return { enabled: false, reason: "flag-disabled", nodeEnv };
  return { enabled: true, reason: "internal-proof-enabled", nodeEnv };
}

export function isSpatialInternalProofEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return getSpatialInternalGateDecision(env).enabled;
}

function flagEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}
