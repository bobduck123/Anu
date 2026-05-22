import { defineConfig, devices } from "playwright/test";

const frontendURL =
  process.env.PRESENCE_CONTROLLED_LAUNCH_FRONTEND_URL ??
  process.env.PRESENCE_HOSTED_FRONTEND_URL ??
  "";
const backendURL =
  process.env.PRESENCE_CONTROLLED_LAUNCH_BACKEND_URL ??
  process.env.PRESENCE_HOSTED_BACKEND_URL ??
  "";

if (!frontendURL || !backendURL) {
  throw new Error(
    "Set PRESENCE_CONTROLLED_LAUNCH_FRONTEND_URL and PRESENCE_CONTROLLED_LAUNCH_BACKEND_URL for hosted controlled-launch proof.",
  );
}

for (const [name, value] of [
  ["PRESENCE_CONTROLLED_LAUNCH_FRONTEND_URL", frontendURL],
  ["PRESENCE_CONTROLLED_LAUNCH_BACKEND_URL", backendURL],
] as const) {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value)) {
    throw new Error(`${name} must be a deployed URL for controlled-launch proof.`);
  }
}

const bypassToken = process.env.PRESENCE_CONTROLLED_LAUNCH_BYPASS_TOKEN;
const bypassHeaderName =
  process.env.PRESENCE_CONTROLLED_LAUNCH_BYPASS_HEADER_NAME ??
  "x-vercel-protection-bypass";

const extraHTTPHeaders: Record<string, string> = {};
if (bypassToken) {
  extraHTTPHeaders[bypassHeaderName] = bypassToken;
  if (process.env.PRESENCE_CONTROLLED_LAUNCH_SET_BYPASS_COOKIE === "true") {
    extraHTTPHeaders["x-vercel-set-bypass-cookie"] = "true";
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /controlled-launch-hosted\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: frontendURL,
    extraHTTPHeaders,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
