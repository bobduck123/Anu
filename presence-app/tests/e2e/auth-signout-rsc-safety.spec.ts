import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-auth-signout-rsc-self-destruction-proof",
  "screenshots",
);

async function signInOnce(page: Page, returnTo = "/studio/101/editor") {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter Studio" }).click();
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
}

async function sessionCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === "presence_e2e_session");
}

test("editor, refresh, debug and preview never request sign-out or clear the active session", async ({ page, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  const signOutRequests: string[] = [];
  page.on("request", (requestEvent) => {
    if (new URL(requestEvent.url()).pathname === "/auth/sign-out") {
      signOutRequests.push(requestEvent.url());
    }
  });

  await signInOnce(page);
  await expect(page.locator('a[href="/auth/sign-out"]')).toHaveCount(0);
  await expect.poll(() => sessionCookie(page)).toBeTruthy();

  await page.waitForTimeout(5_000);
  expect(signOutRequests).toEqual([]);
  await expect.poll(() => sessionCookie(page)).toBeTruthy();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await page.goto("/studio/101/editor?debug=1", { waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();

  expect(signOutRequests).toEqual([]);
  await expect.poll(() => sessionCookie(page)).toBeTruthy();
  await page.screenshot({ path: path.join(evidenceDir, "owner-preview-session-still-present.png"), fullPage: true });
});

test("GET and RSC-style GET to sign-out are non-mutating", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await signInOnce(page);

  const signOutResponses: Array<{ url: string; setCookie: string | null }> = [];
  page.on("response", async (response) => {
    if (new URL(response.url()).pathname === "/auth/sign-out") {
      signOutResponses.push({
        url: response.url(),
        setCookie: await response.headerValue("set-cookie"),
      });
    }
  });

  await page.goto("/auth/sign-out", { waitUntil: "networkidle" });
  await expect.poll(() => sessionCookie(page)).toBeTruthy();
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();

  await page.goto("/auth/sign-out?_rsc=signout-prefetch-proof", { waitUntil: "networkidle" });
  await expect.poll(() => sessionCookie(page)).toBeTruthy();
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();

  expect(signOutResponses).toHaveLength(2);
  expect(signOutResponses.every((response) => !response.setCookie?.includes("Max-Age=0"))).toBeTruthy();
});

test("only the explicit Sign out control clears the owner session", async ({ page, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await signInOnce(page);
  await expect.poll(() => sessionCookie(page)).toBeTruthy();

  await page.getByTestId("explicit-sign-out").click();
  await page.waitForURL("/");
  await expect.poll(() => sessionCookie(page)).toBeFalsy();
  await page.screenshot({ path: path.join(evidenceDir, "explicit-sign-out-clears-session.png"), fullPage: true });

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByText("Sign in to open this Presence")).toBeVisible();
});
