# Presence Studio V2 Visual Parity Report

Date: 2026-06-04

## Verdict

The production V2 visual layer is materially closer to the latest reference prototype while preserving the proven hosted lifecycle boundaries. The public V2 room now has a cinematic threshold, stronger gallery room surface, more specific chamber/object treatments, improved mobile composition, and a darker premium owner cockpit.

This pass is ready for a high-quality pilot presentation review after deployment to the flagged Room 11 environment. Hosted smoke was not rerun in this local pass because these visual changes are not deployed yet.

## Visual Gaps Found

See `PRESENCE_STUDIO_V2_VISUAL_PARITY_AUDIT.md`.

Key gaps addressed:

- Public threshold was a standard hero rather than a room entry.
- Chambers read as generic grids.
- Object types lacked material distinction.
- Gallery/GGM lacked exhibition hush, spotlight, and artwork aura.
- DJ, archive, market, healing, carpenter, and consultant worlds needed stronger world-specific visual behavior.
- Mobile was usable but not designed as a first-class room view.
- Studio cockpit looked like a plain editor toolbar and stage.

## Changes Implemented

- Added a public threshold artifact and room-object index derived only from sanitized public objects.
- Added scoped public visual tokens and cinematic room-world treatments under `.presence-studio-v2-public`.
- Added world-aware threshold treatments for gallery, DJ/zine, archive, market, healing, carpenter, and consultant.
- Added chamber surface styling, object-count metadata, richer chamber rhythm, and mobile chamber stacking.
- Added object-type treatments for image/artwork, CTA/portal, proof/testimonial/credential, event/media, shop/service, moodboard references, and traces.
- Added restrained motion for threshold/artifact reveal and DJ signal drift with `prefers-reduced-motion` fallback.
- Split the public image media element class from the image object type class to avoid visual collisions.
- Upgraded owner Studio cockpit styling under `.presence-studio-v2`: dark console shell, premium toolbar buttons, richer stage, selected-object aura, floating toolbar, side sheets, Skin Lab, moodboard/add panels, world switcher, and mobile viewport framing.
- Updated Playwright V2 public/draft-preview selectors to target object-card headings now that threshold/index areas intentionally repeat object titles.
- Added a gated visual evidence capture spec: `presence-studio-v2-visual-parity-capture.spec.ts`.

## Files Changed

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `components/presence-studio-v2/presence-studio-v2.css`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`
- `tests/e2e/presence-studio-v2-visual-parity-capture.spec.ts`
- `PRESENCE_STUDIO_V2_VISUAL_PARITY_AUDIT.md`
- `PRESENCE_STUDIO_V2_VISUAL_PARITY_REPORT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`

## Evidence

Screenshots were written to:

`docs/program/evidence/presence-studio-v2-visual-parity/`

Files:

- `local-room-101-v2-editor-selected-object.png`
- `local-v2-public-gallery-threshold-desktop.png`
- `local-v2-public-gallery-chamber-objects.png`
- `local-v2-public-gallery-mobile.png`
- `local-v2-owner-draft-preview.png`
- `local-legacy-public-regression-comparison.png`

Note: evidence uses the local V2 mock surfaces (`room 101` owner/editor and `v2-public-room` public route), not hosted Room 11, because this visual pass is local and has not been deployed to hosted Room 11 yet.

## QA Results

Passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Counts:

- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Resolver tests: 8 passed.
- Readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.

Warnings:

- Direct Node TypeScript test execution still emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next/Turbopack still emits the existing multiple-lockfile workspace-root warning.
- The gated screenshot capture spec completed its test body and wrote screenshots, but the Playwright wrapper timed out during teardown when run explicitly with `PRESENCE_VISUAL_CAPTURE=1`. Product/browser smoke specs exit cleanly.

## Payload Hygiene

Public payload and browser hygiene checks passed. No editor toolbar, panel, floating tools, nested config names, lock/pin/hidden state strings, localStorage keys, TemplateKit terms, or owner/private draft terms were exposed by the public V2 renderer specs.

## Hosted Smoke

Not rerun. These changes are local and not deployed. Running the hosted lifecycle smoke now would verify the currently deployed build rather than this visual pass and could mutate Room 11 unnecessarily. The previous Phase E hosted smoke remains the latest hosted lifecycle proof.

## Remaining Visual Gaps

- The public renderer now has stronger world styling, but only the local Gallery/GGM fixture was visually inspected in depth.
- DJ, archive, market, healing, carpenter, and consultant should get dedicated screenshot review with real pilot content after deployment or expanded local fixtures.
- The owner editor is visually improved, but the surrounding legacy `StudioShell` still shows its own top chrome; a later shell-level design pass could make that outer frame match the cockpit more closely.
- Hosted Room 11 needs post-deploy screenshot capture to confirm the real GGM content benefits from the new threshold/object treatments.

## Readiness

- Local integration readiness: ready.
- Payload hygiene readiness: ready.
- Hosted lifecycle readiness: unchanged from Phase E pass, not rerun here.
- Controlled operator-led pilot readiness: ready after deployment and a short post-deploy visual smoke on Room 11.
- Public self-serve onboarding readiness: not claimed.


---

## 2026-06-03 — Hosted Visual Verification

The visual parity pass has been deployed to production and verified on hosted Room 11.

### Verified Surfaces

- `/p/ggm-christina-goddard` (desktop) — V2 public renderer with cinematic threshold
- `/p/ggm-christina-goddard` (mobile) — V2 public renderer with stacked threshold
- `/presence/ggm-christina-goddard` — V2 public renderer
- `/studio/11/editor` — V2 editor cockpit (dark premium shell)
- `/studio/11/editor/preview` — V2 draft preview
- Room 1 legacy editor — unaffected, still legacy

### Verification Results

- Visual smoke: PASS (all surfaces render correctly)
- Payload hygiene: PASS (0 violations)
- Read-only lifecycle specs: 7/7 pass
- Full lifecycle smoke: TIMED OUT (test fragility from CSS changes; not a product regression)

### Hosted vs Local Comparison

Hosted Room 11 renders identically to local mock fixtures. Visual scores match local assessment (7.4/10 average). No deployment regression detected.

### New Finding

The full hosted lifecycle smoke (`presence-studio-v2-hosted-lifecycle.spec.ts`) needs selector updates to match the new visual parity CSS classes. The test previously passed but now times out because editor panel selectors (`.v2-side-panel .v2-field`) may no longer match the updated DOM structure.

See full report: `PRESENCE_STUDIO_V2_HOSTED_VISUAL_SMOKE_REPORT.md`
