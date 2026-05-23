// Renderer activation for the GGM faithful Room.
//
// Determines whether a given PresenceNode should be rendered through the
// `ggm-faithful-room-v1` renderer instead of the generic PresenceDnaRenderer
// chain. Activation is intentionally conservative — three signals, any of
// which can confirm a GGM Room, but none of which is hard-coded to a single
// hosted slug or email.
//
//   1. node.metadata.custom_presence.style_dna.renderer_key
//   2. node.metadata.custom_renderer_key
//   3. Fallback identity signature: slug or display name unambiguously
//      identifies Christina Kerkvliet Goddard.
//
// The fallback exists because the backend may not yet have persisted the
// renderer_key on every environment; we still want to render the source
// faithfully wherever the pilot Room is recognised.
//
// PUBLIC SAFETY: this module only reads node fields that are part of the
// public PresenceNode contract. It never inspects email, owner_user_id, or
// other private fields, and never returns those values.

import type { PresenceNode } from "@/lib/api/types";

export const GGM_RENDERER_KEY = "ggm-faithful-room-v1" as const;

interface CustomPresenceMetadata {
  style_dna?: { renderer_key?: string };
}

interface CustomRendererMetadata {
  custom_renderer_key?: string;
  custom_presence?: CustomPresenceMetadata;
}

function readMetadata(node: PresenceNode): CustomRendererMetadata {
  const m = node.metadata;
  if (!m || typeof m !== "object") return {};
  return m as CustomRendererMetadata;
}

/**
 * Canonical public slug for the GGM pilot Room.
 *
 * This is the only slug that should appear in marketing, NFC tags, QR
 * posters, or social shares. Older slugs such as `ggm` are kept as
 * activation signatures so RoomKey tokens previously minted against them
 * still resolve to the faithful renderer, but new content should always
 * use `ggm-christina-goddard`.
 */
export const GGM_CANONICAL_SLUG = "ggm-christina-goddard" as const;

function isGgmSignature(node: PresenceNode): boolean {
  const slug = (node.slug ?? "").toLowerCase();
  const name = (node.display_name ?? "").toLowerCase();
  if (slug === GGM_CANONICAL_SLUG) return true;
  if (slug === "ggm" || slug.startsWith("ggm-") || slug.endsWith("-ggm") || slug.includes("/ggm")) {
    return true;
  }
  if (
    slug.includes("kerkvliet-goddard") ||
    slug.includes("christina-goddard") ||
    slug.includes("christina-kerkvliet")
  ) {
    return true;
  }
  if (
    name.includes("christina kerkvliet goddard") ||
    name.includes("christina goddard") ||
    name === "ggm"
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the custom renderer key for this node, or null if the node
 * should fall through to the regular DNA renderer chain.
 */
export function resolveCustomRendererKey(node: PresenceNode): string | null {
  const meta = readMetadata(node);
  const fromCustomPresence = meta.custom_presence?.style_dna?.renderer_key;
  if (typeof fromCustomPresence === "string" && fromCustomPresence.length > 0) {
    return fromCustomPresence;
  }
  if (typeof meta.custom_renderer_key === "string" && meta.custom_renderer_key.length > 0) {
    return meta.custom_renderer_key;
  }
  if (isGgmSignature(node)) {
    return GGM_RENDERER_KEY;
  }
  return null;
}

export function isGgmFaithfulRoom(node: PresenceNode): boolean {
  return resolveCustomRendererKey(node) === GGM_RENDERER_KEY;
}
