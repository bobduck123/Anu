import test from "node:test";
import assert from "node:assert/strict";
import {
  getSpatialInternalGateDecision,
  isSpatialInternalProofEnabled,
  SPATIAL_INTERNAL_PROOF_ENV,
} from "./internalGate.ts";

test("spatial internal proof is default-off outside production", () => {
  assert.deepEqual(getSpatialInternalGateDecision({ NODE_ENV: "development" }), {
    enabled: false,
    reason: "flag-disabled",
    nodeEnv: "development",
  });
  assert.equal(isSpatialInternalProofEnabled({ NODE_ENV: "test" }), false);
});

test("spatial internal proof accepts an explicit development-only flag", () => {
  assert.equal(
    isSpatialInternalProofEnabled({
      NODE_ENV: "development",
      [SPATIAL_INTERNAL_PROOF_ENV]: "1",
    }),
    true,
  );
  assert.equal(
    getSpatialInternalGateDecision({
      NODE_ENV: "test",
      [SPATIAL_INTERNAL_PROOF_ENV]: "yes",
    }).reason,
    "internal-proof-enabled",
  );
});

test("production rejects the spatial internal proof even when flagged", () => {
  assert.deepEqual(
    getSpatialInternalGateDecision({
      NODE_ENV: "production",
      [SPATIAL_INTERNAL_PROOF_ENV]: "1",
    }),
    {
      enabled: false,
      reason: "production-disabled",
      nodeEnv: "production",
    },
  );
});

test("unknown, empty and staging environments fail closed even when flagged", () => {
  for (const nodeEnv of [undefined, "", "staging", "preview", "qa"]) {
    assert.deepEqual(
      getSpatialInternalGateDecision({
        NODE_ENV: nodeEnv,
        [SPATIAL_INTERNAL_PROOF_ENV]: "1",
      }),
      {
        enabled: false,
        reason: "environment-disabled",
        nodeEnv: nodeEnv ?? "",
      },
    );
  }
});
