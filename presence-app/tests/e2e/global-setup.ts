/**
 * Playwright global setup — pre-warms Next dev route compilations.
 *
 * Next dev compiles each route on first request. When a multi-spec suite
 * runs sequentially and a later spec hits a cold route, individual page
 * actions can exceed 60s of cumulative compile + click + state propagation
 * time on a warm dev server.
 *
 * Touching every route here ensures every route the suite uses is hot
 * before the first test asserts anything. This eliminates the historical
 * flake in `presence-pass-paths.spec.ts > Observer Mask creation can
 * complete the save flow` when the Gardens/Halls suite has just finished.
 */

import { request as buildRequest } from "playwright/test";

const ROUTES_TO_WARM = [
  "/",
  "/world",
  "/halls",
  "/halls/open-studio-friday",
  "/observer/garden",
  "/observer/passport",
  "/observer/mood-boards",
  "/m/quiet-walker",
  "/r/test-room-key-token",
  "/presence/test-presence-room",
  "/presence-chooser",
  "/gallery",
  "/paths/from-room/101",
  "/paths/from-hall/1",
];

export default async function globalSetup() {
  const baseURL = "http://127.0.0.1:3100";
  const context = await buildRequest.newContext({ baseURL, ignoreHTTPSErrors: true });
  await Promise.all(
    ROUTES_TO_WARM.map(async (route) => {
      try {
        await context.get(route, { timeout: 90_000 });
      } catch {
        // Best effort — some routes may not exist in every environment.
      }
    }),
  );
  await context.dispose();
}
