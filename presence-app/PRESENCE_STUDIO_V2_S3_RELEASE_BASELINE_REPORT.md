# Presence Studio V2 - S3 Release Baseline Report

**Date:** 2026-06-06  
**Branch:** `feature/presence-ecosystem-alpha`  
**Target remote:** `origin/feature/presence-ecosystem-alpha`  
**Hosted deployment:** `dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df`  
**Hosted deployment URL:** `https://presence-c9s85tb7s-emadhatu-2110s-projects.vercel.app`  
**Production alias:** `https://your-presence.vercel.app`  
**Hosted deploy commit:** `0ab808ab15f63dc78b53486b73fb8039522f1341`

## Verdict

**PASS.** The hosted-verified Studio Recovery S3 state is ready to be locked in Git and pushed before S4 begins.

S4 was not started. Product behavior was not changed in this baseline pass.

## Git Hygiene Summary

Inspected:

```powershell
git status
git diff --stat
git diff
```

Categories:

S3 product code:

- Already represented in the deployed commit `0ab808ab15f63dc78b53486b73fb8039522f1341`.
- No additional product code changes were made during this release-baseline pass.

S3 tests:

- `tests/e2e/presence-studio-v2-hosted-s3-smoke.spec.ts`

Hosted S3 reports:

- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_REPORT.md`
- `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`
- `PRESENCE_STUDIO_V2_S3_RELEASE_BASELINE_REPORT.md`

Hosted S3 evidence screenshots:

- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/01-full-s3-editor-cockpit.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/02-content-tab-image-preview.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/03-style-tab-state-delete-confirm.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/04-motion-tab-sliders-steppers.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/05-selected-object-with-s2-frame.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/06-preview-publish-confidence-checklist.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/07-desktop-device-frame.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/08-mobile-device-frame.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/09-narrow-outline-inspector-toggles.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/10-owner-preview-clean.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/11-public-desktop-clean.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/12-public-mobile-clean.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/13-legacy-room-negative.png`

Generated artifacts not committed:

- `test-results/`
- Playwright trace/error output
- Next build output/cache
- ignored local environment files

Secrets/env files not committed:

- `.env.local`
- `.env.presence-controlled-launch.frontend-production.local`
- sibling project `.env*` files surfaced by ignored-status scan
- no Playwright auth state files were staged

## Secret Hygiene

Search performed across committable S3 files and evidence path for:

- owner email/password
- auth tokens
- bearer tokens
- Vercel tokens
- Supabase tokens
- `ROOM11_OWNER_TOKEN`
- `.env` / `.env.local`
- Playwright auth state indicators
- hosted credential values

Result:

- No credential values found in committable files.
- Only environment variable names are present in the hosted S3 smoke spec and reports.
- Ignored `.env*` files exist locally but are not staged or committed.
- No rotation required.

## Local QA Result

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

Known warnings:

- Node direct TypeScript tests emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server emit the existing Turbopack workspace-root warning.

## Hosted Verification Relationship

S3 was deployed and verified before this baseline report.

Hosted proof:

- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_HOSTED_SMOKE.md`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/`

Hosted checks passed:

- Hosted S3 smoke: 1 passed in 18.8s.
- Full hosted lifecycle smoke: 1 passed in 22.6s.
- Standalone hosted payload hygiene: `TOTAL_VIOLATIONS: 0`.
- Room 1 legacy negative remained legacy.
- Room 11 cleanup/restoration completed.

Relationship to deployment:

- Deployment `dpl_5R4QQYfDBvBUnLcQf9MxSTegd1Df` was created from commit `0ab808ab15f63dc78b53486b73fb8039522f1341`.
- This baseline commit will supersede that deploy commit by adding hosted smoke documentation, hosted S3 evidence, and the repeatable hosted S3 smoke spec.
- Product behavior in the deployed S3 build is unchanged by this release-baseline pass.

## Remaining Risks

- S4 chamber management is not implemented.
- Real asset upload/assignment remains deferred.
- Undo/redo, grouping, collaboration cursors, and true archive/version history remain deferred.
- Public self-serve onboarding remains not ready.
- Vercel/npm audit still reports 2 moderate findings from the install step; no new dependency change was made in this pass.

## S4 Readiness

S4 can begin after:

1. this baseline commit is pushed to `origin/feature/presence-ecosystem-alpha`, and
2. the working tree is clean except ignored local env files.

S4 was not started in this pass.
