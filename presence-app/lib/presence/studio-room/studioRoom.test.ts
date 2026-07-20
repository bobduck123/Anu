import assert from "node:assert/strict";
import test from "node:test";
import {
  PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
  SAMPLE_ROOM,
  createEditorDraftFromPublished,
  createStudioRoomState,
  getRoomForState,
  hasUnpublishedDraft,
  migrateStudioRoomConfig,
  publishEditorDraft,
  renderStudioRoom,
  saveEditorDraft,
  toPublicRoomPayload,
  validateRoomConfig,
  type Room,
} from "./index.ts";

test("room config validation accepts the sample and reports required field gaps", () => {
  assert.equal(validateRoomConfig(SAMPLE_ROOM).filter((issue) => issue.severity === "error").length, 0);

  const broken = {
    ...SAMPLE_ROOM,
    entryChamberId: "missing",
    chambers: [{ ...SAMPLE_ROOM.chambers[0], id: "", objects: [{ type: "text", label: "", content: {} }] }],
  };
  const issues = validateRoomConfig(broken);
  assert.ok(issues.some((issue) => issue.path === "chambers.0.id"));
  assert.ok(issues.some((issue) => issue.path === "entryChamberId"));
  assert.ok(issues.some((issue) => issue.path === "chambers.0.objects.0.id"));
});

test("public payload sanitisation strips editor-only and internal fields deeply", () => {
  const publicPayload = toPublicRoomPayload(SAMPLE_ROOM);
  const serialized = JSON.stringify(publicPayload);
  assert.equal(serialized.includes("editorOnly"), false);
  assert.equal(serialized.includes("internal"), false);
  assert.equal(serialized.includes("sample-internal-audit"), false);
  assert.equal(publicPayload.chambers[1].objects[0].label, "Cover image");
});

test("draft and published room states stay separated until publish", () => {
  const state = createStudioRoomState(SAMPLE_ROOM, 4);
  const draft = createEditorDraftFromPublished(state.published, (room) => ({
    ...room,
    title: "Draft title",
  }));
  const withDraft = saveEditorDraft(state, draft);

  assert.equal(hasUnpublishedDraft(withDraft), true);
  assert.equal(getRoomForState(withDraft, "published").title, SAMPLE_ROOM.title);
  assert.equal(getRoomForState(withDraft, "draft").title, "Draft title");

  const published = publishEditorDraft(withDraft);
  assert.equal(published.published.version, 5);
  assert.equal(published.published.room.title, "Draft title");
  assert.equal(published.draft, undefined);
});

test("renderer renders structured sample room and does not crash on missing optional content", () => {
  const sparse: Room = {
    ...SAMPLE_ROOM,
    chambers: [
      {
        ...SAMPLE_ROOM.chambers[0],
        objects: [
          {
            id: "empty-note",
            type: "note",
            label: "Empty note",
            content: {},
          },
        ],
      },
    ],
  };
  const tree = renderStudioRoom(sparse);
  assert.equal(tree.title, SAMPLE_ROOM.title);
  assert.equal(tree.chambers[0].objects[0].title, "Empty note");
  assert.equal(tree.chambers[0].objects[0].body, "");
});

test("mobile variants apply order and labels while falling back when absent", () => {
  const room: Room = {
    ...SAMPLE_ROOM,
    chambers: [
      {
        ...SAMPLE_ROOM.chambers[0],
        objects: [
          { ...SAMPLE_ROOM.chambers[0].objects[0], mobile: undefined },
          { ...SAMPLE_ROOM.chambers[0].objects[1], mobile: { order: 1, label: "Talk" } },
        ],
      },
      {
        ...SAMPLE_ROOM.chambers[1],
        mobile: { hidden: true },
      },
    ],
  };
  const tree = renderStudioRoom(room, { viewport: "mobile" });
  assert.equal(tree.chambers.length, 1);
  assert.equal(tree.chambers[0].objects[0].id, "invitation");
  assert.equal(tree.chambers[0].objects[0].label, "Talk");
  assert.equal(tree.chambers[0].objects[1].label, "Room title");
});

test("schema migration placeholder records old version without external services", () => {
  const oldRoom = { ...SAMPLE_ROOM, schemaVersion: "presence-studio-room-v0" } as unknown as Room;
  const result = migrateStudioRoomConfig(oldRoom, { now: "2026-05-28T00:00:00.000Z" });
  assert.equal(result.migrated, true);
  assert.equal(result.room.schemaVersion, PRESENCE_STUDIO_ROOM_SCHEMA_VERSION);
  assert.equal(result.room.migration?.from, "presence-studio-room-v0");
});
