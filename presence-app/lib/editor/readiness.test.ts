import test from "node:test";
import assert from "node:assert/strict";
import type { PresenceEditableConfig, PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  presenceConfigFromStudioV2State,
  type StudioV2State,
} from "../presence/studio-v2/index.ts";
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

test("a valid Studio V2 draft is not blocked by legacy GGM scene readiness", () => {
  const state: StudioV2State = {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: "11",
    slug: "ggm-christina-goddard",
    title: "Studio V2 room ready to open",
    tagline: "A V2 public room",
    worldId: "gallery",
    publicStylePreset: "gallery-p2",
    skin: DEFAULT_STUDIO_V2_SKIN,
    cta: { label: "Begin a conversation", href: "https://example.com/contact" },
    chambers: [
      {
        id: "room",
        label: "Room",
        objects: [
          {
            id: "proof-1",
            type: "proof",
            title: "Public proof object",
            detail: "Visible public proof.",
            visibility: { public: true, mobile: true },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: true,
            pinned: true,
          },
          {
            id: "cta-1",
            type: "cta",
            role: "cta",
            title: "Begin a conversation",
            link: "https://example.com/contact",
            visibility: { public: true, mobile: true },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: false,
            pinned: false,
          },
        ],
      },
    ],
    moodboardRefs: [],
    traces: { enabled: false, demo: true, disclosure: "Demo traces" },
    mobileRecovery: { transformsSuspendedOnMobile: true, strategy: "suspend-mobile-transforms" },
  };
  const config = {
    ...presenceConfigFromStudioV2State(state, null),
    status: "draft",
  } as PresenceEditableConfig;

  const report = buildReadinessReport({
    config,
    overview: overview({ ...config, status: "published" }),
    node: { ...node, renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY },
    dirty: false,
    mobilePreviewReviewed: true,
  });

  assert.equal(report.hasBlockingIssues, false);
  assert.equal(report.critical.some((issue) => issue.id === "missing-title"), false);
  assert.equal(report.critical.some((issue) => issue.id === "missing-primary-image"), false);
  assert.equal(report.critical.some((issue) => issue.id === "missing-primary-cta"), false);
  assert.equal(report.critical.some((issue) => issue.id === "missing-enquiry-routing"), false);
});
