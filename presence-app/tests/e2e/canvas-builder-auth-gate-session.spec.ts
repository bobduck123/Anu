import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-auth-gate-session-persistence-proof",
  "screenshots",
);

async function signInOnce(page: Page, returnTo = "/studio/101/editor") {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:delay_session_reads_after_sign_in", "2");
  });
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter Studio" }).click();
}

test("one login opens the standard editor; debug is display-only and refresh keeps access", async ({ page, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await request.post("http://127.0.0.1:5105/__test__/state", {
    data: { failNextOwnerNodeReads: 1, failNextEditorReads: 1 },
  });

  await signInOnce(page);
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await expect(page.getByTestId("hosted-runtime-diagnostics")).toHaveCount(0);
  await expect(page.getByText("Sign in to open this Presence")).toHaveCount(0);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "standard-editor-after-one-login-refresh.png"), fullPage: true });

  await page.goto("/studio/101/editor?debug=1", { waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await expect(page.getByTestId("hosted-runtime-diagnostics")).toContainText("Debug mode: display-only");
  await expect(page.getByTestId("hosted-runtime-diagnostics")).toContainText("Auth provider: session ready");
  await page.screenshot({ path: path.join(evidenceDir, "debug-editor-same-canvas-plus-diagnostics.png"), fullPage: true });
});

test("hydrating session on standard editor and private preview does not become a sticky gate", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence:e2e:hidden_session_reads", "2");
  });

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await expect(page.getByText("Sign in to open this Presence")).toHaveCount(0);

  await page.evaluate(() => window.localStorage.setItem("presence:e2e:hidden_session_reads", "2"));
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await expect(page.getByText("Sign in to open this Presence")).toHaveCount(0);

  await page.goto("/studio/101/editor/preview?debug=1", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await expect(page.getByText("Sign in to open this Presence")).toHaveCount(0);
});

test("debug query cannot bypass owner denial", async ({ page, browser, request }) => {
  await request.post("http://127.0.0.1:5105/__test__/reset");

  await page.goto("/studio/101/editor?debug=1", { waitUntil: "networkidle" });
  await expect(page.getByText("Sign in to open this Presence")).toBeVisible();
  await expect(page.getByTestId("hosted-runtime-diagnostics")).toHaveCount(0);
  await page.goto("/studio/101/editor/preview?debug=1", { waitUntil: "networkidle" });
  await expect(page.getByText("Sign in to open this Presence")).toBeVisible();

  const otherOwnerContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const otherOwner = await otherOwnerContext.newPage();
  await otherOwner.goto("/");
  await otherOwner.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "non-owner-token"));
  await otherOwner.goto("/studio/101/editor?debug=1", { waitUntil: "networkidle" });
  await expect(otherOwner.getByText("You do not have access to this Room.")).toBeVisible();
  await expect(otherOwner.getByTestId("hosted-runtime-diagnostics")).toHaveCount(0);
  await otherOwnerContext.close();
});
