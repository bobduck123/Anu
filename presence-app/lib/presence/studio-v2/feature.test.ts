import assert from "node:assert/strict";
import test from "node:test";
import {
  isPresenceStudioV2GloballyEnabled,
  isPresenceStudioV2PilotEligible,
  shouldUsePresenceStudioV2,
  type PresenceStudioV2FeatureEnv,
} from "./feature.ts";

const V2_ENV: PresenceStudioV2FeatureEnv = {
  NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
  NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "11,22",
};

const DISABLED_ENV: PresenceStudioV2FeatureEnv = {
  NEXT_PUBLIC_PRESENCE_STUDIO_V2: "0",
  NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "11",
};

test("shouldUsePresenceStudioV2 returns false when globally disabled", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      { roomId: 11, rendererKey: "presence-studio-v2-room" },
      DISABLED_ENV,
    ),
    false,
  );
});

test("shouldUsePresenceStudioV2 returns true for V2 renderer key in pilot list", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      { roomId: 11, rendererKey: "presence-studio-v2-room" },
      V2_ENV,
    ),
    true,
  );
});

test("shouldUsePresenceStudioV2 returns false for non-pilot room", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      { roomId: 99, rendererKey: "presence-studio-v2-room" },
      V2_ENV,
    ),
    false,
  );
});

test("shouldUsePresenceStudioV2 falls back to metadata.custom_renderer_key", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      {
        roomId: 11,
        node: {
          id: 11,
          slug: "ggm-christina-goddard",
          display_name: "Christina Kerkvliet Goddard",
          metadata: {
            custom_renderer_key: "presence-studio-v2-room",
          },
        } as unknown as import("../../api/types.ts").PresenceNode,
      },
      V2_ENV,
    ),
    true,
  );
});

test("shouldUsePresenceStudioV2 falls back to metadata.custom_presence.renderer_key", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      {
        roomId: 11,
        node: {
          id: 11,
          slug: "ggm-christina-goddard",
          display_name: "Christina Kerkvliet Goddard",
          metadata: {
            custom_presence: {
              renderer_key: "presence-studio-v2-room",
            },
          },
        } as unknown as import("../../api/types.ts").PresenceNode,
      },
      V2_ENV,
    ),
    true,
  );
});

test("shouldUsePresenceStudioV2 prefers explicit rendererKey over metadata", () => {
  assert.strictEqual(
    shouldUsePresenceStudioV2(
      {
        roomId: 11,
        rendererKey: "ggm-faithful-room-v1",
        node: {
          id: 11,
          metadata: {
            custom_renderer_key: "presence-studio-v2-room",
          },
        } as unknown as import("../../api/types.ts").PresenceNode,
      },
      V2_ENV,
    ),
    false,
  );
});

test("isPresenceStudioV2GloballyEnabled respects NEXT_PUBLIC_PRESENCE_STUDIO_V2", () => {
  assert.strictEqual(isPresenceStudioV2GloballyEnabled({ NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1" }), true);
  assert.strictEqual(isPresenceStudioV2GloballyEnabled({ NEXT_PUBLIC_PRESENCE_STUDIO_V2: "0" }), false);
});

test("isPresenceStudioV2PilotEligible matches roomId and slug", () => {
  assert.strictEqual(isPresenceStudioV2PilotEligible({ roomId: 11 }, V2_ENV), true);
  assert.strictEqual(isPresenceStudioV2PilotEligible({ roomId: 22 }, V2_ENV), true);
  assert.strictEqual(isPresenceStudioV2PilotEligible({ slug: "11" }, V2_ENV), true);
  assert.strictEqual(isPresenceStudioV2PilotEligible({ roomId: 99 }, V2_ENV), false);
});
