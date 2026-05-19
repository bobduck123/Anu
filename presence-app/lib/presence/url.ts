const DEFAULT_PUBLIC_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://your-presence.vercel.app"
    : "http://localhost:3001";

const DEPRECATED_PUBLIC_ORIGINS = new Set([
  "https://presence-gilt.vercel.app",
]);

export function activePresenceOrigin(origin: string): string {
  const cleaned = origin.replace(/\/+$/, "");
  return DEPRECATED_PUBLIC_ORIGINS.has(cleaned)
    ? "https://your-presence.vercel.app"
    : cleaned;
}

export const PRESENCE_PUBLIC_ORIGIN = activePresenceOrigin(
  process.env.NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  DEFAULT_PUBLIC_ORIGIN,
);

export function canonicalPublicUrl(slug: string): string {
  return `${PRESENCE_PUBLIC_ORIGIN}/presence/${encodeURIComponent(slug)}`;
}

export function displayPublicUrl(slug: string): string {
  return canonicalPublicUrl(slug).replace(/^https?:\/\//, "");
}
