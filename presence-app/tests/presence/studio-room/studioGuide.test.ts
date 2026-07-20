import { describe, it } from "node:test";
import assert from "node:assert";
import { analyzeStudioGuide } from "../../../lib/presence/studio-room/studioGuide";
import type { Room, StudioRoomTemplateKit } from "../../../lib/presence/studio-room/model";

const PERSISTED_SCHEMA = "presence-studio-room-v1" as const;

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    schemaVersion: PERSISTED_SCHEMA,
    id: "room-1",
    slug: "test-room",
    title: overrides.title ?? "Test Room",
    state: "draft",
    entryChamberId: "field",
    theme: {
      background: "#000",
      surface: "#111",
      text: "#fff",
      muted: "#888",
      accent: "#f0f",
      radius: "soft",
      fontHeading: "sans-serif",
      fontBody: "sans-serif",
      motion: "gentle",
      spacing: "comfortable",
    },
    rendererConfig: {
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      objectOpenMode: "sheet",
      reducedMotion: false,
    },
    templateKitId: overrides.templateKitId ?? "gallery-artist",
    chambers: overrides.chambers ?? [],
    ...overrides,
  };
}

function makeKitHints(
  overrides: Partial<StudioRoomTemplateKit> = {},
): Parameters<typeof analyzeStudioGuide>[1] {
  return {
    requiredFields: overrides.requiredFields ?? [],
    optionalFields: overrides.optionalFields ?? [],
    copyScaffolds: overrides.copyScaffolds ?? [],
    ctaStrategy: overrides.ctaStrategy ?? {
      label: "Commission a work",
      target: "commission",
      primaryChamberId: "card",
      appearsEarlyOnMobile: true,
    },
  };
}

describe("analyzeStudioGuide", () => {
  it("returns all-clear for a well-formed gallery-artist room", () => {
    const room = makeRoom({
      title: "Naoko Sato",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          summary: "A calm first view",
          objects: [
            {
              id: "o1",
              type: "headline",
              label: "Name",
              content: { title: "Naoko Sato", body: "Painter and printmaker" },
            },
            {
              id: "cta1",
              type: "cta",
              label: "Commission",
              content: {
                title: "Commission",
                action: { label: "Commission a portrait", href: "#card" },
              },
            },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
        {
          id: "wall",
          type: "gallery",
          title: "Selected works",
          objects: [
            { id: "i1", type: "image", label: "W1", content: {} },
            { id: "i2", type: "image", label: "W2", content: {} },
            { id: "i3", type: "image", label: "W3", content: {} },
          ],
          mobile: { order: 2, layout: "carousel", label: "Works" },
        },
        {
          id: "proof",
          type: "proof",
          title: "Proof",
          objects: [
            { id: "o2", type: "testimonial", label: "T1", content: { quote: "Beautiful work.", attribution: "A. Client" } },
          ],
          mobile: { order: 3, layout: "stack", label: "Proof" },
        },
        {
          id: "card",
          type: "invitation",
          title: "Commission invitation",
          objects: [
            {
              id: "o3",
              type: "note",
              label: "Enquiry",
              content: { title: "Get in touch", body: "Email studio@example.com" },
            },
          ],
          mobile: { order: 4, layout: "stack", label: "Commission" },
        },
        {
          id: "contact",
          type: "contact",
          title: "Contact",
          objects: [
            { id: "o4", type: "note", label: "Email", content: { body: "studio@example.com" } },
          ],
          mobile: { order: 5, layout: "stack", label: "Contact" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    assert.strictEqual(result.urgentCount, 0);
    assert.strictEqual(result.advisoryCount, 0);
    assert.strictEqual(result.polishCount, 0);
    assert.ok(result.completedCount > 0);
  });

  it("flags empty room title as urgent", () => {
    const room = makeRoom({ title: "" });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("no title"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "urgent");
  });

  it("flags placeholder room title as advisory", () => {
    const room = makeRoom({ title: "Your name or studio name" });
    const result = analyzeStudioGuide(
      room,
      makeKitHints({
        copyScaffolds: [
          { field: "hero_title", label: "Room title", placeholder: "Your name or studio name", required: true },
        ],
      }),
    );
    const issue = result.issues.find((i) => i.issue.includes("looks like a placeholder"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags missing CTA as urgent", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("No primary call-to-action"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "urgent");
  });

  it("flags default CTA label as advisory", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            {
              id: "cta1",
              type: "cta",
              label: "Commission a work",
              content: {
                title: "Commission a work",
                action: { label: "Commission a work", href: "#card" },
              },
            },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("still uses the default text"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags empty chamber as advisory", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("chamber is empty"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags all-hidden objects in a chamber as urgent", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" }, mobile: { order: 1, hidden: true } },
            { id: "o2", type: "note", label: "Bio", content: { body: "Text" }, mobile: { order: 2, hidden: true } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("hidden on mobile"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "urgent");
  });

  it("flags missing threshold chamber as urgent", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "gallery",
          type: "gallery",
          title: "Works",
          objects: [{ id: "o1", type: "image", label: "Work 1", content: {} }],
          mobile: { order: 1, layout: "carousel", label: "Works" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("No threshold"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "urgent");
  });

  it("flags missing proof for gallery-artist kit", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("No proof chamber"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags empty proof content as advisory", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
        {
          id: "proof",
          type: "proof",
          title: "Proof",
          objects: [
            { id: "o2", type: "testimonial", label: "T1", content: {} },
          ],
          mobile: { order: 2, layout: "stack", label: "Proof" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("Empty proof item"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags gallery with fewer than 3 images for gallery-artist kit", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
        {
          id: "wall",
          type: "gallery",
          title: "Works",
          objects: [
            { id: "i1", type: "image", label: "W1", content: {} },
          ],
          mobile: { order: 2, layout: "carousel", label: "Works" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("expects at least 3"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags placeholder body text as advisory", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            {
              id: "o1",
              type: "note",
              label: "Intro",
              content: { body: "Optional content can be added here when the room is authored." },
            },
            {
              id: "cta1",
              type: "cta",
              label: "CTA",
              content: { title: "Go", action: { label: "Custom Go", href: "#" } },
            },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("looks like placeholder copy"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("flags missing contact for gallery-artist kit", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("No contact chamber"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "urgent");
  });

  it("sorts issues urgent first, then advisory, then polish", () => {
    const room = makeRoom({
      title: "",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "",
          objects: [
            { id: "o1", type: "headline", label: "", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "Commission a work", content: { title: "Commission a work", action: { label: "Commission a work", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const priorities = result.issues.map((i) => i.priority);
    assert.ok(priorities.indexOf("urgent") <= priorities.indexOf("advisory"));
    assert.ok(priorities.indexOf("advisory") <= priorities.indexOf("polish"));
  });

  it("does not flag empty label on CTA objects", () => {
    const room = makeRoom({
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            {
              id: "cta1",
              type: "cta",
              label: "",
              content: { title: "Go", action: { label: "Go", href: "#" } },
            },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("Unlabelled") && i.objectId === "cta1");
    assert.strictEqual(issue, undefined);
  });

  it("flags missing portal for cultural-community-artist kit", () => {
    const room = makeRoom({
      templateKitId: "cultural-community-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("No portal or links chamber"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "polish");
  });

  it("flags empty invitation content for kits that expect it", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
        {
          id: "card",
          type: "invitation",
          title: "Invite",
          objects: [
            { id: "o2", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 2, layout: "stack", label: "Invite" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("Invitation chamber") && i.issue.includes("no supporting content"));
    assert.ok(issue);
    assert.strictEqual(issue.priority, "advisory");
  });

  it("counts work and work-card objects toward gallery minimum", () => {
    const room = makeRoom({
      templateKitId: "gallery-artist",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            { id: "o1", type: "headline", label: "Name", content: { title: "Hello" } },
            { id: "cta1", type: "cta", label: "CTA", content: { title: "CTA", action: { label: "Go", href: "#" } } },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
        {
          id: "wall",
          type: "gallery",
          title: "Works",
          objects: [
            { id: "i1", type: "work", label: "W1", content: {} },
            { id: "i2", type: "work-card", label: "W2", content: {} },
            { id: "i3", type: "image", label: "W3", content: {} },
          ],
          mobile: { order: 2, layout: "carousel", label: "Works" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    const issue = result.issues.find((i) => i.issue.includes("gallery"));
    assert.strictEqual(issue, undefined);
  });

  it("does not read editorOnly or internal fields", () => {
    const room = makeRoom({
      title: "Safe Title",
      chambers: [
        {
          id: "field",
          type: "threshold",
          title: "Threshold",
          objects: [
            {
              id: "o1",
              type: "note",
              label: "Note",
              content: { title: "Hello", body: "World" },
              editorOnly: { editablePaths: ["content.title"], notes: "Secret editor note" },
              internal: { backendId: 12345, privateField: "secret" },
            },
          ],
          mobile: { order: 1, layout: "stack", label: "Start" },
        },
      ],
    });
    const result = analyzeStudioGuide(room, makeKitHints());
    // Should not crash and should not surface editorOnly/internal data in issues
    const allIssueText = result.issues.map((i) => `${i.issue} ${i.why} ${i.action}`).join(" ");
    assert.strictEqual(allIssueText.includes("Secret editor note"), false);
    assert.strictEqual(allIssueText.includes("secret"), false);
    assert.strictEqual(allIssueText.includes("backendId"), false);
    assert.strictEqual(allIssueText.includes("12345"), false);
  });
});
