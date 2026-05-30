import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioRoomCanvas } from "../../../components/presence-studio/StudioRoomCanvas.ts";
import { StudioRoomTemplateKitPreview } from "../../../components/presence-studio/StudioRoomTemplateKitPreview.tsx";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { isStudioRoomInternalPreviewEnabled } from "./previewGate.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";
import {
  getTemplateKitById,
  instantiateRoomFromTemplateKit,
  listTemplateKits,
  templateKitPreviewMetadata,
  validateTemplateKit,
} from "./templateKits.ts";

const EXPECTED_PRIMARY_KITS = [
  "gallery-artist",
  "cultural-community-artist",
  "material-tradie-proof-card",
  "healing-practitioner",
  "consultant-contractor",
];

test("TemplateKit registry includes the expected primary kits and safe DJ candidate", () => {
  const ids = listTemplateKits().map((kit) => kit.id);
  for (const id of EXPECTED_PRIMARY_KITS) assert.ok(ids.includes(id), id);
  assert.ok(ids.includes("underground-dj-portal"));
  assert.equal(new Set(ids).size, ids.length);

  const cultural = getTemplateKitById("cultural-community-artist");
  assert.ok(cultural);
  assert.equal(cultural.supportState, "primary");
  assert.equal(cultural.sourceCandidate.slug, "ggm-christina-goddard");
  assert.equal(cultural.sourceCandidate.id, "demo:ggm-christina-goddard");

  const dj = getTemplateKitById("underground-dj-portal");
  assert.ok(dj);
  assert.equal(dj.supportState, "candidate");
});

test("each TemplateKit validates, instantiates a Room, and renders through StudioRoomCanvas", () => {
  for (const kit of listTemplateKits()) {
    const validation = validateTemplateKit(kit);
    assert.equal(validation.valid, true, kit.id);
    assert.deepEqual(validation.restrictedPublicPayloadKeys, [], kit.id);
    assert.equal(validation.ctaPresent, true, kit.id);
    assert.ok(validation.mobileVariantCount >= kit.defaultRoom.chambers.length, kit.id);

    const room = instantiateRoomFromTemplateKit(kit.id);
    assert.equal(room.templateKitId, kit.id);
    assert.equal(room.state, "draft");
    assert.equal(room.schemaVersion, kit.schemaVersion);
    assert.equal(room.chambers.length > 0, true, kit.id);

    const tree = renderStudioRoom(room, { viewport: "mobile" });
    assert.equal(tree.chambers.length, room.chambers.length, kit.id);
    assert.ok(tree.chambers.some((chamber) => chamber.objects.some((object) => object.action?.href)), kit.id);

    const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room, viewport: "mobile" }));
    assert.match(html, /studio-room-canvas-shell/);
    assert.equal(html.includes("editable_config"), false, kit.id);
    assert.equal(html.includes("asset_config"), false, kit.id);
    assert.equal(html.includes("content_config"), false, kit.id);
  }
});

test("TemplateKit public-style payloads are sanitized and do not expose broad private contact fields", () => {
  const banned = [
    "contactEmail",
    "contactPhone",
    "ownerEmail",
    "authEmail",
    "adminEmail",
    "staffEmail",
    "owner_user_id",
    "auth_subject",
    "editorOnly",
    "internal",
  ];
  for (const kit of listTemplateKits()) {
    const payload = toPublicRoomPayload(kit.defaultRoom);
    assert.deepEqual(findRestrictedPublicPayloadKeys(payload), [], kit.id);
    const serialized = JSON.stringify(payload);
    for (const term of banned) assert.equal(serialized.includes(term), false, `${kit.id}:${term}`);
  }
});

test("TemplateKit preview metadata reports structure, CTA, semantic coverage, and deferred fields", () => {
  const gallery = getTemplateKitById("gallery-artist");
  assert.ok(gallery);
  const galleryMeta = templateKitPreviewMetadata(gallery);
  assert.equal(galleryMeta.sourceCandidate, "demo:rooms-gallery-painter");
  assert.ok(galleryMeta.chamberCount >= 6);
  assert.ok(galleryMeta.objectCount >= 12);
  assert.equal(galleryMeta.ctaPresent, true);
  assert.ok(galleryMeta.semanticCoverage.services >= 1);
  assert.ok(galleryMeta.semanticCoverage.proof >= 1);

  const dj = getTemplateKitById("underground-dj-portal");
  assert.ok(dj);
  const djMeta = templateKitPreviewMetadata(dj);
  assert.ok(djMeta.deferredFields.includes("media embeds"));

  const cultural = getTemplateKitById("cultural-community-artist");
  assert.ok(cultural);
  const culturalMeta = templateKitPreviewMetadata(cultural);
  assert.equal(culturalMeta.sourceCandidate, "demo:ggm-christina-goddard");
  assert.ok(culturalMeta.chamberCount >= 7);
  assert.ok(culturalMeta.objectCount >= 18);
  assert.equal(culturalMeta.ctaPresent, true);
  assert.ok(culturalMeta.semanticCoverage.contact >= 1);
  assert.ok(culturalMeta.semanticCoverage.services >= 1);
  assert.ok(culturalMeta.semanticCoverage.proof >= 1);
  assert.ok(culturalMeta.semanticCoverage.links >= 1);
  assert.ok(culturalMeta.mobileVariantCount >= cultural.defaultRoom.chambers.length);
});

test("cultural-community artist kit carries archive, story, practice, proof, contact, CTA, and mobile semantics", () => {
  const kit = getTemplateKitById("cultural-community-artist");
  assert.ok(kit);
  const validation = validateTemplateKit(kit);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.restrictedPublicPayloadKeys, []);
  assert.equal(validation.ctaPresent, true);
  assert.equal(validation.mobileVariantCount >= kit.defaultRoom.chambers.length, true);

  assert.deepEqual(
    kit.defaultRoom.chambers.map((chamber) => chamber.id),
    ["field", "studio", "wall", "services", "proof", "portal", "card", "contact"],
  );
  assert.equal(kit.defaultRoom.chambers[0].title, "Archive Threshold");
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.title === "Practice / Story"));
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.title === "Community Archive / Evidence Wall"));
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.type === "services"));
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.type === "proof"));
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.type === "portal"));
  assert.ok(kit.defaultRoom.chambers.some((chamber) => chamber.type === "contact"));
  assert.equal(kit.ctaStrategy.label, "Invite a practice archive conversation");
  assert.equal(kit.ctaStrategy.target, "contact");
  assert.equal(kit.ctaStrategy.appearsEarlyOnMobile, true);
  assert.ok(kit.copyScaffolds.some((scaffold) => scaffold.field === "archive_items" && scaffold.required));
  assert.ok(kit.copyScaffolds.some((scaffold) => scaffold.field === "practice_statement" && scaffold.required));

  const serialized = JSON.stringify(toPublicRoomPayload(kit.defaultRoom));
  for (const unsafe of ["localhost", "127.0.0.1", "/studio", "/internal", "/api/", "/admin"]) {
    assert.equal(serialized.includes(unsafe), false, unsafe);
  }
});

test("TemplateKit preview renders internally without exposing restricted payload keys", () => {
  const kit = getTemplateKitById("consultant-contractor");
  assert.ok(kit);
  const html = renderToStaticMarkup(createElement(StudioRoomTemplateKitPreview, { kit }));
  assert.match(html, /Internal TemplateKit preview only - not public route output/);
  assert.match(html, /Studio Room TemplateKit preview/);
  assert.match(html, /studio-room-canvas-shell/);
  assert.equal(html.includes("editable_config"), false);
  assert.equal(html.includes("style_dna"), false);
  assert.equal(html.includes("motion_config"), false);
});

test("TemplateKit preview route remains production-closed and hidden from public routes/navigation", () => {
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "development" }), true);

  const publicRouteFiles = [
    "app/(public)/presence/[slug]/page.tsx",
    "app/(public)/p/[slug]/page.tsx",
    "app/(public)/p/[slug]/works/[workId]/page.tsx",
    "app/(public)/room/[id]/key/page.tsx",
  ];
  for (const file of publicRouteFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("studio-room-template-kits"), false, file);
    assert.equal(source.includes("StudioRoomTemplateKitPreview"), false, file);
    assert.equal(source.includes("templateKits"), false, file);
    assert.equal(source.includes("templateDrafts"), false, file);
    assert.equal(source.includes("studioRoomTemplates"), false, file);
    assert.equal(source.includes("StudioRoomCanvas"), false, file);
    assert.equal(source.includes("StudioRoomOwnerEditorShell"), false, file);
    assert.equal(source.includes("StudioRoomRealRoomComparison"), false, file);
    assert.equal(source.includes("StudioRoomPreviewComparison"), false, file);
  }

  const navigationFiles = [
    "components/studio/StudioShell.tsx",
    "components/studio/editor/PresenceStudioEditorApp.tsx",
    "app/(studio)/studio/page.tsx",
  ];
  for (const file of navigationFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("studio-room-template-kits"), false, file);
  }
});

test("existing uniqueness guard is still present and not weakened by TemplateKit work", () => {
  const source = readFileSync(join(process.cwd(), "lib/presence/uniqueness.test.ts"), "utf8");
  assert.match(source, /TOO_SIMILAR_THRESHOLD/);
  assert.match(source, /assert\.equal\(failures, 0/);
  assert.match(source, /material-carpenter and local-carpenter/);
});

test("TemplateKit runtime surfaces do not introduce AI or LLM integrations", () => {
  const files = [
    "lib/presence/studio-room/templateKits.ts",
    "lib/presence/studio-room/templateDrafts.ts",
    "lib/presence/studio-room/persistedDraft.ts",
    "lib/presence/studio-room/editing.ts",
    "lib/api/studioRoomTemplates.ts",
    "lib/presence/studio-room/templates/shared.ts",
    "lib/presence/studio-room/templates/culturalCommunityArtist.ts",
    "components/studio/template-kits/TemplateKitStarter.tsx",
    "components/presence-studio/StudioRoomOwnerEditorShell.tsx",
    "components/presence-studio/StudioRoomTemplateKitPreview.tsx",
  ];
  const banned = [
    /\bopenai\b/i,
    /\banthropic\b/i,
    /\blangchain\b/i,
    /@ai-sdk/i,
    /\bchatbot\b/i,
    /\bmodel inference\b/i,
    /\bruntime ai\b/i,
  ];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    for (const pattern of banned) {
      assert.equal(pattern.test(source), false, `${file}:${pattern}`);
    }
  }
});
