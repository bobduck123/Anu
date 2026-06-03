# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presence-studio-v2-hosted-lifecycle.spec.ts >> hosted Studio V2 owner lifecycle >> real owner edits, saves, previews, publishes, and renders a flagged V2 room publicly
- Location: tests\e2e\presence-studio-v2-hosted-lifecycle.spec.ts:45:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('presence-studio-v2-root')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('presence-studio-v2-root')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link [ref=e5] [cursor=pointer]:
        - /url: /studio
        - img [ref=e6]
      - generic [ref=e8]:
        - generic [ref=e9]: Christina Kerkvliet Goddard
        - link "ggm-christina-goddard" [ref=e10] [cursor=pointer]:
          - /url: https://your-presence.vercel.app/presence/ggm-christina-goddard
          - img [ref=e11]
          - text: ggm-christina-goddard
      - generic [ref=e14]: published
      - button "Sign out" [ref=e15]:
        - img [ref=e16]
        - text: Sign out
    - navigation [ref=e19]:
      - link "Overview" [ref=e20] [cursor=pointer]:
        - /url: /studio/11
        - img [ref=e21]
        - text: Overview
      - link "Editor" [ref=e26] [cursor=pointer]:
        - /url: /studio/11/editor
        - img [ref=e27]
        - text: Editor
      - link "Works" [ref=e28] [cursor=pointer]:
        - /url: /studio/11/works
        - img [ref=e29]
        - text: Works
      - link "Collections" [ref=e33] [cursor=pointer]:
        - /url: /studio/11/collections
        - img [ref=e34]
        - text: Collections
      - link "Halls" [ref=e36] [cursor=pointer]:
        - /url: /studio/11/halls
        - img [ref=e37]
        - text: Halls
      - link "Enquiries" [ref=e42] [cursor=pointer]:
        - /url: /studio/11/enquiries
        - img [ref=e43]
        - text: Enquiries
      - link "DNA" [ref=e46] [cursor=pointer]:
        - /url: /studio/11/dna
        - img [ref=e47]
        - text: DNA
      - link "Passes" [ref=e50] [cursor=pointer]:
        - /url: /studio/11/passes
        - img [ref=e51]
        - text: Passes
      - link "QR & NFC" [ref=e53] [cursor=pointer]:
        - /url: /studio/11/qr
        - img [ref=e54]
        - text: QR & NFC
      - link "Analytics" [ref=e60] [cursor=pointer]:
        - /url: /studio/11/analytics
        - img [ref=e61]
        - text: Analytics
      - link "Settings" [ref=e62] [cursor=pointer]:
        - /url: /studio/11/settings
        - img [ref=e63]
        - text: Settings
    - main [ref=e66]:
      - generic [ref=e68]:
        - generic [ref=e70]:
          - generic [ref=e71]:
            - paragraph [ref=e72]: Presence Studio
            - generic [ref=e73]:
              - heading "Christina Kerkvliet Goddard" [level=1] [ref=e74]
              - generic [ref=e75]: Live room open to visitors
            - paragraph [ref=e76]: All changes saved
          - generic [ref=e77]:
            - link "Preview your draft" [ref=e78] [cursor=pointer]:
              - /url: /studio/11/editor/preview
              - img [ref=e79]
              - text: Preview your draft
            - button "Open room to visitors" [ref=e82]:
              - img [ref=e83]
              - text: Open room to visitors
            - link "Live room" [ref=e86] [cursor=pointer]:
              - /url: https://your-presence.vercel.app/presence/ggm-christina-goddard
              - img [ref=e87]
              - text: Live room
        - generic [ref=e90]: Live room/Your Live room is up to date. Visitors see the room that is open now.
        - generic [ref=e92]:
          - complementary [ref=e93]:
            - navigation [ref=e94]:
              - button "Build" [ref=e95]:
                - img [ref=e96]
                - text: Build
              - button "Look" [ref=e102]:
                - img [ref=e103]
                - text: Look
              - button "Images" [ref=e106]:
                - img [ref=e107]
                - text: Images
              - button "Preview" [ref=e111]:
                - img [ref=e112]
                - text: Preview
              - button "Advanced controls" [ref=e115]:
                - img [ref=e116]
                - text: Advanced controls
          - main [ref=e117]:
            - generic [ref=e118]:
              - generic [ref=e119]:
                - generic [ref=e120]:
                  - img [ref=e121]
                  - paragraph [ref=e124]: "Pilot mode: shape your room here. Your changes save as a draft until you open the room to visitors."
                - button "Advanced controls" [ref=e125]:
                  - img [ref=e126]
                  - text: Advanced controls
              - button "Blocks in your room Browse" [ref=e128]:
                - text: Blocks in your room
                - generic [ref=e129]: Browse
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - generic [ref=e132]:
                    - generic [ref=e133]:
                      - paragraph [ref=e134]: Canvas
                      - paragraph [ref=e135]: Tap a visible element to shape your draft room.
                    - generic "Choose scene" [ref=e136]:
                      - button "Entrance" [ref=e137]
                      - button "Work wall" [ref=e138]
                      - button "Practice" [ref=e139]
                      - button "Invitation" [ref=e140]
                  - generic [ref=e143]:
                    - button "Select Cover image" [ref=e144]:
                      - generic [ref=e145]:
                        - img [ref=e146]
                        - text: Add cover image
                    - generic [ref=e150]:
                      - button "Select Room title" [pressed] [ref=e151]:
                        - generic [ref=e152]: Room title
                        - generic [ref=e153]: Using room default
                        - paragraph [ref=e154]
                      - button "Select Room caption" [ref=e155]:
                        - paragraph [ref=e156]
                      - paragraph [ref=e157]: Select visible words or image to change them
                  - generic [ref=e158]:
                    - generic [ref=e159]: Room title
                    - button "Edit text" [ref=e160]:
                      - img [ref=e161]
                      - text: Edit text
                - complementary [ref=e164]:
                  - generic [ref=e165]:
                    - generic [ref=e166]:
                      - paragraph [ref=e167]: Inspector
                      - heading "Room title" [level=3] [ref=e168]
                    - generic [ref=e169]:
                      - heading "Content" [level=4] [ref=e170]
                      - button "Edit words in Canvas" [ref=e171]:
                        - img [ref=e172]
                        - text: Edit words in Canvas
                    - generic [ref=e175]:
                      - heading "Style" [level=4] [ref=e176]
                      - paragraph [ref=e177]: Style presets are coming next for this room type.
                    - generic [ref=e178]:
                      - generic [ref=e179]:
                        - paragraph [ref=e180]: Pick a font
                        - paragraph [ref=e181]: Pick a font that matches your room's voice.
                        - generic [ref=e182]:
                          - button "Editorial Gallery Quiet sans throughout — a contemporary art-fair voice." [ref=e183]:
                            - generic [ref=e184]: Editorial Gallery
                            - generic [ref=e185]: Quiet sans throughout — a contemporary art-fair voice.
                          - button "Soft Studio Serif headings + sans body — warm and intimate." [ref=e186]:
                            - generic [ref=e187]: Soft Studio
                            - generic [ref=e188]: Serif headings + sans body — warm and intimate.
                          - button "Luxury Serif Playfair Display + Georgia body. High contrast." [ref=e189]:
                            - generic [ref=e190]: Luxury Serif
                            - generic [ref=e191]: Playfair Display + Georgia body. High contrast.
                          - button "Mono Archive All mono. Reads as catalogue, archive, or technical note." [ref=e192]:
                            - generic [ref=e193]: Mono Archive
                            - generic [ref=e194]: All mono. Reads as catalogue, archive, or technical note.
                          - button "Brutalist Poster Space Grotesk display + sans body. Bold and graphic." [ref=e195]:
                            - generic [ref=e196]: Brutalist Poster
                            - generic [ref=e197]: Space Grotesk display + sans body. Bold and graphic.
                        - generic [ref=e198]:
                          - text: Heading
                          - combobox "Heading font" [ref=e199]:
                            - option "Room default" [selected]
                            - option "System sans"
                            - option "Helvetica Neue"
                            - option "Georgia"
                            - option "Courier"
                            - option "Inter"
                            - option "Inter Tight"
                            - option "Fraunces"
                            - option "Instrument Serif"
                            - option "Playfair Display"
                            - option "IBM Plex Mono"
                            - option "Space Grotesk"
                        - generic [ref=e200]:
                          - text: Body
                          - combobox "Body font" [ref=e201]:
                            - option "Room default" [selected]
                            - option "System sans"
                            - option "Helvetica Neue"
                            - option "Georgia"
                            - option "Courier"
                            - option "Inter"
                            - option "Inter Tight"
                            - option "Fraunces"
                            - option "Instrument Serif"
                            - option "Playfair Display"
                            - option "IBM Plex Mono"
                            - option "Space Grotesk"
                        - paragraph [ref=e202]: Your room title in the chosen voice
                      - generic [ref=e203]:
                        - paragraph [ref=e204]: Room colours
                        - generic [ref=e205]:
                          - generic [ref=e206]:
                            - textbox "Room background" [ref=e207] [cursor=pointer]: "#f4f4f4"
                            - text: Room background
                          - generic [ref=e208]:
                            - textbox "Paper" [ref=e209] [cursor=pointer]: "#eceae7"
                            - text: Paper
                          - generic [ref=e210]:
                            - textbox "Warm paper" [ref=e211] [cursor=pointer]: "#e7e1d7"
                            - text: Warm paper
                          - generic [ref=e212]:
                            - textbox "Text" [ref=e213] [cursor=pointer]: "#111111"
                            - text: Text
                          - generic [ref=e214]:
                            - textbox "Quiet text" [ref=e215] [cursor=pointer]: "#6a6a6a"
                            - text: Quiet text
                          - generic [ref=e216]:
                            - textbox "Frame line" [ref=e217] [cursor=pointer]: "#d7d2c8"
                            - text: Frame line
                          - generic [ref=e218]:
                            - textbox "Entrance background" [ref=e219] [cursor=pointer]: "#eaeaea"
                            - text: Entrance background
                          - generic [ref=e220]:
                            - textbox "Accent" [ref=e221] [cursor=pointer]: "#b87938"
                            - text: Accent
                      - generic [ref=e222]:
                        - paragraph [ref=e223]: Pick a mood
                        - button "Paper Gallery Quiet paper field, gallery ink, scroll-paced viewing tray." [ref=e224]:
                          - generic [ref=e226]:
                            - generic [ref=e227]: Paper Gallery
                            - generic [ref=e228]: Quiet paper field, gallery ink, scroll-paced viewing tray.
                        - button "Ink Room Dark stage, warm type, slower glass morph between artworks." [ref=e229]:
                          - generic [ref=e231]:
                            - generic [ref=e232]: Ink Room
                            - generic [ref=e233]: Dark stage, warm type, slower glass morph between artworks.
                    - generic [ref=e234]:
                      - heading "Mood" [level=4] [ref=e235]
                      - paragraph [ref=e236]: Mood presets are coming next for this room type.
                    - generic [ref=e237]:
                      - heading "Motion" [level=4] [ref=e238]
                      - paragraph [ref=e239]: Motion presets are coming next for this room type.
                  - generic [ref=e240]:
                    - button "All changes saved" [disabled] [ref=e241]:
                      - img [ref=e242]
                      - text: All changes saved
                    - button "Preview draft room" [ref=e246]:
                      - img [ref=e247]
                      - text: Preview draft room
                    - paragraph [ref=e250]: When the draft is ready, use Open room to visitors above.
```

# Test source

```ts
  1   | import { expect, test, type APIRequestContext, type Page } from "playwright/test";
  2   | 
  3   | const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
  4   | const requiredEnv = [
  5   |   "PRESENCE_E2E_BASE_URL",
  6   |   "PRESENCE_E2E_API_URL",
  7   |   "PRESENCE_E2E_OWNER_EMAIL",
  8   |   "PRESENCE_E2E_OWNER_PASSWORD",
  9   |   "PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID",
  10  | ] as const;
  11  | const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  12  | 
  13  | const restrictedConfigTerms = [
  14  |   "style_dna",
  15  |   "scene_config",
  16  |   "motion_config",
  17  |   "asset_config",
  18  |   "content_config",
  19  |   "roomkey_config",
  20  |   "enquiry_config",
  21  |   "editable_config",
  22  |   "hiddenPublic",
  23  |   "hiddenMobile",
  24  |   "WILD TRANSFORM SUSPENDED",
  25  |   "localStorage",
  26  |   "TemplateKit",
  27  | ] as const;
  28  | 
  29  | const restrictedEditorTerms = [
  30  |   "presence-studio-v2-toolbar",
  31  |   "presence-studio-v2-panel",
  32  |   "/api/presence/owner",
  33  |   "auth-token",
  34  |   "service_role",
  35  |   "bearer ",
  36  | ] as const;
  37  | 
  38  | test.describe("hosted Studio V2 owner lifecycle", () => {
  39  |   test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted Studio V2 lifecycle smoke.");
  40  |   test.skip(
  41  |     hostedGate && missingEnv.length > 0,
  42  |     `Missing hosted Studio V2 smoke env vars: ${missingEnv.join(", ")}`,
  43  |   );
  44  | 
  45  |   test("real owner edits, saves, previews, publishes, and renders a flagged V2 room publicly", async ({
  46  |     page,
  47  |     context,
  48  |     request,
  49  |   }) => {
  50  |     test.setTimeout(180_000);
  51  | 
  52  |     const baseURL = required("PRESENCE_E2E_BASE_URL");
  53  |     const apiBase = trimTrailingSlash(required("PRESENCE_E2E_API_URL"));
  54  |     const roomId = Number(required("PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID"));
  55  |     const marker = `Phase E V2 hosted smoke ${Date.now()}`;
  56  |     const visibleTitle = `${marker} visible object`;
  57  |     const hiddenTitle = `${marker} hidden object`;
  58  |     const moodTitle = `${marker} mood reference`;
  59  |     const observedRequests: string[] = [];
  60  |     const pageErrors: string[] = [];
  61  |     const consoleErrors: string[] = [];
  62  | 
  63  |     page.on("request", (req) => observedRequests.push(req.url()));
  64  |     page.on("pageerror", (err) => pageErrors.push(err.message));
  65  |     page.on("console", (message) => {
  66  |       if (message.type() === "error") consoleErrors.push(message.text());
  67  |     });
  68  | 
  69  |     await test.step("anonymous visitor cannot open owner editor", async () => {
  70  |       const anonymous = await context.browser()?.newContext({ baseURL });
  71  |       expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
  72  |       const anonymousEditor = await anonymous!.newPage();
  73  |       await anonymousEditor.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
  74  |       await expect(anonymousEditor.getByTestId("presence-studio-v2-root")).toHaveCount(0);
  75  |       await expect(anonymousEditor.getByText(/sign in|checking access|editor access|node not found/i)).toBeVisible({ timeout: 30_000 });
  76  |       await anonymous!.close();
  77  |     });
  78  | 
  79  |     await signInHostedOwner(page, roomId);
  80  |     const token = await readSupabaseAccessToken(page);
  81  |     expect(token, "Supabase access token should be available after hosted sign-in.").toBeTruthy();
  82  | 
  83  |     const originalOverview = await fetchEditorOverview(request, apiBase, token!, roomId);
  84  |     const originalSlug = text(record(originalOverview.room).slug) || process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG;
  85  |     expect(originalSlug, "Hosted pilot room slug should be available from editor overview or env.").toBeTruthy();
  86  |     test.info().annotations.push({ type: "hosted-v2-room-id", description: String(roomId) });
  87  |     test.info().annotations.push({ type: "hosted-v2-room-slug", description: originalSlug! });
  88  | 
  89  |     try {
  90  |       await test.step("open V2 owner editor", async () => {
  91  |         await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
> 92  |         await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
  93  |         await expect(page.getByTestId("studio-room-owner-editor-shell")).toHaveCount(0);
  94  |       });
  95  | 
  96  |       await test.step("edit V2 room and save through owner draft API", async () => {
  97  |         await page.getByRole("button", { name: "+ Add" }).click();
  98  |         await fillSidePanelField(page, "Title", visibleTitle);
  99  |         await fillSidePanelField(page, "Meta", "Hosted lifecycle visible proof");
  100 |         await fillSidePanelField(page, "Detail", "This object proves backend draft persistence for Studio V2.");
  101 |         await page.getByRole("button", { name: "Add object" }).click();
  102 | 
  103 |         await page.getByRole("button", { name: "+ Add" }).click();
  104 |         await fillSidePanelField(page, "Title", hiddenTitle);
  105 |         await fillSidePanelField(page, "Meta", "Hidden public projection proof");
  106 |         await fillSidePanelField(page, "Detail", "This object must stay out of anonymous public render.");
  107 |         await page.getByRole("button", { name: "Add object" }).click();
  108 |         await page.getByTitle("Visibility").click();
  109 | 
  110 |         await page.getByRole("button", { name: "Mood" }).click();
  111 |         await fillSidePanelField(page, "Title", moodTitle);
  112 |         await fillSidePanelField(page, "Detail", "Hosted V2 influence persistence");
  113 |         await page.getByRole("button", { name: "Add reference" }).click();
  114 |         await closeSidePanel(page);
  115 | 
  116 |         await page.getByRole("button", { name: "Skin" }).click();
  117 |         const objectShape = page.locator(".v2-side-panel .v2-skin-row").filter({ hasText: "Object Shape" }).locator("input[type='range']");
  118 |         await expect(objectShape).toBeVisible();
  119 |         await objectShape.fill("24");
  120 |         await closeSidePanel(page);
  121 | 
  122 |         await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  123 |         const saveResponse = page.waitForResponse(
  124 |           (response) =>
  125 |             response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`) &&
  126 |             ["POST", "PATCH"].includes(response.request().method()),
  127 |         );
  128 |         await page.getByTestId("presence-studio-v2-save").click();
  129 |         const saved = await saveResponse;
  130 |         expect(saved.ok()).toBeTruthy();
  131 |         await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });
  132 |       });
  133 | 
  134 |       await test.step("reload editor and verify backend draft persistence", async () => {
  135 |         await page.reload({ waitUntil: "domcontentloaded" });
  136 |         await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
  137 |         await expect(page.getByText(visibleTitle)).toBeVisible();
  138 |         await expect(page.getByText(hiddenTitle)).toBeVisible();
  139 |         await page.getByRole("button", { name: "Mood" }).click();
  140 |         await expect(page.getByText(moodTitle)).toBeVisible();
  141 |       });
  142 | 
  143 |       await test.step("owner draft preview renders sanitized V2 room", async () => {
  144 |         await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
  145 |         await expect(page.getByText("Draft preview - only you can see this")).toBeVisible({ timeout: 30_000 });
  146 |         await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  147 |         await expect(page.getByText(visibleTitle)).toBeVisible();
  148 |         await expect(page.getByText(moodTitle)).toBeVisible();
  149 |         await expect(page.getByText(hiddenTitle)).toHaveCount(0);
  150 |         const rendererHtml = await page.locator(".presence-studio-v2-public").evaluate((el) => el.outerHTML);
  151 |         assertNoRestrictedTerms(rendererHtml, [...restrictedConfigTerms, ...restrictedEditorTerms]);
  152 |         const previewHtml = await page.content();
  153 |         assertNoRestrictedTerms(previewHtml, restrictedConfigTerms);
  154 |       });
  155 | 
  156 |       await test.step("publish through real owner endpoint", async () => {
  157 |         await expect(page.getByTestId("preview-open-to-visitors")).toBeEnabled({ timeout: 20_000 });
  158 |         await page.getByTestId("preview-open-to-visitors").click();
  159 |         await expect(page.getByRole("dialog", { name: /open your room to visitors/i })).toBeVisible();
  160 |         const publishResponse = page.waitForResponse(
  161 |           (response) =>
  162 |             response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/publish`) &&
  163 |             response.request().method() === "POST",
  164 |         );
  165 |         await page.getByRole("dialog").getByRole("button", { name: "Open room to visitors" }).click();
  166 |         const published = await publishResponse;
  167 |         expect(published.ok()).toBeTruthy();
  168 |         await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  169 |       });
  170 | 
  171 |       await test.step("anonymous public V2 render is clean on canonical and alias routes", async () => {
  172 |         const anonymous = await context.browser()?.newContext({ baseURL });
  173 |         expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
  174 |         const publicPage = await anonymous!.newPage();
  175 |         await publicPage.goto(`/p/${originalSlug}`, { waitUntil: "domcontentloaded" });
  176 |         await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  177 |         await expect(publicPage.getByText(visibleTitle)).toBeVisible();
  178 |         await expect(publicPage.getByText(moodTitle)).toBeVisible();
  179 |         await expect(publicPage.getByText(hiddenTitle)).toHaveCount(0);
  180 |         let html = await publicPage.content();
  181 |         assertNoRestrictedTerms(html, [...restrictedConfigTerms, ...restrictedEditorTerms, "locked", "pinned", "/studio/"]);
  182 | 
  183 |         await publicPage.goto(`/presence/${originalSlug}`, { waitUntil: "domcontentloaded" });
  184 |         await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  185 |         await expect(publicPage.getByText(visibleTitle)).toBeVisible();
  186 |         html = await publicPage.content();
  187 |         assertNoRestrictedTerms(html, [...restrictedConfigTerms, ...restrictedEditorTerms, "locked", "pinned", "/studio/"]);
  188 | 
  189 |         await publicPage.setViewportSize({ width: 390, height: 844 });
  190 |         await publicPage.goto(`/p/${originalSlug}`, { waitUntil: "domcontentloaded" });
  191 |         await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  192 |         await expect(publicPage.getByText(hiddenTitle)).toHaveCount(0);
```