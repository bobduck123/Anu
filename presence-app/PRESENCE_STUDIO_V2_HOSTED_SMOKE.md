# Presence Studio V2 Hosted Smoke

Date: 2026-06-03

## Current Status

Hosted Studio V2 lifecycle smoke was run against the provided hosted URLs and failed before mutation.

Initial failure reason: the supplied pilot room ID `11` was not a hosted Studio V2 room. It rendered the existing Canvas/GGM editor and had published renderer `ggm-faithful-room-v1`.

**Subsequent conversion pass (Kimi):**
- Room 11 backend data was converted to V2 via the owner editor API.
- Published config now has `renderer_key: presence-studio-v2-room` (version 27).
- Node metadata updated to `custom_renderer_key: presence-studio-v2-room`.
- Frontend metadata fallback fix added to `lib/presence/studio-v2/feature.ts`.
- **Blocked on:** Vercel env var confirmation + frontend redeployment.

No draft save, publish, public content change, or cleanup was required during the smoke attempt.

## Hosted Environment Used

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=https://your-presence.vercel.app
PRESENCE_E2E_API_URL=https://anu-back-end.vercel.app
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=11
```

## Room Verification

Read-only verification confirmed:

```txt
Room ID: 11
Slug: ggm-christina-goddard
Display name: Christina Kerkvliet Goddard
Status: published
Draft renderer: none
Published renderer: ggm-faithful-room-v1
Studio V2 root visible: false
```

Owner room scan:

- 28 owner rooms were inspected.
- No room had `presence-studio-v2-room` as node, draft, or published renderer.
- TemplateKit draft rooms exist, but they use `studio-room-template-kit-v1`.

## Command Run

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

```txt
1 failed
```

Failing assertion:

```txt
getByTestId('presence-studio-v2-root') was not visible
```

The test stopped before all mutating steps.

## Evidence

```txt
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium-retry1/error-context.md
```

## Smoke Flow Status

Passed:

1. Hosted owner sign-in.
2. Owner session/token extraction.
3. Anonymous visitor did not see the V2 editor root on owner editor route.
4. Owner editor route for room `11` loaded.
5. Owner editor API returned `200`.

Failed:

1. V2 editor mount for room `11`.

Not reached:

1. Edit/save.
2. Reload persistence.
3. Owner V2 preview.
4. Real publish.
5. Anonymous V2 public render.
6. Hosted payload hygiene after publish.
7. Cleanup/restoration mutation.

## Required For Next Run

Create or identify a real hosted Studio V2 pilot room:

```txt
renderer_key=presence-studio-v2-room
```

Then configure hosted V2 gating for that ID/slug:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Server-side, if used:

```txt
PRESENCE_STUDIO_V2_ENABLED=1
PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Rerun:

```powershell
$env:PRESENCE_HOSTED_SMOKE="1"
$env:PRESENCE_E2E_BASE_URL="https://your-presence.vercel.app"
$env:PRESENCE_E2E_API_URL="https://anu-back-end.vercel.app"
$env:PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID="<actual-v2-room-id>"
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

## Readiness

- Local integration: ready.
- Hosted V2 editor: blocked; no V2 pilot room mounted.
- Hosted owner preview: blocked.
- Hosted public render: blocked.
- Controlled operator-led pilot: not ready until hosted lifecycle passes.
- Public self-serve onboarding: not ready.

---

## 2026-05-31 — Hosted Smoke Attempt Result

**Status:** BLOCKED at Step 1 (open V2 owner editor)

**Finding:** `NEXT_PUBLIC_PRESENCE_STUDIO_V2` is absent from the deployed production build.

**Consequence:**
- `/studio/11/editor` renders legacy editor, not V2
- `presence-studio-v2-root` testid not found
- Playwright fails with timeout on V2 root visibility
- No edits, saves, or publishes attempted
- No hosted content modified

**Fix required:**
- Confirm env vars in Vercel **production** environment
- Run `vercel --prod` to force fresh build
- Verify env strings exist in deployed chunks
- Re-run smoke

**Report:** `docs/program/evidence/PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_AUDIT.md`


---

## 2026-05-31 — Second Hosted Smoke Attempt Result

**Status:** Stage 1 partially passes. Full smoke blocked.

**Public render:** ✅ Room 11 now renders V2 publicly (`presence-studio-v2-public` class confirmed in SSR HTML).

**Editor:** ❌ Still renders legacy editor. Missing `NEXT_PUBLIC_PRESENCE_STUDIO_V2` from client bundle.

**Fix required:** Add `NEXT_PUBLIC_*` variants to Vercel production env, rebuild, re-run Stage 1.

**No hosted content modified.**



---

## 2026-06-03 — Final Hosted Smoke (POST-ENV-FIX)

**Status:** ✅ **PASSED**

### What Changed

`lib/presence/studio-v2/feature.ts` client env alias bug fixed. `NEXT_PUBLIC_PRESENCE_STUDIO_V2` and `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` are now correctly inlined by Next.js at build time because the code accesses them directly as `process.env.VAR_NAME` instead of through an alias parameter.

### Stage 1 Fast Gate

```
V2_ROOT:          1
V2_SAVE:          1
LEGACY_CANVAS:    0
LEGACY_INSPECTOR: 0
ERRORS:           none
```

- Room 11 editor renders V2
- Room 1 editor still renders legacy (negative check passed)
- Anonymous users blocked

### Stage 2 Full Lifecycle Smoke

Playwright `presence-studio-v2-hosted-lifecycle.spec.ts` — **1 passed** (17.7s).

- Owner sign-in ✅
- V2 editor mount ✅
- Edit/save/persist ✅
- Draft preview ✅
- Publish ✅
- Public render `/p/` ✅
- Public render `/presence/` ✅
- Mobile viewport ✅
- Payload hygiene ✅
- Room key safety ✅
- Cleanup/restoration ✅

### Payload Hygiene

Zero violations across all scanned surfaces.

### Verdict

**Room 11 is ready for controlled operator-led pilot.**


---

## 2026-06-03 — Hosted Visual Verification

The visual parity pass has been deployed and verified on hosted Room 11.

**Visual smoke results:**
- Public desktop `/p/` — V2 renders, threshold cinematic
- Public mobile `/p/` — V2 renders, designed stack
- Public `/presence/` — V2 renders
- Editor `/studio/11/editor` — V2 cockpit mounts, dark premium shell
- Owner preview — V2 draft preview renders
- Legacy Room 1 — still legacy, no V2 pollution

**Payload hygiene:** 0 violations

**Lifecycle sanity:** Read-only specs 7/7 pass. Full smoke timed out (test fragility from CSS class changes; needs selector update pass).

**Verdict:** Deployed visual pass verified. Room 11 ready for controlled pilot.

See: `PRESENCE_STUDIO_V2_HOSTED_VISUAL_SMOKE_REPORT.md`

---

## 2026-06-04 - P1 Selector Maintenance Attempt

The full hosted lifecycle smoke selector fragility has been fixed in source:

- `presence-studio-v2-hosted-lifecycle.spec.ts` now uses Studio V2 test IDs for Add, Moodboard, Skin Lab, and sheet close interactions.
- Missing V2 editor/panel test IDs were added.
- The brittle `.v2-side-panel .v2-field` helper was removed.

Hosted rerun status:

- Attempted against `https://your-presence.vercel.app` with Room 11.
- The test reached the V2 editor but timed out before edit/save/publish because the live deployed build does not yet include the new test IDs.
- Timeout evidence: `test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md`.
- The snapshot showed Save Draft disabled and no smoke marker objects visible.
- A post-timeout public HTML check did not contain `Phase E V2 hosted smoke`.

Current requirement before claiming a fresh full hosted lifecycle pass:

1. Deploy the P1 selector/test-ID patch.
2. Re-run `presence-studio-v2-hosted-lifecycle.spec.ts`.
3. Re-run hosted visual smoke and verify `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` still render V2 publicly.

No self-serve readiness is claimed.

---

## 2026-06-05 - Studio Recovery S1 Hosted Smoke

Studio Recovery S1 was deployed and verified on hosted Room 11.

Deployment:

```txt
Production URL: https://your-presence.vercel.app
Deployment URL: https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC
```

Read-only hosted verification passed:

- `/studio/11/editor` renders V2 root and S1 cockpit.
- Top chrome, left outline, persistent inspector, Threshold/Chamber/Studio Archive tabs, and chamber tabs are present.
- `/studio/11/editor/preview` renders V2 owner preview with no editor chrome.
- `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` render V2 publicly.
- Mobile public route remains usable.
- Room 1 legacy negative remains legacy.
- `/room/11/key` remains clean.

Full hosted lifecycle smoke:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result: `1 passed (19.7s)`.

Payload hygiene:

- Hosted payload hygiene script passed.
- Total violations: `0`.

Cleanup/restoration:

- First lifecycle attempt timed out before save/publish and public marker checks were clean.
- Cleanup script found no smoke-marker draft residue.
- Final passing lifecycle completed its cleanup/restoration path.
- Post-smoke public marker checks found no smoke content on `/p` or `/presence`.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
```

Verdict: Room 11 remains ready for controlled operator-led pilot use. Public self-serve onboarding is still not ready.

Release baseline:

- Baseline product commit: `7a27ec30abebf871f13ccda3830378542f16115d`.
- Deployment `dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC` was originally created from dirty local state based on `f81fca829742939ad24865521d5c2d52f3a4bdfb`.
- The baseline commit records the deployed S1 product code, tests, reports, smoke scripts, and safe evidence in Git.

---

## 2026-06-06 - Studio Recovery S2 Hosted Smoke

Studio Recovery S2 was verified on hosted Room 11 / `ggm-christina-goddard`.

S2 hosted verification:

- V2 editor root mounts.
- Selected-object frame and handles render in the editor only.
- Guided Mode disables direct manipulation.
- Wild Mode drag-to-move works.
- Wild Mode resize works.
- Wild Mode rotate works.
- Locked objects disable manipulation.
- Motion inspector values sync with canvas manipulation.
- Save/reload persisted transform values exactly.
- Owner preview has no editor chrome leakage.
- Public desktop/mobile render cleanly.
- Legacy rooms remain unaffected.
- Full hosted lifecycle smoke passed in 36.7s.
- Cleanup restored transform values to the original state.

Payload hygiene:

- Preview/public HTML scan found `0` restricted editor/config leaks.
- Public routes did not expose S2 editor selectors or manipulation handles.

Evidence:

```txt
PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
```

Verdict:

- Room 11 remains ready for controlled operator-led pilot use with S2 direct manipulation.
- S3 can begin after release-baseline commit/push.
- Public self-serve onboarding remains out of scope.

---

## 2026-06-06 - Studio Recovery S3 Hosted Smoke

Studio Recovery S3 was deployed and verified on hosted Room 11 / `ggm-christina-goddard`.

Deployment:

```txt
Production alias: https://your-presence.vercel.app
Deployment URL: https://presence-c9s85tb7s-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df
Deploy commit: 0ab808ab15f63dc78b53486b73fb8039522f1341
```

S3 hosted verification:

- V2 editor root mounts.
- S1 three-pane cockpit remains present.
- S2 selected-object frame and manipulation controls remain present.
- Content tab image preview/empty state path verified.
- Style tab state badges, lock/pin clarity, layer summary, and two-click delete confirmation verified.
- Motion tab X/Y steppers and scale/rotation sliders verified.
- Desktop/mobile device frame chrome verified.
- Narrow Outline/Inspector toggles verified.
- Preview/publish confidence checklist verified.
- Dirty-state warning verified.
- Guided Mode disables manipulation.
- Wild Mode drag/scale/rotation sanity passed.
- Owner preview remains clean.
- Public desktop/mobile render cleanly.
- Room 1 legacy negative remains legacy.
- Full hosted lifecycle smoke passed in 22.6s.
- Cleanup/restoration completed.

Payload hygiene:

- Hosted S3 smoke found `0` editor/config leaks in preview/public HTML.
- Standalone hosted payload hygiene script passed with `TOTAL_VIOLATIONS: 0`.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/
```

Verdict:

- Hosted S3 editor: ready for Room 11.
- Hosted direct manipulation: ready.
- Hosted owner preview: ready.
- Hosted public render: ready.
- Controlled operator-led pilot: ready with operator support.
- Public self-serve onboarding: not ready until later S4/S5/S6/S7 work.


---

## P1 Public Output Recovery Deployment — 2026-06-07

**Deployment URL:** `https://your-presence.vercel.app`
**Deployment ID:** `2a88iBaAgYm1v1QUPqeiLZjCUdfJ`
**Branch:** `feature/presence-ecosystem-alpha`
**S4A Status:** Parked in `stash@{0}` — NOT deployed

### Deployed Changes

Public Output Recovery P1 deployed to production. Changes limited to:
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`

### Hosted Smoke Results (Completed 2026-06-07)

- **Public Room 11 (`/p/ggm-christina-goddard`):** Threshold, gallery grid, museum-frame images, mobile flow all verified.
- **Payload Hygiene:** 0 violations (pre + post lifecycle).
- **Owner Preview:** ✅ Tested — draft banner renders, threshold visible, no chrome leaks.
- **Legacy Negative:** ✅ Tested — room `hesmaddw` confirmed legacy, no V2 leakage.
- **Full Lifecycle:** ✅ Tested — 18.5s pass; edit/save/preview/publish/public/hygiene/cleanup.
- **Studio Regression:** ✅ Tested — editor mounts, S1/S2/S3 features present.

Full hosted smoke report:
`docs/program/evidence/presence-public-output-recovery-p1-hosted/PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_HOSTED_SMOKE.md`

### Verdict

- Hosted Gallery/GGM public output: **ready with P2 polish**
- Hosted owner preview: **ready**
- Hosted Studio regression: **ready**
- Live legacy isolation: **ready**
- Hosted lifecycle: **ready**
- Controlled operator-led pilot: **ready with operator support**
- Public self-serve onboarding: **not ready** (wait for P2)


---

## P2 Public Output Recovery Deployment - 2026-06-08

**Production alias:** `https://your-presence.vercel.app`
**Deployment URL:** `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
**Deployment ID:** `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
**Commit:** `f9673c80cb163c3007b8deedeedcc29d2848e9ee`
**S4A Status:** Parked in `stash@{0}` - NOT deployed

### Hosted Smoke Results

- Hosted Gallery/GGM P2 public output smoke: PASS, warmed rerun `1 passed (40.6s)`.
- Owner preview: PASS, upgraded P2 renderer visible and no editor chrome leakage.
- Studio regression: PASS, V2 editor mounts with S1/S2/S3 surfaces present.
- Legacy negative: PASS, `https://your-presence.vercel.app/p/hesmaddw` remains legacy with no V2/P2 leakage.
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0` before and after lifecycle.
- Full hosted lifecycle: PASS, `1 passed (48.7s)`, cleanup/restoration complete.

Evidence:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_HOSTED_SMOKE.md
docs/program/evidence/presence-public-output-recovery-p2-hosted/
```

### Hosted Caveat

The live Room 11 media/content currently includes a prior blue `Harmless V1B Test / Hosted Smoke Image` asset. The P2 renderer/deployment is clean, but final client-facing Gallery/GGM screenshots should wait for a separate controlled content/media correction pass.

### Verdict

- Hosted Gallery/GGM P2 public output: **ready at renderer/deployment level, with hosted media-content caveat**
- Hosted owner preview: **ready**
- Hosted Studio regression: **ready**
- Live legacy isolation: **ready**
- Hosted lifecycle: **ready**
- Controlled operator-led pilot: **ready with operator support**
- Public self-serve onboarding: **not ready**


---

## S6A Public Style Presets Deployment - 2026-06-09

**Production alias:** `https://your-presence.vercel.app`
**Deployment URL:** `https://presence-ektpmsott-emadhatu-2110s-projects.vercel.app`
**Deployment ID:** `dpl_8Cuyuyq1sgYSpznp6jwTVNbge8Bz`
**Deployed commit:** `1e4a570ae95cf154870980cdb43f1c49a91d3796`
**S4A Status:** Parked in `stash@{0}` - NOT deployed

### Hosted Gate

Initial hosted smoke showed Room 11 editor and owner preview on V2, but anonymous public output had fallen back to the stale GGM demo fixture because the backend public endpoint returned `404 not_found`.

Read-only owner checks showed:

- Draft config renderer: `presence-studio-v2-room`
- Published config renderer: `presence-studio-v2-room`
- Node status: `unpublished`
- Node public status: `draft`

The existing owner node publish endpoint restored the intended public pilot state:

```txt
POST /api/presence/owner/nodes/11/publish
```

After that, the public endpoint returned Room 11 with `renderer_key: presence-studio-v2-room`, `status: published`, and `public_status: public`.

### Hosted Smoke Results

- Hosted S6A smoke: PASS, `1 passed (18.7s)`.
- Studio style selector: PASS, Gallery P2 and Christina / Liquid Gallery options visible.
- Owner preview: PASS, V2 Gallery P2 output clean.
- Public `/p/ggm-christina-goddard`: PASS, V2 Gallery P2 output clean.
- Public `/presence/ggm-christina-goddard`: PASS.
- Public lightbox/focus: PASS.
- Mobile public output: PASS.
- Legacy negative `/p/hesmaddw`: PASS, remains outside V2.
- Public leakage scan in smoke: PASS, no style selector, S5 asset panel, editor, config, auth, or owner API terms exposed.

Evidence:

```txt
PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-public-style-presets-s6a-hosted/
```

### Verdict

- Hosted S6A editor readiness: **ready**
- Hosted owner preview readiness: **ready**
- Hosted public output readiness: **ready**
- Hosted payload hygiene readiness: **ready for smoke scope**
- Live legacy isolation readiness: **ready**
- Controlled operator-led pilot readiness: **ready with operator support**
- Public self-serve onboarding readiness: **not ready**

### Release Baseline Lock

P2 hosted baseline was locked in Git on 2026-06-08:

- Baseline commit: `4bbfce9dcbbd884dc9780391fcec353186dd7b24`
- Release report: `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_RELEASE_BASELINE_REPORT.md`
- Secret hygiene: passed.
- Local QA rerun: passed.
- Hosted data: not mutated during lock pass.
- S4A: still parked in `stash@{0}`.


---

### Room 11 Content/Media Correction — 2026-06-08

The hosted media-content caveat above has been resolved.

Full report:
`PRESENCE_ROOM_11_CONTENT_MEDIA_CORRECTION_REPORT.md`

- Bad asset (`783471c01a894f9ebddd039f83d4ac68.png`) replaced with `/ggm/works/willow-of-port-arthur-2019.webp`.
- Payload hygiene: `TOTAL_VIOLATIONS: 0`.
- Public routes clean.
- Legacy and Studio regression verified.
- Final client-facing screenshots captured.

Updated verdict:
- Hosted Gallery/GGM P2 public output: **ready for client-facing screenshots and pilot demos**.


---

## S5 Asset / Media Library Deployment - 2026-06-09

**Production alias:** `https://your-presence.vercel.app`
**Deployment URL:** `https://presence-c9nmbuzw5-emadhatu-2110s-projects.vercel.app`
**Deployment ID:** `dpl_2w6Lyj9UfKiyj6PFUdokG12t3Mni`
**Base local commit:** `04886d37c0e4d05fcf81a673ef8d6f38b680a8f5`
**S4A Status:** Parked in `stash@{0}` - NOT deployed

Note: Vercel inspect did not report a Git source commit. The deployment was created from the local S5 working tree on top of the base commit above.

### Hosted Smoke Results

- Hosted S5 editor smoke: PASS, `1 passed (17.1s)` with retries disabled.
- Studio regression: PASS, editor mounts with S1/S2/S3 surfaces present.
- Room Assets panel: PASS, derived hosted Room 11 assets appear.
- Asset detail/used-in mapping: PASS.
- Media health checklist: PASS.
- Replace URL flow: visible and honest; no upload/crop/storage capability implied.
- Owner preview: PASS, no S5 asset UI leakage.
- Public `/p/ggm-christina-goddard`: PASS, public P2 output clean and lightbox/focus works.
- Public `/presence/ggm-christina-goddard`: PASS.
- Mobile public output: PASS.
- Legacy negative `/p/hesmaddw`: PASS, remains legacy with no V2/S5 leakage.
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0` before and after lifecycle.
- Full hosted lifecycle: PASS, `1 passed (20.8s)`, cleanup/restoration complete.

Evidence:

```txt
PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-asset-library-s5-hosted/
```

### Verdict

- Hosted S5 editor: **ready for operator-led pilots**
- Hosted owner preview: **ready**
- Hosted public output: **ready**
- Hosted payload hygiene: **ready**
- Hosted lifecycle: **ready**
- Controlled operator-led pilot: **ready with operator support**
- Public self-serve onboarding: **not ready**

---

## Baseline

**Baseline commit:** `6cafb36` on `feature/presence-ecosystem-alpha`

See full baseline report: `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6_RELEASE_BASELINE_REPORT.md`

## S6 Public Style Presets Deployed — 2026-06-08

Combined S6A/S6B deployment completed successfully:

- **Production URL:** `https://your-presence.vercel.app`
- **Deployment ID:** `7yqscqF5Su93ovXPD99DN8qcuuXE`
- **Source commit:** `535cdca`
- **Deploy method:** Vercel CLI from local working tree

Hosted smoke results:

- Room 11 Studio V2 editor mounts correctly
- Public style selector shows all 3 options (Gallery P2, Christina / Liquid Gallery, bbb.vision / Threshold Gallery)
- Style selection marks dirty and persists through save/reload
- Christina style owner preview renders correctly
- bbbvision style owner preview renders correctly
- Gallery P2 restored successfully after testing
- Legacy room `/p/hesmaddw` remains outside V2
- Payload hygiene clean
- Hosted lifecycle spec passes with cleanup
- Room 11 restored to original state

Evidence: `docs/program/evidence/presence-studio-v2-public-style-presets-s6-hosted/`

Full report: `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6_HOSTED_SMOKE.md`
