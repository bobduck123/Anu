# Presence Studio V2 — Asset / Media Library Foundations S5 Audit

**Date:** 2026-06-08
**Auditor:** Kimi Code CLI (ruthless Studio UX auditor, media-quality workflow reviewer, frontend regression tester, payload hygiene auditor)
**Scope:** `lib/presence/studio-v2/assets.ts`, `PresenceStudioV2Editor.tsx` asset panel + detail view, `presence-studio-v2.css` asset styles, Playwright spec, evidence screenshots
**Deployed:** No. Hosted data mutated: No. S4A status: Parked in `stash@{0}`.

---

## 1. Executive Verdict

**CONDITIONAL PASS — deploy allowed, fix listed P1 soon.**

S5 is honest, safe, and useful. It does exactly what it claims: derives a read-only asset registry from current room objects, surfaces media-health advisory checks, and allows safe URL replacement through the existing object-state → draft-save flow. No fake upload, crop, library, or storage is implied. Public and owner-preview surfaces remain clean. No regressions in S1/S2/S3/P2.

The conditional is one P1 gap: the core asset-derivation logic (`deriveStudioV2AssetRegistry`, `validateStudioV2AssetUrl`, `deriveStatuses`) has **zero unit tests**. A safety feature meant to prevent bad media from reaching public rooms should have its core heuristics covered by fast, deterministic unit tests, not only by slow Playwright integration tests. Fix before the next major refactor.

### Post-audit P1 closure - 2026-06-08

**Status:** P1 unit-test gap closed. S5 is now clean for hosted deployment, pending the normal hosted smoke process.

Added `lib/presence/studio-v2/assets.test.ts` with 8 deterministic Node unit tests covering:

- Registry derivation from Studio V2 object media only.
- Object/chamber mapping, public/mobile visibility, duplicate URL detection, and usage counts.
- Empty room and no-media safe registry output.
- URL validation for missing, local/public, external, unsupported protocol, protocol-relative, trimmed, and relative paths.
- Status derivation for missing, broken/unloaded, duplicate, possible smoke/test asset, external URL, local/public asset, and clean valid artwork.
- Smoke/test terms in URL, title, and alt text: `smoke`, `test`, `harmless`, `hosted-smoke`, `v1b`.
- Safety invariants: no input mutation, no raw editor/private config leakage, and malformed image-field tolerance.
- Threshold/hero heuristic coverage: auto-detected from the first public-visible object with a normalized image URL.

Two real safety bugs were fixed:

- Protocol-relative URLs such as `//cdn.example.com/image.webp` are no longer classified as local/public paths.
- Threshold/hero auto-detection now uses normalized image URLs, so truthy malformed `image.src` values cannot become threshold media.

Full required QA passed after the fix. S4A remains parked in `stash@{0}`.

---

## 2. Scores

| Dimension | Score | Threshold | Met |
|-----------|-------|-----------|-----|
| Derived asset registry correctness | **8 / 10** | ≥ 8 | Yes |
| Asset panel UX honesty | **9 / 10** | ≥ 8 | Yes |
| Replace URL flow | **9 / 10** | ≥ 8 | Yes |
| Payload hygiene | **Pass** | Pass | Yes |
| S1/S2/S3/P2 regression | **Pass** | Pass | Yes |
| S4A parking | **Pass** | Pass | Yes |

**Overall deploy recommendation:** `CONDITIONAL PASS`

---

## 3. What S5 Does Well

### 3.1 Honest derived registry
- `deriveStudioV2AssetRegistry(state)` is a **pure function** of current `StudioV2State`. No backend reads, no fake persistence.
- Every asset maps to its originating `objectId`, `objectTitle`, `objectType`, `chamberId`, and `chamberLabel`.
- Duplicate URLs are detected via a `Map<string, number>` count across all chambers.
- Missing URLs (empty string after trim) are flagged.
- External URLs (`/^https?:\/\//i`) are flagged.
- Local/public asset paths (`/^\//`) are flagged.
- Test/smoke asset warning catches `smoke`, `test`, `harmless`, `hosted-smoke`, `v1b` in URL, title, and alt text (case-insensitive).
- Broken/unloaded state is handled safely: an `onError` handler on `<img>` tags marks the object ID in a `brokenAssetObjectIds` Set, which is passed back into the registry on next render. No crash, no infinite loop.
- Threshold/hero context is computed deterministically as the first public-visible object with an image src.

### 3.2 Honest UX
- Left rail panel title: **"Room Assets"** with honest subtitle: **"Derived from objects in this room. Upload library later."**
- Asset cards show thumbnail, object title, chamber/type metadata, and status badges.
- Media health checklist shows 8 metrics with color-coded state: neutral, ok, notice (amber), warn (orange). Not scary.
- Asset detail view includes a clear **"Derived from current room objects. Upload library arrives later."** note at the bottom.
- Replace URL input has placeholder `/public/path/or/https-url.webp` — no upload button, no crop button, no drag-and-drop zone.
- Duplicate URL replacement shows explicit advisory: **"This S5 flow replaces the selected object only; multi-replace arrives later."**
- Locked objects disable the replace field and show a warning.

### 3.3 Safe replace flow
- `replaceAssetUrl(objectId, value)` patches the object's `image.src` through the existing `updateObject` reducer.
- Dirty state appears immediately (`snapshot(v2State) !== baseSnapshot`).
- Save draft persists through existing `patchPresenceEditorDraft` / `createPresenceEditorDraft` API path.
- Reload + re-select confirms persistence (tested in Playwright).
- Clearing the URL removes the `image` field entirely (`image: undefined`), which is consistent with existing object behavior.
- No backend contract changes. No direct DB writes.

### 3.4 Leakage protection
- Grep confirmed: `presence-studio-v2-asset`, `Room Assets`, `Derived from current room objects` appear **zero times** in `PresenceStudioV2PublicRoom.tsx` and `presence-studio-v2-public.css`.
- Playwright spec asserts `expect(page.getByText("Possible test asset")).toHaveCount(0)` on both owner preview and public render.
- Playwright spec asserts `expect(page.getByText("Room Assets")).toHaveCount(0)` on both owner preview and public render.
- `data-testid` attributes are editor-only and do not appear in public HTML.

### 3.5 Visual quality
- Asset cards and detail view match the existing S1/S3 dark-cockpit aesthetic.
- Status badges use warm amber/orange tones, not alarming reds.
- Asset thumbnail uses `aspect-ratio: 4/3` with `object-fit: cover`.
- Detail preview uses `object-fit: contain` with generous max-height.
- Mobile and reduced-motion media queries are preserved in the existing CSS.

---

## 4. What Remains Weak

### 4.1 Core safety logic unit tests (P1 - resolved)
`lib/presence/studio-v2/assets.ts` contains non-trivial heuristic logic. The original audit found no unit coverage; the 2026-06-08 post-audit pass added `assets.test.ts`.

**Now covered by deterministic Node tests:**
- Object with `image` field but empty `src` → missing-url status.
- Object of type `image` with no `image` field at all → still included because `DERIVED_ASSET_OBJECT_TYPES` covers it, but `src` is empty.
- Duplicate URL spanning 3+ objects across multiple chambers.
- Object title containing test term but URL clean → possible-test-asset flag.
- Object alt containing test term but URL clean → possible-test-asset flag.
- Protocol-relative URL (`//cdn.example.com/img.jpg`) → unsupported/broken advisory, not local/public.
- Empty chamber list → registry returns `{ assets: [], health: { total: 0, ... } }`.

**Fix:** Complete. `lib/presence/studio-v2/assets.test.ts` covers the status combinations and safety invariants.

### 4.2 Threshold context is simplistic (P2)
`thresholdObjectId` is defined as the **first** public-visible object with an image src, found by array order. If the operator reorders chambers or objects, the threshold context flag moves arbitrarily. The UI presents "Threshold/hero context" as a factual label, but it is a heuristic guess.

**Fix:** Either make threshold selection explicit in the object inspector (P2) or add a tooltip explaining it is auto-detected (P3).

### 4.3 Test asset regex is narrow (P3)
`TEST_ASSET_PATTERN = /\b(smoke|test|harmless|hosted-smoke|v1b)\b/i` misses common test-name patterns:
- `fixture`, `mock`, `dummy`, `placeholder`, `sample`, `demo`, `temp`
- UUID-looking filenames without test terms
- Common placeholder services (`placehold.co`, `via.placeholder.com`, `picsum.photos`)

**Fix:** Expand regex and/or add a known-placeholder-host list.

### 4.4 Broken/unloaded detection is session-only (P3)
The `broken-unloaded` status is set only when an `<img>` fires `onError` inside the current editor session. It is not persisted. Reloading the editor clears the broken set until images fail again.

**Fix:** This is acceptable for S5 (advisory only). Do not persist broken state to backend without a real asset-crawl service.

### 4.5 Evidence screenshot 07 is poorly cropped (P3)
`07-media-health-checklist.png` captured the room stage mid-scroll rather than the media health panel. The evidence exists but is not a clean artifact.

**Fix:** Re-capture with focused selector or scroll the left rail into view before screenshot.

---

## 5. P0 Blockers

None.

---

## 6. P1 Issues Before Deploy (or Immediately After)

1. **Resolved 2026-06-08:** Added `lib/presence/studio-v2/assets.test.ts` covering `deriveStudioV2AssetRegistry`, `validateStudioV2AssetUrl`, and status derivation edge cases: empty state, duplicates, test-term matches, missing URLs, external vs local, protocol-relative URLs, malformed image fields, and threshold heuristic behavior.
2. **Document the threshold heuristic** — Add a quiet-copy note in the asset detail panel: "Auto-detected as threshold image because it is the first public image in the room." Prevents operator confusion.

---

## 7. P2/P3 Future Improvements

- P2: Expand test-asset regex to cover placeholder hosts and common dummy terms.
- P2: Make threshold/hero selection explicit (dropdown or toggle) rather than heuristic.
- P2: Multi-replace flow for duplicate URLs (already acknowledged as deferred).
- P3: Persist broken-image detection across sessions via a lightweight crawl or localStorage advisory cache.
- P3: Re-capture evidence screenshot 07 with proper framing.

---

## 8. Test Results

### 8.1 Node unit tests

```
lib/presence/studio-v2/feature.test.ts          8 passed
lib/presence/studio-v2/studioV2Adapters.test.ts 14 passed
lib/presence/render/publicPayload.test.ts        5 passed
lib/presence/render/resolver.test.ts             8 passed
lib/editor/readiness.test.ts                     5 passed
```

**Total: 40 passed, 0 failed.**

Known warnings: `MODULE_TYPELESS_PACKAGE_JSON` (existing, harmless).

### 8.2 TypeScript + Build

```
npm.cmd run typecheck   → passed (0 errors)
npm.cmd run build       → passed (all routes compiled)
```

Known warnings: Turbopack workspace-root inference (existing, harmless).

### 8.3 Playwright regression suite

```
presence-public-payload-hygiene.spec.ts          2 passed
presence-studio-v2-asset-library.spec.ts         1 passed
presence-studio-v2-direct-manipulation.spec.ts   2 passed
presence-studio-v2-draft-preview.spec.ts         2 passed
presence-studio-v2-inspector-usability.spec.ts   4 passed
presence-studio-v2-public-render.spec.ts         3 passed
```

**Total: 14 passed, 0 failed, 0 skipped.**
Duration: 50.6s (chromium, workers=1).

### 8.4 Regression matrix

| Test | Assertion | Result |
|------|-----------|--------|
| S1 cockpit mounts | top chrome, outline, inspector visible | Pass |
| S2 direct manipulation | drag, resize handles, rotation | Pass |
| S3 inspector tabs | content/style/motion, device frames | Pass |
| P2 public render | threshold, chamber, lightbox | Pass |
| Owner preview | draft banner, V2 renderer, no editor chrome | Pass |
| Legacy isolation | non-V2 room uses legacy renderer | Pass |
| Payload hygiene | no restricted terms in public HTML | Pass |
| Asset panel leakage | no asset warnings on public/preview | Pass |
| S4A absence | no chamber-management UI in editor | Pass |

---

## 9. Screenshot / Evidence Assessment

| File | Assessment |
|------|------------|
| `01-asset-panel-overview.png` | Clean. Left rail shows Room Assets panel with honest subtitle, media health checklist, and asset card. |
| `02-asset-detail-view.png` | Clean. Inspector shows Asset Detail with preview, full URL, replace URL input, status badges, object facts, and honest note. |
| `03-asset-used-in-state.png` | Clean. "Used in Current Works" link navigates to object selection. |
| `04-missing-image-state.png` | Clean. Missing URL badge shown. Empty preview with "Missing image URL" placeholder. Replace field is empty. |
| `05-replace-url-flow.png` | Clean. Dirty badge visible after URL change. Duplicate URL badge appears after copying URL to second object. |
| `06-suspected-test-asset-warning.png` | Clean. "Possible test asset" and "Broken/unloaded" badges visible. Warning text explains smoke/test terms. |
| `07-media-health-checklist.png` | **Poor framing.** Captured mid-stage instead of health panel. Evidence exists but is not presentation-ready. |
| `08-owner-preview-clean.png` | Clean. No asset warnings, no Room Assets text, no derived note. Standard owner preview. |
| `09-public-render-clean.png` | Clean. No asset warnings, no editor chrome. Standard public render. |

---

## 10. Deploy Safety Assessment

| Question | Answer |
|----------|--------|
| Does S5 mutate hosted data? | No. Only through existing draft save API. |
| Does S5 change backend contracts? | No. |
| Does S5 change public payload shape? | No. `assets.ts` is editor-only derivation. |
| Does S5 leak editor state publicly? | No. Verified by grep + Playwright. |
| Does S5 imply fake upload/crop/library? | No. Honest "Upload library later" language throughout. |
| Are S1/S2/S3/P2 features intact? | Yes. All 14 Playwright tests pass. |
| Is S4A still parked? | Yes. `stash@{0}` untouched. |
| Is secret hygiene clean? | Yes. No credentials in working tree. |

**Verdict:** Safe to deploy to hosted smoke. The P1 unit-test gap was fixed in the 2026-06-08 post-audit pass.

**Post-audit update:** P1 unit-test gap fixed on 2026-06-08. Verdict is now clean for hosted deployment, with hosted smoke still required before release lock.

**Hosted update 2026-06-09:** S5 was deployed to production and hosted-smoked cleanly.

- Deployment ID: `dpl_2w6Lyj9UfKiyj6PFUdokG12t3Mni`
- Deployment URL: `https://presence-c9nmbuzw5-emadhatu-2110s-projects.vercel.app`
- Production alias: `https://your-presence.vercel.app`
- Hosted S5 editor smoke: PASS, `1 passed (17.1s)` with retries disabled.
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0` before and after lifecycle.
- Full hosted lifecycle: PASS, `1 passed (20.8s)`, cleanup/restoration complete.
- Owner preview/public/legacy: PASS, no S5 asset UI leakage.

Verdict after hosted smoke: S5 is ready for operator-led pilots and safe to lock as the hosted renderer/editor baseline after review.

---

## 11. Files Audited

- `lib/presence/studio-v2/assets.ts` — new, clean, pure
- `lib/presence/studio-v2/index.ts` — adds `export * from "./assets.ts"`
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx` — adds `StudioOutlinePanel` asset section, `MediaHealthChecklist`, `AssetDetailPanel`
- `components/presence-studio-v2/presence-studio-v2.css` — adds asset card, detail, health, status styles
- `tests/e2e/presence-studio-v2-asset-library.spec.ts` — new Playwright spec
- `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_REPORT.md` — self-report (updated separately)
- `docs/program/evidence/presence-studio-v2-asset-library-s5/` — 9 screenshots

---

*Audit complete. Original conditional P1 was fixed, and hosted S5 smoke passed on 2026-06-09.*
