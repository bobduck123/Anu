// Canonical asset sync — bridges the gap between what the renderer
// actually displays and what the editable_config contains.
//
// The GGM renderer uses canonical artworks hard-coded in
// `lib/presence/ggm/source.ts` (the GGM_WORKS array). When the
// editable_config has no artworks seeded, the public room still
// renders correctly (the renderer falls back to canonicals), but the
// editor sees "0 visible works" and the owner can't edit them.
//
// This module surfaces the canonicals to the editor as a one-click
// "Sync from live room" action — the owner imports the canonicals
// into their draft config, after which the editor sees them, the
// owner can edit them, and publishing pushes the edits into the
// public room.

import { GGM_WORKS, type GgmWork } from "@/lib/presence/ggm/source";
import type { PresenceEditableConfig, PresenceNode } from "@/lib/api/types";

export interface CanonicalAssetBundle {
  source: "ggm-renderer" | "node-works";
  rendererKey?: string | null;
  count: number;
  hero: { url: string; alt_text: string } | null;
  artworks: CanonicalArtwork[];
}

export interface CanonicalArtwork {
  id: string;
  slug: string;
  title: string;
  year: string | number | null;
  medium: string;
  dimensions: string;
  caption?: string | null;
  description: string;
  url: string;
  image_url: string;
  thumbnail_url: string;
  alt_text: string;
  sort_order: number;
  is_visible: true;
}

/**
 * Returns the canonical asset bundle a renderer would draw if the
 * editable_config were empty. Returns null when there's no canonical
 * source for this room.
 */
export function getCanonicalAssetBundle(node: PresenceNode): CanonicalAssetBundle | null {
  const rendererKey = node.renderer_key ?? null;
  if (rendererKey === "ggm-faithful-room-v1") {
    return ggmBundle(rendererKey);
  }
  // Backend-supplied works are also a canonical source — when the
  // editor opens a node with works on the public API but the editable
  // config is empty, we surface those for sync.
  const nodeWorks = (node.works ?? []).filter((w) => w.is_visible !== false);
  if (nodeWorks.length === 0) return null;
  const artworks: CanonicalArtwork[] = nodeWorks.map((w, idx) => ({
    id: String(w.id ?? `node-${idx}`),
    slug: w.slug ?? String(w.id ?? `node-${idx}`),
    title: w.title ?? "Untitled",
    year: w.year ?? null,
    medium: w.medium ?? "",
    dimensions: w.dimensions ?? "",
    caption: w.description ?? null,
    description: w.description ?? "",
    url: w.image_url ?? w.thumbnail_url ?? "",
    image_url: w.image_url ?? w.thumbnail_url ?? "",
    thumbnail_url: w.thumbnail_url ?? w.image_url ?? "",
    alt_text: w.title ?? "Watercolour work",
    sort_order: w.sort_order ?? idx + 1,
    is_visible: true,
  }));
  const hero = node.hero_image_url || node.cover_image_url || artworks[0]?.url || null;
  return {
    source: "node-works",
    rendererKey,
    count: artworks.length,
    hero: hero ? { url: hero, alt_text: node.hero_title || node.display_name } : null,
    artworks,
  };
}

function ggmBundle(rendererKey: string): CanonicalAssetBundle {
  const artworks: CanonicalArtwork[] = GGM_WORKS.map((w: GgmWork, idx) => ({
    id: w.id,
    slug: w.slug,
    title: w.title,
    year: w.year,
    medium: w.medium,
    dimensions: w.dimensions,
    caption: w.description,
    description: w.description,
    url: w.image,
    image_url: w.image,
    thumbnail_url: w.thumb,
    alt_text: w.alt,
    sort_order: idx + 1,
    is_visible: true,
  }));
  const heroWork = GGM_WORKS.find((w) => w.slug === "willow-of-port-arthur-2019") ?? GGM_WORKS[0];
  return {
    source: "ggm-renderer",
    rendererKey,
    count: artworks.length,
    hero: { url: heroWork.image, alt_text: heroWork.alt },
    artworks,
  };
}

/**
 * Returns true when the editable config has no editable work-wall rows.
 * A separately changed draft cover image must not hide the action that
 * imports the live wall into the editable draft.
 */
export function isAssetConfigEmpty(config: PresenceEditableConfig): boolean {
  const asset = asRecord(config.asset_config);
  const artworks = Array.isArray(asset.artworks) ? asset.artworks : [];
  return artworks.length === 0;
}

/**
 * Returns a new editable config with the canonical bundle merged into
 * `asset_config.artworks` and `asset_config.hero_image`, plus the
 * `content_config.works` mirror that the readiness / public renderer
 * also reads. Non-asset fields are untouched.
 */
export function applyCanonicalBundle(
  config: PresenceEditableConfig,
  bundle: CanonicalAssetBundle,
): PresenceEditableConfig {
  const asset = asRecord(config.asset_config);
  const content = asRecord(config.content_config);
  const sceneCfg = asRecord(config.scene_config);
  const scenes = Array.isArray(sceneCfg.scenes) ? sceneCfg.scenes.slice() : [];
  // Seed the Work Wall scene's artwork_order if missing.
  if (scenes.length >= 2 && asRecord(scenes[1]).artwork_order == null) {
    scenes[1] = { ...asRecord(scenes[1]), artwork_order: bundle.artworks.map((a) => a.slug) };
  }
  return {
    ...config,
    asset_config: {
      ...asset,
      hero_image: textOf(asRecord(asset.hero_image).url) ? asset.hero_image : bundle.hero ?? null,
      artworks: bundle.artworks,
      public_assets_only: true,
    },
    content_config: {
      ...content,
      works: bundle.artworks,
    },
    scene_config: { ...sceneCfg, scenes },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}
