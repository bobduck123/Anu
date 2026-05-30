import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PresenceNode } from "../../api/types.ts";
import { StudioRoomRenderer } from "../../../components/presence-studio/StudioRoomRenderer.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { studioRoomFromPresenceNode } from "./adapters/fromEditableConfig.ts";
import { buildStudioRoomRealRoomComparison } from "./realRoomComparison.ts";
import { toPublicRoomPayload } from "./sanitize.ts";

const SEMANTIC_NODE = {
  id: 9001,
  slug: "semantic-room",
  display_name: "Semantic Room",
  headline: "A room with public commercial content.",
  bio: "Public body text.",
  node_type: "practitioner",
  display_mode: "room",
  status: "published",
  visibility: "public",
  room_type: "practitioner",
  public_email: "hello@example.com",
  public_phone: "+61 400 000 111",
  public_url: "https://example.com/room",
  enquiry_email: "private-operator@example.com",
  services: [
    {
      id: 1,
      title: "Consultation",
      description: "A first public conversation.",
      price_label: "From $120",
      duration_label: "60 min",
      cta_label: "Book",
      cta_url: "https://example.com/book",
      is_visible: true,
    },
    {
      id: 2,
      title: "Hidden service",
      description: "Should not render.",
      is_visible: false,
    },
  ],
  proof_items: [
    {
      id: 1,
      client_label: "Public client",
      testimonial: "Careful, clear and useful.",
      outcome: "Returned for a second engagement.",
      url: "https://example.com/proof",
    },
  ],
  links: [
    { id: 1, label: "Website", url: "https://example.com", is_visible: true },
    { id: 2, label: "Localhost", url: "http://127.0.0.1:3000/admin", is_visible: true },
    { id: 3, label: "Studio admin", url: "/studio/9001/editor", is_visible: true },
    { id: 4, label: "Hidden", url: "https://example.com/hidden", is_visible: false },
  ],
  credentials: [
    {
      id: 1,
      title: "Registered practitioner",
      issuer: "Presence QA",
      credential_type: "Certification",
      verification_url: "https://example.com/verify",
      is_public: true,
    },
    {
      id: 2,
      title: "Private credential",
      issuer: "Internal",
      is_public: false,
    },
  ],
  metadata: {
    owner_email: "owner-private@example.com",
    staff_notes: "internal only",
  },
} as unknown as PresenceNode;

const PRIVATE_CONTACT_ONLY_NODE = {
  ...SEMANTIC_NODE,
  id: 9002,
  slug: "private-contact-only",
  public_email: null,
  public_phone: null,
  public_url: null,
  email: "private-owner@example.com",
  phone: "+61 499 999 999",
  contactEmail: "also-private@example.com",
  contactPhone: "+61 488 888 888",
} as unknown as PresenceNode;

test("semantic adapter maps public contact methods and hides private contact fields", () => {
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(SEMANTIC_NODE, { mode: "draft" }));
  const contact = payload.chambers.find((chamber) => chamber.type === "contact");
  assert.ok(contact);
  assert.equal(contact.objects.filter((object) => object.type === "contact").length, 3);

  const serialized = JSON.stringify(payload);
  assert.match(serialized, /hello@example.com/);
  assert.match(serialized, /\+61 400 000 111/);
  assert.equal(serialized.includes("private-operator@example.com"), false);
  assert.equal(serialized.includes("owner-private@example.com"), false);
  assert.deepEqual(findRestrictedPublicPayloadKeys(payload), []);
});

test("semantic adapter does not fall back to broad private contact fields", () => {
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(PRIVATE_CONTACT_ONLY_NODE, { mode: "draft" }));
  const serialized = JSON.stringify(payload);
  assert.equal(payload.chambers.some((chamber) => chamber.id === "contact"), false);
  assert.equal(serialized.includes("private-owner@example.com"), false);
  assert.equal(serialized.includes("also-private@example.com"), false);
  assert.equal(serialized.includes("+61 499 999 999"), false);
  assert.equal(serialized.includes("+61 488 888 888"), false);
});

test("semantic adapter does not fall back to private email or phone fields", () => {
  const node = {
    ...SEMANTIC_NODE,
    public_email: undefined,
    public_phone: undefined,
    email: "private@owner.com",
    phone: "+61 999 999 999",
    contactEmail: "also-private@owner.com",
    contactPhone: "+61 888 888 888",
  } as unknown as PresenceNode;
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(node, { mode: "draft" }));
  const contact = payload.chambers.find((chamber) => chamber.type === "contact");
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("private@owner.com"), false);
  assert.equal(serialized.includes("+61 999 999 999"), false);
  assert.equal(serialized.includes("also-private@owner.com"), false);
  assert.equal(serialized.includes("+61 888 888 888"), false);
});

test("semantic adapter maps services into service-card objects", () => {
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(SEMANTIC_NODE, { mode: "draft" }));
  const services = payload.chambers.find((chamber) => chamber.type === "services");
  assert.ok(services);
  assert.equal(services.objects.length, 1);
  assert.equal(services.objects[0].type, "service-card");
  assert.match(services.objects[0].content.body || "", /From \$120/);
  assert.match(services.objects[0].content.body || "", /60 min/);
});

test("semantic adapter maps proof and credentials into public-safe proof objects", () => {
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(SEMANTIC_NODE, { mode: "draft" }));
  const proof = payload.chambers.find((chamber) => chamber.id === "proof");
  const credentials = payload.chambers.find((chamber) => chamber.id === "credentials");
  assert.ok(proof);
  assert.ok(credentials);
  assert.equal(proof.objects[0].type, "proof-card");
  assert.equal(credentials.objects[0].type, "credential");
  assert.equal(JSON.stringify(payload).includes("Private credential"), false);
});

test("semantic adapter maps public links and blocks private/internal URLs", () => {
  const payload = toPublicRoomPayload(studioRoomFromPresenceNode(SEMANTIC_NODE, { mode: "draft" }));
  const portal = payload.chambers.find((chamber) => chamber.type === "portal");
  assert.ok(portal);
  assert.equal(portal.objects.length, 2);

  const serialized = JSON.stringify(payload);
  assert.match(serialized, /https:\/\/example.com/);
  assert.equal(serialized.includes("127.0.0.1"), false);
  assert.equal(serialized.includes("/studio/9001/editor"), false);
});

test("renderer handles semantic object roles without crashing", () => {
  const room = studioRoomFromPresenceNode(SEMANTIC_NODE, { mode: "draft" });
  const html = renderToStaticMarkup(createElement(StudioRoomRenderer, { room, viewport: "mobile" }));
  assert.match(html, /Consultation/);
  assert.match(html, /Careful, clear and useful/);
  assert.match(html, /Registered practitioner/);
  assert.match(html, /Send email/);
  assert.equal(html.includes("private-operator@example.com"), false);
});

test("real-room comparison helper uses draft config safely and reports diagnostics without raw private fields", () => {
  const result = buildStudioRoomRealRoomComparison({
    node: PRIVATE_CONTACT_ONLY_NODE,
    overview: {
      room: { id: PRIVATE_CONTACT_ONLY_NODE.id, slug: PRIVATE_CONTACT_ONLY_NODE.slug, display_name: PRIVATE_CONTACT_ONLY_NODE.display_name },
      draft: {
        room_id: PRIVATE_CONTACT_ONLY_NODE.id,
        status: "draft",
        version: 3,
        renderer_key: "ggm-faithful-room-v1",
        content_config: { hero_title: "Draft private contact comparison" },
      },
      published: null,
      published_public_config: null,
      suggested_config: null,
      history: [],
      assets: [],
    },
  });

  assert.equal(result.diagnostics.mode, "draft");
  assert.equal(result.diagnostics.sourceConfig, "draft");
  assert.ok(result.diagnostics.blockedPrivateFieldCount >= 4);
  assert.equal(result.diagnostics.sanitizedPayloadRestrictedKeyCount, 0);
  const serialized = JSON.stringify(result.sanitizedStudioRoom);
  assert.equal(serialized.includes("private-owner@example.com"), false);
  assert.equal(serialized.includes("contactEmail"), false);
});

test("real-room comparison handles missing draft/config/works/media safely", () => {
  const minimalNode = {
    id: 9003,
    slug: "minimal-room",
    display_name: "Minimal Room",
    headline: "Minimal",
    status: "published",
    visibility: "public",
  } as unknown as PresenceNode;

  const result = buildStudioRoomRealRoomComparison({ node: minimalNode });
  assert.equal(result.diagnostics.mode, "draft");
  assert.equal(result.diagnostics.sourceConfig, "node");
  assert.equal(result.diagnostics.sanitizedPayloadRestrictedKeyCount, 0);
  assert.equal(result.sanitizedStudioRoom.chambers.length > 0, true);
});

test("real-room comparison route source uses production-closed preview gate", () => {
  const source = readFileSync(join(process.cwd(), "app/internal/studio-room-comparison/[roomRef]/page.tsx"), "utf8");
  assert.match(source, /isStudioRoomInternalPreviewEnabled/);
  assert.match(source, /notFound/);
});
