import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const restrictedPublicTerms = [
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "presence-studio-v2-drag-readout",
  "presence-studio-v2-panel",
  "presence-studio-v2-toolbar",
  "v2-side-panel",
  "v2-toolbar",
  "v2-float",
  "wild transform suspended",
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

test("Gallery public output opens as a threshold and exhibition path, not a generic card page", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  const room = page.locator(".presence-studio-v2-public.world-gallery");
  const threshold = room.locator(".v2-public-threshold");
  const firstChamber = room.locator(".v2-public-chamber").first();
  const objectGrid = firstChamber.locator(".v2-public-object-grid");

  await expect(room).toBeVisible();
  await expect(threshold).toBeVisible();
  await expect(threshold.locator(".v2-public-threshold-image-field img")).toBeVisible();
  await expect(threshold.locator(".v2-public-primary-cta")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mara Vale Studio V2" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current Works" })).toBeVisible();

  const thresholdBox = await threshold.boundingBox();
  expect(thresholdBox?.height ?? 0, "Gallery threshold should hold the first viewport").toBeGreaterThan(880);

  await expect(firstChamber).not.toHaveAttribute("data-object-count", /./);
  const html = (await page.content()).toLowerCase();
  expect(html).not.toContain("objects held here");
  for (const term of restrictedPublicTerms) {
    expect(html, `public Gallery output exposed ${term}`).not.toContain(term);
  }

  const gridColumns = await objectGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(gridColumns.split(" ").filter(Boolean).length, "Gallery grid should use exhibition rhythm, not a two-column card wall").toBeGreaterThanOrEqual(6);

  const visibleRoleLabels = await room.locator(".v2-public-object-role").evaluateAll((labels) =>
    labels.filter((label) => {
      const style = getComputedStyle(label as HTMLElement);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }).length,
  );
  expect(visibleRoleLabels, "Gallery should not visibly announce system object labels").toBe(0);

  await expect(room.locator(".v2-public-object-media-img").first()).toBeVisible();
  const imageTreatment = await room.locator(".v2-public-object-media-img").first().evaluate((element) => {
    const style = getComputedStyle(element as HTMLElement);
    return { objectFit: style.objectFit, borderRadius: style.borderRadius };
  });
  expect(imageTreatment.objectFit).toBe("contain");
  expect(imageTreatment.borderRadius).toBe("0px");

  await expect(room.locator(".v2-public-influence-card").first()).toBeVisible();
  await expect(room.locator(".v2-public-traces")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("Gallery mobile public output keeps the threshold and hides mobile-muted objects", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  const room = page.locator(".presence-studio-v2-public.world-gallery");
  const threshold = room.locator(".v2-public-threshold");
  await expect(room).toBeVisible();
  await expect(threshold).toBeVisible();
  await expect(threshold.locator(".v2-public-threshold-image-field img")).toBeVisible();
  await expect(threshold.locator(".v2-public-primary-cta")).toBeVisible();

  const thresholdBox = await threshold.boundingBox();
  expect(thresholdBox?.height ?? 0, "Mobile threshold should still feel like an entry state").toBeGreaterThan(760);

  await expect(room.locator(".v2-public-object").getByRole("heading", { name: "Bridle Road, after rain" })).toBeVisible();
  await expect(room.locator(".v2-public-object").getByRole("heading", { name: "Desktop-only proof" })).toBeHidden();
  const visibleRoleLabels = await room.locator(".v2-public-object-role").evaluateAll((labels) =>
    labels.filter((label) => {
      const style = getComputedStyle(label as HTMLElement);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }).length,
  );
  expect(visibleRoleLabels, "Mobile Gallery should not visibly announce system object labels").toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("legacy public room remains outside the Gallery recovery renderer", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });

  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await expect(page.locator(".v2-public-threshold")).toHaveCount(0);
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
