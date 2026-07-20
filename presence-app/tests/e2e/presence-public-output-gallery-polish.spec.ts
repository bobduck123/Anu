import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const restrictedPublicTerms = [
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "presence-studio-v2-drag-readout",
  "presence-studio-v2-panel",
  "presence-studio-v2-toolbar",
  "editable_config",
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "hiddenpublic",
  "hiddenmobile",
  "localstorage",
  "templatekit",
];

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("Gallery public output has P2 threshold continuity, curatorial labels, and artwork focus", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  const room = page.locator(".presence-studio-v2-public.world-gallery");
  const threshold = room.locator(".v2-public-threshold");
  const transition = room.locator(".v2-public-threshold-transition");
  const index = room.locator(".v2-public-threshold-index");
  const firstChamber = room.locator(".v2-public-chamber").first();
  const firstArtwork = firstChamber.locator(".v2-public-object.is-artwork").first();

  await expect(room).toBeVisible();
  await expect(threshold).toBeVisible();
  await expect(transition).toBeVisible();
  await expect(threshold.locator(".v2-public-primary-cta")).toBeVisible();

  const transitionHeight = await transition.evaluate((element) => element.getBoundingClientRect().height);
  expect(transitionHeight, "Gallery should bridge threshold and chamber with a visible transition band").toBeGreaterThan(60);

  const ctaStyle = await threshold.locator(".v2-public-primary-cta").evaluate((element) => {
    const style = getComputedStyle(element as HTMLElement);
    return { borderRadius: style.borderRadius, backgroundColor: style.backgroundColor };
  });
  expect(ctaStyle.borderRadius, "Gallery CTA should not read as a pill button").toBe("0px");
  expect(ctaStyle.backgroundColor, "Gallery CTA should be text-first, not a filled SaaS CTA").toBe("rgba(0, 0, 0, 0)");

  const indexText = (await index.textContent()) ?? "";
  expect(indexText, "Gallery wayfinding should not expose numbered app navigation").not.toMatch(/\b0[1-9]\b/);

  const chamberLabelStyle = await firstChamber.locator(".v2-public-chamber-head h2").evaluate((element) => {
    const style = getComputedStyle(element as HTMLElement);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      textTransform: style.textTransform,
      borderTopWidth: style.borderTopWidth,
    };
  });
  expect(chamberLabelStyle.fontSize, "Chamber title should read as a gallery label, not a giant page heading").toBeLessThan(32);
  expect(chamberLabelStyle.textTransform).toBe("uppercase");
  expect(chamberLabelStyle.borderTopWidth).not.toBe("0px");

  await expect(firstArtwork.locator(".v2-public-object-media-img")).toBeVisible();
  const wallLabelStyle = await firstArtwork.locator(".v2-public-object-copy").evaluate((element) => {
    const style = getComputedStyle(element as HTMLElement);
    return { borderTopWidth: style.borderTopWidth, paddingTop: style.paddingTop };
  });
  expect(wallLabelStyle.borderTopWidth, "Artwork copy should be treated like a wall label").not.toBe("0px");
  expect(Number.parseFloat(wallLabelStyle.paddingTop)).toBeGreaterThan(0);

  await firstArtwork.hover();
  await firstArtwork.getByTestId("presence-public-artwork-focus-trigger").click();
  const focus = room.getByTestId("presence-public-artwork-focus");
  await expect(focus).toBeVisible();
  await expect(focus.locator("img")).toBeVisible();
  await expect(focus.locator("figcaption")).toContainText("Bridle Road, after rain");
  const focusPosition = await focus.evaluate((element) => getComputedStyle(element as HTMLElement).position);
  expect(focusPosition, "Artwork focus should render as an overlay, not inline page content").toBe("fixed");
  await room.getByTestId("presence-public-artwork-focus-close").click();
  await expect(focus).toBeHidden();

  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPublicTerms) {
    expect(html, `public Gallery polish exposed ${term}`).not.toContain(term);
  }
  expect(runtimeErrors).toEqual([]);
});

test("Gallery P2 polish remains usable on mobile", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  const room = page.locator(".presence-studio-v2-public.world-gallery");
  await expect(room.locator(".v2-public-threshold")).toBeVisible();
  await expect(room.locator(".v2-public-threshold-transition")).toBeVisible();
  await expect(room.locator(".v2-public-primary-cta")).toBeVisible();

  const chamberLabelSize = await room.locator(".v2-public-chamber-head h2").first().evaluate((element) =>
    Number.parseFloat(getComputedStyle(element as HTMLElement).fontSize),
  );
  expect(chamberLabelSize, "Mobile chamber labels should stay placard-sized").toBeLessThan(22);

  const firstArtwork = room.locator(".v2-public-object.is-artwork").first();
  await firstArtwork.getByTestId("presence-public-artwork-focus-trigger").click();
  await expect(room.getByTestId("presence-public-artwork-focus")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(room.getByTestId("presence-public-artwork-focus")).toBeHidden();
  expect(runtimeErrors).toEqual([]);
});

test("legacy public room is not affected by Gallery P2 polish", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });

  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await expect(page.locator(".v2-public-threshold-transition")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-artwork-focus")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
