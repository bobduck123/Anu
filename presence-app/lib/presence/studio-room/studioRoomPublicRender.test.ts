import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioRoomCanvas } from "../../../components/presence-studio/StudioRoomCanvas.ts";
import { STUDIO_ROOM_RENDERER_CSS, StudioRoomRenderer } from "../../../components/presence-studio/StudioRoomRenderer.ts";
import {
  SAMPLE_ROOM,
  renderStudioRoom,
  toPublicRoomPayload,
  type Room,
} from "./index.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";

test("React Studio Room renderer handles missing optional chamber and object content", () => {
  const sparse: Room = {
    ...SAMPLE_ROOM,
    chambers: [
      {
        id: "empty",
        type: "story",
        title: "Empty chamber",
        objects: [{ id: "empty-note", type: "note", label: "Empty note", content: {} }],
      },
    ],
  };
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room: sparse }));
  assert.match(html, /Empty chamber/);
  assert.match(html, /Empty note/);
});

test("React canvas adapter renders draft status without exposing internal fields", () => {
  const html = renderToStaticMarkup(createElement(StudioRoomCanvas, { room: SAMPLE_ROOM, dirty: true }));
  assert.match(html, /Draft room/);
  assert.match(html, /Visitors still see the Live room/);
  assert.equal(html.includes("sample-internal-audit"), false);
  assert.equal(html.includes("editorOnly"), false);
});

test("mobile variant fallback is respected by the public render tree", () => {
  const tree = renderStudioRoom(SAMPLE_ROOM, { viewport: "mobile" });
  assert.equal(tree.chambers[0].title, "Start");
  assert.equal(tree.chambers[0].objects[0].label, "Title");
  assert.ok(tree.chambers[0].objects.every((object) => object.title.length > 0));
});

test("mobile-first renderer exposes early CTA and avoids horizontal overflow by construction", () => {
  const room: Room = {
    ...SAMPLE_ROOM,
    chambers: [
      {
        ...SAMPLE_ROOM.chambers[0],
        objects: [
          ...SAMPLE_ROOM.chambers[0].objects,
          {
            id: "book-call",
            type: "cta",
            label: "Book a call",
            content: { action: { label: "Book a studio visit", href: "/visit" } },
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room, viewport: "mobile" }));
  assert.match(html, /data-testid="studio-room-mobile-primary-cta"/);
  assert.match(html, /Book a studio visit/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /overflow-x: hidden/);
  assert.match(STUDIO_ROOM_RENDERER_CSS, /max-width: 100%/);
});

test("renderer uses sanitized payload and strips editor-only/internal metadata before markup", () => {
  const payload = toPublicRoomPayload(SAMPLE_ROOM);
  assert.deepEqual(findRestrictedPublicPayloadKeys(payload), []);
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room: SAMPLE_ROOM }));
  assert.equal(html.includes("sample-internal-audit"), false);
  assert.equal(html.includes("draftNotes"), false);
  assert.equal(html.includes("editorOnly"), false);
});

test("unknown chamber and object roles render through safe fallback surfaces", () => {
  const room = {
    ...SAMPLE_ROOM,
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
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room }));
  assert.match(html, /Untitled chamber/);
  assert.match(html, /Mystery object/);
  assert.match(html, /ready for content/);
});

test("reduced-motion flag and image focal point are reflected in render markup", () => {
  const room: Room = {
    ...SAMPLE_ROOM,
    rendererConfig: { ...SAMPLE_ROOM.rendererConfig, reducedMotion: true },
    chambers: [
      {
        ...SAMPLE_ROOM.chambers[1],
        objects: [
          {
            id: "focal-image",
            type: "image",
            label: "Focal image",
            content: {
              image: {
                src: "/image.webp",
                alt: "Image with focal point",
                focalPoint: { x: 0.2, y: 0.8 },
              },
            },
            mobile: { aspectRatio: "landscape" },
          },
        ],
      },
    ],
  };
  const tree = renderStudioRoom(room);
  assert.equal(tree.chambers[0].objects[0].image?.objectPosition, "20% 80%");
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room }));
  assert.match(html, /data-reduced-motion="true"/);
  assert.match(html, /object-position:20% 80%/);
  assert.match(html, /data-aspect="landscape"/);
});
