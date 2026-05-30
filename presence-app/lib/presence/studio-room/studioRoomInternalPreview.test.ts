import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioRoomPreviewComparison } from "../../../components/presence-studio/StudioRoomPreviewComparison.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { isStudioRoomInternalPreviewEnabled } from "./previewGate.ts";
import { buildStudioRoomPreviewSnapshot } from "./previewSnapshot.ts";

test("internal Studio Room preview gate is closed in production and open in local development", () => {
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "test" }), true);
});

test("internal preview snapshot uses sanitized Studio Room and public-style payloads", () => {
  const snapshot = buildStudioRoomPreviewSnapshot();
  assert.deepEqual(snapshot.debug.restrictedKeysInStudioPayload, []);
  assert.deepEqual(snapshot.debug.restrictedKeysInPublicPayload, []);
  assert.deepEqual(findRestrictedPublicPayloadKeys(snapshot.studioRoom), []);
  const serialized = JSON.stringify(snapshot.studioRoom);
  assert.equal(serialized.includes("created_by_user_id"), false);
  assert.equal(serialized.includes("sourceRendererKey"), false);
  assert.equal(serialized.includes("sourceRenderMode"), false);
});

test("internal preview component renders warning banner and sanitized Studio Room canvas", () => {
  const html = renderToStaticMarkup(createElement(StudioRoomPreviewComparison, { snapshot: buildStudioRoomPreviewSnapshot() }));
  assert.match(html, /Internal preview only - not public route output/);
  assert.match(html, /studio-room-canvas-shell/);
  assert.equal(html.includes("created_by_user_id"), false);
  assert.equal(html.includes("editable_config"), false);
  assert.equal(html.includes("asset_config"), false);
});

test("public routes do not import the internal Studio Room preview route or canvas", () => {
  const publicRouteFiles = [
    "app/(public)/presence/[slug]/page.tsx",
    "app/(public)/p/[slug]/page.tsx",
    "app/(public)/p/[slug]/works/[workId]/page.tsx",
    "app/(public)/room/[id]/key/page.tsx",
  ];
  for (const file of publicRouteFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("studio-room-preview"), false, file);
    assert.equal(source.includes("studio-room-comparison"), false, file);
    assert.equal(source.includes("StudioRoomPreviewComparison"), false, file);
    assert.equal(source.includes("StudioRoomRealRoomComparison"), false, file);
    assert.equal(source.includes("StudioRoomOwnerEditorShell"), false, file);
    assert.equal(source.includes("StudioRoomCanvas"), false, file);
  }
});

test("internal real-room comparison route remains hidden from normal owner navigation", () => {
  const navigationFiles = [
    "components/studio/StudioShell.tsx",
    "components/studio/editor/PresenceStudioEditorApp.tsx",
    "app/(studio)/studio/page.tsx",
  ];
  for (const file of navigationFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("studio-room-comparison"), false, file);
    assert.equal(source.includes("StudioRoomRealRoomComparison"), false, file);
  }
});
