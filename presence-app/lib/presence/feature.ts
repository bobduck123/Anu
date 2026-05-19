// Feature flags for Presence DNA. Today these gate the temporary demo
// layers so they can be safely retired in any environment where the
// backend already persists DNA for the six demo slugs.
//
// Both flags are NEXT_PUBLIC_* so they are statically inlined at build
// time. Their default (unset) is "demo layers active" — Pass 1's
// behaviour. Pass 2 deployments that have run `flask seed-presence`
// should set the disables to true.

function readEnv(name: string): string | undefined {
  // Next.js inlines process.env.NEXT_PUBLIC_* at build time.
  return (typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>)[name] : undefined);
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/** When true, demoDnaForSlug() always returns null. */
export function isDemoDnaOverlayDisabled(): boolean {
  return truthy(readEnv("NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_OVERLAY"));
}

/** When true, fetchDemoOrPublicNode never falls back to the demo fixture. */
export function isDemoProfileFallbackDisabled(): boolean {
  return truthy(readEnv("NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_PROFILES"));
}
