# Presence Studio V2 P1 Visual Polish and Test Report

Date: 2026-06-04

## Executive Verdict

Local P1 polish is complete and passes the required local QA set. The hosted lifecycle smoke selector fragility is fixed in source by moving the lifecycle spec to stable Studio V2 test IDs and adding missing test IDs to the V2 editor panels/tool buttons.

The full hosted lifecycle was attempted against the currently deployed site, but it timed out before edit/save because the deployed hosted build does not yet include the new test IDs. No smoke marker was visible in the post-timeout public HTML check, and the timeout snapshot showed the editor in a clean saved state before mutation.

Room 11 remains suitable for controlled operator-led pilot based on the previously passed hosted lifecycle and hosted visual smoke, but this P1 patch itself needs deployment before the full hosted lifecycle can pass with the updated selectors.

## Changes Implemented

### 1. Lifecycle Selector Fixes

Files:

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`

Added stable non-visual test IDs for:

- Studio toolbar: world, skin, moodboard, add.
- Skin Lab sheet and range controls.
- Add Object sheet title/meta/detail/link fields.
- Moodboard sheet title/url/detail fields.
- Object editor title/type/meta/detail/link/image fields.
- Shared V2 sheet close button.

Updated the hosted lifecycle spec to:

- stop using `.v2-side-panel .v2-field` and `.v2-skin-row`;
- remove the brittle `fillSidePanelField(...)` helper;
- fill add/moodboard/skin controls by `data-testid`;
- avoid strict text collisions by using `.first()` where public threshold/index can duplicate object labels.

### 2. Public CSS Consolidation

File:

- `components/presence-studio-v2/presence-studio-v2-public.css`

Consolidated the public stylesheet from a duplicated base layer plus visual parity override layer into one scoped `.presence-studio-v2-public` stylesheet. The stylesheet still contains the required public foundation styles, but no longer carries the old duplicated top cascade that was overridden by the parity layer.

### 3. Gallery Museum-Frame Treatment

Gallery/GGM image objects now use:

- sharp/near-sharp image frames;
- stronger off-white mat and dark frame treatment;
- reduced gallery chamber radius;
- framed threshold artifact treatment for Gallery world only.

Non-gallery worlds retain their softer object treatments.

### 4. World-Specific Desktop Grids

Added scoped desktop grid rules:

- Gallery: two-column exhibition rhythm with image objects spanning vertically.
- Zine: two-column paste-up rhythm with slight paper rotations.
- DJ: three-column signal wall.

Mobile remains one column for all worlds and mobile-muted objects remain hidden.

## QA Results

### Passed

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

Results:

- Typecheck: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Resolver tests: 8 passed.
- Readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.

Notes:

- The first local Playwright parallel attempt hit `EADDRINUSE` on the shared mock API port because multiple specs tried to start the same web server. Rerunning the affected specs sequentially passed.
- Node direct TypeScript execution still emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Build/Playwright still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

### Hosted Lifecycle Attempt

Command attempted with hosted env values:

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

- Did not pass in this local run.
- The first path form was rejected by Playwright because `testDir` is already `tests/e2e`; rerun used `presence-studio-v2-hosted-lifecycle.spec.ts`.
- The hosted run timed out at the editor before edit/save/publish because the live deployed build does not yet contain the new selector test IDs.
- Error evidence: `test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md`.
- The timeout snapshot showed the V2 editor with Save Draft disabled and no smoke marker objects visible.
- A post-timeout public HTML check did not show `Phase E V2 hosted smoke`, so no ugly smoke marker was left public.

Required next step for hosted pass:

- Deploy this selector/test-ID patch.
- Re-run the hosted lifecycle smoke against Room 11.
- Re-run hosted visual smoke because one public spot-check during this pass returned legacy GGM HTML rather than V2 public HTML.

## Payload Hygiene

Local payload hygiene remains clean:

- `publicPayload.test.ts`: 5 passed.
- `presence-public-payload-hygiene.spec.ts`: 2 passed.
- V2 public render spec still verifies editor chrome/restricted strings are absent and hidden public objects do not render.

No public payload shape changes were made.

## Evidence Screenshots

New local P1 polish evidence:

```txt
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-room-101-v2-editor-selected-object.png
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-v2-public-gallery-threshold-desktop.png
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-v2-public-gallery-chamber-objects.png
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-v2-public-gallery-mobile.png
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-v2-owner-draft-preview.png
docs/program/evidence/presence-studio-v2-p1-visual-polish/local-legacy-public-regression-comparison.png
```

Capture note:

- `presence-studio-v2-visual-parity-capture.spec.ts` completed its test body and wrote screenshots.
- The wrapper command timed out during teardown after the passing test body; no local test port listeners remained afterward.

Historical hosted visual evidence remains under:

```txt
docs/program/evidence/presence-studio-v2-hosted-visual-smoke/
```

## Remaining P2/P3 Items

- Deploy this P1 patch and rerun hosted lifecycle smoke.
- Re-run hosted visual smoke after deployment to confirm Gallery framing and world grids are live.
- Investigate current hosted public route drift if `/p/ggm-christina-goddard` continues to return legacy GGM HTML.
- Consider a future test helper that can read deployed-build compatibility separately from local selector contracts.

## Readiness Verdicts

- Local integration readiness: ready.
- Local P1 visual polish readiness: ready.
- Hosted V2 editor readiness: previously passed; this P1 selector patch needs deployment before retesting.
- Hosted owner preview readiness: previously passed; needs post-deploy retest.
- Hosted public render readiness: previously passed; recheck required after one public spot-check returned legacy HTML.
- Controlled operator-led pilot readiness: ready based on previous hosted pass, with post-deploy smoke recommended before any new high-stakes demo.
- Public self-serve onboarding readiness: not ready and out of scope.
