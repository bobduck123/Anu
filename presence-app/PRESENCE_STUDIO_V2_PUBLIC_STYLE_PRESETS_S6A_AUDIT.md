# Presence Studio V2 — Public Style Presets S6A Audit

**Date:** 2026-06-09
**Auditor:** Kimi Code CLI (Studio V2 design-system auditor, public-renderer QA reviewer, model-contract reviewer, payload hygiene tester)
**Scope:** `lib/presence/studio-v2/model.ts`, `adapters.ts`, `sanitize.ts`, `PresenceStudioV2Editor.tsx` style selector, `PresenceStudioV2PublicRoom.tsx` Christina branch, `presence-studio-v2-public.css` liquid styles, Playwright spec, evidence screenshots
**Deployed:** No. Hosted data mutated: No. S4A status: Parked in `stash@{0}`.

---

## 1. Executive Verdict

**PASS — deploy S6A to hosted smoke.**

S6A successfully created a real selectable public-output style system, not a one-off Christina page. The style preset is persisted, selectable, reversible, safe, data-driven, sanitized, reusable, and non-breaking for Gallery P2.

---

## 2. Scores

| Dimension | Score | Threshold | Met |
|-----------|-------|-----------|-----|
| Public style model / adapter | **9 / 10** | ≥ 8 | Yes |
| Studio style selector UX | **9 / 10** | ≥ 8 | Yes |
| Christina Liquid Gallery renderer | **8 / 10** | ≥ 8 | Yes |
| Gallery P2 preservation | **Pass** | Pass | Yes |
| Style switching behaviour | **Pass** | Pass | Yes |
| Payload hygiene | **Pass** | Pass | Yes |
| S5 / editor regression | **Pass** | Pass | Yes |
| Legacy isolation | **Pass** | Pass | Yes |

---

## 3. Public Style Model and Adapter

### What was verified

- **Type safety:** `StudioV2PublicStylePreset = "gallery-p2" | "christina-liquid-gallery"` is a strict union type in `model.ts`.
- **Default fallback:** `DEFAULT_STUDIO_V2_PUBLIC_STYLE_PRESET = "gallery-p2"` ensures old/invalid configs never break.
- **Persistence path:** The preset is saved into `style_dna.studio_v2.publicStylePreset` via `presenceConfigFromStudioV2State` and restored via `studioV2FromStoredConfig`.
- **Normalization:** `normalizePublicStylePreset()` in `adapters.ts` validates against `STUDIO_V2_PUBLIC_STYLE_PRESETS` and falls back to `gallery-p2` for any unsupported value.
- **Public projection:** `stripEditorStateFromStudioV2()` passes `publicStylePreset` through to `StudioV2PublicRoom` without stripping it (not in `STUDIO_V2_PUBLIC_RESTRICTED_KEYS`).
- **Sanitization:** `sanitizeStudioV2PublicPayload()` does not block the scalar `publicStylePreset` field.
- **Legacy lift:** `studioV2FromLegacyPresenceConfig()` defaults to `gallery-p2`, so legacy rooms are not broken.

### Unit test coverage

`studioV2Adapters.test.ts` includes three style-specific tests:

1. **Round-trip:** `gallery-p2` persists through save and reload.
2. **Christina round-trip:** `christina-liquid-gallery` persists through save, reload, and public projection.
3. **Invalid fallback:** `"unsupported-liquid-engine"` normalizes to `gallery-p2` in both restored state and public room.

All three pass. No payload leaks detected in any case.

### Score: 9/10

Only gap: no test for the `STUDIO_V2_PUBLIC_STYLE_PRESETS` array exhaustiveness, but the union type + normalization makes this statically safe.

---

## 4. Studio Style Selector UX

### What was verified

- **Location:** The selector appears in the Room inspector (when no object is selected), under a "Public output style" section — the correct room-level/public-output placement.
- **Current style visibility:** `presence-studio-v2-public-style-current` shows "Current style" label + the selected preset name.
- **Options:** Two options rendered via `PUBLIC_STYLE_PRESET_OPTIONS`:
  - **Gallery P2** — "Quiet gallery threshold, chamber placards, wall labels, and public-safe artwork focus."
  - **Christina / Liquid Gallery** — "Selected-works sequence, minimal art-site chrome, liquid atmosphere, and practice pathway."
- **Selection UX:** Radio-group style buttons with `aria-checked`, hover/focus states, selected border highlight.
- **Dirty state:** Selecting a different preset immediately marks the draft dirty (`Unsaved changes` badge).
- **Save/reload:** Persisted through existing draft API and survives reload.
- **Honesty note:** "Style controls public presentation only. Room content, assets, and publish flow stay unchanged."
- **No fake features:** No upload, crop, marketplace, or custom CSS editor implied.

### Required test IDs

All three required IDs exist and are used by Playwright:

- `data-testid="presence-studio-v2-public-style-selector"` — container
- `data-testid="presence-studio-v2-public-style-option"` — each option button
- `data-testid="presence-studio-v2-public-style-current"` — current label display

### Score: 9/10

---

## 5. Christina Liquid Gallery Renderer Quality

### What was verified

- **Data-driven:** The renderer derives everything from `StudioV2PublicRoom`:
  - `room.title`, `room.tagline` for hero copy
  - `room.chambers[].objects[]` filtered by `object.image?.src` for the selected-works sequence
  - `object.title`, `object.meta`, `object.detail` for art labels
  - `room.cta` for the primary action
  - `room.moodboardRefs` for references/coordinates
- **No hardcoded content:** Grep confirmed zero matches for "Christina", "Goddard", "Kerkvliet", "Room 11", or "hesmaddw" in the public renderer source (except the component function name, which does not leak to DOM).
- **No Room 11-specific IDs:** The renderer branches on `publicStylePreset === "christina-liquid-gallery"` and `worldId === "gallery"`, not on room ID.
- **Selected-works sequence:** `liquidWorks` is built from all public image objects across chambers, in chamber/object order.
- **Large image stage:** The hero section contains a prominent `.v2-liquid-stage` with the active work image.
- **Progress indicator:** `01 / N` format via `presence-public-liquid-progress`.
- **Prev/next controls:** `.v2-liquid-arrow` buttons with disabled state when `< 2` works.
- **Dot controls:** Row of dot buttons for direct work selection.
- **Art labels:** Caption shows chamber label, title, meta, detail, and a "View work" button.
- **Practice/about treatment:** `.v2-liquid-practice` section uses `room.tagline` and text/note/proof objects (objects without images) up to 4 items.
- **Mobile layout:** Playwright tests at `390×844` confirm the renderer mounts and is usable.
- **Reduced motion:** The existing `@media (prefers-reduced-motion: reduce)` rule (line 2400) disables all animations and transitions globally for public renders, including the Christina style.
- **No system labels:** No object counts, no "Gallery room" system text, no fake social proof.
- **Artwork focus overlay:** Reuses the existing `v2-public-artwork-focus` component with Escape-to-close.

### Visual assessment (evidence screenshots)

- `03-owner-preview-christina-sequence.png`: Clean split-layout hero with large title, tagline, and artwork stage. Navigation shows Works / Practice / Request Availability.
- `05-public-christina-clean.png`: Same layout, no editor chrome, no draft banner. Honest public output.
- `06-public-christina-mobile.png`: Single-column mobile layout. Title, image, and navigation stack cleanly.

### Score: 8/10

The renderer is data-driven and reusable. The only reason it is not 9+/10 is that the sequence order is implicit (derived from chamber/object array order) rather than explicitly configurable, and the liquid atmosphere is CSS-only gradient/dither rather than true shader-based liquid morphology. Both are documented as deferred future work.

---

## 6. Gallery P2 Preservation

### What was verified

- **Default unchanged:** `gallery-p2` remains the default preset and fallback.
- **P2 renderer intact:** The existing Gallery P2 branch in `PresenceStudioV2PublicRoom` is completely untouched except for the added `publicStylePreset` conditional at line 80.
- **P2 tests pass:**
  - `presence-public-output-gallery-quality.spec.ts` — 3 passed
  - `presence-public-output-gallery-polish.spec.ts` — 3 passed
- **Lightbox/focus:** P2 artwork focus overlay still works (tested via existing public-render spec).
- **Mobile output:** P2 mobile rendering remains strong (tested via gallery-polish spec).
- **Switch back works:** The S6A Playwright spec explicitly selects Christina, saves, publishes, then switches back to Gallery P2, saves, publishes, and confirms the public render returns to P2.
- **No corruption:** Style switch only changes `publicStylePreset`; objects, chambers, assets, CTA, and skin are untouched.

### Score: Pass

---

## 7. Style Switching Behaviour

### What was verified

| Behaviour | Test | Result |
|-----------|------|--------|
| Select Christina → dirty | `expect(dirty).toBeVisible()` | Pass |
| Save → persist | Reload, expect "Christina / Liquid Gallery" | Pass |
| Owner preview → Christina render | `expect(presence-public-style-christina-liquid-gallery).toBeVisible()` | Pass |
| Public render → Christina render | Same test ID visible on `/p/test-presence-room` | Pass |
| Switch back → Gallery P2 | Select Gallery P2, save, publish | Pass |
| Invalid fallback → Gallery P2 | Unit test with `"unsupported-liquid-engine"` | Pass |
| No object mutation | Objects/chambers/CTA unchanged after switch | Pass |

### Score: Pass

---

## 8. S5 / Editor Regression

### What was verified

All 21 Playwright tests passed, including:

- `presence-studio-v2-asset-library.spec.ts` — S5 Room Assets, media health, replace URL
- `presence-studio-v2-direct-manipulation.spec.ts` — S2 drag, resize, rotation
- `presence-studio-v2-inspector-usability.spec.ts` — S3 inspector tabs, device frames, preview confidence
- `presence-studio-v2-public-render.spec.ts` — P2 public renderer
- `presence-studio-v2-draft-preview.spec.ts` — owner preview
- `presence-public-payload-hygiene.spec.ts` — payload hygiene

No S1/S2/S3/S5 feature was weakened.

### Score: Pass

---

## 9. Public Hygiene and Legacy Isolation

### What was verified

- **Payload hygiene spec:** 2 tests passed. No restricted keys or value fragments found in public HTML.
- **S6A spec hygiene scan:** `expectPublicHygiene()` checks 20 restricted terms including `style_dna`, `scene_config`, `motion_config`, `asset_config`, `locked`, `pinned`, `room assets`, `media health`, `public output style`. All pass.
- **No editor leakage:** `getByText("Room Assets").toHaveCount(0)`, `getByText("Public output style").toHaveCount(0)` on public render.
- **Legacy negative:** `/p/rooms-gallery-painter` (legacy room) renders outside V2, confirmed in spec and screenshot.
- **S4A:** Remains parked in `stash@{0}`. No chamber-management UI leaked.

### Score: Pass

---

## 10. Test Results

### 10.1 Node unit tests

```
lib/presence/studio-v2/assets.test.ts          8 passed
lib/presence/studio-v2/feature.test.ts         8 passed
lib/presence/studio-v2/studioV2Adapters.test.ts 16 passed
lib/presence/render/publicPayload.test.ts       5 passed
lib/presence/render/resolver.test.ts            8 passed
lib/editor/readiness.test.ts                    5 passed
```

**Total: 50 passed, 0 failed.**

### 10.2 TypeScript + Build

```
npm.cmd run typecheck   → passed (0 errors)
npm.cmd run build       → passed (all routes compiled)
```

### 10.3 Playwright regression suite

```
presence-public-output-gallery-polish.spec.ts      3 passed
presence-public-output-gallery-quality.spec.ts     3 passed
presence-public-payload-hygiene.spec.ts            2 passed
presence-studio-v2-asset-library.spec.ts           1 passed
presence-studio-v2-direct-manipulation.spec.ts     2 passed
presence-studio-v2-draft-preview.spec.ts           2 passed
presence-studio-v2-inspector-usability.spec.ts     4 passed
presence-studio-v2-public-render.spec.ts           3 passed
presence-studio-v2-public-style-presets.spec.ts    1 passed
```

**Total: 21 passed, 0 failed, 0 skipped.**
Duration: 63.0s (chromium, workers=1).

### 10.4 Chromium timeout note

`presence-public-payload-hygiene.spec.ts` initially hit a browser-launch timeout on the first run of the batch. This is a known local DevServer warm-up behaviour. The spec passed immediately on rerun with zero assertion failures. No action required.

---

## 11. Screenshot / Evidence Assessment

| File | Assessment |
|------|------------|
| `01-studio-style-selector-gallery-p2.png` | Clean. Inspector shows "Public output style" section with Gallery P2 selected. Honest note visible. |
| `02-studio-style-selector-christina.png` | Clean. Dirty badge visible after selecting Christina. Two options clearly rendered. |
| `03-owner-preview-christina-sequence.png` | Clean. Draft preview banner present. Christina renderer shows large title, artwork stage, progress indicator, prev/next. No editor chrome. |
| `04-owner-preview-christina-focus.png` | Clean. Artwork focus overlay open with Escape close. |
| `05-public-christina-clean.png` | Clean. No draft banner. No editor text. Public-safe Christina render. |
| `06-public-christina-mobile.png` | Clean. Mobile viewport stacks title, image, controls. Readable. |
| `07-studio-style-switch-back-gallery-p2.png` | Clean. Studio shows Gallery P2 re-selected after save. |
| `08-public-gallery-p2-restored.png` | Clean. Public render is back to P2 threshold with dark atmosphere. No Christina elements. |
| `09-legacy-negative.png` | Clean. Legacy room uses old renderer, no V2 chrome, no Gallery CSS. |

---

## 12. P0 Blockers

None.

---

## 13. P1 Issues Before Deploy (or Immediately After)

None. S6A is safe to deploy as-is.

---

## 14. P2/P3 Future Improvements

- **P2:** Add an explicit `selected-works` order field to the model so operators can curate sequence order independently of chamber/object array order.
- **P2:** Add per-style typography/atmosphere overrides beyond the existing skin system.
- **P3:** True liquid shader/WebGL atmosphere behind the hero (currently CSS gradient + dither).
- **P3:** Add more public style presets (e.g., "Zine Editorial", "DJ Dark Stage") to prove the system is genuinely reusable.
- **P3:** Consider renaming the internal component from `ChristinaLiquidGalleryPublicRoom` to a more generic name like `LiquidGalleryPublicRoom` to remove any archetype coupling from the codebase. This is cosmetic only — no user-facing impact.

---

## 15. Deploy Safety Assessment

| Question | Answer |
|----------|--------|
| Does S6A mutate hosted data? | No. Only through existing draft save/publish API. |
| Does S6A change backend contracts? | No. Uses existing `style_dna` nested config. |
| Does S6A change public payload shape? | Adds one scalar `publicStylePreset` to sanitized public room. |
| Does S6A leak editor state publicly? | No. Verified by grep + 20-term hygiene scan + Playwright. |
| Is the Christina renderer a one-off? | No. Data-driven, reusable for any gallery room. |
| Is Gallery P2 preserved? | Yes. Default, fallback, and explicitly tested. |
| Are S1/S2/S3/S5 features intact? | Yes. All 21 Playwright tests pass. |
| Is S4A still parked? | Yes. `stash@{0}` untouched. |
| Is secret hygiene clean? | Yes. No credentials in working tree. |

**Verdict:** Safe to deploy to hosted smoke.

---

## 16. Files Audited

- `lib/presence/studio-v2/model.ts` — type definitions, defaults
- `lib/presence/studio-v2/adapters.ts` — persistence, normalization, round-trip
- `lib/presence/studio-v2/sanitize.ts` — public payload sanitization
- `lib/presence/studio-v2/studioV2Adapters.test.ts` — adapter unit tests
- `components/presence-studio-v2/worlds.ts` — preset options
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx` — style selector UI
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx` — public renderer with Christina branch
- `components/presence-studio-v2/presence-studio-v2-public.css` — liquid gallery styles (113 rules)
- `components/presence-studio-v2/presence-studio-v2.css` — editor style selector styles
- `tests/e2e/presence-studio-v2-public-style-presets.spec.ts` — Playwright spec
- `docs/program/evidence/presence-studio-v2-public-style-presets-s6a/` — 9 screenshots

---

*Audit complete. PASS — deploy to hosted smoke.*
