import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { interiorSceneGlb } from "./__fixtures__/glb.ts";
import type { BlenderResult } from "./ingest/blender.ts";
import { buildCandidates, CANDIDATE_VERSION } from "./ingest/candidates.ts";
import { readGltfContainer } from "./ingest/gltf.ts";
import { inspectSource } from "./ingest/inspect.ts";
import { SPATIAL_ASSET_BUDGETS_KB } from "./types/config.ts";
import type { SourceAssetReport } from "./types/source.ts";
import { CANDIDATE_PLACEMENTS } from "./types/candidates.ts";

const INTERIOR_OBJECTS = [
  { name: "Floor", min: [-3, 0, -2.5] as [number, number, number], max: [3, 0.1, 2.5] as [number, number, number], triangles: 12, materialName: "concrete" },
  { name: "Wall_North", min: [-3, 0, -2.5] as [number, number, number], max: [3, 3, -2.3] as [number, number, number], triangles: 12, materialName: "plaster" },
  { name: "Low Table", min: [-0.6, 0, -0.4] as [number, number, number], max: [0.6, 0.42, 0.4] as [number, number, number], triangles: 900, materialName: "oak" },
  { name: "Sofa", min: [-1.1, 0, -0.45] as [number, number, number], max: [1.1, 0.85, 0.45] as [number, number, number], triangles: 2400, materialName: "wool" },
  { name: "Garment Rack", min: [-0.8, 0, -0.3] as [number, number, number], max: [0.8, 1.7, 0.3] as [number, number, number], triangles: 600, materialName: "steel" },
  { name: "Poster Frame", min: [-0.4, 0.9, -0.02] as [number, number, number], max: [0.4, 1.9, 0.02] as [number, number, number], triangles: 20, materialName: "aluminium" },
  { name: "Plant Pot", min: [-0.2, 0, -0.2] as [number, number, number], max: [0.2, 0.6, 0.2] as [number, number, number], triangles: 300, materialName: "terracotta" },
  { name: "Shelf Unit", min: [-0.5, 0, -0.25] as [number, number, number], max: [0.5, 1.9, 0.25] as [number, number, number], triangles: 700, materialName: "birch" },
  { name: "Ceiling Lamp", min: [-0.25, 2.4, -0.25] as [number, number, number], max: [0.25, 2.9, 0.25] as [number, number, number], triangles: 250, materialName: "brass" },
];

async function interiorReport(): Promise<SourceAssetReport> {
  const directory = await mkdtemp(path.join(tmpdir(), "presence-candidates-"));
  try {
    const filePath = path.join(directory, "living-room-interior.glb");
    await writeFile(filePath, interiorSceneGlb({
      objects: INTERIOR_OBJECTS,
      geometryBytes: 900_000,
      textureBytes: 9_000_000,
      imageCount: 9,
      extras: { author: "Fixture Author", license: "CC-BY-4.0", title: "living room interior fixture" },
    }));
    return await inspectSource({ container: await readGltfContainer(filePath), sourceRoot: directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function bounds(width: number, height: number, depth: number) {
  return {
    min: [-width / 2, 0, -depth / 2] as const,
    max: [width / 2, height, depth / 2] as const,
    dimensions: { width, height, depth },
    center: [0, height / 2, 0] as const,
  };
}

function blenderResult(): BlenderResult {
  return {
    ok: true,
    blenderVersion: "5.1.1",
    geometryCompression: "draco",
    sceneBounds: bounds(6, 3, 5),
    sceneTriangleCount: 5194,
    sceneMaterialNames: ["concrete", "plaster", "oak"],
    objects: [
      {
        index: 0, name: "Sofa", meshObjectCount: 1, triangleCount: 2400, materialNames: ["wool"],
        instanceCount: 3, instanceNames: ["Sofa", "Sofa.001", "Sofa.002"],
        file: "obj-000.glb", fileBytes: 320_000, thumbnail: "obj-000.webp",
        bounds: bounds(2.2, 0.85, 0.9), looseParts: [], warnings: [],
      },
      {
        index: 1, name: "Garment Rack", meshObjectCount: 1, triangleCount: 600, materialNames: ["steel"],
        instanceCount: 1, instanceNames: ["Garment Rack"],
        file: "obj-001.glb", fileBytes: 90_000, thumbnail: "obj-001.webp",
        bounds: bounds(1.6, 1.7, 0.6), looseParts: [], warnings: [],
      },
      {
        index: 2, name: "Hero Wall Panel", meshObjectCount: 1, triangleCount: 400_000, materialNames: ["plaster"],
        instanceCount: 1, instanceNames: ["Hero Wall Panel"],
        // Deliberately far past the 5 MB hero budget.
        file: "obj-002.glb", fileBytes: 9_000_000, thumbnail: "obj-002.webp",
        bounds: bounds(6, 3, 0.2), looseParts: [], warnings: [],
      },
    ],
    roomKit: {
      shapeOnly: { file: "roomkit-shape.glb", fileBytes: 800_000 },
      textured: { file: "roomkit-textured.glb", fileBytes: 1_600_000 },
      thumbnail: "roomkit.webp",
      resizedImages: ["image-0", "image-1"],
    },
    warnings: [],
  };
}

function build(report: SourceAssetReport, blender: BlenderResult | null) {
  return buildCandidates({
    report,
    blender,
    roomKitIndex: 1,
    maxManifestOnlyCandidates: 24,
    minTriangleCountForExport: 24,
    extraWarnings: [],
  });
}

test("a complete interior produces both a room kit and component candidates", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  assert.ok(built.roomKit, "expected a room-kit candidate for a complete interior");
  assert.equal(built.components.length, 3);
  assert.equal(built.roomKit.extractedComponents.length, 3);
  assert.deepEqual(
    [...built.roomKit.extractedComponents].sort(),
    built.components.map((component) => component.componentId).sort(),
  );
  assert.equal(built.roomKit.category, "living-room");
  assert.equal(built.roomKit.export.kind, "textured");
  assert.equal(built.roomKit.fallback.strategy, "shape-only-glb");
  assert.ok(built.roomKit.fallback.runtimeAsset?.endsWith(".shape.glb"));
});

test("every candidate carries the metadata the registry contract requires", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  for (const component of built.components) {
    assert.equal(component.version, CANDIDATE_VERSION);
    assert.equal(component.status, "candidate-review-required");
    assert.equal(component.sourceAssetId, report.sourceAssetId);
    assert.ok(component.componentId.startsWith("candidate."));
    assert.equal(component.dimensions.length, 3);
    assert.ok(CANDIDATE_PLACEMENTS.includes(component.placement));
    assert.ok(component.materialSlots.length > 0, "material slots must always be exposed");
    assert.ok(component.presenceMaterialSlots.length > 0, "candidates must map onto Presence material slots");
    assert.ok(component.anchors.length > 0, "candidates must expose at least one anchor");
    assert.ok(component.anchors.some((anchor) => anchor.id === "center"));
    assert.ok(component.reviewActions.length > 0);
    assert.equal(component.export.texturesStripped, true);
    assert.equal(component.export.geometryCompression, "draco");
  }
});

test("shape-only exports strip textures and rack-like objects gain repeated slots", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  const rack = built.components.find((component) => component.sourceNodeName === "Garment Rack");
  assert.ok(rack);
  assert.equal(rack.category, "rack");
  assert.equal(rack.export.kind, "shape-only");
  assert.equal(rack.export.texturesStripped, true);
  assert.equal(rack.export.materialSlotsPreserved, true);
  assert.deepEqual([...rack.materialSlots], ["metal", "frame", "base"]);
  assert.ok(rack.anchors.filter((anchor) => anchor.id.startsWith("slot-")).length >= 2, "a 1.6 m rack should generate repeated slots");
});

test("budget status is computed per tier and never admits an over-budget candidate", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  const sofa = built.components.find((component) => component.sourceNodeName === "Sofa");
  assert.ok(sofa);
  assert.equal(sofa.budget.tier, "simple");
  assert.equal(sofa.budget.limitKb, SPATIAL_ASSET_BUDGETS_KB.simple);
  assert.equal(sofa.budget.status, "within-budget");
  assert.equal(sofa.budget.runtimeEligible, true);
  assert.equal(sofa.instanceCount, 3, "repeated instances collapse onto one shared candidate");

  const hero = built.components.find((component) => component.sourceNodeName === "Hero Wall Panel");
  assert.ok(hero);
  assert.equal(hero.budget.tier, "hero");
  assert.equal(hero.budget.status, "over-budget");
  assert.equal(hero.budget.runtimeEligible, false);
  assert.ok(hero.reviewActions.includes("needs-manual-cleanup"));
});

test("without Blender the pipeline still produces manifest-level candidates", async () => {
  const report = await interiorReport();
  const built = build(report, null);

  assert.ok(built.components.length > 0, "manifest-only extraction must still yield candidates");
  assert.ok(built.roomKit);
  for (const component of built.components) {
    assert.equal(component.extraction, "gltf-node");
    assert.equal(component.export.kind, "manifest-only");
    assert.equal(component.export.runtimeAsset, null);
    assert.equal(component.budget.status, "not-exported");
    assert.equal(component.budget.runtimeEligible, false);
    assert.ok(component.anchors.length > 0);
    assert.ok(component.materialSlots.length > 0);
  }
  assert.equal(built.roomKit.export.kind, "manifest-only");
  assert.equal(built.roomKit.fallback.strategy, "semantic-only");
  assert.equal(built.stagedFiles.length, 0);
});

test("licence and quality stay unreviewed on every generated candidate", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  for (const entry of [...built.components, built.roomKit!]) {
    assert.equal(entry.license.status, "needs-review");
    assert.equal(entry.quality.status, "not-reviewed");
    assert.equal(entry.quality.visuallyApproved, false);
    assert.ok(entry.reviewActions.includes("needs-license-review"));
    assert.ok(entry.reviewActions.includes("needs-art-direction-review"));
  }
  assert.equal(built.roomKit!.license.declaredLicense, "CC-BY-4.0");
});

test("candidate assets are written outside public/ and never reference a source file", async () => {
  const report = await interiorReport();
  const built = build(report, blenderResult());

  for (const entry of [...built.components, built.roomKit!]) {
    const asset = entry.export.runtimeAsset;
    if (asset === null) continue;
    assert.ok(asset.startsWith("assets/presence-spatial/candidates/"), `${asset} must live under the candidate output folder`);
    assert.ok(!asset.startsWith("public/"), "candidates must never be written into the served public folder");
    assert.ok(!asset.includes(report.absoluteSourcePath), "candidate paths must never point back at a source file");
  }
});
