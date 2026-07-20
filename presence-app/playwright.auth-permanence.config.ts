import { defineConfig, devices } from "playwright/test";

const frontendURL = process.env.PRESENCE_AUTH_FRONTEND_URL ?? "";
const storageState = process.env.PRESENCE_AUTH_STORAGE_STATE ?? "";

if (!frontendURL || !/^https:\/\//i.test(frontendURL)) {
  throw new Error("Set PRESENCE_AUTH_FRONTEND_URL to the hosted Presence frontend URL.");
}

if (!storageState) {
  throw new Error(
    "Set PRESENCE_AUTH_STORAGE_STATE to an authenticated Playwright storageState file before hosted auth proof.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /auth-permanence\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: frontendURL,
    storageState,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
