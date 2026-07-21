import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDIO_V3_BROWSER_PILOT_FLAG,
  getPresenceStudioV3GateDecision,
  shouldUsePresenceStudioV3Editor,
} from "./feature.ts";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    original[key] = mutableEnv[key];
    if (values[key] === undefined) delete mutableEnv[key];
    else mutableEnv[key] = values[key];
  }
  const originalWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;
  try {
    run();
  } finally {
    for (const key of Object.keys(values)) {
      if (original[key] === undefined) delete mutableEnv[key];
      else mutableEnv[key] = original[key];
    }
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
  }
}

test("hosted human-test gate stays default-off for BBB in production", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: undefined,
    },
    () => {
      const decision = getPresenceStudioV3GateDecision({ roomId: 29, slug: "bbbvision" });
      assert.equal(decision.enabled, false);
      assert.equal(decision.reason, "production-without-hosted-human-test");
      assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), false);
    },
  );
});

test("hosted human-test gate opens Studio V3 for explicitly allowed BBB room in production", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "29,bbbvision",
    },
    () => {
      const decision = getPresenceStudioV3GateDecision({ roomId: 29, slug: "bbbvision" });
      assert.equal(decision.enabled, true);
      assert.equal(decision.source, "hosted-human-test");
      assert.equal(decision.reason, "hosted-human-test-allowed-room");
      assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), true);
    },
  );
});

test("hosted human-test gate rejects ID-only and slug-only BBB mismatches", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "29,bbbvision",
    },
    () => {
      const idOnly = getPresenceStudioV3GateDecision({ roomId: 29, slug: "other-slug" });
      const slugOnly = getPresenceStudioV3GateDecision({ roomId: 300, slug: "bbbvision" });
      assert.equal(idOnly.enabled, false);
      assert.equal(idOnly.reason, "hosted-human-test-room-not-allowed");
      assert.equal(slugOnly.enabled, false);
      assert.equal(slugOnly.reason, "hosted-human-test-room-not-allowed");
    },
  );
});

test("hosted human-test gate does not enable non-allowlisted rooms or wildcard tokens", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "*,all,29,bbbvision",
    },
    () => {
      const decision = getPresenceStudioV3GateDecision({ roomId: 101, slug: "mara-vale-test-room" });
      assert.equal(decision.enabled, false);
      assert.equal(decision.reason, "hosted-human-test-room-not-allowed");
    },
  );
});

test("hosted human-test gate requires an explicit non-empty allowlist", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "*,all",
    },
    () => {
      const decision = getPresenceStudioV3GateDecision({ roomId: 29, slug: "bbbvision" });
      assert.equal(decision.enabled, false);
      assert.equal(decision.reason, "hosted-human-test-allowlist-missing");
    },
  );
});

test("hosted human-test gate requires both allowlisted ID and slug dimensions", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "29",
    },
    () => {
      const idOnlyAllowlist = getPresenceStudioV3GateDecision({ roomId: 29, slug: "bbbvision" });
      assert.equal(idOnlyAllowlist.enabled, false);
      assert.equal(idOnlyAllowlist.reason, "hosted-human-test-allowlist-missing");
    },
  );
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: "bbbvision",
    },
    () => {
      const slugOnlyAllowlist = getPresenceStudioV3GateDecision({ roomId: 29, slug: "bbbvision" });
      assert.equal(slugOnlyAllowlist.enabled, false);
      assert.equal(slugOnlyAllowlist.reason, "hosted-human-test-allowlist-missing");
    },
  );
});

test("legacy local/test BBB pilot still works outside production and remains BBB-only", () => {
  withEnv(
    {
      NODE_ENV: "test",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: undefined,
    },
    () => {
      assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), true);
      assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 101, slug: "mara-vale-test-room" }), false);
    },
  );
});

test("browser localStorage opt-in remains local/test-only", () => {
  withEnv(
    {
      NODE_ENV: "test",
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST: undefined,
      NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS: undefined,
    },
    () => {
      (globalThis as { window?: unknown }).window = {
        localStorage: { getItem: (key: string) => key === STUDIO_V3_BROWSER_PILOT_FLAG ? "1" : null },
      };
      assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), true);
    },
  );
});
