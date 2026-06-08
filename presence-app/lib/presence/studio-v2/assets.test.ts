import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveStudioV2AssetRegistry,
  validateStudioV2AssetUrl,
  type StudioV2DerivedAsset,
} from "./assets.ts";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  type StudioV2Object,
  type StudioV2State,
} from "./model.ts";

function object(overrides: Partial<StudioV2Object>): StudioV2Object {
  return {
    id: "object",
    type: "image",
    title: "Untitled object",
    visibility: { public: true, mobile: true },
    transform: DEFAULT_STUDIO_V2_TRANSFORM,
    locked: false,
    pinned: false,
    ...overrides,
  };
}

function state(overrides: Partial<StudioV2State> = {}): StudioV2State {
  return {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: "11",
    slug: "ggm-christina-goddard",
    title: "Christina Kerkvliet Goddard",
    tagline: "Gallery room",
    worldId: "gallery",
    skin: DEFAULT_STUDIO_V2_SKIN,
    cta: { label: "Begin a conversation", href: "mailto:studio@example.com" },
    chambers: [
      {
        id: "threshold",
        label: "Threshold",
        objects: [
          object({
            id: "lead",
            type: "image",
            title: "Willow of Port Arthur",
            image: { src: "/ggm/works/willow-of-port-arthur-2019.webp", alt: "Willow tree artwork" },
            visibility: { public: true, mobile: true },
          }),
          object({
            id: "proof-note",
            type: "proof",
            title: "Text proof without image",
            visibility: { public: true, mobile: false },
          }),
        ],
      },
      {
        id: "work-wall",
        label: "Work Wall",
        objects: [
          object({
            id: "duplicate-a",
            type: "image",
            title: "Duplicate A",
            image: { src: "/ggm/works/repeated.webp", alt: "Repeated work" },
            visibility: { public: true, mobile: false },
          }),
          object({
            id: "duplicate-b",
            type: "media",
            title: "Duplicate B",
            image: { src: "/ggm/works/repeated.webp", alt: "Repeated work detail" },
            visibility: { public: false, mobile: true },
          }),
          object({
            id: "external",
            type: "moodboard",
            title: "Reference image",
            image: { src: "https://cdn.example.com/reference.webp", alt: "External reference" },
            visibility: { public: false, mobile: false },
          }),
        ],
      },
    ],
    moodboardRefs: [],
    traces: { enabled: false, demo: false, disclosure: "" },
    mobileRecovery: {
      transformsSuspendedOnMobile: true,
      strategy: "suspend-mobile-transforms",
    },
    ...overrides,
  };
}

function assetById(assets: StudioV2DerivedAsset[], objectId: string): StudioV2DerivedAsset {
  const asset = assets.find((entry) => entry.objectId === objectId);
  assert.ok(asset, `expected asset for ${objectId}`);
  return asset;
}

test("deriveStudioV2AssetRegistry maps only Studio V2 object media into chamber usage assets", () => {
  const registry = deriveStudioV2AssetRegistry(state());

  assert.deepEqual(registry.assets.map((asset) => asset.objectId), [
    "lead",
    "duplicate-a",
    "duplicate-b",
    "external",
  ]);

  const lead = assetById(registry.assets, "lead");
  assert.equal(lead.id, "asset-lead");
  assert.equal(lead.objectTitle, "Willow of Port Arthur");
  assert.equal(lead.objectType, "image");
  assert.equal(lead.chamberId, "threshold");
  assert.equal(lead.chamberLabel, "Threshold");
  assert.equal(lead.publicVisible, true);
  assert.equal(lead.mobileVisible, true);
  assert.equal(lead.thresholdContext, true);

  const hiddenPublic = assetById(registry.assets, "duplicate-b");
  assert.equal(hiddenPublic.objectType, "media");
  assert.equal(hiddenPublic.chamberId, "work-wall");
  assert.equal(hiddenPublic.chamberLabel, "Work Wall");
  assert.equal(hiddenPublic.publicVisible, false);
  assert.equal(hiddenPublic.mobileVisible, true);

  assert.equal(registry.health.total, 4);
  assert.equal(registry.health.publicVisible, 2);
  assert.equal(registry.health.mobileVisible, 2);
});

test("deriveStudioV2AssetRegistry detects duplicate URLs and repeated usage counts", () => {
  const registry = deriveStudioV2AssetRegistry(state());
  const duplicateA = assetById(registry.assets, "duplicate-a");
  const duplicateB = assetById(registry.assets, "duplicate-b");

  assert.equal(duplicateA.usageCount, 2);
  assert.equal(duplicateB.usageCount, 2);
  assert.ok(duplicateA.statuses.includes("duplicate"));
  assert.ok(duplicateB.statuses.includes("duplicate"));
  assert.equal(registry.health.duplicateUrls, 2);
});

test("deriveStudioV2AssetRegistry returns safe empty registries for empty rooms or rooms without media", () => {
  assert.deepEqual(deriveStudioV2AssetRegistry(state({ chambers: [] })), {
    assets: [],
    health: {
      total: 0,
      missingUrls: 0,
      brokenOrUnloaded: 0,
      suspectedTestAssets: 0,
      duplicateUrls: 0,
      externalUrls: 0,
      publicVisible: 0,
      mobileVisible: 0,
    },
  });

  const noMedia = state({
    chambers: [
      {
        id: "notes",
        label: "Notes",
        objects: [
          object({ id: "text-only", type: "text", title: "Public note" }),
          object({ id: "proof-only", type: "proof", title: "Proof note" }),
        ],
      },
    ],
  });

  assert.equal(deriveStudioV2AssetRegistry(noMedia).assets.length, 0);
});

test("validateStudioV2AssetUrl classifies missing, local public, external, unsupported, and trimmed URLs", () => {
  assert.deepEqual(validateStudioV2AssetUrl(""), {
    empty: true,
    unsupportedProtocol: false,
    externalUrl: false,
    possibleTestAsset: false,
    localPublicAsset: false,
  });

  assert.deepEqual(validateStudioV2AssetUrl("  /ggm/works/example.webp  "), {
    empty: false,
    unsupportedProtocol: false,
    externalUrl: false,
    possibleTestAsset: false,
    localPublicAsset: true,
  });

  assert.deepEqual(validateStudioV2AssetUrl("https://cdn.example.com/work.webp"), {
    empty: false,
    unsupportedProtocol: false,
    externalUrl: true,
    possibleTestAsset: false,
    localPublicAsset: false,
  });

  assert.equal(validateStudioV2AssetUrl("javascript:alert(1)").unsupportedProtocol, true);
  assert.equal(validateStudioV2AssetUrl("data:image/svg+xml,<svg></svg>").unsupportedProtocol, true);
  assert.equal(validateStudioV2AssetUrl("//cdn.example.com/protocol-relative.webp").unsupportedProtocol, true);
  assert.equal(validateStudioV2AssetUrl("//cdn.example.com/protocol-relative.webp").localPublicAsset, false);
  assert.equal(validateStudioV2AssetUrl("ggm/works/relative.webp").unsupportedProtocol, true);
});

test("status derivation flags missing, broken, local, external, and clean valid assets without false alarms", () => {
  const registry = deriveStudioV2AssetRegistry(
    state({
      chambers: [
        {
          id: "media",
          label: "Media",
          objects: [
            object({
              id: "missing",
              type: "image",
              title: "Missing image",
              image: { src: "", alt: "" },
            }),
            object({
              id: "broken",
              type: "image",
              title: "Broken image",
              image: { src: "/ggm/works/broken.webp", alt: "Broken artwork" },
            }),
            object({
              id: "external",
              type: "image",
              title: "External image",
              image: { src: "https://cdn.example.com/work.webp", alt: "External artwork" },
            }),
            object({
              id: "clean",
              type: "image",
              title: "Willow of Port Arthur",
              image: { src: "/ggm/works/willow-of-port-arthur-2019.webp", alt: "Willow tree artwork" },
            }),
          ],
        },
      ],
    }),
    { brokenObjectIds: new Set(["broken"]) },
  );

  assert.deepEqual(assetById(registry.assets, "missing").statuses, ["missing-url"]);
  assert.ok(assetById(registry.assets, "broken").statuses.includes("broken-unloaded"));
  assert.ok(assetById(registry.assets, "broken").statuses.includes("local-public-asset"));
  assert.ok(assetById(registry.assets, "external").statuses.includes("valid"));
  assert.ok(assetById(registry.assets, "external").statuses.includes("external-url"));
  assert.ok(assetById(registry.assets, "clean").statuses.includes("valid"));
  assert.ok(assetById(registry.assets, "clean").statuses.includes("local-public-asset"));
  assert.equal(assetById(registry.assets, "clean").statuses.includes("possible-test-asset"), false);
  assert.equal(assetById(registry.assets, "clean").statuses.includes("broken-unloaded"), false);
  assert.equal(registry.health.missingUrls, 1);
  assert.equal(registry.health.brokenOrUnloaded, 1);
  assert.equal(registry.health.externalUrls, 1);
});

test("status derivation flags obvious smoke and test terms in URL, title, and alt text", () => {
  const terms = ["smoke", "test", "harmless", "hosted-smoke", "v1b"];

  for (const [index, term] of terms.entries()) {
    const registry = deriveStudioV2AssetRegistry(
      state({
        chambers: [
          {
            id: "suspect",
            label: "Suspect",
            objects: [
              object({
                id: `url-${term}`,
                type: "image",
                title: "Clean title",
                image: { src: `/ggm/works/${term}.webp`, alt: "Clean alt" },
              }),
              object({
                id: `title-${term}`,
                type: "image",
                title: `Possible ${term} asset`,
                image: { src: `/ggm/works/title-case-${index}.webp`, alt: "Clean alt" },
              }),
              object({
                id: `alt-${term}`,
                type: "image",
                title: "Clean title",
                image: { src: `/ggm/works/alt-case-${index}.webp`, alt: `Possible ${term} asset` },
              }),
            ],
          },
        ],
      }),
    );

    assert.ok(assetById(registry.assets, `url-${term}`).statuses.includes("possible-test-asset"));
    assert.ok(assetById(registry.assets, `title-${term}`).statuses.includes("possible-test-asset"));
    assert.ok(assetById(registry.assets, `alt-${term}`).statuses.includes("possible-test-asset"));
    assert.equal(registry.health.suspectedTestAssets, 3);
  }
});

test("asset registry derivation does not mutate input state or leak editor-only fields", () => {
  const input = state();
  const before = JSON.parse(JSON.stringify(input)) as StudioV2State;
  const registry = deriveStudioV2AssetRegistry(input);

  assert.deepEqual(input, before);

  const serialized = JSON.stringify(registry);
  for (const forbidden of [
    "locked",
    "pinned",
    "transform",
    "scene_config",
    "style_dna",
    "motion_config",
    "asset_config",
    "content_config",
    "roomkey_config",
    "enquiry_config",
    "editable_config",
    "owner",
    "draft",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `registry should not include ${forbidden}`);
  }
});

test("asset registry tolerates partial malformed image fields and documents threshold auto-detection", () => {
  const registry = deriveStudioV2AssetRegistry(
    state({
      chambers: [
        {
          id: "malformed",
          label: "Malformed",
          objects: [
            object({
              id: "partial-image",
              type: "image",
              title: "Partial image object",
              image: {} as StudioV2Object["image"],
              visibility: { public: true, mobile: true },
            }),
            object({
              id: "number-src",
              type: "image",
              title: "Number src object",
              image: { src: 42, alt: 7 } as unknown as StudioV2Object["image"],
              visibility: { public: true, mobile: true },
            }),
            object({
              id: "hero",
              type: "image",
              title: "First public artwork with URL",
              image: { src: "/ggm/works/hero.webp", alt: "Hero artwork" },
              visibility: { public: true, mobile: true },
            }),
          ],
        },
      ],
    }),
  );

  assert.equal(assetById(registry.assets, "partial-image").src, "");
  assert.ok(assetById(registry.assets, "partial-image").statuses.includes("missing-url"));
  assert.equal(assetById(registry.assets, "number-src").src, "");
  assert.ok(assetById(registry.assets, "number-src").statuses.includes("missing-url"));

  assert.equal(assetById(registry.assets, "partial-image").thresholdContext, false);
  assert.equal(assetById(registry.assets, "number-src").thresholdContext, false);
  assert.equal(assetById(registry.assets, "hero").thresholdContext, true);
});
