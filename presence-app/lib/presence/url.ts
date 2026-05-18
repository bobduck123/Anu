const DEFAULT_PUBLIC_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://presence-gilt.vercel.app"
    : "http://localhost:3001";

export const PRESENCE_PUBLIC_ORIGIN = (
  process.env.NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  DEFAULT_PUBLIC_ORIGIN
).replace(/\/+$/, "");

export function canonicalPublicUrl(slug: string): string {
  return `${PRESENCE_PUBLIC_ORIGIN}/presence/${encodeURIComponent(slug)}`;
}

export function displayPublicUrl(slug: string): string {
  return canonicalPublicUrl(slug).replace(/^https?:\/\//, "");
}
