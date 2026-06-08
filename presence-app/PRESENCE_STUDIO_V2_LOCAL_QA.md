# Presence Studio V2 Local QA

Date: 2026-06-03

## Scope

Local QA for the Studio V2 integration slice, including Phase A adapter hardening:

- integration audit
- adapter/model/sanitizer scaffold
- feature flag helper
- optional sanitized V2 public payload projection
- adapter hardening (production guard, moodboard lift, world mapping, type safety, test expansion)

This QA does not certify the full V2 editor UI, because that UI has not yet been mounted into the real owner Studio route.

## Commands Run

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

## Results

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 13 passed (was 5).
- Public payload tests: 3 passed.

## Verified

- Studio V2 state maps into the existing nested editable config areas.
- Existing nested config keys are preserved when V2 config is written.
- V2 config round-trips back into runtime state.
- Locked/pinned owner edit state persists in owner config.
- Hidden public objects are removed from public projection.
- Mobile transform suspension affects public projection.
- Public V2 projection has no restricted payload keys.
- V2 public projection is only added when the feature flag and pilot eligibility allow it.
- Existing public payload hygiene test still passes.
- Production build still compiles all current routes.
- **Production empty-pilot guard blocks all rooms when pilot list is empty in production.**
- **Sanitizer recursively strips restricted keys at all nesting depths.**
- **`safePublicUrl` rejects file://, javascript:, localhost, private IPs, control-plane paths.**
- **`normalizeTransform` clamps x/y, scale, rotation, zIndex to safe boundaries.**
- **Malformed stored config (missing objectState, garbage sections, wrong types) recovers safely.**
- **Legacy moodboard references lift from content_config and asset_config sources.**
- **Explicit room_type mapping takes precedence over substring heuristic.**

## Warnings

Direct Node TypeScript test execution emitted:

```txt
MODULE_TYPELESS_PACKAGE_JSON
```

This is caused by running `.ts` test files directly with Node's built-in type stripping. It does not affect the Next production build.

The build emitted the existing Turbopack workspace-root warning because multiple lockfiles exist:

```txt
Next.js inferred your workspace root ... Detected additional lockfiles
```

This warning existed at build time and is not caused by the Studio V2 adapter slice.

## Phase B Verification (2026-05-31)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed (was 13, +1 mount evidence test).
- Public payload tests: 3 passed.

Verified:

- Feature flag branch added to `app/(studio)/studio/[id]/editor/page.tsx`.
- `shouldUsePresenceStudioV2` gates V2 editor mount; non-V2 rooms fall through to legacy editor unchanged.
- `PresenceStudioV2Editor` loads real draft via `getPresenceEditor` + `studioV2FromPresenceConfig`.
- Title edit mutates local React state and marks dirty.
- Save converts via `presenceConfigFromStudioV2State` and calls `patchPresenceEditorDraft` / `createPresenceEditorDraft`.
- Save refreshes base state from backend response; dirty state clears.
- Round-trip test proves updated title persists through adapter serialization and deserialization.
- No `localStorage` usage in V2 editor component.
- No TemplateKit API usage in V2 editor component.
- Scoped CSS root `.presence-studio-v2` created; no style collisions.
- Stable test IDs added for future Playwright coverage.

## Phase C Verification (2026-05-31)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 3 passed.

Verified:

- Full V2 cockpit renders with toolbar, room stage, and panels.
- `PresenceStudioV2Room` renders chambers and objects with world-specific backgrounds.
- Object selection works (click object → selected state; click background → deselect).
- Floating toolbar appears on selection with Edit/Duplicate/Visibility/Delete.
- Wild Mode adds Layer/Pin/Lock to floating toolbar.
- Object Editor panel opens on Edit with title, type, meta, detail, link, image, visibility, transform, lock/pin.
- Transform buttons adjust X/Y/rotation/scale/ZIndex in wild mode.
- Add Object panel with type grid and form creates new objects.
- Duplicate creates copy with offset transform and selects it.
- Delete removes object from state.
- Skin Lab panel with 10 controls updates `StudioV2Skin` live.
- World Switcher overlay changes `worldId`.
- Moodboard panel adds/removes references with type and color.
- Desktop/Mobile viewport toggle narrows room stage.
- Social traces render entries/seeds/guestbook strip.
- Editor badges show Locked/Pinned/Hidden/Wild transform suspended.
- Save Draft persists all changes through owner editor draft API.
- No `localStorage` usage in any V2 component.
- No TemplateKit API usage in any V2 component.
- All CSS scoped under `.presence-studio-v2`.

## Not Yet Verified

- Pointer-based drag/resize/rotate (button controls only).
- Auto-save debounce.
- Preview button wired.
- Publish button wired.
- Browser console cleanliness under full interaction load.
- Hosted smoke.

## Phase D Verification (2026-06-03)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
npx playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- V2 public renderer Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.

Verified:

- `/p/[slug]` passes sanitized `studioV2Room` into `PortfolioRenderer`.
- `/presence/[slug]` inherits the same dispatch through its route re-export.
- `PortfolioRenderer` renders `PresenceStudioV2PublicRoom` only when sanitized `studioV2Room` exists.
- Legacy public rooms keep the existing DNA/legacy rendering path when `studioV2Room` is absent.
- Public V2 renderer accepts only `StudioV2PublicRoom`, not raw editable config.
- Public V2 renderer displays title, tagline, world surface, chambers, public objects, CTA, moodboard references, and disclosed demo traces.
- Hidden public objects do not render.
- Editor controls, side panels, floating toolbar, and editor badges do not render.
- Restricted internal config names and editor/private terms are absent from V2 public HTML.
- Existing `/room/[id]/key` redirect/hygiene path still passes.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.
- Direct Node execution of `lib\presence\studio-room\studioRoomPublicRender.test.ts` remains blocked by an existing extensionless import path; this is not new to Phase D.
- Browser plugin in-app automation was not available because the Node REPL callable was not exposed; CLI Playwright was used for browser verification.

Still not verified:

- Hosted smoke.
- V2-specific work detail behavior under `/p/[slug]/works/[workId]`; this route remains on the existing work-detail implementation.
- Full owner preview/publish lifecycle for a hosted V2 room.

## Phase D.5 Verification (2026-06-03)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- V2 anonymous public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.

Verified:

- Owner draft preview route `/studio/101/editor/preview` remains owner-gated and noindex.
- V2 owner draft preview constructs a sanitized `StudioV2PublicRoom` through the shared adapter/projection helper.
- `PortfolioRenderer` receives `studioV2Room` for V2 preview and a scrubbed node with `editable_config: null`.
- Legacy owner draft preview keeps the existing renderer path when `studioV2Room` is absent.
- V2 draft preview renders `.presence-studio-v2-public`.
- V2 draft preview does not render editor toolbar, side panel, floating object tools, or object state badges.
- V2 draft preview HTML does not contain nested config names or editor-only lock/pin/hidden state strings.
- Public V2 mobile viewport hides `mobileVisible === false` objects.
- Anonymous public V2 route and `/presence/[slug]` alias remain clean.
- V2 public and draft-preview browser specs collect console errors and page errors and assert none occurred.
- Existing public payload hygiene paths still pass.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

Still not verified:

- Hosted smoke.
- Production/preview deployment behavior.
- V2 work-detail routes under `/p/[slug]/works/[workId]`.

## Phase E Local Preflight (2026-06-03)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 anonymous public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.
- Hosted V2 lifecycle Playwright smoke: 1 skipped because hosted env was not configured.

Additional verification:

- Added hosted lifecycle smoke spec at `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`.
- Added Studio V2 publish-readiness branch so valid V2 drafts are not blocked by legacy GGM readiness requirements.
- Added readiness regression: a valid V2 draft is not blocked by missing legacy `artwork_field`, primary image, primary CTA, or enquiry routing.
- Confirmed hosted V2 feature gating conventions and rollback path.
- Confirmed no hosted smoke env keys or V2 pilot room ID are configured in repo env files.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.
- Running V2 public and draft-preview Playwright specs in parallel can hit the known mock API port/global-state contention; sequential runs pass.

Still not verified:

- Hosted V2 editor lifecycle.
- Hosted owner preview lifecycle.
- Hosted real publish.
- Hosted anonymous public V2 render after publish.
- Hosted cleanup/restoration.

Phase E hosted smoke remains blocked until the required hosted env variables and pilot room ID are supplied.

## Phase E Hosted Attempt (2026-06-03)

Hosted env supplied and used:

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=https://your-presence.vercel.app
PRESENCE_E2E_API_URL=https://anu-back-end.vercel.app
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=11
```

Local preflight rerun before hosted attempt:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- `node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts`: 14 passed.
- `node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts`: 5 passed.
- `node --experimental-strip-types --test lib\presence\render\resolver.test.ts`: 8 passed.
- `node --experimental-strip-types --test lib\editor\readiness.test.ts`: 5 passed.
- `npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium`: 3 passed.
- `npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1`: 2 passed.
- `npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium`: 2 passed.

Hosted room verification:

- Room `11` is `ggm-christina-goddard`.
- Display name is `Christina Kerkvliet Goddard`.
- Published renderer is `ggm-faithful-room-v1`.
- No draft config exists.
- `presence-studio-v2-root` did not render.
- Safe verification had no page errors and no console errors.

Read-only owner room scan:

- 28 owner rooms inspected.
- No room had `presence-studio-v2-room` as node, draft, or published renderer.
- Hosted TemplateKit drafts use `studio-room-template-kit-v1`, not Studio V2.

Hosted lifecycle command:

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

- 1 failed.
- Failure step: `open V2 owner editor`.
- Failure reason: `getByTestId('presence-studio-v2-root')` was not found.

Evidence:

```txt
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium-retry1/error-context.md
```

No hosted content was changed:

- no object added
- no draft saved
- no publish attempted
- no public content changed
- no cleanup required

Current hosted blocker:

- A real hosted Studio V2 pilot room is not available for this owner account, or hosted feature flags/pilot IDs are not configured to expose one.

---

## 2026-05-31 — Hosted Smoke Link

Local QA continues to pass (47/47 tests). However, the **hosted smoke is blocked** because the deployed production build does not contain `NEXT_PUBLIC_PRESENCE_STUDIO_V2`.

Local tests are green. Deployment is the blocker.

See: `docs/program/evidence/PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_AUDIT.md`


---

## 2026-05-31 — Hosted Smoke Update

Local tests: 47/47 continue to pass.

Deployed status after second redeploy:
- Public render: ✅ V2 working for Room 11
- Editor: ❌ Blocked (needs NEXT_PUBLIC_* env vars)

See: `docs/program/evidence/PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_AUDIT.md`



---

## 2026-06-03 — Final Verification

### Local Test Status

All local tests continue to pass after the `feature.ts` fix:

- `feature.test.ts` — 8/8 pass
- `studioV2Adapters.test.ts` — 14/14 pass
- `publicPayload.test.ts` — 5/5 pass
- `resolver.test.ts` — 8/8 pass
- `readiness.test.ts` — 5/5 pass
- Additional suites — 183/183 pass total

### Hosted Smoke Status

- ✅ Stage 1 fast gate passed
- ✅ Stage 2 full lifecycle smoke passed (17.7s)
- ✅ Payload hygiene clean (0 violations)
- ✅ Cleanup/restoration automatic via test `finally`

### Verdict

Local QA and hosted smoke both **PASS**.

---

## 2026-06-04 - Visual Parity Pass Verification

Scope:

- Production visual parity pass for Studio V2 public renderer and owner cockpit.
- No routing, auth, save/reload, preview, publish, adapter, backend, or feature-gating changes.
- Hosted Room 11 smoke was not rerun because these changes are local and not deployed.

Commands run:

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

- TypeScript: passed.
- Production build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.

Visual evidence:

```txt
docs/program/evidence/presence-studio-v2-visual-parity/local-room-101-v2-editor-selected-object.png
docs/program/evidence/presence-studio-v2-visual-parity/local-v2-public-gallery-threshold-desktop.png
docs/program/evidence/presence-studio-v2-visual-parity/local-v2-public-gallery-chamber-objects.png
docs/program/evidence/presence-studio-v2-visual-parity/local-v2-public-gallery-mobile.png
docs/program/evidence/presence-studio-v2-visual-parity/local-v2-owner-draft-preview.png
docs/program/evidence/presence-studio-v2-visual-parity/local-legacy-public-regression-comparison.png
```

Evidence capture note:

- `PRESENCE_VISUAL_CAPTURE=1 npx.cmd playwright test presence-studio-v2-visual-parity-capture.spec.ts --project=chromium --workers=1` completed the capture test body and wrote screenshots.
- The wrapper timed out during teardown rather than returning a clean Playwright summary. The ordinary product smoke specs exit cleanly.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

Verified:

- Public V2 renderer still receives sanitized `studioV2Room`.
- Public V2 route still shows no editor chrome.
- Draft preview still renders the sanitized public V2 room.
- Public payload hygiene remains clean.
- Mobile-muted public objects remain hidden on narrow public viewport.
- Legacy public room still uses the existing renderer when Studio V2 payload is absent.
- Visual layer remains scoped under `.presence-studio-v2-public` and `.presence-studio-v2`.

---

## 2026-06-04 - P1 Visual Polish and Test Maintenance Verification

Scope:

- Hosted lifecycle selector maintenance after visual parity CSS changed the editor surface.
- Public V2 CSS consolidation.
- Gallery museum-frame treatment.
- World-specific public object grids for gallery, zine, and DJ.
- No routing, auth, save/reload, preview, publish, adapter, backend, or feature-gating changes.

Commands run:

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

- TypeScript: passed.
- Production build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.

Notes:

- The first local parallel Playwright attempt hit `EADDRINUSE` because multiple specs tried to start the same mock API server. The affected specs passed when rerun sequentially.
- The local visual capture spec wrote screenshots but the wrapper command timed out during teardown after the passing test body.
- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Next build/Playwright still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

Hosted lifecycle:

- Attempted after selector maintenance.
- Timed out before edit/save/publish because the currently deployed hosted build does not yet contain the new test IDs.
- No smoke marker appeared in the post-timeout public HTML check.
- A fresh full hosted lifecycle pass requires deployment of this P1 patch.

Evidence:

```txt
docs/program/evidence/presence-studio-v2-p1-visual-polish/
PRESENCE_STUDIO_V2_P1_VISUAL_POLISH_AND_TEST_REPORT.md
```

---

## 2026-06-04 - Studio Recovery S1 Verification

Scope:

- Recovered prototype-grade Studio V2 editor information architecture.
- Added top chrome, left outline/assets rail, center stage shell, persistent right inspector, surface tabs, and chamber navigation tabs.
- No routing, auth, save/reload, preview, publish, adapter, backend, payload, or feature-gating changes.
- S2 direct manipulation was intentionally not implemented.

Commands run:

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
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Results:

- TypeScript: passed.
- Production build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.
- Hosted lifecycle spec: 1 skipped because `PRESENCE_HOSTED_SMOKE` was not set.

Evidence capture:

```powershell
$env:PRESENCE_STUDIO_RECOVERY_S1_CAPTURE="1"
npx.cmd playwright test tests/e2e/presence-studio-v2-studio-recovery-s1-capture.spec.ts --project=chromium --workers=1
```

The S1 capture test body passed and wrote screenshots, but the wrapper command timed out during Playwright web-server teardown after the passing test body.

Evidence path:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s1/
```

Warnings:

- A first parallel Playwright attempt hit `EADDRINUSE` on the shared mock API port. The affected specs passed when rerun sequentially.
- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

Verified:

- Studio V2 editor root still mounts locally when V2 feature gating applies.
- Left outline selects objects and chamber tabs scroll the stage.
- Persistent right inspector edits existing state fields.
- Existing object title/meta/detail/link/image test IDs remain present in the inspector.
- Skin Lab, Add, Moodboard, World switcher entry points remain reachable.
- Public V2 rendering remains sanitized.
- Draft preview remains sanitized.
- Payload hygiene remains clean.
- Legacy public room still uses the existing renderer when Studio V2 payload is absent.

Hosted note:

- Real hosted smoke was not rerun because the S1 patch is local and not deployed. Running the hosted lifecycle against the current hosted deployment would not validate this editor recovery pass.

---

## 2026-06-05 - S1 Hosted Deployment Gate

Pre-deploy local gate rerun:

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
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.

Adjustment:

- `presence-studio-v2-draft-preview.spec.ts` now filters local sandbox external-resource DNS noise in the legacy fallback test. This avoids failing a passing local legacy render because external non-app resources cannot resolve in the sandbox.

Hosted deployment:

```txt
Production URL: https://your-presence.vercel.app
Deployment URL: https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC
```

Hosted verification:

- Read-only S1 hosted smoke passed.
- Full hosted lifecycle smoke passed: `1 passed (19.7s)`.
- Hosted payload hygiene scan passed with `0` violations.
- Room 1 legacy negative remained legacy.
- Smoke cleanup/restoration completed; no public smoke marker remained.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
```

Known notes:

- Vercel deploy reported existing `npm audit` findings: 2 moderate and 1 high vulnerability. They were not addressed in this S1 smoke pass.
- Deployment was made from a dirty local working tree. Baseline commit `7a27ec30abebf871f13ccda3830378542f16115d` now records the S1 product code, tests, reports, smoke scripts, and safe evidence in Git.


---

## 2026-06-04 - Dependency Patch Verification

Scope: Targeted dependency patch after S1 baseline. No product code changes.

Commands run:

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

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.

Packages changed:

- `next`: 16.2.4 -> 16.2.7 (high severity patch)
- `@supabase/supabase-js`: 2.105.3 -> 2.107.0 (removes vulnerable ws transitive dep)

Audit after patch:

- High severity: 0 (was 1)
- Moderate severity: 2 (postcss via Next internal bundle; deferred until Next release)
- ws vulnerability: resolved

Warnings:

- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit Turbopack workspace-root warning.
- Hosted smoke not run — env vars not available in execution context. Recommended before S2 begins.

See full report: `PRESENCE_STUDIO_V2_DEPENDENCY_PATCH_REPORT.md`

---

## 2026-06-05 - Studio Recovery S2 Local QA

Scope: Direct manipulation and object handles for Studio V2. No backend contracts, auth, save/reload, preview, publish, public payload, or feature-gating logic changed.

Commands run:

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
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium --workers=1
```

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.
- S2 direct manipulation Playwright smoke: 2 passed.

S2 interaction coverage:

- selected-object frame renders
- Guided Mode disables handles/drag
- Wild Mode drag updates x/y
- resize handle updates scale
- rotate handle updates rotation
- Motion tab stays synced
- Save Draft persists transforms through the owner draft API mock path
- reload restores saved transform values
- locked objects remain fixed and visibly disabled

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S2_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s2/
```

Capture note:

- `PRESENCE_STUDIO_RECOVERY_S2_CAPTURE=1 npx.cmd playwright test tests/e2e/presence-studio-v2-studio-recovery-s2-capture.spec.ts --project=chromium --workers=1` wrote the S2 screenshots and the test body passed, but the shell command hit the local timeout during Playwright teardown. The screenshots are present and usable.

Warnings:

- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning.
- Hosted S2 smoke was not run because S2 has not been deployed in this pass.

---

## 2026-06-06 - S2 Release Baseline Local QA

Scope: Release-baseline verification after hosted S2 passed on Room 11. No product behavior changed in this pass.

Commands run:

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
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test tests\e2e\presence-studio-v2-hosted-manipulation.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.
- S2 direct manipulation Playwright smoke: 2 passed.
- Hosted S2 manipulation audit spec: 1 skipped without `PRESENCE_HOSTED_SMOKE=1`.

Warnings:

- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning.

Hosted S2 verification:

```txt
PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
```

---

## 2026-06-06 - Studio Recovery S3 Local QA

Scope: Inspector depth, device frame chrome, mid-width/narrow editor usability, and client confidence language. No backend contracts, public payload shape, feature gating, auth, save/reload, preview, or publish flow changed.

Commands run:

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
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright smoke: 3 passed.
- V2 draft preview Playwright smoke: 2 passed.
- Public payload hygiene Playwright smoke: 2 passed.
- S2 direct manipulation Playwright smoke: 2 passed.
- S3 inspector usability Playwright smoke: 4 passed.

S3 coverage:

- inspector image preview and empty state
- object link status
- public/mobile visibility language
- Style state badges, lock/pin controls, layer clarity, delete confirmation
- Motion x/y steppers, scale slider, rotation slider
- desktop/mobile device frame labels
- mid-width and narrow Outline/Inspector controls
- preview/publish confidence copy
- public render remains free of editor state
- S2 direct manipulation still passes

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s3/
```

Notes:

- An initial parallel Playwright invocation produced `EADDRINUSE` on mock API port `5105`; rerunning the browser specs sequentially passed.
- `PRESENCE_STUDIO_RECOVERY_S3_CAPTURE=1 npx.cmd playwright test presence-studio-v2-studio-recovery-s3-capture.spec.ts --project=chromium` wrote the S3 screenshots and the test body passed, but the shell command timed out during Playwright teardown. The screenshots are present.
- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning.
- Hosted S3 smoke was not run because S3 has not been deployed in this pass.

---

## 2026-06-06 - Studio Recovery S3 Pre-Deploy and Hosted QA

Scope: Final pre-deploy local gates, production deployment, hosted S3 smoke, full hosted lifecycle smoke, and payload hygiene.

Pre-deploy commands passed:

```powershell
git status
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
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.
- S2 direct manipulation Playwright: 2 passed.
- S3 inspector usability Playwright: 4 passed.

Deployment:

```txt
Production alias: https://your-presence.vercel.app
Deployment URL: https://presence-c9s85tb7s-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df
Deploy commit: 0ab808ab15f63dc78b53486b73fb8039522f1341
```

Hosted commands passed:

```powershell
npx.cmd playwright test tests\e2e\presence-studio-v2-hosted-s3-smoke.spec.ts --project=chromium --workers=1
npx.cmd playwright test tests\e2e\presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
node scripts\hosted-payload-hygiene.mjs
```

Hosted results:

- S3 hosted smoke: 1 passed in 18.8s.
- Full hosted lifecycle smoke: 1 passed in 22.6s.
- Standalone hosted payload hygiene: `TOTAL_VIOLATIONS: 0`.
- Room 1 legacy negative remained legacy.
- Cleanup/restoration completed.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/
```

Warnings:

- Initial `vercel --prod` failed because `vercel` was not on PATH; deployment succeeded through `npx vercel@latest --prod`.
- The first hosted S3 smoke run was blocked by sandbox network access before sign-in; no hosted data was touched.
- A subsequent hosted S3 smoke attempt failed before save due a test-only range step mismatch; no draft save occurred.
- A later hosted S3 smoke attempt failed during cleanup-selection before save; no draft save occurred.
- Final hosted S3 smoke passed with restoration complete.
- Existing Node/Next warnings remain unchanged.

Baseline note:

- S3 release-baseline QA was rerun after hosted verification with the same local command set.
- All required local gates passed before commit.
- See `PRESENCE_STUDIO_V2_S3_RELEASE_BASELINE_REPORT.md`.

---

## 2026-06-06 - Public Output Recovery P1 Gallery/GGM

Scope: Local public-renderer quality recovery for Gallery/GGM output only. No deploy. No hosted data mutation. No editor/backend/feature-gate changes.

Preflight:

- `git status` showed uncommitted S4A chamber-management work.
- S4A was parked before editing with:

```powershell
git stash push -u -m "park S4A chamber management safety-audited local work"
```

Commands passed:

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
npx.cmd playwright test presence-public-output-gallery-quality.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.
- New Gallery public-output quality Playwright: 3 passed.

Verified:

- Gallery public output uses a full-viewport image-led threshold.
- Gallery chamber output no longer uses object-count pseudo text.
- Gallery desktop object layout uses an exhibition-path grid rather than a two-column card wall.
- Gallery object type/system labels are not visibly announced.
- Gallery image treatment uses sharp museum framing and `object-fit: contain`.
- Gallery mobile threshold remains a designed entry state.
- Mobile-muted public objects remain hidden on narrow public viewports.
- Owner draft preview remains V2-backed and clean.
- Public payload hygiene remains clean.
- Legacy public room remains outside the V2 public renderer.

Evidence:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_REPORT.md
docs/program/evidence/presence-public-output-recovery-p1/
```

Notes:

- The expected Kimi audit path was not present on the clean S3 baseline, so `docs/program/presence-studio-v2-public-output-quality/PRESENCE_PUBLIC_ROOM_OUTPUT_QUALITY_AUDIT.md` was recreated with the supplied audit finding and P1 status.
- The P1 capture spec reported `ok` and wrote screenshots, but the shell wrapper timed out during Playwright web-server teardown. This matches prior capture-spec teardown behavior; evidence files are present.
- Direct Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning.

---

## Public Output Recovery P2 Local QA - 2026-06-07

Scope: Gallery/GGM public-output art-direction polish.

Results:

- TypeScript: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.
- Gallery public-output quality Playwright: 3 passed.
- New Gallery public-output polish Playwright: 3 passed.

Verified:

- Gallery threshold-to-chamber transition band exists.
- Threshold CTA remains accessible but no longer reads as a filled pill.
- Gallery wayfinding no longer exposes visible numeric index labels.
- Chamber labels are placard-sized, not page-heading scale.
- Artwork copy reads as a wall label.
- Lightweight artwork focus/lightbox opens and closes on desktop and mobile.
- Mobile Gallery output remains usable.
- Owner draft preview remains V2-backed and clean.
- Public payload hygiene remains clean.
- Legacy public room remains outside the V2 public renderer.
- S4A Chamber Management remains parked in `stash@{0}` and absent from the working tree.

Evidence:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_REPORT.md
docs/program/evidence/presence-public-output-recovery-p2/
```

Notes:

- The P2 capture spec reported `ok` and wrote screenshots, but the shell wrapper timed out during Playwright web-server teardown. Evidence files are present.
- Superseded on 2026-06-08 by deployed/hosted-smoked P2 verification below.

## P2 Art-Direction Audit — 2026-06-08

**Auditor:** Kimi Code CLI
**Score:** **8.3/10** (up from P1: 7.6/10)
**Verdict:** **PASS — deploy to hosted smoke**

Full audit:
`PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_ART_DIRECTION_AUDIT.md`

Deploy thresholds met:
- Overall ≥ 8.3/10 ✅
- Threshold ≥ 8.0/10 ✅
- Gallery/chamber ≥ 8.0/10 ✅
- Mobile ≥ 7.5/10 ✅
- Payload hygiene passes ✅
- No editor/system leakage ✅
- No S4A leakage ✅
- Legacy rooms unaffected ✅

Post-deploy actions:
1. Run hosted smoke for public render, owner preview, legacy negative, payload hygiene.
2. Fix lightbox backdrop opacity (minor visual bleed-through defect).
3. Consider prev/next lightbox navigation for P3.

---

## P1 Deployment — 2026-06-07

**Deployed to production via `npx vercel --prod`.**

- Production URL: `https://your-presence.vercel.app`
- Deployment ID: `2a88iBaAgYm1v1QUPqeiLZjCUdfJ`
- Build: 29 static pages, 0 errors
- S4A: Parked in `stash@{0}` — not deployed

Hosted smoke completed. All public-output checks passed:
- Threshold height: 950px ✅
- 12-column grid: confirmed ✅
- Museum-frame images: `contain`, `border-radius: 0` ✅
- Role labels: `display: none` ✅
- Mobile: functional ✅
- Payload hygiene: 0 violations ✅

Full hosted smoke report:
`docs/program/evidence/presence-public-output-recovery-p1-hosted/PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_HOSTED_SMOKE.md`


## P1 Hosted Verification Completed — 2026-06-07

All skipped checks from initial deployment now closed:

- **Owner preview:** ✅ Tested with live credentials. Draft preview banner renders. Threshold visible. No editor chrome leaks.
- **Studio regression:** ✅ Tested with live credentials. V2 editor mounts. S1/S2/S3 features present. One non-blocking 404 from auxiliary resource.
- **Legacy negative:** ✅ Tested room `hesmaddw`. Confirmed legacy renderer. No V2 public renderer, no Gallery CSS, no threshold leakage.
- **Full hosted lifecycle:** ✅ `presence-studio-v2-hosted-lifecycle.spec.ts` passed in 18.5s. Edit/save/reload/preview/publish/public/hygiene/cleanup all verified.
- **Payload hygiene post-lifecycle:** ✅ 0 violations.

**Evidence:** 14 screenshots in `docs/program/evidence/presence-public-output-recovery-p1-hosted/`

**Baseline status:** LOCKED. P1 is deployed, hosted-verified, and ready for controlled operator-led pilot.

## Public Output Recovery P2 Pre-Deploy And Hosted QA - 2026-06-08

Scope: Deploy Public Output Recovery P2, verify hosted Gallery/GGM public output, owner preview, Studio regression, payload hygiene, legacy isolation, and full hosted lifecycle. S4A remained parked in `stash@{0}`.

Preflight:

- `git status`: clean before hosted smoke artifacts were added.
- `git stash list`: `stash@{0}` remained `park S4A chamber management safety-audited local work`.
- `git diff --stat`: empty at preflight.
- No env files, credentials, auth state, or local credential artifacts were staged.

Local pre-deploy commands passed:

```txt
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
npx.cmd playwright test presence-public-output-gallery-quality.spec.ts --project=chromium
npx.cmd playwright test presence-public-output-gallery-polish.spec.ts --project=chromium
```

Deployment:

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
- Commit: `f9673c80cb163c3007b8deedeedcc29d2848e9ee`
- `vercel --prod` was unavailable on PATH; deployment completed with `npx vercel@latest --prod`.

Hosted commands passed:

```txt
npx.cmd playwright test presence-public-output-recovery-p2-hosted.spec.ts --project=chromium --workers=1
node scripts\hosted-payload-hygiene.mjs
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
node scripts\hosted-payload-hygiene.mjs
```

Hosted results:

- P2 hosted smoke: warmed rerun `1 passed (40.6s)`.
- Owner preview: ready.
- Studio regression: ready.
- Legacy negative: ready at `https://your-presence.vercel.app/p/hesmaddw`.
- Hosted payload hygiene: `TOTAL_VIOLATIONS: 0` pre-lifecycle and post-lifecycle.
- Full hosted lifecycle: `1 passed (48.7s)`.
- Cleanup/restoration completed; public marker scan found no lifecycle smoke residue.

Evidence:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_HOSTED_SMOKE.md
docs/program/evidence/presence-public-output-recovery-p2-hosted/
```

Hosted caveat:

- Hosted Room 11 currently includes a prior blue `Harmless V1B Test / Hosted Smoke Image` asset. Renderer/deployment QA is clean, but final client-facing Gallery/GGM evidence should follow a separate controlled content/media correction pass.

Verdict:

- Gallery/GGM P2 public output: ready at renderer/deployment level, with hosted media-content caveat.
- Owner preview: ready.
- Studio regression: ready.
- Legacy isolation: ready.
- Hosted lifecycle: ready.
- Controlled operator-led pilot: ready with operator support.
- Public self-serve onboarding: not ready.

## Public Output Recovery P2 Release Baseline Lock - 2026-06-08

Purpose: represent the hosted-verified P2 renderer baseline in Git without changing hosted content.

Baseline commit:

```txt
4bbfce9dcbbd884dc9780391fcec353186dd7b24
```

Release report:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_RELEASE_BASELINE_REPORT.md
```

QA status:

- Local QA rerun passed.
- Secret hygiene passed.
- No credentials, env files, auth state, storage state, traces, or local logs were committed.
- S4A remains parked in `stash@{0}`.
- Hosted Room 11 content/media was not mutated.

Controlled content/media correction can begin after this baseline is pushed and reviewed.


---

## Room 11 Content/Media Correction — 2026-06-08

**Status:** COMPLETE

The hosted Room 11 content/media correction pass ran as a controlled data-only operation after the P2 renderer baseline was locked.

Full report:
`PRESENCE_ROOM_11_CONTENT_MEDIA_CORRECTION_REPORT.md`

What changed:
- Replaced the prior blue smoke-test threshold image (`783471c01a894f9ebddd039f83d4ac68.png`) with the existing clean artwork `/ggm/works/willow-of-port-arthur-2019.webp`.
- Updated Object 0 (`hero-image`) in the V2 content config.
- Saved draft, verified reload, published.

Verification:
- Public `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` no longer contain the bad asset URL or test text.
- Payload hygiene scan: `TOTAL_VIOLATIONS: 0`.
- Legacy room `hesmaddw` remains on legacy renderer.
- Studio V2 editor still mounts at `/studio/11/editor`.
- Owner preview renders corrected P2 output.

Evidence captured:
`docs/program/evidence/presence-room-11-content-media-correction/`

Constraints respected:
- No renderer code changed.
- No Studio code changed.
- S4A remained parked in `stash@{0}`.
- No backend contracts changed.
- Credentials supplied via env vars only; not written to files.

The P2 Gallery/GGM public output is now client-facing clean.

## Studio Recovery S5 Asset / Media Library Foundations - 2026-06-08

Scope: Editor-only derived asset/media foundations for Studio V2. No upload/crop/storage, no backend contract changes, no public payload shape changes, no hosted data mutation, no deploy.

Implemented:

- Derived asset registry from current Studio V2 room objects.
- Room Assets panel in the left rail.
- Asset card thumbnails, status badges, usage mapping, and used-in navigation.
- Asset detail state in the persistent inspector.
- Replace image URL flow through existing `object.image.src`.
- Advisory validation for missing URLs, broken/unloaded thumbnails, duplicate URLs, possible smoke/test assets, external URLs, and local/public asset paths.
- Room-level media health checklist.
- Editor-only warnings; owner preview/public render remain clean.

Files changed:

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `lib/presence/studio-v2/assets.ts`
- `lib/presence/studio-v2/index.ts`
- `tests/e2e/presence-studio-v2-asset-library.spec.ts`
- `docs/program/evidence/presence-studio-v2-asset-library-s5/`
- `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_REPORT.md`

Model/adapter status:

- No model fields changed.
- No adapter behavior changed.
- Public projection unchanged.

Required QA passed:

```txt
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
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-asset-library.spec.ts --project=chromium
```

Evidence:

```txt
docs/program/evidence/presence-studio-v2-asset-library-s5/
PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_REPORT.md
```

## Studio Recovery S5 Asset / Media Library Foundations — 2026-06-08

Audit:

`PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_AUDIT.md` — CONDITIONAL PASS

- 14 Playwright regression tests passed (50.6s).
- 40 Node unit tests passed.
- TypeScript + build passed.
- Payload hygiene passes. No leakage to public/preview.
- P1 fix before next refactor: add `lib/presence/studio-v2/assets.test.ts`.

Verdict:

- Safe for Kimi audit.
- Safe to deploy after audit if no hosted data mutation is bundled.
- S4A remains parked in `stash@{0}`.

## Studio Recovery S6A Public Style Presets — 2026-06-09

Audit:

`PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_AUDIT.md` — PASS

- 21 Playwright regression tests passed (63.0s).
- 50 Node unit tests passed.
- TypeScript + build passed.
- Payload hygiene passes. No leakage to public/preview.
- S5 P1 fix completed: `lib/presence/studio-v2/assets.test.ts` added (8 tests, 378 lines).
- Christina renderer is data-driven and reusable; no hardcoded content.
- Gallery P2 preserved as default and fallback.

Verdict:

- Safe to deploy to hosted smoke.
- S4A remains parked in `stash@{0}`.
- Public self-serve onboarding remains out of scope.

## Studio Recovery S5 Asset / Media Library P1 Unit-Test Closure - 2026-06-08

Scope: Close the Kimi P1 gap before hosted deployment by adding deterministic unit coverage for S5 asset/media safety logic. No deploy. No hosted data mutation.

Tests added:

- `lib/presence/studio-v2/assets.test.ts`

Edge cases covered:

- Registry derivation from Studio V2 object media only.
- Object ID, title, type, chamber ID, and chamber label mapping.
- Duplicate URL detection and repeated usage counts.
- Public/mobile visibility counts.
- Empty room and no-media safe registry output.
- URL validation for empty, local/public, external, unsupported protocol, protocol-relative, trimmed, and relative paths.
- Status derivation for missing, broken/unloaded, duplicate, possible smoke/test asset, external URL, local/public asset, and clean valid artwork.
- Smoke/test terms in URL, title, and alt text: `smoke`, `test`, `harmless`, `hosted-smoke`, `v1b`.
- Safety invariants: no input mutation, no raw editor/private config fields in registry output, malformed image-field tolerance.
- Threshold/hero heuristic: auto-detected from the first public-visible object with a normalized image URL.

Bugs found/fixed:

- Protocol-relative URLs such as `//cdn.example.com/image.webp` were too loosely treated as local/public assets. They are now marked unsupported/broken-unloaded.
- Threshold/hero auto-detection previously used a truthy raw `image.src`; it now uses the normalized URL path so malformed non-string values cannot become threshold media.

Required QA passed:

```txt
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-asset-library.spec.ts --project=chromium
```

Known warnings:

- Node direct TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next/Turbopack still warns about multiple lockfiles and inferred workspace root.

Verdict:

- S5 P1 unit-test gap is closed.
- S5 is clean for hosted deployment, pending normal hosted smoke.
- S4A remains parked in `stash@{0}`.
- No credentials, env files, auth state, or hosted data mutation were introduced in this pass.

## Studio Recovery S5 Hosted Smoke - 2026-06-09

Scope: Deploy and hosted-smoke S5 Asset / Media Library Foundations on production. Verify hosted Studio editor, owner preview, public output, payload hygiene, legacy isolation, and lifecycle cleanup.

Deployment:

```txt
Production alias: https://your-presence.vercel.app
Deployment URL: https://presence-c9nmbuzw5-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_2w6Lyj9UfKiyj6PFUdokG12t3Mni
Base local commit: 04886d37c0e4d05fcf81a673ef8d6f38b680a8f5
```

Note: Vercel inspect did not report a Git source commit. Deployment was run from the local S5 working tree on top of the base commit above.

Hosted smoke:

- Hosted S5 editor smoke: PASS, `1 passed (17.1s)` with retries disabled.
- Room Assets panel: PASS.
- Asset cards/detail/used-in mapping: PASS.
- Media health checklist: PASS.
- Replace URL flow visible and honest; no upload/crop/storage capability implied.
- Corrected Room 11 content: no possible smoke/test asset warning observed.
- Owner preview: PASS, no S5/editor leakage.
- Public `/p/ggm-christina-goddard`: PASS, P2 output clean and lightbox/focus works.
- Public `/presence/ggm-christina-goddard`: PASS.
- Mobile public output: PASS.
- Legacy negative `/p/hesmaddw`: PASS.
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0` pre-lifecycle and post-lifecycle.
- Full hosted lifecycle: PASS, `1 passed (20.8s)`, cleanup/restoration complete.

Evidence:

```txt
PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-asset-library-s5-hosted/
```

Guardrails:

- S4A remains parked in `stash@{0}`.
- No S4A chamber-management code found in app/components/lib/tests.
- No hosted content replacement was performed during the S5 asset panel smoke.
- Lifecycle mutation was controlled and restored.
- Exact credential scan returned no hits.
- No env files, credentials, auth state, traces, HARs, or logs are staged.

Verdict:

- Hosted S5 editor readiness: ready for operator-led pilots.
- Hosted owner preview readiness: ready.
- Hosted public output readiness: ready.
- Hosted payload hygiene readiness: ready.
- Hosted lifecycle readiness: ready.
- Controlled operator-led pilot readiness: ready with operator support.
- Public self-serve onboarding readiness: not ready.
- S5 baseline can be locked after review.

## Studio Recovery S6A Public Style Presets - 2026-06-09

Scope: Add selectable public-output style presets to Studio V2 and implement the Christina / Liquid Gallery archetype as a data-driven public renderer branch. Local only. No deploy. No hosted data mutation.

Verified:

- S5 baseline was already locked on branch head before S6A work began.
- S4A remained parked in `stash@{0}`.
- Public style preset field round-trips through `style_dna.studio_v2.publicStylePreset`.
- Invalid/absent style preset falls back to `gallery-p2`.
- Studio room inspector shows the public style selector with Gallery P2 and Christina / Liquid Gallery options.
- Selecting Christina marks the draft dirty, saves, reloads, and persists in the mock owner flow.
- Owner preview renders the Christina Liquid Gallery branch.
- Mock public publish path renders the Christina Liquid Gallery branch after publish.
- Switching back to Gallery P2 restores the existing P2 public renderer.
- Gallery P2 public-output quality and polish specs still pass.
- S5 Room Assets, S2 direct manipulation, and S3 inspector usability still pass.
- Public payload hygiene remains clean.
- Legacy public route remains outside the V2 renderer.

Required QA passed:

```txt
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-asset-library.spec.ts --project=chromium
npx.cmd playwright test presence-public-output-gallery-quality.spec.ts --project=chromium
npx.cmd playwright test presence-public-output-gallery-polish.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-public-style-presets.spec.ts --project=chromium
```

Evidence:

```txt
docs/program/evidence/presence-studio-v2-public-style-presets-s6a/
PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_REPORT.md
```

Known warnings:

- Node direct TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next/Turbopack still warns about multiple lockfiles and inferred workspace root.
- `presence-public-payload-hygiene.spec.ts` initially hit a Chromium browser-launch timeout; the same spec passed on rerun with no payload assertion failures.

Verdict:

- S6A is safe for Kimi design/QA audit.
- S6A is safe to deploy after audit if the audit passes.
- Public self-serve onboarding remains out of scope.
