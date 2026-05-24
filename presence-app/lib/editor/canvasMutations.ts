import type { PresenceEditableConfig } from "../api/types.ts";
import type { OptionPack } from "../presence/option-packs/registry.ts";
import { optionPackToConfigPatch } from "../presence/option-packs/registry.ts";
import type { FontFamily, FontPack } from "../presence/typography/registry.ts";
import { getFont } from "../presence/typography/registry.ts";

export type PaletteToken = "bg" | "paper" | "paper_warm" | "ink" | "muted" | "line" | "hero_stage_bg" | "accent";

export function applyFontPack(config: PresenceEditableConfig, pack: FontPack): PresenceEditableConfig {
  const heading = getFont(pack.headingFontId);
  const body = getFont(pack.bodyFontId);
  if (!heading || !body) return config;
  return writeTypography(config, {
    heading_stack: heading.stack,
    body_stack: body.stack,
    heading_font_id: heading.id,
    body_font_id: body.id,
    font_pack_id: pack.id,
  });
}

export function applyFontFamily(
  config: PresenceEditableConfig,
  target: "heading" | "body",
  font: FontFamily,
): PresenceEditableConfig {
  const key = target === "heading" ? "heading_stack" : "body_stack";
  const idKey = target === "heading" ? "heading_font_id" : "body_font_id";
  return writeTypography(config, { [key]: font.stack, [idKey]: font.id, font_pack_id: null });
}

export function updatePaletteToken(config: PresenceEditableConfig, token: PaletteToken, value: string): PresenceEditableConfig {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return config;
  const styleDna = record(config.style_dna);
  return {
    ...config,
    style_dna: {
      ...styleDna,
      palette: { ...record(styleDna.palette), [token]: value.toLowerCase() },
    },
  };
}

export function applyOptionPack(config: PresenceEditableConfig, pack: OptionPack): PresenceEditableConfig {
  if (!pack.publicRendererSupport) return config;
  const patch = optionPackToConfigPatch(pack);
  const styleDna = record(config.style_dna);
  const sceneConfig = record(config.scene_config);
  const layoutByStoredScene: Record<string, string | undefined> = {
    artwork_field: record(patch.scene_config.layouts).field as string | undefined,
    work_wall: record(patch.scene_config.layouts).wall as string | undefined,
    practice_studio: record(patch.scene_config.layouts).studio as string | undefined,
    calling_card: record(patch.scene_config.layouts).card as string | undefined,
  };
  return {
    ...config,
    style_dna: {
      ...styleDna,
      ...patch.style_dna,
      option_pack_id: pack.id,
      palette: { ...record(styleDna.palette), ...record(patch.style_dna.palette) },
      typography: { ...record(styleDna.typography), ...record(patch.style_dna.typography) },
      element_styles: record(styleDna.element_styles),
    },
    motion_config: { ...record(config.motion_config), ...patch.motion_config },
    scene_config: {
      ...sceneConfig,
      scenes: records(sceneConfig.scenes).map((scene) => {
        const nextLayout = layoutByStoredScene[text(scene.id)];
        return nextLayout ? { ...scene, layout: nextLayout } : scene;
      }),
    },
  };
}

function writeTypography(config: PresenceEditableConfig, patch: Record<string, unknown>): PresenceEditableConfig {
  const styleDna = record(config.style_dna);
  return {
    ...config,
    style_dna: {
      ...styleDna,
      typography: { ...record(styleDna.typography), ...patch },
    },
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
