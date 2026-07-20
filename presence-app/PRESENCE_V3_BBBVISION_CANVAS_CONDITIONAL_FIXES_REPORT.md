# Presence V3 bbbvision Canvas Conditional Fixes Report

**Date:** 2026-06-10
**Branch:** `feature/presence-ecosystem-alpha`
**Baseline commit:** `c318847`
**Scope:** Local conditional-fix pass only. No deploy. No hosted smoke. No hosted data mutation.

## Verdict

**PASS  ready for Kimi re-audit before deploy**

Do not deploy until Kimi completes a visual-motion re-audit. Tests prove regression safety; the next decision should be based on visual-motion review.

## Audit Issues Addressed

1. **Loading state:** Added a bbbvision-native black/gold field loader so first frames no longer read as a broken black canvas.
2. **Focus animation:** Added a short canvas-based horizontal strip burst using the selected thumbnail before the existing accessible focus overlay opens.
3. **Image scatter:** Replaced modulo image assignment with deterministic seeded scatter from editable room works.

## Implementation

### Loader

- Added `v2-bbb-canvas-shell` and `v2-bbb-field-loader`.
- Visible loader copy: `Loading field`.
- Canvas also draws a minimal gold line/dot loader while thumbnails resolve.
- Loader fades when enough thumbnails are ready or all image attempts have resolved.
- Image preloading now resolves on load, error, or a 2.2s timeout so one bad image cannot block the field.

### Focus Animation

- Click/Enter now starts a 360ms canvas transition before calling `onFocusWork`.
- Transition uses the selected thumbnail canvas as source where available.
- Horizontal strips expand from the selected shape with seeded jitter and `Math.tan` dispersion.
- Existing `v2-bbb-focus` dialog remains the final accessible overlay.
- Reduced motion bypasses the strip burst and opens focus immediately.

### Deterministic Scatter

The scatter remains Studio-data-driven:

- Stable seed source: `chamberId`, `object.id`, and `object.image.src`.
- Generated deterministically: 256 shape-to-work assignments, per-shape crop anchors, and angular jitter.
- No runtime `Math.random()` is used for image scatter.
- `Math.random()` remains only for the original-style glitch pass.
- No hardcoded bbbvision image URLs or fixed image list were introduced.
- No fixed 20-image assumption was introduced.

### Performance Guardrails

- Desktop keeps the 16x16 / 256-shape field.
- Mobile keeps 256 shapes but caps DPR at 2.
- Desktop DPR is capped at 2.5.
- Mobile glitch probability is reduced from 1% to 0.25%.
- Animation pauses when `document.hidden`.
- `requestAnimationFrame` is cancelled on unmount.

## Evidence

Evidence path:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-conditional-fixes/
```

Captured:

- `01-loader-first-frame.png`
- `02-canvas-ready-state.png`
- `03-desktop-gallery-field.png`
- `04-focus-strip-transition.png`
- `05-focus-overlay-final.png`
- `06-reduced-motion-focus.png`
- `07-mobile-gallery-field.png`
- `08-gallery-p2-regression.png`
- `09-legacy-negative.png`

Focus animation evidence is a screenshot sequence, not a video/GIF.

## QA Results

- `npm.cmd run typecheck`: pass
- `npm.cmd run build`: pass
- Node unit tests: 92/92 passed
- New canvas-gallery Playwright spec: 5/5 passed
- Existing gallery parity spec: 12/12 passed
- Existing bbbvision parity spec: 2/2 passed
- Public payload hygiene Playwright: 2/2 passed
- Broader local regression batch: 29/29 passed

Warnings observed:

- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for direct `.ts` test execution.
- Existing Next/Turbopack workspace-root warning due multiple lockfiles.

## Regression Result

- Threshold `Enter` gallery still works.
- Direct `#gallery` still works.
- Escape closes focus and returns to threshold.
- Reduced motion remains safe.
- Mobile gallery remains usable.
- Payload hygiene passes.
- Gallery P2 remains outside the bbbvision canvas renderer.
- Christina/public style preset regression passes.
- Legacy `/p/hesmaddw` remains legacy.

## Remaining Gaps

- Kimi should visually re-audit the strip burst against the original strip-scatter feel.
- Focus transition evidence is screenshot-based; no video/GIF was captured.
- Hosted smoke was not run and should not be claimed.

## Deploy Recommendation

Do not deploy until Kimi re-audit passes.

---

## Hosted Release Addendum - 2026-06-11

Kimi re-audit passed before deploy. The canvas baseline was locked and deployed to Vercel production.

- Baseline commit deployed: `3b8134fedeff4aae37091c42ad270c951bf96ec6`
- Implementation commit: `e600153`
- Deployment ID: `dpl_3799dWREJvcSkuRyVR36qD9KAqFD`
- Deployment URL: `https://presence-lwmmryqq1-emadhatu-2110s-projects.vercel.app`
- Production alias: `https://your-presence.vercel.app`
- Hosted smoke: PASS
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0`
- Direct hosted `#gallery`: PASS
- Mobile hosted gallery: PASS
- Reduced-motion hosted gallery/focus: PASS
- Room 11 regression: PASS
- Legacy `/p/hesmaddw`: PASS

Hosted evidence:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke/
```

Credential-bound owner/editor browser smoke was not run because owner credentials were not available in process env.

Updated deploy recommendation: deployed and hosted-smoked for controlled pilot presentation only. Do not call this public self-serve ready.
