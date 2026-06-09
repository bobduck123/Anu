# Presence Studio V2 — bbbvision Pilot S6B Audit

**Date:** 2026-06-08
**Auditor:** Kimi Code CLI (Studio V2 model-contract reviewer, renderer QA reviewer, payload hygiene tester, regression auditor)
**Scope:** `lib/presence/studio-v2/model.ts`, `adapters.ts`, `sanitize.ts`, `PresenceStudioV2Editor.tsx` style selector, `PresenceStudioV2PublicRoom.tsx` bbbvision branch, `presence-studio-v2-public.css` bbbvision styles, `tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts`, mock API state, evidence screenshots
**Deployed:** Yes — deployed 2026-06-08 as part of combined S6A/S6B style system deploy. Hosted data mutated: Minimal and restored (Room 11 style switching for smoke verification). S4A status: Parked in `stash@{0}`.

**Baseline commit:** `6cafb36` on `feature/presence-ecosystem-alpha`

See full baseline report: `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6_RELEASE_BASELINE_REPORT.md`

---

## 1. Executive Verdict

**PASS — bbbvision is a real editable Presence pilot/style preset, not a static clone.**

S6B successfully brought the bbbvision public-output grammar into Presence as a reusable, selectable Studio V2 public style preset. It is:

- **Typed** — strict union type in the model
- **Persisted** — round-trips through `style_dna.studio_v2.publicStylePreset`
- **Selectable** — appears in the Studio selector alongside P2 and Christina
- **Reversible** — can switch to bbbvision, save, preview, publish, then switch back to P2 or Christina without data loss
- **Data-driven** — renderer uses only sanitized `StudioV2PublicRoom` data; no hardcoded bbbvision content
- **Public-safe** — payload hygiene passes; no editor state leaks to public output
- **RBAC-ready** — mock proves owner access and cross-owner negative
- **Regression-safe** — all existing S2/S3/S5/S6A tests pass; legacy isolation preserved

---

## 2. Scores

| Dimension | Score | Threshold | Met |
|-----------|-------|-----------|-----|
| Public style model / adapter | **9 / 10** | ≥ 8 | Yes |
| Studio style selector UX | **9 / 10** | ≥ 8 | Yes |
| bbbvision Threshold Gallery renderer | **8 / 10** | ≥ 8 | Yes |
| Data-driven editability | **9 / 10** | ≥ 8 | Yes |
| RBAC readiness | **8 / 10** | ≥ 7 | Yes |
| Regression safety (P2 / Christina / S5) | **9 / 10** | Pass | Yes |
| Payload hygiene | **Pass** | Pass | Yes |
| Test quality | **9 / 10** | ≥ 8 | Yes |

---

## 3. Public Style Model and Adapter

### What was verified

- **Type safety:** `StudioV2PublicStylePreset` now includes `"bbbvision-threshold-gallery"` as a third member of the strict union type.
- **Array membership:** `STUDIO_V2_PUBLIC_STYLE_PRESETS` includes all three presets; `normalizePublicStylePreset` validates against this array.
- **Persistence path:** The preset is saved into `style_dna.studio_v2.publicStylePreset` via `presenceConfigFromStudioV2State` and restored via `studioV2FromStoredConfig`.
- **Normalization:** Invalid values fall back to `gallery-p2` safely.
- **Public projection:** `stripEditorStateFromStudioV2()` passes `publicStylePreset` through to `StudioV2PublicRoom`.
- **Sanitization:** `sanitizeStudioV2PublicPayload()` does not block the scalar `publicStylePreset` field.
- **Legacy lift:** `studioV2FromLegacyPresenceConfig()` defaults to `gallery-p2`.

### Unit test coverage

`studioV2Adapters.test.ts` includes a bbbvision-specific test:

- **bbbvision round-trip:** `bbbvision-threshold-gallery` persists through save, reload, and public projection without payload leaks.

Passed. No restricted keys or value fragments found in the public room.

### Score: 9/10

---

## 4. Studio Style Selector UX

### What was verified

- **Options count:** Three options rendered via `PUBLIC_STYLE_PRESET_OPTIONS`:
  - **Gallery P2**
  - **Christina / Liquid Gallery**
  - **bbb.vision / Threshold Gallery** — "Threshold landing, black-and-gold gallery field, and restrained image focus."
- **Selection UX:** Radio-group style buttons; selecting bbbvision marks dirty immediately.
- **Save/reload:** Persists through existing draft API and survives reload.
- **Switch-back:** Selecting Gallery P2 again restores P2 output after save/publish.
- **Cross-switch:** Selecting Christina after bbbvision renders Christina correctly.

### Test IDs

All required IDs exist and are used by Playwright:

- `data-testid="presence-studio-v2-public-style-selector"`
- `data-testid="presence-studio-v2-public-style-option"`
- `data-testid="presence-studio-v2-public-style-current"`

### Score: 9/10

---

## 5. bbbvision Threshold Gallery Renderer Quality

### What was verified

- **Data-driven:** The `BbbVisionThresholdGalleryPublicRoom` component derives everything from `StudioV2PublicRoom`:
  - `room.title` for brand mark and gallery head
  - `room.tagline` for threshold line and practice note
  - `room.chambers[].objects[]` filtered by `object.image?.src` for threshold slideshow and gallery orbit
  - `object.title`, `object.meta`, `object.detail` for captions
  - `room.cta` for optional public action link
  - Text/note objects for practice/story section
- **No hardcoded content:** Grep confirmed zero matches for "bbb.vision", "benny", "sparkle", "willow", "bridle" in the public renderer source (except CSS class names and test IDs, which do not leak data).
- **Threshold section:** Full-viewport slideshow with dot navigation, brand mark, tagline, and "Enter" anchor.
- **Gallery section:** Sticky header with brand nav, orbit thumbnail ring, large focused stage with zoom-in focus mode, Prev/Next controls, and caption block.
- **Practice section:** "Practice" heading with tagline and public-safe text objects.
- **Mobile:** Mock mobile viewport (390×844) confirms threshold and gallery render correctly.
- **CSS namespace:** All styles scoped under `.presence-studio-v2-public.style-bbbvision-threshold-gallery` and `.v2-bbb-*` classes.
- **Accessibility:** `aria-label`, `aria-labelledby`, `aria-modal`, `role="dialog"` present on interactive sections.
- **Reduced motion:** Respects existing `motion-${room.skin.motionIntensity}` class and public CSS motion guards.

### Not ported (correctly deferred)

- No canvas/glitch engine port.
- No static one-off bbbvision page.
- No iframe.
- No hardcoded asset filenames in renderer.

### Score: 8/10

The DOM/CSS renderer is honest and accessible. Canvas parity is a future pass if performance and accessibility can be proven.

---

## 6. Data-Driven Editability

### What is editable through normal Studio V2

- Room title — renders as brand mark and gallery head
- Tagline — renders as threshold line and practice note
- Public style preset — switches renderer branch
- Image objects — appear in threshold slideshow and gallery orbit/stage
- Text/story objects — appear in practice section
- Chamber labels — appear in captions and story list
- Asset inspection — S5 Room Assets panel
- Replace URL — S5 object media replacement flow
- CTA label/link — renders in gallery head nav
- Owner preview — `/editor/preview` renders bbbvision branch
- Publish path — updates public output

### Mock proof

The mock API `buildBbbVisionEditorConfig` uses standard Studio V2 editable config shapes (`style_dna`, `scene_config`, `content_config`, `asset_config`, etc.). The test proves the entire edit-save-preview-publish cycle works without renderer hardcode.

### Score: 9/10

---

## 7. RBAC Readiness

### What was verified

- **Owner access:** Mock `owner-test-token` loads `/studio/101/editor` successfully with bbbvision draft.
- **Cross-owner negative:** Mock `non-owner-token` returns `403` with "You do not have access to this Room."
- **Public hygiene:** Public HTML contains no restricted terms (editor fields, token strings, control-plane paths, object counts).
- **Public safety:** `presence-public-bbbvision-threshold-gallery` test ID confirms the public renderer branch is hit; no editor chrome leaked.

### Hosted gap

No hosted bbbvision room exists yet. RBAC was proven locally via mock. Hosted proof requires the controlled create/seed/assign pass.

### Score: 8/10

---

## 8. Regression Safety

### Tests run and passed

| Suite | Tests | Result |
|-------|-------|--------|
| `presence-studio-v2-public-render.spec.ts` | 3 | Pass |
| `presence-studio-v2-draft-preview.spec.ts` | 2 | Pass |
| `presence-public-payload-hygiene.spec.ts` | 2 | Pass |
| `presence-studio-v2-direct-manipulation.spec.ts` | 2 | Pass |
| `presence-studio-v2-inspector-usability.spec.ts` | 4 | Pass |
| `presence-studio-v2-asset-library.spec.ts` | 1 | Pass |
| `presence-public-output-gallery-quality.spec.ts` | 3 | Pass |
| `presence-public-output-gallery-polish.spec.ts` | 3 | Pass |
| `presence-studio-v2-public-style-presets.spec.ts` | 1 | Pass |
| `presence-studio-v2-bbbvision-pilot.spec.ts` | 1 | Pass |
| **Total local Playwright** | **22 / 22** | **Pass** |

Node unit tests:

| Suite | Tests | Result |
|-------|-------|--------|
| `studioV2Adapters.test.ts` | 17 | Pass |
| `publicPayload.test.ts` | 5 | Pass |
| `assets.test.ts` | 8 | Pass |
| `feature.test.ts` | 8 | Pass |
| **Total Node unit** | **38 / 38** | **Pass** |

TypeScript typecheck and production build both pass cleanly.

### Specific regression checks

- **Gallery P2 preserved:** Switching back to Gallery P2 after bbbvision restores P2 renderer and output.
- **Christina preserved:** Switching to Christina after bbbvision restores Christina renderer and output.
- **S5 asset library:** Asset registry, media health, and replace-URL flow remain passing.
- **Legacy isolation:** Legacy room `/p/rooms-gallery-painter` continues to render outside Studio V2.
- **Public payload hygiene:** Existing hygiene tests still pass; no new restricted keys introduced.

### Score: 9/10

---

## 9. Test Quality

### New Playwright spec

`presence-studio-v2-bbbvision-pilot.spec.ts` — 1 comprehensive test covering:

1. Selector visibility and 3-option count
2. bbbvision option selection and dirty state
3. Save and reload persistence
4. Owner preview threshold rendering
5. Owner preview gallery rendering
6. Owner preview image focus (click stage → focus modal → Escape close)
7. Publish and public local rendering
8. Public hygiene scan (restricted terms)
9. Mobile viewport threshold and gallery
10. Switch-back to Gallery P2
11. Cross-switch to Christina proof
12. Legacy negative isolation
13. Owner RBAC negative

14 evidence screenshots captured.

### New/modified unit tests

- `studioV2Adapters.test.ts` — bbbvision round-trip test added
- `publicPayload.test.ts` — bbbvision preset in sanitized public payload test added

### Score: 9/10

---

## 10. Evidence

```txt
docs/program/evidence/presence-studio-v2-bbbvision-pilot/
  01-studio-style-selector-bbbvision-option.png
  02-studio-bbbvision-selected-dirty.png
  03-owner-preview-bbbvision-threshold.png
  04-owner-preview-bbbvision-gallery.png
  05-owner-preview-bbbvision-focus.png
  06-public-bbbvision-threshold-local.png
  07-public-bbbvision-gallery-local.png
  08-mobile-bbbvision-threshold.png
  09-mobile-bbbvision-gallery.png
  10-switch-back-gallery-p2.png
  11-public-gallery-p2-restored.png
  12-public-christina-switch-proof.png
  13-legacy-negative.png
  14-owner-rbac-negative.png
```

---

## 11. Limitations

- No hosted bbbvision room was created in this pass.
- No hosted data was mutated.
- The generic renderer does not include bbbvision-specific asset filenames.
- The canvas glitch/orbit engine was not ported.
- Public route remains one Presence route with threshold and gallery sections, not separate `/gallery` state.
- Hosted RBAC proof requires the controlled create/seed/assign pass.

---

## 12. Readiness

| Question | Answer |
|----------|--------|
| Safe for merge/deploy after audit? | **Yes** — renderer/style-preset code only |
| Safe to begin controlled hosted bbbvision migration? | **Yes** — after audit approval |
| Public self-serve onboarding ready? | **No** — remains out of scope |
| S4A chamber management safe to un-park? | **No change** — still parked |

---

## 13. Next Recommended Pass

1. **Controlled hosted room creation** — create/seed/assign a Presence room for `e4hatu@gmail.com` using existing owner/admin flow.
2. **Content migration** — map real bbbvision assets into Studio V2 editable objects/chambers.
3. **Select preset** — set `bbbvision-threshold-gallery` in Studio.
4. **Hosted smoke** — save, preview, publish, and verify public output.
5. **Hosted RBAC proof** — verify owner access and cross-owner negative on the real room.
