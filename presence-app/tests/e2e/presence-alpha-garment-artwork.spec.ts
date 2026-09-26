import { expect, test, type Page } from "playwright/test";

/**
 * Rendered guard for the alpha-masked garment artwork path.
 *
 * This asserts what unit tests cannot: that the alpha artwork actually reaches
 * the WebGL lane and shapes what is drawn. It is a regression guard for the two
 * defects that kept garment artwork invisible — garment items were never
 * scheduled for texture loading, and the loader ignored the garment artwork
 * override — either of which leaves every garment on its procedural
 * placeholder, which is a filled rectangle.
 */

const ROUTE = "/internal/spatial-object-model";

async function openAlphaRack(page: Page) {
  const response = await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("presence-spatial-room-viewport")).toHaveAttribute(
    "data-renderer-lane",
    /^(semantic|three)$/,
    { timeout: 30_000 },
  );
  await page.getByTestId("presence-spatial-load-alpha-garment-rack").click();
  await expect(page.getByTestId("presence-spatial-three-renderer").locator("canvas")).toHaveCount(1);
  // The alpha textures are eager, but still need a load and a frame.
  await page.waitForTimeout(2500);
  const rackFocus = page.getByRole("button", { name: /Focus the garment rack/i });
  if (await rackFocus.count()) {
    await rackFocus.first().click();
    await page.waitForTimeout(2000);
  }
}

test("alpha garment artwork reaches the WebGL lane and cuts a real silhouette", async ({ page }) => {
  test.setTimeout(180_000);
  const sharp = (await import("sharp")).default;
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAlphaRack(page);

  // The proof is only meaningful in the real renderer.
  await expect(page.getByTestId("presence-spatial-room-viewport")).toHaveAttribute("data-renderer-lane", "three");

  const shot = await page.getByTestId("presence-spatial-three-renderer").locator("canvas").screenshot();
  const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x: number, y: number) => {
    const offset = (y * width + x) * channels;
    return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
  };
  // The pant is the only green garment in the fixture, so colour isolates it
  // without hardcoding any screen position.
  const isPant = (x: number, y: number) => {
    const { r, g, b } = at(x, y);
    return g > r + 25 && g > b + 8 && g > 45;
  };

  const columnHits = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (isPant(x, y)) columnHits[x] += 1;
  }
  let peak = 0;
  for (let x = 0; x < width; x += 1) if (columnHits[x] > columnHits[peak]) peak = x;
  expect(columnHits[peak], "the pant artwork must be visible in the render").toBeGreaterThan(10);

  let bandMin = peak;
  let bandMax = peak;
  while (bandMin > 0 && columnHits[bandMin - 1] > 0) bandMin -= 1;
  while (bandMax < width - 1 && columnHits[bandMax + 1] > 0) bandMax += 1;

  let topY = height;
  let bottomY = -1;
  let pantPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = bandMin; x <= bandMax; x += 1) {
      if (!isPant(x, y)) continue;
      pantPixels += 1;
      if (y < topY) topY = y;
      if (y > bottomY) bottomY = y;
    }
  }
  expect(pantPixels, "the pant must render as a substantial shape").toBeGreaterThan(500);

  // Down the legs, each row must show garment on BOTH sides of a non-garment
  // centre. A garment drawn as a filled rectangle — which is exactly what the
  // procedural placeholder is — cannot produce that interior gap.
  const centreX = Math.round((bandMin + bandMax) / 2);
  let rowsWithLegGap = 0;
  for (let y = Math.round(topY + (bottomY - topY) * 0.62); y <= bottomY; y += 1) {
    let left = false;
    let right = false;
    for (let x = bandMin; x < centreX - 1; x += 1) if (isPant(x, y)) left = true;
    for (let x = centreX + 2; x <= bandMax; x += 1) if (isPant(x, y)) right = true;
    if (left && right && !isPant(centreX, y)) rowsWithLegGap += 1;
  }

  console.log(`PANT_BAND=${bandMin}..${bandMax} PANT_Y=${topY}..${bottomY} PANT_PIXELS=${pantPixels} LEG_GAP_ROWS=${rowsWithLegGap}`);
  expect(rowsWithLegGap, "the pant legs must be separated in the render").toBeGreaterThan(10);

  // The garment must not fill the rectangle it occupies.
  const boxArea = (bandMax - bandMin + 1) * (bottomY - topY + 1);
  expect(pantPixels / boxArea, "an alpha-masked garment cannot fill its own bounding box").toBeLessThan(0.75);
});

test("the carrier debug toggle changes the carrier without touching the artwork", async ({ page }) => {
  test.setTimeout(180_000);
  const sharp = (await import("sharp")).default;
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAlphaRack(page);

  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  const countPant = async () => {
    const { data, info } = await sharp(await canvas.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let pixels = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const [r, g, b] = [data[offset], data[offset + 1], data[offset + 2]];
      if (g > r + 25 && g > b + 8 && g > 45) pixels += 1;
    }
    return pixels;
  };

  const before = await countPant();
  const debugToggle = page.getByLabel(/Show carrier bounds/i);
  await expect(debugToggle).toBeVisible();
  await debugToggle.check();
  await page.waitForTimeout(2500);
  await expect(canvas).toHaveCount(1);
  const after = await countPant();

  console.log(`PANT_PIXELS_CARRIER_OFF=${before} PANT_PIXELS_CARRIER_ON=${after}`);
  // Artwork is a separate material from the carrier, so ghosting the carrier
  // must leave the garment artwork essentially untouched.
  expect(before).toBeGreaterThan(500);
  expect(Math.abs(after - before) / before, "carrier debug must not change the artwork").toBeLessThan(0.15);
});
