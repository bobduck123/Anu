import test from "node:test";
import assert from "node:assert/strict";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { getSpatialInternalGateDecision, isSpatialInternalProofEnabled } from "./internalGate.ts";
import {
  SpatialDraftStorage,
  SPATIAL_DRAFT_ENCODED_BUDGET_BYTES,
  createSpatialDraftEnvelope,
  decodeSpatialDraftEnvelope,
  encodeSpatialDraftEnvelope,
  spatialDraftPreviousStorageKey,
  spatialDraftStorageKey,
  type SpatialStorageLike,
} from "./storage.ts";

class MemoryStorage implements SpatialStorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

class ThrowingMemoryStorage extends MemoryStorage {
  private mutationAttempt = 0;
  private failures = new Map<number, Error>();

  failOnMutations(failures: readonly (readonly [number, Error])[]): void {
    this.mutationAttempt = 0;
    this.failures = new Map(failures);
  }

  override setItem(key: string, value: string): void {
    this.maybeThrow();
    super.setItem(key, value);
  }

  override removeItem(key: string): void {
    this.maybeThrow();
    super.removeItem(key);
  }

  private maybeThrow(): void {
    this.mutationAttempt += 1;
    const failure = this.failures.get(this.mutationAttempt);
    if (failure) throw failure;
  }
}

test("pure draft envelopes round-trip with a deterministic room fingerprint", () => {
  const envelope = createSpatialDraftEnvelope(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  const decoded = decodeSpatialDraftEnvelope(encodeSpatialDraftEnvelope(envelope));
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.equal(decoded.value.roomId, MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
    assert.equal(decoded.value.roomFingerprint, envelope.roomFingerprint);
  }
});

test("draft decoding rejects content that no longer matches its fingerprint", () => {
  const envelope = createSpatialDraftEnvelope(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  const encoded = JSON.parse(encodeSpatialDraftEnvelope(envelope)) as Record<string, unknown>;
  const room = encoded.room as Record<string, unknown>;
  const placements = room.placements as Array<Record<string, unknown>>;
  placements[0].semanticLabel = "Tampered renderer input";
  const result = decodeSpatialDraftEnvelope(JSON.stringify(encoded));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "fingerprint-mismatch"));
});

test("the localStorage-style adapter remains outside pure envelope logic", () => {
  const memory = new MemoryStorage();
  const drafts = new SpatialDraftStorage(memory);
  drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  const key = spatialDraftStorageKey(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  assert.ok(memory.values.has(key));
  assert.equal(drafts.load(MOBSTAR_SPATIAL_ROOM_FIXTURE.id)?.ok, true);
  drafts.remove(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  assert.equal(drafts.load(MOBSTAR_SPATIAL_ROOM_FIXTURE.id), null);
});

test("storage keys encode room IDs as one collision-proof key segment", () => {
  const base = spatialDraftStorageKey("room");
  const suffixedRoom = spatialDraftStorageKey("room:previous");
  assert.notEqual(spatialDraftPreviousStorageKey("room"), suffixedRoom);
  assert.equal(base.endsWith(":room"), true);
  assert.equal(suffixedRoom.endsWith(":room%3Aprevious"), true);
});

test("draft decoding rejects payloads above 256 KB before attempting JSON parsing", () => {
  const oversizedInvalidJson = "{".repeat(SPATIAL_DRAFT_ENCODED_BUDGET_BYTES + 1);
  const result = decodeSpatialDraftEnvelope(oversizedInvalidJson);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issues[0]?.code, "draft-budget");
    assert.equal(result.issues.some((issue) => issue.code === "json"), false);
  }
});

test("storage keeps one previous generation and supports a recoverable revert", () => {
  const memory = new MemoryStorage();
  const drafts = new SpatialDraftStorage(memory);
  drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  const revisionTwo = { ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 2 };
  drafts.save(revisionTwo, "2026-08-17T00:01:00.000Z");

  const previous = drafts.loadPrevious(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  assert.equal(previous?.ok, true);
  if (previous?.ok) assert.equal(previous.value.fixtureRevision, 1);

  const reverted = drafts.revert(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  assert.equal(reverted?.ok, true);
  if (reverted?.ok) assert.equal(reverted.value.fixtureRevision, 1);
  const active = drafts.load(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  const undoRevert = drafts.loadPrevious(MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  if (active?.ok) assert.equal(active.value.fixtureRevision, 1);
  if (undoRevert?.ok) assert.equal(undoRevert.value.fixtureRevision, 2);
});

test("failed saves restore the exact active and previous generations at either write step", async (t) => {
  for (const failedMutation of [1, 2]) {
    await t.test(`write ${failedMutation}`, () => {
      const memory = new ThrowingMemoryStorage();
      const drafts = new SpatialDraftStorage(memory);
      drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
      drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 2 }, "2026-08-17T00:01:00.000Z");
      const before = new Map(memory.values);
      const originalError = new Error(`save write ${failedMutation} failed`);
      memory.failOnMutations([[failedMutation, originalError]]);

      assert.throws(
        () => drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 3 }, "2026-08-17T00:02:00.000Z"),
        (error) => error === originalError,
      );
      assert.deepEqual(memory.values, before);
    });
  }
});

test("failed reverts restore the exact active and previous generations at either swap write", async (t) => {
  for (const failedMutation of [1, 2]) {
    await t.test(`write ${failedMutation}`, () => {
      const memory = new ThrowingMemoryStorage();
      const drafts = new SpatialDraftStorage(memory);
      drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
      drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 2 }, "2026-08-17T00:01:00.000Z");
      const before = new Map(memory.values);
      const originalError = new Error(`revert write ${failedMutation} failed`);
      memory.failOnMutations([[failedMutation, originalError]]);

      assert.throws(() => drafts.revert(MOBSTAR_SPATIAL_ROOM_FIXTURE.id), (error) => error === originalError);
      assert.deepEqual(memory.values, before);
    });
  }
});

test("failed previous-generation removal restores both revert keys", () => {
  const memory = new ThrowingMemoryStorage();
  const roomId = MOBSTAR_SPATIAL_ROOM_FIXTURE.id;
  const activeKey = spatialDraftStorageKey(roomId);
  const previousKey = spatialDraftPreviousStorageKey(roomId);
  const envelope = createSpatialDraftEnvelope(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  memory.values.set(previousKey, encodeSpatialDraftEnvelope(envelope));
  const before = new Map(memory.values);
  const originalError = new Error("previous removal failed");
  memory.failOnMutations([[2, originalError]]);

  assert.throws(() => new SpatialDraftStorage(memory).revert(roomId), (error) => error === originalError);
  assert.equal(memory.values.has(activeKey), false);
  assert.deepEqual(memory.values, before);
});

test("rollback continues after its own failure and rethrows the original storage error", () => {
  const memory = new ThrowingMemoryStorage();
  const drafts = new SpatialDraftStorage(memory);
  drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
  drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 2 }, "2026-08-17T00:01:00.000Z");
  const before = new Map(memory.values);
  const originalError = new Error("active save failed");
  const rollbackError = new Error("active rollback failed");
  memory.failOnMutations([[2, originalError], [3, rollbackError]]);

  assert.throws(
    () => drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 3 }, "2026-08-17T00:02:00.000Z"),
    (error) => error === originalError,
  );
  assert.deepEqual(memory.values, before);
});

test("failed removals restore both active and previous generations", async (t) => {
  for (const failedMutation of [1, 2]) {
    await t.test(`remove ${failedMutation}`, () => {
      const memory = new ThrowingMemoryStorage();
      const drafts = new SpatialDraftStorage(memory);
      drafts.save(MOBSTAR_SPATIAL_ROOM_FIXTURE, "2026-08-17T00:00:00.000Z");
      drafts.save({ ...MOBSTAR_SPATIAL_ROOM_FIXTURE, revision: 2 }, "2026-08-17T00:01:00.000Z");
      const before = new Map(memory.values);
      const originalError = new Error(`remove ${failedMutation} failed`);
      memory.failOnMutations([[failedMutation, originalError]]);

      assert.throws(() => drafts.remove(MOBSTAR_SPATIAL_ROOM_FIXTURE.id), (error) => error === originalError);
      assert.deepEqual(memory.values, before);
    });
  }
});

test("the internal gate is default-off and can never enable in production", () => {
  assert.equal(isSpatialInternalProofEnabled({}), false);
  assert.equal(isSpatialInternalProofEnabled({ NODE_ENV: "development", PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL: "true" }), true);
  assert.deepEqual(
    getSpatialInternalGateDecision({ NODE_ENV: "production", PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL: "true" }),
    { enabled: false, reason: "production-disabled", nodeEnv: "production" },
  );
});
