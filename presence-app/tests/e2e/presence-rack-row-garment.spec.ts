import { expect, test, type Page } from "playwright/test";

const ROUTE = "/internal/spatial-object-model";

async function openArranger(page: Page) {
  const response = await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Spatial object arranger" })).toBeVisible();
  await expect(page.getByTestId("presence-spatial-room-viewport")).toHaveAttribute(
    "data-renderer-lane",
    /^(semantic|three)$/,
    { timeout: 30_000 },
  );
}

async function createGarment(page: Page, title: string, article: string) {
  const library = page.getByTestId("presence-spatial-piece-library");
  await library.getByLabel("Piece title").fill(title);
  await library.getByLabel("Piece type").selectOption("garment");
  await library.getByLabel("Piece media").selectOption("");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await expect(library.getByTestId("presence-spatial-piece-library-list")).toContainText(title);
  const artwork = page.getByTestId("presence-spatial-garment-artwork");
  await expect(artwork).toBeVisible();
  await artwork.getByLabel("Article type").selectOption(article);
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText(title);
}

test("rack-row is selectable and a bound pant keeps the WebGL canvas alive", async ({ page }) => {
  test.setTimeout(180_000);
  const contextLost: string[] = [];
  await page.exposeFunction("__presenceContextLost", (reason: string) => { contextLost.push(reason); });
  await page.addInitScript(() => {
    // The renderer calls `forceContextLoss()` on teardown by design, so a raw
    // `webglcontextlost` count reports intentional cleanup as a fault. Only a
    // loss on a canvas that is STILL IN THE DOCUMENT afterwards is a real
    // failure; a loss on a canvas being unmounted is correct disposal.
    const original = HTMLCanvasElement.prototype.addEventListener;
    HTMLCanvasElement.prototype.addEventListener = function patched(this: HTMLCanvasElement, ...args: unknown[]) {
      if (!this.dataset.presenceLossHooked) {
        this.dataset.presenceLossHooked = "1";
        const canvas = this;
        original.call(this, "webglcontextlost", () => {
          const report = (window as unknown as { __presenceContextLost: (reason: string) => void }).__presenceContextLost;
          setTimeout(() => {
            report(canvas.isConnected ? "live-canvas-context-lost" : "teardown-context-loss");
          }, 250);
        });
      }
      return original.apply(this, args as never);
    } as typeof original;
  });

  await openArranger(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await page.getByTestId("presence-spatial-add-option-presence-object-suspended-rack").click();

  // A: rack-row must be offered. B: a rack host must default to it.
  const arrangement = page.getByLabel("Arrangement");
  const offered = await arrangement.locator("option").evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  expect(offered).toContain("rack-row");
  expect(await arrangement.inputValue()).toBe("rack-row");

  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveCount(1);

  for (const [title, article] of [
    ["QA Shirt A", "shirt"],
    ["QA Shirt B", "shirt"],
    ["QA Pant A", "pant"],
    ["QA Shoe A", "shoe"],
    ["QA Generic A", "generic"],
  ] as const) {
    await createGarment(page, title, article);
    await page.waitForTimeout(600);
    // D: the canvas must survive every article, the pant included.
    await expect(canvas, `canvas lost after binding ${title} (${article})`).toHaveCount(1);
  }

  // Teardown losses are expected; a mounted canvas losing its context is not.
  await page.waitForTimeout(500);
  expect(
    contextLost.filter((reason) => reason === "live-canvas-context-lost"),
    "no mounted canvas may lose its WebGL context",
  ).toEqual([]);
  await expect(canvas).toHaveAttribute("data-rendered-item-count", /^[1-9][0-9]*$/);

  // C: the saved layout records rack-row.
  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((candidate) => candidate.includes("internal-draft"));
    return key ? window.localStorage.getItem(key) : null;
  });
  expect(saved).toBeTruthy();
  expect(saved).toContain("rack-row");
});

test("each host derives its own arrangement default instead of inheriting the previous host's", async ({ page }) => {
  test.setTimeout(120_000);
  await openArranger(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();

  // A spherical gallery must still default to spherical: that default used to be
  // forced by a dedicated effect and is now derived from the host itself.
  await page.getByTestId("presence-spatial-add-option-presence-display-spherical-gallery").click();
  await expect(page.getByLabel("Arrangement")).toHaveValue("spherical");

  // Switching host re-derives rather than carrying the previous choice across,
  // so a rack never inherits a gallery's arrangement.
  await page.getByTestId("presence-spatial-add-option-presence-object-suspended-rack").click();
  await expect(page.getByLabel("Arrangement")).toHaveValue("rack-row");
});
