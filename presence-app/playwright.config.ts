import { defineConfig, devices } from "playwright/test";

const appPort = 3100;
const apiPort = 5105;

export default defineConfig({
  testDir: "./tests/e2e",
  // Test timeout is generous because Next dev compiles routes on first hit
  // and the suite walks many cold routes back-to-back; individual page.goto
  // calls can easily exceed 30s during the first sweep on a cold dev cache.
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // Pre-warm Next dev route compilation so a multi-spec sequential run never
  // collides with a 60s cold-compile inside an interactive test step.
  globalSetup: "./tests/e2e/global-setup.ts",
  // One retry on the existing presence-pass-paths "Observer Mask creation"
  // selector flake when run after the gardens-halls suite. The test passes
  // deterministically on retry; see
  // docs/program/evidence/presence-gardens-halls-frontend-contract-integration-proof/README.md
  // for the documented root-cause investigation and retained workaround.
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-presence-api.mjs",
      url: `http://127.0.0.1:${apiPort}/healthz`,
      reuseExistingServer: false,
      timeout: 20_000,
      env: {
        PORT: String(apiPort),
      },
    },
    {
      command: `cmd /c npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
      url: `http://127.0.0.1:${appPort}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE: `http://127.0.0.1:${apiPort}`,
        NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://presence-e2e.supabase.test",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "presence-e2e-public-key",
      },
    },
  ],
});
