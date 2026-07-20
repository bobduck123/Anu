# Presence Studio V2 - Studio Recovery S3 Hosted Smoke

**Date:** 2026-06-06  
**Production alias:** `https://your-presence.vercel.app`  
**Deployment URL:** `https://presence-c9s85tb7s-emadhatu-2110s-projects.vercel.app`  
**Deployment ID:** `dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df`  
**Deploy commit:** `0ab808ab15f63dc78b53486b73fb8039522f1341`  
**Room:** 11 / `ggm-christina-goddard`  
**Legacy negative:** Room 1  

## Verdict

**PASS.** Studio Recovery S3 is deployed and hosted-verified for Room 11. S1 cockpit, S2 direct manipulation, S3 inspector/device-frame upgrades, owner preview, public rendering, payload hygiene, lifecycle smoke, and legacy negative checks all passed.

No S4 work was started. Rollout remains limited to explicit Studio V2 pilot rooms. Public self-serve onboarding is still not ready.

## Deployment

Initial command `vercel --prod` failed because `vercel` was not on PATH. Deployment was completed with:

```powershell
npx vercel@latest --prod
```

Vercel result:

- Status: `READY`
- Target: production
- Deployment URL: `https://presence-c9s85tb7s-emadhatu-2110s-projects.vercel.app`
- Alias: `https://your-presence.vercel.app`
- Deployment ID: `dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df`

Vercel build completed successfully. The known npm audit output remains `2 moderate severity vulnerabilities`.

## Local Pre-Deploy Verification

Passed:

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
- Unit/contract tests: 40 passed.
- Playwright local gates: 13 passed in the required command set.
- S3 inspector usability spec: 4 passed.

Existing warnings only:

- Node TypeScript tests emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Next/Turbopack emits the existing workspace-root warning due multiple lockfiles.

## Hosted Read-Only Verification

Command:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-s3-smoke.spec.ts --project=chromium --workers=1
```

Result: `1 passed (18.8s)`.

Verified:

- `/studio/11/editor` renders `presence-studio-v2-root`.
- S1 three-pane cockpit appears.
- S2 selected object frame and handles appear.
- S3 inspector upgrades appear.
- Content tab image preview/empty state path verified.
- Style tab state badges, lock/pin clarity, layer summary, and two-click delete confirmation verified.
- Motion tab X/Y steppers and scale/rotation sliders verified.
- Desktop/mobile device frame chrome verified.
- Narrow Outline/Inspector toggles verified.
- Preview/publish confidence checklist verified.
- Dirty-state warning appears before sharing/publishing confidence.
- Legacy Canvas/Inspector does not appear for Room 11.
- Room 1 remains legacy and does not render the V2 root.
- No console/page errors.

## S2/S3 Interaction Sanity

The hosted S3 smoke selected an unlocked object and verified:

- selected-object frame appears
- Wild Mode enables manipulation
- drag updates X/Y readout and Motion tab values
- scale slider updates the numeric scale value
- rotation slider updates the numeric rotation value
- Guided Mode disables manipulation handles

Cleanup/restoration:

- The S3 smoke restored the object transform values before leaving the editor flow.
- The first two S3 smoke attempts failed before any draft save; no hosted content was persisted by those attempts.
- The final hosted S3 smoke passed and did not leave test content or visible transforms.
- The full lifecycle smoke later completed its own save/publish cleanup/restoration path.

## Owner Preview and Public Hygiene

Verified:

- `/studio/11/editor/preview` renders V2 through the sanitized public renderer.
- Device/editor chrome does not leak.
- Inspector labels do not leak.
- Object state badges do not leak.
- S2 selection/resize/rotate/readout handles do not leak.
- No restricted/internal strings appeared in preview/public HTML.

Anonymous public routes verified:

- `/p/ggm-christina-goddard`
- `/presence/ggm-christina-goddard`
- mobile `/p/ggm-christina-goddard`

Public render remained V2, visually intact, and clean.

## Full Hosted Lifecycle Smoke

Command:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result: `1 passed (22.6s)`.

Verified:

- real owner sign-in
- V2 editor root
- edit/save through owner draft API
- reload persistence
- owner preview
- real publish flow
- anonymous `/p/ggm-christina-goddard`
- anonymous `/presence/ggm-christina-goddard`
- payload hygiene
- room key safety
- cleanup/restoration

## Payload Hygiene

Standalone hosted payload hygiene script:

```powershell
node scripts\hosted-payload-hygiene.mjs
```

Result:

```txt
TOTAL_VIOLATIONS: 0
VIOLATIONS: NONE
PASS: true
```

Hosted S3 smoke also scanned preview/public HTML for:

- internal config section names
- `editable_config`
- owner/draft/editor state
- localStorage/TemplateKit references
- S2 manipulation selectors
- S3 inspector labels and state badges

No violations found.

## Evidence

Path:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/
```

Screenshots:

- `01-full-s3-editor-cockpit.png`
- `02-content-tab-image-preview.png`
- `03-style-tab-state-delete-confirm.png`
- `04-motion-tab-sliders-steppers.png`
- `05-selected-object-with-s2-frame.png`
- `06-preview-publish-confidence-checklist.png`
- `07-desktop-device-frame.png`
- `08-mobile-device-frame.png`
- `09-narrow-outline-inspector-toggles.png`
- `10-owner-preview-clean.png`
- `11-public-desktop-clean.png`
- `12-public-mobile-clean.png`
- `13-legacy-room-negative.png`

## Issues

P0: none.  
P1: none.  
P2:

- Hosted S3 smoke spec is newly added for repeatable S3 verification.
- Vercel install still reports 2 moderate audit findings, consistent with prior dependency triage.
- Public self-serve onboarding remains out of scope until later S4/S5/S6/S7 work.

## Verdict Categories

- Hosted S3 editor readiness: ready for Room 11.
- Hosted direct manipulation readiness: ready.
- Hosted owner preview readiness: ready.
- Hosted public render readiness: ready.
- Hosted lifecycle readiness: ready.
- Controlled operator-led pilot readiness: ready with operator support.
- Public self-serve onboarding readiness: not ready.

## Release Baseline

S3 release-baseline lock is tracked in:

```txt
PRESENCE_STUDIO_V2_S3_RELEASE_BASELINE_REPORT.md
```

The baseline commit records this hosted report, hosted S3 evidence, and the repeatable hosted S3 smoke spec. S4 was not started during the release-baseline pass.
