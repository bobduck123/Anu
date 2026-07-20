// Feature flags for Presence demo fallback layers. Presence DNA now resolves
// from backend-seeded or fixture-backed metadata.presence_dna; no frontend
// DNA overlay fallback remains.
//
// This flag is NEXT_PUBLIC_* so it is statically inlined at build time. Its
// default (unset) leaves demo profile fixtures active for local development
// when a backend seed is unavailable.

function readEnv(name: string): string | undefined {
  // Next.js inlines process.env.NEXT_PUBLIC_* at build time.
  return (typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>)[name] : undefined);
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/** When true, fetchDemoOrPublicNode never falls back to the demo fixture. */
export function isDemoProfileFallbackDisabled(): boolean {
  return truthy(readEnv("NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_PROFILES"));
}
