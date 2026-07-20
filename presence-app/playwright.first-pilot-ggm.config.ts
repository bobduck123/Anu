import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "playwright/test";

loadPilotEnv(resolve(__dirname, "../.env.presence-first-pilot-ggm.local"));

const frontendURL = process.env.PRESENCE_PILOT_GGM_FRONTEND_URL ?? "";
const backendURL = process.env.PRESENCE_PILOT_GGM_BACKEND_URL ?? "";

if (!frontendURL || !backendURL) {
  throw new Error(
    "Set PRESENCE_PILOT_GGM_FRONTEND_URL and PRESENCE_PILOT_GGM_BACKEND_URL for GGM first-pilot hosted proof.",
  );
}

for (const [name, value] of [
  ["PRESENCE_PILOT_GGM_FRONTEND_URL", frontendURL],
  ["PRESENCE_PILOT_GGM_BACKEND_URL", backendURL],
] as const) {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value)) {
    throw new Error(`${name} must be a deployed URL for GGM first-pilot proof.`);
  }
}

const extraHTTPHeaders: Record<string, string> = {};
if (process.env.PRESENCE_PILOT_GGM_BYPASS_TOKEN) {
  extraHTTPHeaders[
    process.env.PRESENCE_PILOT_GGM_BYPASS_HEADER_NAME ??
      "x-vercel-protection-bypass"
  ] = process.env.PRESENCE_PILOT_GGM_BYPASS_TOKEN;
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /first-pilot-ggm\.spec\.ts/,
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
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
});

function loadPilotEnv(path: string) {
  try {
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI and operator shells can provide the same values directly.
  }
}
