import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { interiorSceneGlb, singleObjectGlb } from "./__fixtures__/glb.ts";
import { readGltfContainer } from "./ingest/gltf.ts";
import { inspectSource } from "./ingest/inspect.ts";
import { discoverSources } from "./ingest/discover.ts";

async function withFixtureDir<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(tmpdir(), "presence-spatial-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const INTERIOR_OBJECTS = [
  { name: "Floor", min: [-3, 0, -2.5] as [number, number, number], max: [3, 0.1, 2.5] as [number, number, number], triangles: 12, materialName: "concrete" },
  { name: "Wall_North", min: [-3, 0, -2.5] as [number, number, number], max: [3, 3, -2.3] as [number, number, number], triangles: 12, materialName: "plaster" },
  { name: "Low Table", min: [-0.6, 0, -0.4] as [number, number, number], max: [0.6, 0.42, 0.4] as [number, number, number], triangles: 900, materialName: "oak" },
  { name: "Sofa", min: [-1.1, 0, -0.45] as [number, number, number], max: [1.1, 0.85, 0.45] as [number, number, number], triangles: 2400, materialName: "wool" },
  { name: "Garment Rack", min: [-0.8, 0, -0.3] as [number, number, number], max: [0.8, 1.7, 0.3] as [number, number, number], triangles: 600, materialName: "steel" },
  { name: "Shelf Unit", min: [-0.5, 0, -0.25] as [number, number, number], max: [0.5, 1.9, 0.25] as [number, number, number], triangles: 700, materialName: "birch" },
  { name: "Poster Frame", min: [-0.4, 0.9, -0.02] as [number, number, number], max: [0.4, 1.9, 0.02] as [number, number, number], triangles: 20, materialName: "aluminium" },
  { name: "Plant Pot", min: [-0.2, 0, -0.2] as [number, number, number], max: [0.2, 0.6, 0.2] as [number, number, number], triangles: 300, materialName: "terracotta" },
  { name: "Ceiling Lamp", min: [-0.25, 2.4, -0.25] as [number, number, number], max: [0.25, 2.9, 0.25] as [number, number, number], triangles: 250, materialName: "brass" },
];

export async function writeInteriorFixture(directory: string, filename = "living-room-interior.glb"): Promise<string> {
  const filePath = path.join(directory, filename);
  await writeFile(filePath, interiorSceneGlb({
    objects: INTERIOR_OBJECTS,
    geometryBytes: 900_000,
    textureBytes: 9_000_000,
    imageCount: 9,
    extras: {
      author: "Fixture Author (https://example.invalid/fixture-author)",
      license: "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
      title: "living room interior fixture",
      source: "https://example.invalid/models/living-room",
    },
  }));
  return filePath;
}

test("GLB inspection reports structure, byte split, bounds and triangle counts", async () => {
  await withFixtureDir(async (directory) => {
    const filePath = await writeInteriorFixture(directory);
    const container = await readGltfContainer(filePath);
    const report = await inspectSource({ container, sourceRoot: directory });

    assert.equal(report.format, "glb");
    assert.equal(report.gltfVersion, "2.0");
    assert.equal(report.meshCount, INTERIOR_OBJECTS.length);
    assert.equal(report.materialCount, INTERIOR_OBJECTS.length);
    assert.equal(report.imageCount, 9);
    assert.equal(report.triangleCount, INTERIOR_OBJECTS.reduce((total, object) => total + object.triangles, 0));
    assert.equal(report.textureBytes, 9_000_000);
    assert.ok(report.geometryBytes > 0 && report.geometryBytes < 1_000_000);
    assert.ok(report.contentHash.length === 64);

    assert.ok(report.bounds);
    assert.equal(report.bounds.dimensions.width, 6);
    assert.equal(report.bounds.dimensions.height, 3);
    assert.equal(report.bounds.dimensions.depth, 5);
  });
});

test("wrapper nodes are descended so separable objects are found", async () => {
  await withFixtureDir(async (directory) => {
    const filePath = await writeInteriorFixture(directory);
    const container = await readGltfContainer(filePath);
    const report = await inspectSource({ container, sourceRoot: directory });

    assert.equal(report.sceneRootCount, 1);
    assert.deepEqual(report.separationRootPath, ["Sketchfab_model", "RootNode"]);
    assert.equal(report.topLevelNodeCount, INTERIOR_OBJECTS.length);
    assert.equal(report.hasSeparableNodes, true);
    assert.ok(report.topLevelNodes.some((node) => node.name === "Sofa"));
  });
});

test("a multi-object interior is classified as a room-kit source and a single object is not", async () => {
  await withFixtureDir(async (directory) => {
    const interiorPath = await writeInteriorFixture(directory);
    const interior = await inspectSource({
      container: await readGltfContainer(interiorPath),
      sourceRoot: directory,
    });
    assert.ok(interior.classifications.includes("complete-interior-source"));
    assert.ok(interior.classifications.includes("candidate-roomkit-source"));
    assert.ok(interior.classifications.includes("multi-object-source"));
    assert.ok(interior.classifications.includes("texture-heavy-source"));
    assert.equal(interior.appearsCompleteInterior, true);

    const singlePath = path.join(directory, "single-table.glb");
    await writeFile(singlePath, singleObjectGlb());
    const single = await inspectSource({
      container: await readGltfContainer(singlePath),
      sourceRoot: directory,
    });
    assert.equal(single.appearsCompleteInterior, false);
    assert.equal(single.appearsSingleObject, true);
    assert.ok(single.classifications.includes("single-object-source"));
    assert.ok(!single.classifications.includes("candidate-roomkit-source"));
  });
});

test("licence status is never assumed, with or without embedded metadata", async () => {
  await withFixtureDir(async (directory) => {
    const withMetadata = await inspectSource({
      container: await readGltfContainer(await writeInteriorFixture(directory)),
      sourceRoot: directory,
    });
    assert.equal(withMetadata.license.status, "needs-review");
    assert.equal(withMetadata.license.source, "embedded");
    assert.equal(withMetadata.license.declaredLicense, "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)");
    assert.equal(withMetadata.license.declaredAuthor, "Fixture Author (https://example.invalid/fixture-author)");
    assert.ok(withMetadata.classifications.includes("needs-license-review"));

    const barePath = path.join(directory, "no-metadata.glb");
    await writeFile(barePath, singleObjectGlb());
    const withoutMetadata = await inspectSource({
      container: await readGltfContainer(barePath),
      sourceRoot: directory,
    });
    assert.equal(withoutMetadata.license.status, "needs-review");
    assert.equal(withoutMetadata.license.source, "unknown");
    assert.equal(withoutMetadata.license.declaredLicense, null);
    assert.ok(withoutMetadata.classifications.includes("needs-license-review"));
    assert.ok(withoutMetadata.warnings.some((warning) => warning.code === "no-license-metadata"));
  });
});

test("a non-metre interior raises a scale review instead of being silently rescaled", async () => {
  await withFixtureDir(async (directory) => {
    const filePath = path.join(directory, "oversized-interior.glb");
    await writeFile(filePath, interiorSceneGlb({
      objects: INTERIOR_OBJECTS.map((object) => ({
        ...object,
        min: object.min.map((value) => value * 10) as [number, number, number],
        max: object.max.map((value) => value * 10) as [number, number, number],
      })),
      geometryBytes: 900_000,
      textureBytes: 9_000_000,
      imageCount: 9,
    }));
    const report = await inspectSource({ container: await readGltfContainer(filePath), sourceRoot: directory });

    assert.equal(report.scaleReview.required, true);
    assert.equal(report.scaleReview.measuredHeight, 30);
    assert.ok(report.scaleReview.suggestedUniformScale !== null && report.scaleReview.suggestedUniformScale < 1);
    assert.ok(report.warnings.some((warning) => warning.code === "scale-check-required"));
  });
});

test("discovery finds nested sources and inspection leaves every source byte untouched", async () => {
  await withFixtureDir(async (directory) => {
    const nested = path.join(directory, "kit", "source");
    await import("node:fs/promises").then((fs) => fs.mkdir(nested, { recursive: true }));
    const rootFile = await writeInteriorFixture(directory);
    const nestedFile = path.join(nested, "Untitled.glb");
    await writeFile(nestedFile, singleObjectGlb("Plinth"));

    const before = await Promise.all([rootFile, nestedFile].map(async (file) => ({
      file,
      bytes: await readFile(file),
      mtimeMs: (await stat(file)).mtimeMs,
    })));

    const sources = await discoverSources(directory);
    assert.equal(sources.length, 2);
    for (const source of sources) {
      const container = await readGltfContainer(source.absolutePath);
      await inspectSource({ container, sourceRoot: directory });
    }

    for (const original of before) {
      const after = await readFile(original.file);
      assert.ok(after.equals(original.bytes), `${original.file} was modified by inspection.`);
      assert.equal((await stat(original.file)).mtimeMs, original.mtimeMs);
    }
  });
});
