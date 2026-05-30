import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioRoomCanvas } from "../../../components/presence-studio/StudioRoomCanvas.ts";
import {
  buildStudioRoomDraftSaveRequest,
  buildTemplateKitStartRequest,
  TEMPLATE_KIT_START_ENDPOINT,
} from "../../api/studioRoomTemplates.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { editableContentKeysForObjectType, isObjectActionEditable, isSafeStudioRoomEditUrl } from "./editing.ts";
import { extractPersistedStudioRoomDraft, TEMPLATE_KIT_DRAFT_CONTRACT_VERSION } from "./persistedDraft.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";
import {
  instantiateTemplateKitDraft,
  listInternalTemplateKits,
  listOwnerCreatableTemplateKits,
  TEMPLATE_DRAFT_PERSISTENCE_MODE,
} from "./templateDrafts.ts";

const PRIMARY_KITS = [
  "gallery-artist",
  "cultural-community-artist",
  "material-tradie-proof-card",
  "healing-practitioner",
  "consultant-contractor",
];
const TEMPLATE_KIT_CONTRACT_PATH = join(
  process.cwd(),
  "../flora-fauna/backend/app/data/presence_studio_template_kits.json",
);

function loadTemplateKitContract(): {
  schemaVersion: string;
  studioRoomSchemaVersion: string;
  kits: Array<{
    id: string;
    displayName: string;
    supportState: "primary" | "candidate" | "deferred";
    ownerCreatable: boolean;
    version: number;
    schemaVersion: string;
  }>;
} {
  return JSON.parse(readFileSync(TEMPLATE_KIT_CONTRACT_PATH, "utf8"));
}

test("shared TemplateKit owner-creatable contract matches frontend registry", () => {
  const contract = loadTemplateKitContract();
  const allKits = listInternalTemplateKits();
  const registryById = new Map(allKits.map((kit) => [kit.id, kit]));
  const contractIds = contract.kits.map((kit) => kit.id);
  const frontendIds = allKits.map((kit) => kit.id);

  assert.equal(contract.schemaVersion, "presence-studio-template-kit-contract-v1");
  assert.equal(contract.studioRoomSchemaVersion, "presence-studio-room-v1");
  assert.deepEqual(contractIds, frontendIds);
  assert.deepEqual(
    contract.kits.filter((kit) => kit.ownerCreatable).map((kit) => kit.id),
    PRIMARY_KITS,
  );

  for (const entry of contract.kits) {
    const kit = registryById.get(entry.id);
    assert.ok(kit, entry.id);
    assert.equal(entry.displayName, kit.name, entry.id);
    assert.equal(entry.supportState, kit.supportState, entry.id);
    assert.equal(entry.ownerCreatable, kit.supportState === "primary", entry.id);
    assert.equal(entry.schemaVersion, kit.schemaVersion, entry.id);
    assert.ok(entry.version >= 1, entry.id);
  }

  const candidate = contract.kits.find((kit) => kit.id === "underground-dj-portal");
  assert.ok(candidate);
  assert.equal(candidate.supportState, "candidate");
  assert.equal(candidate.ownerCreatable, false);
});

test("owner TemplateKit selection lists only primary kits", () => {
  const exposed = listOwnerCreatableTemplateKits();
  assert.deepEqual(exposed.map((kit) => kit.id), PRIMARY_KITS);
  assert.equal(exposed.some((kit) => kit.id === "underground-dj-portal"), false);
  assert.equal(listInternalTemplateKits().some((kit) => kit.id === "underground-dj-portal"), true);
});

test("selecting each primary kit instantiates a valid staged Studio Room draft", () => {
  for (const kitId of PRIMARY_KITS) {
    const result = instantiateTemplateKitDraft(kitId);
    assert.equal(result.persistence, TEMPLATE_DRAFT_PERSISTENCE_MODE);
    assert.equal(result.draft.room.state, "draft");
    assert.equal(result.published, null);
    assert.equal(result.draft.basePublishedVersion, 0);
    assert.equal(result.saveablePayload.templateKitId, kitId);
    assert.equal(result.saveablePayload.room.id, `starter-${kitId}`);
    assert.equal(result.saveablePayload.room.schemaVersion, result.saveablePayload.schemaVersion);
    assert.equal(result.saveablePayload.room.chambers.length > 0, true, kitId);
    assert.equal(result.saveablePayload.room.theme.background.length > 0, true, kitId);
    assert.equal(Boolean(result.saveablePayload.room.moodPresetId), true, kitId);
    assert.equal(result.saveablePayload.ctaStrategy.appearsEarlyOnMobile, true, kitId);
    assert.ok(result.saveablePayload.requiredFields.length > 0, kitId);
    assert.ok(result.saveablePayload.optionalFields.length > 0, kitId);
    assert.ok(result.saveablePayload.copyScaffolds.length > 0, kitId);

    const mobileTree = renderStudioRoom(result.saveablePayload.room, { viewport: "mobile" });
    assert.ok(mobileTree.chambers.some((chamber) => chamber.objects.some((object) => object.action?.href)), kitId);
    assert.ok(result.saveablePayload.room.chambers.every((chamber) => chamber.mobile), kitId);
    assert.ok(result.saveablePayload.room.chambers.some((chamber) => chamber.objects.some((object) => object.mobile)), kitId);
  }
});

test("candidate TemplateKits cannot be instantiated through owner draft creation", () => {
  assert.equal(listOwnerCreatableTemplateKits().some((kit) => kit.id === "underground-dj-portal"), false);
  assert.equal(listInternalTemplateKits().some((kit) => kit.id === "underground-dj-portal"), true);
  assert.throws(
    () => instantiateTemplateKitDraft("underground-dj-portal"),
    /not available for owner draft creation/,
  );
});

test("instantiated draft payloads remove source candidate content and remain public-safe", () => {
  const result = instantiateTemplateKitDraft("gallery-artist");
  const serialized = JSON.stringify(result.saveablePayload);
  assert.equal(serialized.includes("Naoko Sato"), false);
  assert.equal(serialized.includes("studio@naokosato.work"), false);
  assert.equal(serialized.includes("contactEmail"), false);
  assert.equal(serialized.includes("contactPhone"), false);
  assert.equal(serialized.includes("ownerEmail"), false);
  assert.equal(serialized.includes("authEmail"), false);
  assert.equal(serialized.includes("editorOnly"), false);
  assert.equal(serialized.includes("internal"), false);

  const publicPayload = toPublicRoomPayload(result.saveablePayload.room);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicPayload), []);
  const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room: publicPayload, dirty: true }));
  assert.match(html, /Image ready to be chosen/);
  assert.equal(html.includes("editable_config"), false);
});

test("cultural-community artist draft is staged, source-scrubbed, and preserves kit structure", () => {
  const result = instantiateTemplateKitDraft("cultural-community-artist");
  assert.equal(result.persistence, TEMPLATE_DRAFT_PERSISTENCE_MODE);
  assert.equal(result.published, null);
  assert.equal(result.draft.room.state, "draft");
  assert.equal(result.draft.room.slug, "starter-cultural-community-artist");
  assert.equal(result.saveablePayload.templateKitId, "cultural-community-artist");
  assert.equal(result.saveablePayload.room.templateKitId, "cultural-community-artist");
  assert.equal(result.saveablePayload.room.moodPresetId, "cultural-archive");
  assert.equal(result.saveablePayload.room.theme.accent, "#8f3a2f");
  assert.deepEqual(
    result.saveablePayload.room.chambers.map((chamber) => chamber.id),
    ["field", "studio", "wall", "services", "proof", "portal", "card", "contact"],
  );
  assert.ok(result.saveablePayload.copyScaffolds.some((scaffold) => scaffold.field === "archive_items"));
  assert.equal(result.saveablePayload.ctaStrategy.label, "Invite a practice archive conversation");
  assert.equal(result.saveablePayload.ctaStrategy.target, "contact");

  const serialized = JSON.stringify(result.saveablePayload).toLowerCase();
  const sourceTerms = [
    "christina",
    "kerkvliet",
    "goddard",
    "memory colours",
    "bigpond",
    "bridle road",
    "willow of port arthur",
    "watercolour",
    "artscenetoday",
    "source portfolio",
    "moana",
  ];
  for (const term of sourceTerms) assert.equal(serialized.includes(term), false, term);
  for (const restricted of ["editable_config", "style_dna", "motion_config", "editoronly", "internal"]) {
    assert.equal(serialized.includes(restricted), false, restricted);
  }

  const publicSerialized = JSON.stringify(result.publicPreviewPayload).toLowerCase();
  for (const unsafe of ["localhost", "127.0.0.1", "/studio", "/internal", "/api/", "/admin"]) {
    assert.equal(publicSerialized.includes(unsafe), false, unsafe);
  }
  assert.deepEqual(findRestrictedPublicPayloadKeys(result.publicPreviewPayload), []);
});

test("TemplateKit selection route is owner-authenticated and hidden from public routes/navigation", () => {
  const route = readFileSync(join(process.cwd(), "app/(studio)/studio/template-kits/page.tsx"), "utf8");
  const component = readFileSync(join(process.cwd(), "components/studio/template-kits/TemplateKitStarter.tsx"), "utf8");
  assert.match(route, /listOwnerCreatableTemplateKits/);
  assert.match(component, /resolveOwnerSessionToken/);
  assert.match(component, /StudioAuthGate/);
  assert.match(component, /createStudioRoomFromTemplateKit/);
  assert.match(component, /Create saved Draft/);
  assert.match(component, /staged/i);
  assert.doesNotMatch(component, /Source:/);
  assert.doesNotMatch(component, /underground-dj-portal/);

  const publicRouteFiles = [
    "app/(public)/presence/[slug]/page.tsx",
    "app/(public)/p/[slug]/page.tsx",
    "app/(public)/p/[slug]/works/[workId]/page.tsx",
    "app/(public)/room/[id]/key/page.tsx",
  ];
  for (const file of publicRouteFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("template-kits"), false, file);
    assert.equal(source.includes("from-template-kit"), false, file);
    assert.equal(source.includes("studioRoomTemplates"), false, file);
    assert.equal(source.includes("TemplateKitStarter"), false, file);
    assert.equal(source.includes("templateDrafts"), false, file);
    assert.equal(source.includes("StudioRoomOwnerEditorShell"), false, file);
    assert.equal(source.includes("StudioRoomTemplateKitPreview"), false, file);
    assert.equal(source.includes("StudioRoomRealRoomComparison"), false, file);
    assert.equal(source.includes("StudioRoomCanvas"), false, file);
  }

  const navigationFiles = [
    "components/studio/StudioShell.tsx",
    "components/studio/editor/PresenceStudioEditorApp.tsx",
    "app/(studio)/studio/page.tsx",
  ];
  for (const file of navigationFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("studio/template-kits"), false, file);
    assert.equal(source.includes("TemplateKitStarter"), false, file);
    assert.equal(source.includes("StudioRoomOwnerEditorShell"), false, file);
  }
});

test("TemplateKit start request preserves a source-scrubbed saveable payload for backend persistence", () => {
  const instantiation = instantiateTemplateKitDraft("cultural-community-artist");
  const request = buildTemplateKitStartRequest({
    kitId: "cultural-community-artist",
    draftPayload: instantiation.saveablePayload,
  });
  assert.equal(TEMPLATE_KIT_START_ENDPOINT, "/api/presence/owner/studio-rooms/from-template-kit");
  assert.equal(request.kit_id, "cultural-community-artist");
  assert.equal(request.draft_payload.templateKitId, "cultural-community-artist");
  assert.equal(request.draft_payload.room.state, "draft");
  assert.equal(request.draft_payload.room.id, "starter-cultural-community-artist");
  assert.equal(request.draft_payload.room.chambers.length, 8);
  assert.ok(request.draft_payload.copyScaffolds.length > 0);
  assert.equal(request.draft_payload.ctaStrategy.label, "Invite a practice archive conversation");

  const serialized = JSON.stringify(request).toLowerCase();
  for (const unsafe of ["underground-dj-portal", "contactemail", "contactphone", "owneremail", "authsubject"]) {
    assert.equal(serialized.includes(unsafe), false, unsafe);
  }
});

test("persisted TemplateKit Studio Room drafts extract for the owner editor shell and render safely", () => {
  const instantiation = instantiateTemplateKitDraft("gallery-artist");
  const persisted = extractPersistedStudioRoomDraft({
    status: "draft",
    content_config: {
      studio_room_draft: {
        contract: TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
        schema_version: instantiation.saveablePayload.schemaVersion,
        template_kit_id: instantiation.saveablePayload.templateKitId,
        template_kit_name: instantiation.kit.name,
        support_state: "primary",
        base_published_version: 0,
        published_state: null,
        room: instantiation.saveablePayload.room,
        required_fields: instantiation.saveablePayload.requiredFields,
        optional_fields: instantiation.saveablePayload.optionalFields,
        copy_scaffolds: instantiation.saveablePayload.copyScaffolds,
        cta_strategy: instantiation.saveablePayload.ctaStrategy,
      },
    },
  });
  assert.ok(persisted);
  assert.equal(persisted.templateKitId, "gallery-artist");
  assert.equal(persisted.basePublishedVersion, 0);
  assert.equal(persisted.publishedState, null);
  assert.equal(persisted.room.state, "draft");
  assert.ok(persisted.requiredFields.length > 0);
  assert.ok(persisted.optionalFields.length > 0);

  const publicPayload = toPublicRoomPayload(persisted.room);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicPayload), []);
  const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room: publicPayload, dirty: true, viewport: "mobile" }));
  assert.match(html, /studio-room-canvas-shell/);
  assert.equal(html.includes("editable_config"), false);
});

test("Studio Room draft save request serializes only the compat draft boundary", () => {
  const instantiation = instantiateTemplateKitDraft("gallery-artist");
  const persisted = extractPersistedStudioRoomDraft({
    status: "draft",
    content_config: {
      studio_room_draft: {
        contract: TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
        schema_version: instantiation.saveablePayload.schemaVersion,
        template_kit_id: instantiation.saveablePayload.templateKitId,
        template_kit_name: instantiation.kit.name,
        support_state: "primary",
        base_published_version: 0,
        published_state: null,
        room: instantiation.saveablePayload.room,
        required_fields: instantiation.saveablePayload.requiredFields,
        optional_fields: instantiation.saveablePayload.optionalFields,
        copy_scaffolds: instantiation.saveablePayload.copyScaffolds,
        cta_strategy: instantiation.saveablePayload.ctaStrategy,
      },
    },
  });
  assert.ok(persisted);
  const request = buildStudioRoomDraftSaveRequest(persisted);
  assert.equal(request.studio_room_draft.contract, TEMPLATE_KIT_DRAFT_CONTRACT_VERSION);
  assert.equal(request.studio_room_draft.template_kit_id, "gallery-artist");
  assert.equal(request.studio_room_draft.published_state, null);
  assert.equal(request.studio_room_draft.room.state, "draft");
  const serialized = JSON.stringify(request).toLowerCase();
  for (const unsafe of ["editable_config", "style_dna", "motion_config", "owner_user_id", "contactemail", "contactphone"]) {
    assert.equal(serialized.includes(unsafe), false, unsafe);
  }
});

test("Studio Room editing utilities expose narrow safe field and URL rules", () => {
  assert.deepEqual([...editableContentKeysForObjectType("headline")], ["title", "body"]);
  assert.ok(editableContentKeysForObjectType("service-card").includes("priceLabel"));
  assert.ok(editableContentKeysForObjectType("proof-card").includes("attribution"));
  assert.ok(editableContentKeysForObjectType("credential").includes("issuer"));
  assert.equal(isObjectActionEditable("cta"), true);
  assert.equal(isObjectActionEditable("link-card"), true);
  assert.equal(isObjectActionEditable("headline"), false);
  assert.equal(isSafeStudioRoomEditUrl("#contact"), true);
  assert.equal(isSafeStudioRoomEditUrl("https://example.org/project"), true);
  assert.equal(isSafeStudioRoomEditUrl("/presence/public-room"), true);
  assert.equal(isSafeStudioRoomEditUrl("/studio/123"), false);
  assert.equal(isSafeStudioRoomEditUrl("http://localhost:3000/internal"), false);
  assert.equal(isSafeStudioRoomEditUrl("mailto:private@example.invalid"), false);
});

test("Studio Room owner editor shell route is owner-gated and separate from public routes", () => {
  const route = readFileSync(join(process.cwd(), "app/(studio)/studio/[id]/studio-room/page.tsx"), "utf8");
  const shell = readFileSync(join(process.cwd(), "components/presence-studio/StudioRoomOwnerEditorShell.tsx"), "utf8");
  assert.match(route, /useOwnerNode/);
  assert.match(route, /StudioNodeGate/);
  assert.match(route, /StudioShell/);
  assert.match(shell, /getPresenceEditor/);
  assert.match(shell, /saveStudioRoomDraft/);
  assert.match(shell, /Save draft/);
  assert.match(shell, /Inspector/);
  assert.match(shell, /Chambers/);
  assert.match(shell, /extractPersistedStudioRoomDraft/);
  assert.match(shell, /StudioRoomCanvas/);
  assert.match(shell, /public-style sanitized copy/);
  assert.doesNotMatch(shell, /publishPresenceEditorDraft/);
});

test("existing uniqueness guard remains present and strict", () => {
  const source = readFileSync(join(process.cwd(), "lib/presence/uniqueness.test.ts"), "utf8");
  assert.match(source, /assert\.equal\(failures, 0/);
  assert.match(source, /TOO_SIMILAR_THRESHOLD/);
});
