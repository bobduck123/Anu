import test from "node:test";
import assert from "node:assert/strict";
import type { PresenceEditableConfig, PresenceNode } from "@/lib/api/types";
import type { ReadinessIssue } from "./readiness.ts";
import {
  applyCanvasMotion,
  buildCanvasRegistry,
  CANVAS_MOTION_PRESETS,
  buildCanvasImageCandidates,
  canvasTargetForIssue,
  getCanvasImage,
  getCanvasTextStyle,
  reorderCanvasWorks,
  replaceCanvasImage,
  updateCanvasText,
  updateCanvasTextStyle,
} from "./canvasModel.ts";

const node = {
  id: 101,
  slug: "room",
  display_name: "Room title",
  primary_cta_label: "Begin",
  works: [],
} as unknown as PresenceNode;

const config: PresenceEditableConfig = {
  status: "draft",
  scene_config: {
    scenes: [
      { id: "artwork_field", title: "Old title" },
      { id: "work_wall", artwork_order: ["one", "two"] },
      { id: "practice_studio", about_title: "Practice" },
    ],
  },
  style_dna: { palette: { ink: "#111111", accent: "#b87938" } },
  motion_config: {},
  asset_config: {
    hero_image: { url: "/hero.webp", alt_text: "" },
    artworks: [
      { slug: "one", title: "One", caption: "First", url: "/one.webp", alt_text: "One", is_visible: true },
      { slug: "two", title: "Two", caption: "Second", url: "/two.webp", alt_text: "Two", is_visible: true },
    ],
  },
  content_config: { about: { biography: "Bio" }, contact: { contact_title: "Invite" } },
  enquiry_config: { cta_label: "Begin" },
};

test("canvas registry uses stable nested draft targets and includes works", () => {
  const registry = buildCanvasRegistry(config, node);
  assert.equal(registry.some((element) => element.canvasId === "hero-title" && element.draftPath.includes("scene_config")), true);
  assert.equal(registry.some((element) => element.canvasId === "work-image:one"), true);
  assert.equal(registry.some((element) => element.label.includes("asset_config")), false);
});

test("inline edits and safe style tokens update nested draft configuration", () => {
  const edited = updateCanvasText(config, "hero-title", "New room title");
  const styled = updateCanvasTextStyle(edited, "hero-title", { size: "feature", color: "accent", fontMood: "editorial" });
  const statementStyled = updateCanvasTextStyle(styled, "main-statement", { color: "accent" });
  const scenes = (styled.scene_config?.scenes ?? []) as Array<Record<string, unknown>>;
  assert.equal(scenes[0].title, "New room title");
  assert.deepEqual(getCanvasTextStyle(styled, "hero-title"), {
    size: "feature",
    weight: undefined,
    color: undefined,
    align: undefined,
    fontMood: "editorial",
    italic: false,
    underline: false,
  });
  assert.equal(getCanvasTextStyle(statementStyled, "main-statement").color, "accent");
});

test("image replacement preserves the work record and alt text association", () => {
  const replaced = replaceCanvasImage(config, "work-image:one", "/new-one.webp", "New alt");
  const works = (replaced.asset_config?.artworks ?? []) as Array<Record<string, unknown>>;
  assert.equal(works[0].title, "One");
  assert.equal(works[0].url, "/new-one.webp");
  assert.equal(works[0].alt_text, "New alt");
});

test("work reorder ignores duplicate requests and mirrors renderer order", () => {
  const reordered = reorderCanvasWorks(config, node, ["two", "two", "one"]);
  const works = (reordered.asset_config?.artworks ?? []) as Array<Record<string, unknown>>;
  const scenes = (reordered.scene_config?.scenes ?? []) as Array<Record<string, unknown>>;
  assert.deepEqual(works.map((work) => work.slug), ["two", "one"]);
  assert.deepEqual((scenes[1].artwork_order as string[]), ["two", "one"]);
  assert.deepEqual(((reordered.content_config?.works ?? []) as Array<Record<string, unknown>>).map((work) => work.slug), ["two", "one"]);
});

test("readiness and motion presets route to human Canvas fixes without heavy motion", () => {
  const issue: ReadinessIssue = {
    id: "missing-hero-alt",
    severity: "recommended",
    label: "Hero image needs alt text.",
    detail: "Add alt text.",
    tabId: "assets",
  };
  assert.equal(canvasTargetForIssue(issue, config, node), "hero-image");
  const living = applyCanvasMotion(config, CANVAS_MOTION_PRESETS[2]);
  assert.equal(living.motion_config?.heavy_motion_enabled, false);
});

test("missing alt text stays empty and unsafe work attention maps to the affected work", () => {
  const missingAlt = {
    ...config,
    asset_config: {
      ...config.asset_config,
      hero_image: { url: "/hero.webp", alt_text: "" },
      artworks: [
        { slug: "one", title: "One", url: "https://localhost/private.webp", alt_text: "One", is_visible: true },
      ],
    },
  };
  assert.equal(getCanvasImage(missingAlt, node, "hero-image").altText, "");
  assert.equal(
    canvasTargetForIssue({ id: "unsafe-asset-one", severity: "critical", label: "", detail: "", tabId: "assets" }, missingAlt, node),
    "work-image:one",
  );
  assert.equal(buildCanvasImageCandidates(missingAlt, node, [], null).some((candidate) => candidate.url.includes("localhost")), false);
});
