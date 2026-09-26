import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ID_PATTERN, VERSION_PATTERN } from "../model.ts";
import {
  ADMITTED_STATUS,
  INTERNAL_USE_STATUS,
  MOBSTAR_ROLES,
} from "./types/internalUse.ts";
import type { InternalUseManifest, MobstarGate4Bridge, MobstarShortlist } from "./types/internalUse.ts";
import type { CandidateComponent, CandidateRegistry, CandidateRoomKit } from "./types/candidates.ts";
import {
  assertNotAdmitted,
  automatedFilter,
  buildGate4Bridge,
  buildInternalUseManifest,
  buildShortlist,
  MOBSTAR_LIGHTING_PROFILE,
  MOBSTAR_STYLE_PRESET,
} from "./mobstar/selection.ts";
import { MOBSTAR_REVIEW_NOTES, MOBSTAR_UNFILLED_ROLES } from "./mobstar/reviewDecisions.ts";

const REPO_ROOT = process.cwd();
const GENERATED_AT = "2026-08-17T00:00:00.000Z";

const resolve = (relative: string): string => path.join(REPO_ROOT, ...relative.split("/"));

async function readRegistry(): Promise<CandidateRegistry> {
  const raw = await readFile(resolve("assets/presence-spatial/candidates/manifests/candidate-registry.json"), "utf8");
  return JSON.parse(raw) as CandidateRegistry;
}

async function readJson<T>(relative: string): Promise<T> {
  return JSON.parse(await readFile(resolve(relative), "utf8")) as T;
}

test("the internal-use manifest validates against the candidate registry", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });

  assert.equal(manifest.manifestVersion, "mobstar-gate4-internal-use.v0");
  assert.equal(manifest.admission, "internal-use-candidates-only");
  assert.ok(manifest.components.length > 0, "expected at least one selected component");
  assert.ok(manifest.roomKits.length > 0, "expected at least one selected room kit");

  const componentIds = new Set(registry.components.map((component) => component.componentId));
  const roomKitIds = new Set(registry.roomKits.map((roomKit) => roomKit.roomKitId));

  for (const component of manifest.components) {
    assert.ok(componentIds.has(component.componentId), `${component.componentId} is not in the candidate registry`);
    assert.ok(ID_PATTERN.test(component.componentId));
    assert.ok(MOBSTAR_ROLES.includes(component.role));
    assert.ok(component.intendedUses.includes("mobstar-gate4"));
    assert.ok(component.notAdmittedReason.length > 0);
  }
  for (const roomKit of manifest.roomKits) {
    assert.ok(roomKitIds.has(roomKit.roomKitId), `${roomKit.roomKitId} is not in the candidate registry`);
    assert.ok(["use-whole", "mine-for-parts", "use-whole-or-mine"].includes(roomKit.usage));
    assert.ok(roomKit.usageNote.length > 0);
  }
});

test("nothing is marked as an admitted Presence component", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });
  const bridge = buildGate4Bridge({ manifest, registry, generatedAt: GENERATED_AT });

  const statuses: string[] = [
    ...manifest.components.map((component) => component.status),
    ...manifest.roomKits.map((roomKit) => roomKit.status),
    ...bridge.components.map((component) => component.status),
    ...bridge.roomKits.map((roomKit) => roomKit.status),
  ];
  assert.ok(statuses.length > 0);
  for (const status of statuses) assert.equal(status, INTERNAL_USE_STATUS);
  assert.ok(!statuses.includes(ADMITTED_STATUS));

  // The guard itself must actually reject the admitted status.
  assert.throws(() => assertNotAdmitted([ADMITTED_STATUS]), /second-context review/);

  // Candidate versions still fail the admitted version pattern, so nothing here
  // can be dropped into the real component registry by accident.
  for (const component of manifest.components) {
    assert.equal(VERSION_PATTERN.test(component.version), false, `${component.componentId} carries an admitted-looking version`);
  }

  // The written artefacts must agree with the built ones.
  const writtenManifest = await readJson<InternalUseManifest>("assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json");
  const serialised = JSON.stringify(writtenManifest);
  assert.ok(!serialised.includes(ADMITTED_STATUS), "the written manifest must not contain the admitted status");
});

test("no selected candidate is over budget, unexported, or missing a thumbnail", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });
  const componentById = new Map(registry.components.map((component) => [component.componentId, component]));
  const roomKitById = new Map(registry.roomKits.map((roomKit) => [roomKit.roomKitId, roomKit]));

  for (const selected of manifest.components) {
    const candidate = componentById.get(selected.componentId);
    assert.ok(candidate);
    assert.notEqual(candidate.budget.status, "over-budget", `${selected.componentId} is over budget and must not be selected`);
    assert.equal(selected.budgetStatus, candidate.budget.status);
    assert.ok(selected.runtimeAsset.length > 0, `${selected.componentId} has no runtime asset`);
    assert.equal(selected.runtimeAsset, candidate.export.runtimeAsset);
    assert.ok(selected.thumbnail !== null, `${selected.componentId} has no thumbnail`);
    assert.ok(selected.materialSlots.length > 0);
    assert.ok(selected.presenceMaterialSlots.length > 0);
    assert.ok(selected.anchors.length > 0);
  }

  for (const selected of manifest.roomKits) {
    const candidate = roomKitById.get(selected.roomKitId);
    assert.ok(candidate);
    assert.notEqual(candidate.budget.status, "over-budget", `${selected.roomKitId} is over budget and must not be selected`);
    assert.ok(selected.thumbnail !== null);
    assert.ok(selected.runtimeAsset.length > 0);
  }
});

test("no selected asset is a raw source file and none is served from public/", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });

  for (const asset of [...manifest.components, ...manifest.roomKits].map((entry) => entry.runtimeAsset)) {
    assert.ok(asset.startsWith("assets/presence-spatial/candidates/"), `${asset} must be a generated candidate export`);
    assert.ok(!asset.startsWith("public/"), `${asset} must not be served publicly`);
    assert.ok(!asset.includes("presence pieces"), `${asset} must never point at the raw source folder`);
  }
});

test("source and provenance metadata is preserved, and clearance is never overstated", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });
  const byId = new Map<string, CandidateComponent | CandidateRoomKit>([
    ...registry.components.map((component) => [component.componentId, component] as [string, CandidateComponent]),
    ...registry.roomKits.map((roomKit) => [roomKit.roomKitId, roomKit] as [string, CandidateRoomKit]),
  ]);

  for (const entry of [...manifest.components, ...manifest.roomKits]) {
    const id = "componentId" in entry ? entry.componentId : entry.roomKitId;
    const candidate = byId.get(id);
    assert.ok(candidate);

    // Provenance carried forward verbatim, not rewritten.
    assert.equal(entry.sourceClearance.declaredLicense, candidate.license.declaredLicense);
    assert.equal(entry.sourceClearance.declaredAuthor, candidate.license.declaredAuthor);
    assert.equal(entry.sourceClearance.declaredCopyright, candidate.license.declaredCopyright);
    assert.deepEqual(entry.sourceClearance.licenseEvidence, candidate.license.evidence);
    assert.ok(entry.sourceClearance.licenseEvidence.length > 0, "licence evidence must not be emptied");

    // Clearance is an owner declaration, never an independent legal finding.
    assert.equal(entry.sourceClearance.status, "user-sourced-cleared-for-internal-use");
    assert.equal(entry.sourceClearance.independentLegalVerification, false);
    assert.equal(entry.sourceAssetId, candidate.sourceAssetId);
  }

  // The underlying registry must be untouched by this pass.
  for (const candidate of [...registry.components, ...registry.roomKits]) {
    assert.equal(candidate.status, "candidate-review-required");
    assert.equal(candidate.license.status, "needs-review");
    assert.equal(candidate.quality.visuallyApproved, false);
  }
});

test("the Gate 4 bridge references only valid candidate ids and real anchors", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });
  const bridge = buildGate4Bridge({ manifest, registry, generatedAt: GENERATED_AT });

  assert.equal(bridge.registryVersion, "mobstar-gate4-candidate.v0");
  assert.equal(bridge.targets.materialStylePreset, MOBSTAR_STYLE_PRESET);
  assert.equal(bridge.targets.lightingProfile, MOBSTAR_LIGHTING_PROFILE);

  const componentById = new Map(registry.components.map((component) => [component.componentId, component]));
  for (const entry of bridge.components) {
    const candidate = componentById.get(entry.componentId);
    assert.ok(candidate, `bridge references unknown candidate ${entry.componentId}`);
    assert.equal(entry.runtimeAsset, candidate.export.runtimeAsset);
    assert.equal(entry.placement, candidate.placement);
    const anchorIds = new Set(candidate.anchors.map((anchor) => anchor.id));
    for (const anchor of entry.anchors) assert.ok(anchorIds.has(anchor), `${entry.componentId} exposes unknown anchor ${anchor}`);
    assert.equal(entry.anchorDefinitions.length, candidate.anchors.length);
    assert.ok(MOBSTAR_ROLES.includes(entry.role));
  }

  const roomKitById = new Map(registry.roomKits.map((roomKit) => [roomKit.roomKitId, roomKit]));
  for (const entry of bridge.roomKits) {
    assert.ok(roomKitById.has(entry.roomKitId), `bridge references unknown room kit ${entry.roomKitId}`);
  }

  assert.throws(() => buildGate4Bridge({
    manifest: {
      ...manifest,
      components: [{ ...manifest.components[0], componentId: "candidate.table.does-not-exist-0000-999" }],
    },
    registry,
    generatedAt: GENERATED_AT,
  }), /unknown candidate/);
});

test("unfilled roles are declared rather than force-filled", async () => {
  const registry = await readRegistry();
  const manifest = buildInternalUseManifest({ registry, generatedAt: GENERATED_AT });
  const filledRoles = new Set(manifest.components.map((component) => component.role));

  assert.ok(manifest.unfilledRoles.length > 0);
  for (const unfilled of manifest.unfilledRoles) {
    assert.equal(unfilled.status, "missing-suitable-candidate");
    assert.ok(MOBSTAR_ROLES.includes(unfilled.role));
    assert.ok(unfilled.reason.length > 0);
    assert.ok(unfilled.recommendedFallback.note.length > 0);
    assert.ok(!filledRoles.has(unfilled.role), `${unfilled.role} is both filled and declared missing`);
  }

  // The garment rack is the load-bearing Mobstar fixture; it must be declared missing.
  assert.ok(manifest.unfilledRoles.some((role) => role.role === "garment-rack"));
});

test("the automated filter rejects unusable candidates and is not the selector", async () => {
  const registry = await readRegistry();

  const overBudget = registry.components.find((component) => component.budget.status === "over-budget");
  if (overBudget) assert.equal(automatedFilter(overBudget).passed, false);

  const franchise = registry.components.find((component) => component.sourceAssetId === "source.star-wars-the-clone-wars-venator-prefab");
  assert.ok(franchise, "expected franchise-sourced candidates in the registry");
  const franchiseResult = automatedFilter(franchise);
  assert.equal(franchiseResult.passed, false);
  assert.ok(franchiseResult.trace.some((line) => line.includes("franchise IP")));

  // Passing the filter must never imply selection.
  const shortlist = buildShortlist({ registry, generatedAt: GENERATED_AT, sourceRegistryPath: "x" });
  assert.ok(shortlist.totals.passedAutomatedFilter > shortlist.totals.selected, "the filter must narrow, not select");
});

test("every rejection records a reason and no score is silently inflated", () => {
  for (const note of MOBSTAR_REVIEW_NOTES) {
    if (note.decision === "reject") {
      assert.ok(note.rejectionReason && note.rejectionReason.length > 0, `${note.candidateId} was rejected without a reason`);
    }
    if (note.decision === "use-for-mobstar-gate4") {
      assert.ok(note.role !== null, `${note.candidateId} is selected but has no role`);
      // A selected candidate whose scale could not be judged must say so.
      if (note.scores.scaleConfidence !== null && note.scores.scaleConfidence <= 2) {
        assert.equal(note.scores.needs3dReview, true, `${note.candidateId} has low scale confidence but is not flagged for 3D review`);
      }
    }
    assert.ok(note.observedAs.length > 0);
    assert.ok(note.notes.length > 0);
  }
  assert.ok(MOBSTAR_UNFILLED_ROLES.length > 0);
});

test("the written shortlist, manifest and bridge stay consistent with each other", async () => {
  const shortlist = await readJson<MobstarShortlist>("assets/presence-spatial/candidates/mobstar-shortlist.json");
  const manifest = await readJson<InternalUseManifest>("assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json");
  const bridge = await readJson<MobstarGate4Bridge>("assets/presence-spatial/candidates/component-bridge.mobstar-gate4.json");

  const selectedInShortlist = shortlist.entries
    .filter((entry) => entry.decision === "use-for-mobstar-gate4")
    .map((entry) => entry.candidateId)
    .sort();
  const inManifest = [
    ...manifest.components.map((component) => component.componentId),
    ...manifest.roomKits.map((roomKit) => roomKit.roomKitId),
  ].sort();
  assert.deepEqual(inManifest, selectedInShortlist, "shortlist selections and manifest entries must match");

  const inBridge = [
    ...bridge.components.map((component) => component.componentId),
    ...bridge.roomKits.map((roomKit) => roomKit.roomKitId),
  ].sort();
  assert.deepEqual(inBridge, inManifest, "bridge entries and manifest entries must match");
  assert.equal(bridge.proceduralFallbacks.length, manifest.unfilledRoles.length);
});
