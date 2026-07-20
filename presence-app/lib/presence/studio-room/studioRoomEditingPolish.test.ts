import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioRoomCanvas } from "../../../components/presence-studio/StudioRoomCanvas.ts";
import { STUDIO_ROOM_RENDERER_CSS, StudioRoomRenderer } from "../../../components/presence-studio/StudioRoomRenderer.ts";
import {
  duplicateObjectInChamber,
  editableContentKeysForObjectType,
  fieldLengthIssue,
  humanRoleDescriptionForChamberType,
  humanRoleDescriptionForObjectType,
  humanRoleLabelForChamberType,
  humanRoleLabelForObjectType,
  isObjectActionEditable,
  isObjectDuplicatable,
  isObjectHideable,
  isObjectMobileHidden,
  isObjectMovable,
  isSafeStudioRoomEditUrl,
  moveObjectInChamber,
  setObjectMobileHidden,
} from "./editing.ts";
import type { Chamber, Room, RoomObject, RoomObjectType } from "./model.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";
import { instantiateTemplateKitDraft } from "./templateDrafts.ts";

const PRIMARY_KITS = [
  "gallery-artist",
  "cultural-community-artist",
  "material-tradie-proof-card",
  "healing-practitioner",
  "consultant-contractor",
];

function chamberWithObjects(objects: RoomObject[]): Chamber {
  return {
    id: "test-chamber",
    type: "story",
    title: "Test chamber",
    objects,
    mobile: { layout: "stack", order: 1 },
  };
}

function makeObject(id: string, type: RoomObjectType, label: string, overrides: Partial<RoomObject> = {}): RoomObject {
  return {
    id,
    type,
    label,
    content: overrides.content ?? { title: label },
    ...overrides,
  };
}

test("inspector restricts editable fields to the documented safe surface per object type", () => {
  for (const type of [
    "text",
    "headline",
    "service-card",
    "proof-card",
    "link-card",
    "credential",
    "cta",
    "contact",
  ] as RoomObjectType[]) {
    const keys = editableContentKeysForObjectType(type);
    for (const key of keys) {
      assert.ok(
        !["editorOnly", "internal", "id", "schemaVersion", "supportState", "theme", "rendererConfig"].includes(key),
        `${type} should not allow ${key}`,
      );
    }
  }
  assert.deepEqual([...editableContentKeysForObjectType("service-card")], ["title", "body", "priceLabel", "durationLabel"]);
  assert.deepEqual([...editableContentKeysForObjectType("proof-card")], ["title", "body", "quote", "attribution", "source"]);
  assert.deepEqual([...editableContentKeysForObjectType("credential")], ["title", "body", "issuer", "detail"]);
  assert.deepEqual([...editableContentKeysForObjectType("link-card")], ["title", "body", "action", "url", "linkType"]);
  assert.deepEqual([...editableContentKeysForObjectType("metadata")], []);
});

test("inspector URL safety still rejects studio/internal/api/admin/local hosts and bad protocols", () => {
  assert.equal(isSafeStudioRoomEditUrl("https://example.com/x"), true);
  assert.equal(isSafeStudioRoomEditUrl("#chamber-id"), true);
  assert.equal(isSafeStudioRoomEditUrl("/p/some-public-slug"), true);
  assert.equal(isSafeStudioRoomEditUrl("/studio/1"), false);
  assert.equal(isSafeStudioRoomEditUrl("/internal/secret"), false);
  assert.equal(isSafeStudioRoomEditUrl("/api/owner"), false);
  assert.equal(isSafeStudioRoomEditUrl("/admin/x"), false);
  assert.equal(isSafeStudioRoomEditUrl("http://localhost"), false);
  assert.equal(isSafeStudioRoomEditUrl("ftp://example.com"), false);
  assert.equal(isSafeStudioRoomEditUrl("javascript:alert(1)"), false);
  assert.equal(isSafeStudioRoomEditUrl("https://host.internal/x"), false);
});

test("CTA objects are not duplicatable or movable but link/service/proof objects are", () => {
  assert.equal(isObjectDuplicatable("cta"), false);
  assert.equal(isObjectDuplicatable("service-card"), true);
  assert.equal(isObjectDuplicatable("link-card"), true);
  assert.equal(isObjectDuplicatable("proof-card"), true);
  assert.equal(isObjectMovable("cta"), false);
  assert.equal(isObjectMovable("service-card"), true);
});

test("CTA is hide-restricted; other safe types are hideable on mobile", () => {
  assert.equal(isObjectHideable("cta"), false);
  assert.equal(isObjectHideable("contact"), false);
  assert.equal(isObjectHideable("service-card"), true);
  assert.equal(isObjectHideable("link-card"), true);
});

test("duplicateObjectInChamber clones object with a fresh id, copy label, and resequenced order", () => {
  const source = makeObject("service-1", "service-card", "Roof repairs");
  const chamber = chamberWithObjects([
    source,
    makeObject("service-2", "service-card", "Deck builds"),
  ]);
  const next = duplicateObjectInChamber(chamber, "service-1");
  assert.equal(next.objects.length, 3);
  assert.equal(next.objects[0].id, "service-1");
  assert.equal(next.objects[1].id, "service-1-copy");
  assert.equal(next.objects[1].label, "Roof repairs (copy)");
  assert.equal(next.objects[1].required, false);
  assert.equal(next.objects[1].mobile?.order, 2);
  assert.equal(next.objects[2].mobile?.order, 3);

  const twice = duplicateObjectInChamber(next, "service-1");
  // The second duplicate is inserted directly after the source so the array becomes
  // [service-1, service-1-copy-2, service-1-copy, service-2].
  assert.equal(twice.objects[1].id, "service-1-copy-2");
  assert.equal(twice.objects.length, 4);
});

test("duplicateObjectInChamber refuses to duplicate CTA and unknown object ids", () => {
  const chamber = chamberWithObjects([
    makeObject("cta", "cta", "Book a call"),
    makeObject("service-1", "service-card", "Repairs"),
  ]);
  const sameForCta = duplicateObjectInChamber(chamber, "cta");
  assert.equal(sameForCta.objects.length, 2);
  const sameForUnknown = duplicateObjectInChamber(chamber, "nope");
  assert.equal(sameForUnknown.objects.length, 2);
});

test("moveObjectInChamber swaps neighbours and updates mobile.order deterministically", () => {
  const chamber = chamberWithObjects([
    makeObject("a", "service-card", "A"),
    makeObject("b", "service-card", "B"),
    makeObject("c", "service-card", "C"),
  ]);
  const down = moveObjectInChamber(chamber, "a", "down");
  assert.deepEqual(down.objects.map((object) => object.id), ["b", "a", "c"]);
  assert.equal(down.objects[0].mobile?.order, 1);
  assert.equal(down.objects[1].mobile?.order, 2);
  assert.equal(down.objects[2].mobile?.order, 3);
  const upAgain = moveObjectInChamber(down, "a", "up");
  assert.deepEqual(upAgain.objects.map((object) => object.id), ["a", "b", "c"]);
});

test("moveObjectInChamber refuses to move CTA or cross a CTA neighbour", () => {
  const chamber = chamberWithObjects([
    makeObject("a", "service-card", "A"),
    makeObject("cta", "cta", "Book"),
    makeObject("c", "service-card", "C"),
  ]);
  const ctaUp = moveObjectInChamber(chamber, "cta", "up");
  assert.deepEqual(ctaUp.objects.map((object) => object.id), ["a", "cta", "c"]);
  const aDown = moveObjectInChamber(chamber, "a", "down");
  // a tries to swap with cta - refused
  assert.deepEqual(aDown.objects.map((object) => object.id), ["a", "cta", "c"]);
});

test("setObjectMobileHidden flips the hidden flag on hideable types only", () => {
  const chamber = chamberWithObjects([
    makeObject("service-1", "service-card", "Repairs"),
    makeObject("cta", "cta", "Book"),
  ]);
  const hidden = setObjectMobileHidden(chamber, "service-1", true);
  assert.equal(isObjectMobileHidden(hidden.objects[0]), true);
  const ctaHidden = setObjectMobileHidden(chamber, "cta", true);
  assert.equal(isObjectMobileHidden(ctaHidden.objects[1]), false);
});

test("renderer hides mobile-hidden objects from the rendered tree on mobile viewport", () => {
  const room: Room = {
    schemaVersion: "presence-studio-room-v1",
    id: "test-room",
    slug: "test-room",
    title: "Mobile hide test",
    state: "draft",
    entryChamberId: "test-chamber",
    theme: {
      background: "#fff",
      surface: "#fff",
      text: "#000",
      muted: "#666",
      accent: "#111",
      radius: "soft",
      fontHeading: "serif",
      fontBody: "sans-serif",
      motion: "gentle",
      spacing: "comfortable",
    },
    rendererConfig: {
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      reducedMotion: false,
      objectOpenMode: "inline",
    },
    chambers: [
      {
        id: "test-chamber",
        type: "story",
        title: "Test",
        objects: [
          { id: "a", type: "service-card", label: "Visible", content: { title: "Visible", body: "" }, mobile: { order: 1 } },
          { id: "b", type: "service-card", label: "Hidden", content: { title: "Hidden", body: "" }, mobile: { order: 2, hidden: true } },
        ],
      },
    ],
  };
  const mobileTree = renderStudioRoom(room, { viewport: "mobile" });
  assert.equal(mobileTree.chambers[0].objects.length, 1);
  assert.equal(mobileTree.chambers[0].objects[0].id, "a");
  const desktopTree = renderStudioRoom(room, { viewport: "desktop" });
  assert.equal(desktopTree.chambers[0].objects.length, 2);
});

test("fieldLengthIssue surfaces over-length warnings and stays quiet at the limit", () => {
  assert.equal(fieldLengthIssue("title", "x".repeat(100)), null);
  const over = fieldLengthIssue("title", "x".repeat(200));
  assert.ok(over);
  assert.equal(over.length, 200);
  assert.equal(over.limit, 120);
});

test("role labels and descriptions cover every primary object and chamber type used by kits", () => {
  for (const kitId of PRIMARY_KITS) {
    const result = instantiateTemplateKitDraft(kitId);
    for (const chamber of result.draft.room.chambers) {
      assert.notEqual(humanRoleLabelForChamberType(chamber.type), undefined, `${kitId}:${chamber.type}`);
      assert.ok(humanRoleDescriptionForChamberType(chamber.type).length > 0);
      for (const object of chamber.objects) {
        assert.notEqual(humanRoleLabelForObjectType(object.type), undefined, `${kitId}:${object.type}`);
        assert.ok(humanRoleDescriptionForObjectType(object.type).length > 0);
      }
    }
  }
});

test("each primary TemplateKit renders through StudioRoomCanvas with a kit-tagged article", () => {
  for (const kitId of PRIMARY_KITS) {
    const result = instantiateTemplateKitDraft(kitId);
    const publicRoom = toPublicRoomPayload(result.saveablePayload.room);
    const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room: publicRoom, dirty: false, viewport: "mobile" }));
    assert.match(html, new RegExp(`data-template-kit-id="${kitId}"`), kitId);
    assert.match(html, /data-testid="studio-room-canvas"/, kitId);
    assert.match(html, /data-testid="studio-room-mobile-primary-cta"/, kitId);
    assert.match(html, /data-testid="studio-room-mobile-sticky-cta"/, kitId);
  }
});

test("editor cockpit source carries elevated private controls without changing the save lifecycle", () => {
  const shell = readFileSync(join(process.cwd(), "components/presence-studio/StudioRoomOwnerEditorShell.tsx"), "utf8");
  assert.match(shell, /className="ps-cockpit"/);
  assert.match(shell, /Private rehearsal space/);
  assert.match(shell, /ps-mobile-rail/);
  assert.match(shell, /View tweaks/);
  assert.match(shell, /reducedPreviewMotion/);
  assert.match(shell, /data-testid="studio-room-save-draft"/);
  assert.match(shell, /data-testid="studio-room-revert-all"/);
  assert.match(shell, /saveStudioRoomDraft/);
});

test("canvas editor preview marks selected objects and can force local reduced motion", () => {
  const result = instantiateTemplateKitDraft("gallery-artist");
  const publicRoom = toPublicRoomPayload(result.saveablePayload.room);
  const html = renderToStaticMarkup(
    createElement(StudioRoomCanvas, {
      room: publicRoom,
      dirty: true,
      viewport: "mobile",
      selectedObjectId: "template-primary-cta",
      selectionMode: "spotlight",
      reducedMotion: true,
      onSelectObject: () => undefined,
    }),
  );
  assert.match(html, /data-selected="true"/);
  assert.match(html, /data-selection-mode="spotlight"/);
  assert.match(html, /data-reduced-motion="true"/);
  assert.match(html, /studio-room--editor-preview/);
  assert.match(html, /Private rehearsal/);
});

test("desktop viewport does not render the sticky mobile CTA", () => {
  const result = instantiateTemplateKitDraft("gallery-artist");
  const publicRoom = toPublicRoomPayload(result.saveablePayload.room);
  const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room: publicRoom, dirty: false, viewport: "desktop" }));
  assert.equal(html.includes("studio-room-mobile-sticky-cta"), false);
});

test("renderer CSS contains kit-distinct treatment rules for each primary TemplateKit", () => {
  for (const kitId of PRIMARY_KITS) {
    assert.match(
      STUDIO_ROOM_RENDERER_CSS,
      new RegExp(`\\[data-template-kit-id="${kitId}"\\]`),
      `${kitId} missing kit-distinct CSS rule`,
    );
  }
  // sanity: focus visibility, reduced motion guard, and overflow guard remain present
  assert.match(STUDIO_ROOM_RENDERER_CSS, /focus-visible/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /data-reduced-motion="true"/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /overflow-x: hidden/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /max-width: 100%/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /studioRoomMeshDrift/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /studio-room__image-empty/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /studio-room__mobile-sticky-action/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /is-selected/);
});

test("renderer renders service chips and credential issuer when content is present", () => {
  const room: Room = {
    schemaVersion: "presence-studio-room-v1",
    id: "test-room",
    slug: "test-room",
    title: "Detail surface",
    state: "draft",
    entryChamberId: "services",
    theme: {
      background: "#fff",
      surface: "#fff",
      text: "#000",
      muted: "#666",
      accent: "#111",
      radius: "soft",
      fontHeading: "serif",
      fontBody: "sans-serif",
      motion: "gentle",
      spacing: "comfortable",
    },
    rendererConfig: {
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      reducedMotion: false,
      objectOpenMode: "inline",
    },
    chambers: [
      {
        id: "services",
        type: "services",
        title: "Services",
        objects: [
          {
            id: "service-1",
            type: "service-card",
            label: "Repairs",
            content: {
              title: "Roof repairs",
              body: "Replace tiles and flashing.",
              priceLabel: "$280-$650",
              durationLabel: "1-2 days",
            },
          },
          {
            id: "credential-1",
            type: "credential",
            label: "Licence",
            content: {
              title: "Licensed builder",
              issuer: "NSW Fair Trading",
              detail: "Builder licence 123456C.",
            },
          },
          {
            id: "proof-1",
            type: "proof-card",
            label: "Quote",
            content: {
              title: "Outcome",
              body: "Loved the workmanship.",
              quote: "Loved the workmanship.",
              attribution: "Sam D.",
              source: "Google review, 2025",
            },
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room }));
  assert.match(html, /\$280-\$650/);
  assert.match(html, /1-2 days/);
  assert.match(html, /NSW Fair Trading/);
  assert.match(html, /Builder licence 123456C/);
  assert.match(html, /Sam D\./);
  assert.match(html, /Google review, 2025/);
});

test("reduced-motion path remains valid for kit drafts: still motion themes emit data-reduced-motion=true", () => {
  const consultant = instantiateTemplateKitDraft("consultant-contractor");
  assert.equal(consultant.saveablePayload.room.theme.motion, "still");
  const html = renderToStaticMarkup(
    createElement(StudioRoomRenderer, { room: toPublicRoomPayload(consultant.saveablePayload.room), viewport: "mobile" }),
  );
  assert.match(html, /data-reduced-motion="true"/);
});

test("unknown chamber and object roles render through safe fallback surfaces in canvas", () => {
  const room = {
    schemaVersion: "presence-studio-room-v1",
    id: "test-room",
    slug: "test-room",
    title: "Fallback",
    state: "draft",
    entryChamberId: "mystery",
    theme: {
      background: "#fff",
      surface: "#fff",
      text: "#000",
      muted: "#666",
      accent: "#111",
      radius: "soft",
      fontHeading: "serif",
      fontBody: "sans-serif",
      motion: "gentle",
      spacing: "comfortable",
    },
    rendererConfig: {
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      reducedMotion: false,
      objectOpenMode: "inline",
    },
    chambers: [
      {
        id: "mystery",
        type: "unknown-kind",
        title: "",
        objects: [
          {
            id: "unknown-object",
            type: "unknown-object",
            label: "Mystery object",
            content: {},
          },
        ],
      },
    ],
  } as unknown as Room;
  const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room }));
  assert.match(html, /Untitled chamber/);
  assert.match(html, /Mystery object/);
  assert.match(html, /ready for content/);
});

test("inspector source files remain free of runtime LLM/AI references", () => {
  const sources = [
    "components/presence-studio/StudioRoomOwnerEditorShell.tsx",
    "components/presence-studio/StudioRoomRenderer.ts",
    "components/presence-studio/StudioRoomCanvas.ts",
    "lib/presence/studio-room/editing.ts",
    "lib/presence/studio-room/renderer.ts",
  ];
  const forbidden = /(openai|anthropic\.com|claude-3|claude-4|llm|chatgpt|gpt-?4|gpt-?5|cohere|mistral|bedrock|gemini)/i;
  for (const file of sources) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(forbidden.test(source), false, file);
  }
});

test("inspector shell does not introduce a publish button or wire to the public renderer", () => {
  const shell = readFileSync(join(process.cwd(), "components/presence-studio/StudioRoomOwnerEditorShell.tsx"), "utf8");
  assert.doesNotMatch(shell, /publishPresenceEditorDraft/);
  assert.doesNotMatch(shell, /data-testid="studio-room-publish/);
  assert.doesNotMatch(shell, /Publish\s+draft/i);
  assert.doesNotMatch(shell, /from-template-kit/);
  assert.doesNotMatch(shell, /href=["'`]\/p\//);
  assert.doesNotMatch(shell, /href=["'`]\/presence\//);
  assert.match(shell, /toPublicRoomPayload/);
  assert.match(shell, /saveStudioRoomDraft/);
  // "No publish action exists" copy is preserved as the explicit owner-facing reassurance.
  assert.match(shell, /No publish action exists/);
});

test("public route files remain insulated from owner editor surfaces", () => {
  const publicFiles = [
    "app/(public)/presence/[slug]/page.tsx",
    "app/(public)/p/[slug]/page.tsx",
  ];
  for (const file of publicFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(source.includes("StudioRoomOwnerEditorShell"), false, file);
    assert.equal(source.includes("StudioRoomCanvas"), false, file);
    assert.equal(source.includes("studioRoomTemplates"), false, file);
    assert.equal(source.includes("templateDrafts"), false, file);
  }
});

test("inspector exposes safe per-type field surfaces and never the restricted schema/state fields", () => {
  const shell = readFileSync(join(process.cwd(), "components/presence-studio/StudioRoomOwnerEditorShell.tsx"), "utf8");
  // The shell should not allow editing room-level or theme-level fields.
  assert.doesNotMatch(shell, /onChange=\{[^}]*schemaVersion/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*\.theme\b/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*\.style_dna/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*\.motion_config/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*rendererConfig/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*supportState/);
  assert.doesNotMatch(shell, /onChange=\{[^}]*editorOnly/);
  // The shell continues to use the controlled helpers.
  assert.match(shell, /editableContentKeysForObjectType/);
  assert.match(shell, /isObjectActionEditable/);
  assert.match(shell, /isSafeStudioRoomEditUrl/);
});

test("isObjectActionEditable continues to scope action editing to cta/link/portal types", () => {
  assert.equal(isObjectActionEditable("cta"), true);
  assert.equal(isObjectActionEditable("link"), true);
  assert.equal(isObjectActionEditable("link-card"), true);
  assert.equal(isObjectActionEditable("portal"), true);
  assert.equal(isObjectActionEditable("text"), false);
  assert.equal(isObjectActionEditable("service-card"), false);
});
