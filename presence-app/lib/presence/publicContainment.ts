// Public-containment policy for Presence records that must remain private.
//
// Source material may remain available to authenticated migration work, but a
// contained slug must never be promoted by an anonymous demo fallback or an
// external public-demo reference. The backend remains the source of truth for
// whether a record is publicly available.

const PUBLICLY_CONTAINED_PRESENCE_SLUGS = new Set([
  "ggm-christina-goddard",
]);

function normaliseSlug(slug: string | null | undefined): string | null {
  const value = slug?.trim().toLowerCase();
  return value || null;
}

export function isPubliclyContainedPresenceSlug(slug: string | null | undefined): boolean {
  const normalised = normaliseSlug(slug);
  return normalised !== null && PUBLICLY_CONTAINED_PRESENCE_SLUGS.has(normalised);
}

export function canUsePublicDemoProfileFallback(slug: string | null | undefined): boolean {
  return !isPubliclyContainedPresenceSlug(slug);
}

export function canExposePublicDemoReference(slug: string | null | undefined): boolean {
  return !isPubliclyContainedPresenceSlug(slug);
}
