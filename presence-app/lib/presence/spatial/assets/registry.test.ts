import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { VERSION_PATTERN } from "../model.ts";
import { interiorSceneGlb, singleObjectGlb } from "./__fixtures__/glb.ts";
import { CANDIDATE_VERSION } from "./ingest/candidates.ts";
import { runIngestion } from "./ingest/run.ts";
import {
  createCandidateRegistry,
  registrySummary,
  validateCandidateRegistry,
} from "./registry/candidateRegistry.ts";
import {
  candidateLayoutReference,
  isAdmittedVersion,
  layoutJsonBytes,
  promoteCandidateToComponent,
  roomKitLayoutReferences,
} from "./registry/presenceBridge.ts";
import type { CandidateComponent, CandidateRegistry } from "./types/candidates.ts";
import { DEFAULT_INGEST_CONFIG, SPATIAL_ASSET_BUDGETS_KB } from "./types/config.ts";

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

interface Harness {
  sourceRoot: string;
  repoRoot: string;
  sourceFiles: string[];
}

async function withHarness<T>(run: (harness: Harness) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(tmpdir(), "presence-registry-"));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  await import("node:fs/promises").then((fs) => Promise.all([
    fs.mkdir(sourceRoot, { recursive: true }),
    fs.mkdir(repoRoot, { recursive: true }),
  ]));

  const interiorPath = path.join(sourceRoot, "living-room-interior.glb");
  await writeFile(interiorPath, interiorSceneGlb({
    objects: INTERIOR_OBJECTS,
    geometryBytes: 900_000,
    textureBytes: 9_000_000,
    imageCount: 9,
    extras: { author: "Fixture Author", license: "CC-BY-4.0", title: "living room interior fixture" },
  }));
  const objectPath = path.join(sourceRoot, "single-plinth.glb");
  await writeFile(objectPath, singleObjectGlb("Plinth"));

  try {
    return await run({ sourceRoot, repoRoot, sourceFiles: [interiorPath, objectPath] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function ingestConfig(harness: Harness) {
  return {
    ...DEFAULT_INGEST_CONFIG,
    sourceRoot: harness.sourceRoot,
    repoRoot: harness.repoRoot,
    generatedAt: "2026-08-17T00:00:00.000Z",
    inspectOnly: true,
    incremental: false,
  };
}

test("a generated registry validates and reports both candidate kinds", async () => {
  await withHarness(async (harness) => {
    const outcome = await runIngestion(ingestConfig(harness));
    const validation = validateCandidateRegistry(outcome.registry);
    assert.equal(validation.ok, true, JSON.stringify(validation.issues, null, 2));

    const summary = registrySummary(outcome.registry);
    assert.ok(summary.componentCount > 0);
    assert.equal(summary.roomKitCount, 1);
    assert.equal(outcome.registry.admission, "candidates-only");
    assert.equal(outcome.registry.schemaVersion, "presence-spatial-assets.v0");
  });
});

test("the run writes reports, a registry and a review document without touching sources", async () => {
  await withHarness(async (harness) => {
    const before = await Promise.all(harness.sourceFiles.map(async (file) => ({
      file,
      bytes: await readFile(file),
      mtimeMs: (await stat(file)).mtimeMs,
    })));
    const sourceEntriesBefore = (await readdir(harness.sourceRoot)).sort();

    const outcome = await runIngestion(ingestConfig(harness));

    for (const expected of [
      "assets/presence-spatial/source/reports/source-inspection.json",
      "assets/presence-spatial/source/reports/SOURCE_INSPECTION.md",
      "assets/presence-spatial/candidates/manifests/candidate-registry.json",
      "assets/presence-spatial/candidates/manifests/CANDIDATE_REVIEW.md",
    ]) {
      assert.ok(outcome.writtenFiles.includes(expected), `${expected} should have been written`);
      await stat(path.join(harness.repoRoot, ...expected.split("/")));
    }

    const review = await readFile(path.join(harness.repoRoot, "assets/presence-spatial/candidates/manifests/CANDIDATE_REVIEW.md"), "utf8");
    assert.match(review, /Recommended action/);
    assert.match(review, /needs-review/);
    assert.match(review, /Room-kit candidates/);

    for (const original of before) {
      assert.ok((await readFile(original.file)).equals(original.bytes), `${original.file} was modified`);
      assert.equal((await stat(original.file)).mtimeMs, original.mtimeMs);
    }
    assert.deepEqual((await readdir(harness.sourceRoot)).sort(), sourceEntriesBefore, "no file was added to or removed from the source folder");
  });
});

test("validation rejects an assumed licence, an assumed approval and an admitted over-budget candidate", async () => {
  await withHarness(async (harness) => {
    const outcome = await runIngestion(ingestConfig(harness));
    const base = outcome.registry;

    const licenceCleared = JSON.parse(JSON.stringify(base)) as CandidateRegistry & { components: Array<Record<string, unknown>> };
    (licenceCleared.components[0].license as unknown as Record<string, unknown>).status = "cleared";
    const licenceResult = validateCandidateRegistry(licenceCleared);
    assert.equal(licenceResult.ok, false);
    assert.ok(licenceResult.ok === false && licenceResult.issues.some((issue) => issue.code === "license-assumed"));

    const approved = JSON.parse(JSON.stringify(base)) as CandidateRegistry & { components: Array<Record<string, unknown>> };
    (approved.components[0].quality as unknown as Record<string, unknown>).visuallyApproved = true;
    const approvedResult = validateCandidateRegistry(approved);
    assert.equal(approvedResult.ok, false);
    assert.ok(approvedResult.ok === false && approvedResult.issues.some((issue) => issue.code === "quality-assumed"));

    const admitted = JSON.parse(JSON.stringify(base)) as CandidateRegistry & { components: Array<Record<string, unknown>> };
    const budget = admitted.components[0].budget as unknown as Record<string, unknown>;
    budget.status = "over-budget";
    budget.runtimeEligible = true;
    const admittedResult = validateCandidateRegistry(admitted);
    assert.equal(admittedResult.ok, false);
    assert.ok(admittedResult.ok === false && admittedResult.issues.some((issue) => issue.code === "over-budget-admitted"));

    const dangling = JSON.parse(JSON.stringify(base)) as CandidateRegistry & { roomKits: Array<Record<string, unknown>> };
    dangling.roomKits[0].extractedComponents = ["candidate.table.does-not-exist-999"];
    const danglingResult = validateCandidateRegistry(dangling);
    assert.equal(danglingResult.ok, false);
    assert.ok(danglingResult.ok === false && danglingResult.issues.some((issue) => issue.code === "dangling-component-ref"));
  });
});

test("a candidate version can never satisfy the admitted component version pattern", () => {
  assert.equal(VERSION_PATTERN.test(CANDIDATE_VERSION), false);
  assert.equal(isAdmittedVersion(CANDIDATE_VERSION), false);
  assert.equal(isAdmittedVersion("1.0.0"), true);
});

test("promotion refuses unreviewed, over-budget, unexported and raw-path candidates", async () => {
  await withHarness(async (harness) => {
    const outcome = await runIngestion(ingestConfig(harness));
    const candidate = outcome.registry.components[0];
    const license = {
      licenseId: "reviewed-by-a-human-v1",
      sourceKind: "third-party" as const,
      source: "fixture",
      attribution: "Fixture Author",
      internalOnly: true,
    };

    const unreviewed = promoteCandidateToComponent({ candidate, admittedVersion: "1.0.0", license, assetId: "asset:candidate-shape" });
    assert.equal(unreviewed.ok, false);
    assert.ok(unreviewed.ok === false && unreviewed.reasons.some((reason) => reason.includes("not been human-reviewed")));
    assert.ok(unreviewed.ok === false && unreviewed.reasons.some((reason) => reason.includes("no exported runtime asset")));

    const reviewed: CandidateComponent = {
      ...candidate,
      status: "human-approved-component",
      scaleReview: { ...candidate.scaleReview, required: false },
      export: { ...candidate.export, kind: "shape-only", runtimeAsset: "assets/presence-spatial/candidates/components/x.glb", runtimeSizeKb: 320 },
      budget: { ...candidate.budget, tier: "simple", limitKb: SPATIAL_ASSET_BUDGETS_KB.simple, actualKb: 320, status: "within-budget", runtimeEligible: true },
    };

    const badVersion = promoteCandidateToComponent({ candidate: reviewed, admittedVersion: CANDIDATE_VERSION, license, assetId: "asset:candidate-shape" });
    assert.equal(badVersion.ok, false);

    const rawAsset = promoteCandidateToComponent({ candidate: reviewed, admittedVersion: "1.0.0", license, assetId: "candidate.thing.glb" });
    assert.equal(rawAsset.ok, false);
    assert.ok(rawAsset.ok === false && rawAsset.reasons.some((reason) => reason.includes("logical asset reference")));

    const promoted = promoteCandidateToComponent({ candidate: reviewed, admittedVersion: "1.0.0", license, assetId: "asset:candidate-shape" });
    assert.equal(promoted.ok, true, promoted.ok === false ? promoted.reasons.join("; ") : "");
    if (promoted.ok) {
      assert.equal(promoted.definition.version, "1.0.0");
      assert.equal(promoted.definition.geometry.kind, "asset");
      assert.equal(promoted.definition.license.licenseId, "reviewed-by-a-human-v1");
      assert.ok(promoted.definition.materialSlots.length > 0);
      assert.ok(promoted.definition.anchors.length > 0);
    }
  });
});

test("layout references stay lightweight and never inline geometry", async () => {
  await withHarness(async (harness) => {
    const outcome = await runIngestion(ingestConfig(harness));
    const roomKit = outcome.registry.roomKits[0];
    const references = roomKitLayoutReferences({ roomKit, components: outcome.registry.components });

    assert.ok(references.length > 0);
    const bytes = layoutJsonBytes(references);
    assert.ok(bytes < SPATIAL_ASSET_BUDGETS_KB["layout-json"] * 1024, `layout JSON was ${bytes} bytes`);

    const serialised = JSON.stringify(references);
    assert.ok(!serialised.includes(".glb"), "a layout must reference components, never model files");
    assert.ok(!serialised.includes("bounds"), "a layout must not carry geometry data");

    const single = candidateLayoutReference({
      candidate: outcome.registry.components[0],
      position: [1.2, 0, -0.4],
      materialSlotOverrides: { top: "tabletop-warm-stone" },
    });
    assert.deepEqual(single.transform.position, [1.2, 0, -0.4]);
    assert.deepEqual(single.transform.scale, [1, 1, 1]);
    assert.deepEqual(single.skinRefs, []);
    assert.equal(single.materialSlotOverrides.top, "tabletop-warm-stone");
  });
});

test("registry creation is deterministic and stable across runs", async () => {
  await withHarness(async (harness) => {
    const first = await runIngestion(ingestConfig(harness));
    const second = await runIngestion(ingestConfig(harness));
    assert.deepEqual(second.registry, first.registry);

    const rebuilt = createCandidateRegistry({
      generatedAt: first.registry.generatedAt,
      sourceBatch: first.registry.sourceBatch,
      sourceRoot: first.registry.sourceRoot,
      tooling: first.registry.tooling,
      components: [...first.registry.components].reverse(),
      roomKits: [...first.registry.roomKits].reverse(),
    });
    assert.deepEqual(rebuilt.components.map((component) => component.componentId), first.registry.components.map((component) => component.componentId));
  });
});
