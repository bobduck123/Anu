import test from "node:test";
import assert from "node:assert/strict";
import { diffEditableConfigs, summarizeEditableChanges } from "./diffEngine.ts";
import type { PresenceEditableConfig } from "@/lib/api/types";

const published: PresenceEditableConfig = {
  status: "published",
  version: 1,
  renderer_key: "ggm-faithful-room-v1",
  scene_config: { scenes: [{ id: "artwork_field", title: "Live title" }] },
  asset_config: { artworks: [{ slug: "one", title: "One" }] },
  style_dna: { palette: { bg: "#fff" } },
  motion_config: { liquid_intensity: 0.5 },
  roomkey_config: { entry_label: "Live entry" },
  enquiry_config: { cta_label: "Ask" },
};

test("diffEditableConfigs compares the actual PresenceEditableConfig shape", () => {
  const draft: PresenceEditableConfig = {
    ...published,
    status: "draft",
    version: 2,
    scene_config: { scenes: [{ id: "artwork_field", title: "Draft title" }] },
    asset_config: { artworks: [{ slug: "one", title: "One" }, { slug: "two", title: "Two" }] },
    motion_config: { liquid_intensity: 0.9 },
    roomkey_config: { entry_label: "Draft entry" },
  };

  const diffs = diffEditableConfigs(published, draft);
  assert.equal(diffs.some((diff) => diff.field.includes("scene_config")), true);
  assert.equal(diffs.some((diff) => diff.category === "Works and assets"), true);
  assert.equal(diffs.some((diff) => diff.category === "Motion and texture"), true);
  assert.equal(diffs.some((diff) => diff.field === "version"), false);

  const summary = summarizeEditableChanges(diffs);
  assert.equal(summary.total, diffs.length);
  assert.equal(summary.byCategory.RoomKey, 1);
});
