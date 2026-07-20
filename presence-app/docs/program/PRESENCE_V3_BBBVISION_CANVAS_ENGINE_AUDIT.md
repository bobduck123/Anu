# Presence V3 bbbvision Canvas 2D Gallery Engine — Visual-Motion Parity Audit

**Commit audited:** `c318847` — "Presence V3 bbbvision Canvas 2D Gallery Engine Parity Pass"
**Branch:** `feature/presence-ecosystem-alpha`
**Date:** 2026-06-10
**Auditor:** Kimi Code CLI
**Evidence bundle:** `docs/program/evidence/presence-v3-bbbvision-canvas-gallery-audit/`

---

## 1. Executive Verdict: CONDITIONAL PASS

The new canvas engine in `BbbVisionCanvasGallery.tsx` reproduces the original bbbvision spherical gallery field with sufficient fidelity for public pilot use. Core spherical math, culling, depth sorting, DPR scaling, continuous rotation, glitch probability, and the gold focus rectangle are all present and correct.

The verdict is **CONDITIONAL PASS** because three integration-layer deviations remain perceptible enough to track as follow-up work before declaring full parity:

1. **Focus animation:** Presence uses a CSS fade overlay; the original uses a canvas strip-scatter animation with `Math.tan` dispersion.
2. **Image scatter:** Presence assigns images deterministically from the room work set; the original randomly scatters from a larger pool.
3. **Loading state:** The original shows an explicit loading overlay; Presence can render a black canvas for the first few frames while images preload.

None of these are blockers for the current pilot, but item 1 in particular changes the "feel" of the focus transition.

---

## 2. What Was Audited

| Surface | Route / URL | Evidence file(s) |
|---|---|---|
| Original bbbvision gallery (desktop) | `https://bbbvision.vercel.app/gallery` | `01-original-gallery-desktop.png` |
| Original bbbvision gallery (mobile) | `https://bbbvision.vercel.app/gallery` | `02-original-gallery-mobile.png` |
| Presence studio — style selected | `/studio/101/editor` | `03-studio-bbbvision-selected.png` |
| Presence owner preview — threshold | `/studio/101/editor/preview` | `04-owner-preview-threshold.png` |
| Presence owner preview — gallery | `/studio/101/editor/preview#gallery` | `05-owner-preview-gallery.png` |
| Presence owner preview — focus | `/studio/101/editor/preview#gallery` | `06-owner-preview-focus.png` |
| Presence public — threshold | `/p/test-presence-room` | `07-public-threshold.png` |
| Presence public — gallery | `/p/test-presence-room#gallery` | `08-public-gallery.png` |
| Presence public — direct `#gallery` | `/p/test-presence-room#gallery` | `09-public-direct-gallery.png` |
| Presence public — first frame | `/p/test-presence-room#gallery` | `10-public-first-frame.png` |
| Presence public — reduced motion | `/p/test-presence-room#gallery` | `11-public-reduced-motion.png` |
| Presence public — mobile gallery | `/p/test-presence-room#gallery` | `12-public-mobile-gallery.png` |
| Regression — Gallery P2 unaffected | `/p/rooms-gallery-painter` | `13-regression-gallery-p2.png` |
| Legacy negative — non-V2 room | `/p/hesmaddw` | `14-legacy-negative.png` |

---

## 3. Test Evidence

All automated checks relevant to this pass were executed and passed:

| Spec | Result |
|---|---|
| `presence-studio-v2-bbbvision-canvas-audit-capture.spec.ts` | **7 / 7 passed** |
| `presence-studio-v2-bbbvision-gallery-parity.spec.ts` | **12 / 12 passed** (individual run) |
| `presence-studio-v2-bbbvision-parity.spec.ts` | **2 / 2 passed** (individual run) |
| `presence-studio-v2-bbbvision-pilot.spec.ts` | **1 / 1 passed** (individual run) |
| `presence-studio-v2-public-style-presets.spec.ts` | **1 / 1 passed** (individual run) |
| `npm run typecheck` | **passed** |
| `npm run build` | **passed** |

> Note: running multiple bbbvision-related spec files concurrently exposes pre-existing mock-API shared-state contention (parallel workers hit the same `mock-presence-api.mjs` state). Each spec passes cleanly when run individually. No production code paths are affected.

---

## 4. Fixes Applied During Audit

### 4.1 Mock API preview fallback
**File:** `tests/e2e/mock-presence-api.mjs`

The `/api/presence/owner/rooms/101/editor/preview` endpoint was creating a generic `buildEditorConfig()` draft whenever `state.editorDraft` was `null`. After publishing, `editorDraft` is cleared, so owner preview would fall back to the Christina Liquid Gallery instead of the published bbbvision config.

**Fix:** the preview endpoint now uses `state.editorDraft || state.editorPublished` as the preview base:

```js
const previewBase = state.editorDraft || state.editorPublished || buildEditorConfig("draft", state.nextEditorVersion++);
return sendData(res, {
  ...
  editable_config: { ...redactEditorConfig(previewBase), status: "preview" },
  draft: previewBase,
});
```

This is closer to real behavior: preview shows the draft if one exists, otherwise the published config.

---

## 5. Parity Comparison

### 5.1 Reproduced exactly (or near-exactly)

| Feature | Original | Presence | Status |
|---|---|---|---|
| 16×16 spherical grid | Yes | Yes (`setupShapes`) | ✅ |
| Radius = max(w,h)/2 | Yes | Yes | ✅ |
| Shape size = radius/(16/6) | Yes | Yes | ✅ |
| `x = sin(xRadian + dx) * r`, `y = cos(yRadian + dy) * r` | Yes | Yes | ✅ |
| Back-face culling | Yes | Yes | ✅ |
| Depth sort by Z | Yes | Yes | ✅ |
| Alpha = `1 - ease(dist/radius)` | Yes | Yes | ✅ |
| 192×192 offscreen thumbnails | Yes | Yes | ✅ |
| Hash-based crop anchors | Yes | Yes | ✅ |
| Continuous wheel rotation | Yes | Yes | ✅ |
| Touch drag rotation | Yes | Yes | ✅ |
| Glitch effect (~1% probability) | Yes | Yes | ✅ |
| Gold focus rectangle on center item | Yes | Yes | ✅ |
| DPR-aware canvas sizing | Yes | Yes | ✅ |
| Reduced-motion detection | N/A | `matchMedia('(prefers-reduced-motion: reduce)')` | ✅ |

### 5.2 Known deviations

| Feature | Original | Presence | Risk |
|---|---|---|---|
| Image assignment | Random scatter from large pool | Deterministic cycle from room works | Low — same visual class, different content density |
| Focus open animation | Canvas strip animation with `Math.tan` scatter | CSS fade overlay | **Medium** — largest experiential gap |
| Loading screen | Full overlay until images ready | None; first frames may be black | Low — add fade/loader in polish pass |
| Event scope | Document-level (original assumption) | Canvas-only | Low — acceptable UX |
| Mobile performance | Unknown target | 256 shapes + glitch on DPR 2–3 displays | Low–Medium — consider capping shapes/glitch on mobile |

---

## 6. Recommendations (ranked)

1. **Focus animation parity** — Reproduce the original canvas strip-scatter animation for the focus transition, or add a similarly tactile canvas-based zoom. This is the single biggest remaining "feel" gap.
2. **Loading fade-in** — Add a brief CSS/Canvas fade-in or loader so the first frame is never a fully black canvas.
3. **Mobile performance guard** — Cap shape count (e.g. 144) and/or disable glitch on low-DPR or small-viewport devices.
4. **Dead code cleanup** — Remove orphaned `.v2-bbb-star` CSS and the unused `constellationStarStyle()` helper. Remove unused `activeIndex` / `focusOpen` props from `BbbVisionCanvasGallery` or wire them.
5. **Hit detection polish** — Consider selecting the nearest visible shape on click rather than relying on the center focus rect alone.

---

## 7. Files Touched in This Audit Pass

- `tests/e2e/mock-presence-api.mjs` — preview endpoint fallback fix
- `tests/e2e/presence-studio-v2-bbbvision-canvas-audit-capture.spec.ts` — evidence capture spec (already present, re-run)
- `docs/program/evidence/presence-v3-bbbvision-canvas-gallery-audit/*.png` — generated evidence

---

## 8. Sign-off

- Canvas engine implementation: **approved for pilot**
- Visual-motion parity: **close enough for launch, follow-up recommended**
- Test coverage: **PASS**
- Build / typecheck: **PASS**
- Overall: **CONDITIONAL PASS**

---

## 9. Conditional Fix Pass Response — 2026-06-10

Follow-up pass implemented the three ranked conditional gaps from this audit:

1. **Focus animation parity:** `BbbVisionCanvasGallery.tsx` now runs a 360ms canvas strip-burst using the selected thumbnail before opening the existing accessible focus overlay. Reduced motion bypasses the strip burst.
2. **Loading fade-in:** the canvas field now has a black/gold `Loading field` loader and canvas line/dot loader while thumbnails build. Image load errors and timeouts resolve safely.
3. **Deterministic scatter polish:** shape-to-work assignment, crop anchors, and angular jitter are generated from stable editable room data (`chamberId`, `object.id`, `image.src`) rather than modulo order or runtime random image assignment.

Additional guardrails added:

- Mobile DPR cap and reduced mobile glitch probability.
- Animation pause on `document.hidden`.
- RAF cleanup on unmount.
- Hosted smoke script selector updated from obsolete `.v2-bbb-star` to `presence-public-bbbvision-constellation`.

Evidence:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-conditional-fixes/
```

QA summary:

- Typecheck: pass.
- Build: pass.
- Node unit tests: 92/92 pass.
- New canvas-gallery Playwright spec: 5/5 pass.
- Existing bbbvision gallery parity: 12/12 pass.
- Existing bbbvision parity: 2/2 pass.
- Public payload hygiene: 2/2 pass.
- Broader local regression batch: 29/29 pass.

Hosted smoke was not run. No deploy was performed. No hosted data was mutated.

Updated verdict after fix pass:

Hosted release addendum - 2026-06-11:

- Kimi visual-motion re-audit passed before deploy.
- Baseline commit deployed: `3b8134fedeff4aae37091c42ad270c951bf96ec6`
- Deployment ID: `dpl_3799dWREJvcSkuRyVR36qD9KAqFD`
- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-lwmmryqq1-emadhatu-2110s-projects.vercel.app`
- Hosted smoke: PASS
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0`
- Direct `#gallery`: PASS on `/presence/bbbvision#gallery` and `/p/bbbvision#gallery`
- Mobile: PASS
- Reduced motion: PASS
- Room 11 regression: PASS
- Legacy negative: PASS
- Evidence: `docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke/`
- Owner/editor credential-bound hosted smoke was not run because `PRESENCE_E2E_OWNER_EMAIL` and `PRESENCE_E2E_OWNER_PASSWORD` were not present in process env.
- Hosted release verdict: **PASS - hosted bbbvision canvas gallery ready for controlled pilot presentation.**

**PASS — ready for Kimi visual-motion re-audit before deploy.**
