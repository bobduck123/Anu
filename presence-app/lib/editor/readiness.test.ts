import test from "node:test";
import assert from "node:assert/strict";
import type { PresenceEditableConfig, PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import { buildReadinessReport } from "./readiness.ts";

const node = {
  id: 11,
  slug: "ggm-christina-goddard",
  display_name: "Christina Kerkvliet Goddard",
  node_type: "artist",
  display_mode: "room",
  status: "published",
  visibility: "public",
  renderer_key: "ggm-faithful-room-v1",
} as PresenceNode;

const readyDraft: PresenceEditableConfig = {
  status: "draft",
  scene_config: {
    scenes: [
      { id: "artwork_field", title: "A room ready to open", action_labels: { primary: "Begin a conversation" } },
      { id: "calling_card", enquiry_cta: "Begin a conversation" },
    ],
  },
  asset_config: {
    hero_image: { url: "/rooms/hero.webp", alt_text: "Watercolour studio work" },
  },
  content_config: {},
  enquiry_config: { cta_label: "Begin a conversation", delivery_posture: "backend_enquiry_capture" },
};

function overview(published: PresenceEditableConfig | null): PresenceEditorOverview {
  return {
    room: { id: node.id, slug: node.slug, display_name: node.display_name },
    draft: readyDraft,
    published,
    published_public_config: published,
    suggested_config: null,
    history: [],
    assets: [],
  };
}

test("a valid first draft can be intentionally opened to visitors", () => {
  const report = buildReadinessReport({
    config: readyDraft,
    overview: overview(null),
    node,
    dirty: false,
    mobilePreviewReviewed: true,
  });

  assert.equal(report.hasBlockingIssues, false);
  assert.equal(report.critical.some((issue) => issue.id === "first-open-to-visitors"), false);
  assert.equal(report.recommended.some((issue) => issue.id === "first-open-to-visitors"), true);
});

test("first publication still blocks unsafe assets", () => {
  const report = buildReadinessReport({
    config: {
      ...readyDraft,
      asset_config: { hero_image: { url: "file:///private/hero.webp", alt_text: "Private asset" } },
    },
    overview: overview(null),
    node,
    dirty: false,
    mobilePreviewReviewed: true,
  });

  assert.equal(report.hasBlockingIssues, true);
  assert.equal(report.critical.some((issue) => issue.id.startsWith("unsafe-asset-")), true);
});

test("the GGM resolved hero shown in Canvas satisfies publish readiness when draft assets are inherited", () => {
  const report = buildReadinessReport({
    config: { ...readyDraft, renderer_key: "ggm-faithful-room-v1", asset_config: {} },
    overview: overview(null),
    node,
    dirty: false,
    mobilePreviewReviewed: true,
  });

  assert.equal(report.critical.some((issue) => issue.id === "missing-primary-image"), false);
});

test("a renderer without a resolved or authored image remains blocked", () => {
  const genericNode = { ...node, renderer_key: "generic-room-v1" };
  const report = buildReadinessReport({
    config: { ...readyDraft, renderer_key: "generic-room-v1", asset_config: {} },
    overview: overview(null),
    node: genericNode,
    dirty: false,
    mobilePreviewReviewed: true,
  });

  assert.equal(report.critical.some((issue) => issue.id === "missing-primary-image"), true);
});
