# Presence Public Output Recovery P2 Release Baseline Report

Date: 2026-06-08
Scope: Lock hosted-verified Public Output Recovery P2 renderer baseline in Git without hosted content mutation.

## 1. Baseline Commit

Baseline commit:

```txt
4bbfce9dcbbd884dc9780391fcec353186dd7b24
```

Commit message:

```txt
feat(public-output): deploy hosted-verified gallery polish
```

This commit records the hosted-smoked P2 evidence/report/spec state on top of deployed renderer commit:

```txt
f9673c80cb163c3007b8deedeedcc29d2848e9ee
```

Push target:

```txt
origin/feature/presence-ecosystem-alpha
```

The final remote head also includes this release-baseline report commit and is recorded in the handoff after push.

## 2. Relationship To Hosted Deployment

Hosted deployment verified:

- Production: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
- Deployed renderer commit: `f9673c80cb163c3007b8deedeedcc29d2848e9ee`
- Baseline lock commit: `4bbfce9dcbbd884dc9780391fcec353186dd7b24`

The hosted deployment was not redeployed during this lock pass. No hosted Room 11 content/media was edited.

## 3. Files Committed

Baseline commit `4bbfce9dcbbd884dc9780391fcec353186dd7b24` included:

- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_ART_DIRECTION_AUDIT.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_HOSTED_SMOKE.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_REPORT.md`
- `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `docs/program/presence-studio-v2-public-output-quality/PRESENCE_PUBLIC_ROOM_OUTPUT_QUALITY_AUDIT.md`
- `tests/e2e/presence-public-output-recovery-p2-hosted.spec.ts`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/01-hosted-gallery-threshold-desktop.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/02-hosted-threshold-to-chamber-bridge.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/03-hosted-chamber-gallery-placards.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/04-hosted-wall-label-artwork-treatment.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/05-hosted-lead-artwork-hierarchy.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/06-hosted-cta-portal-mark.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/07-hosted-hover-focus-state.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/08-hosted-lightbox-open-state.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/09-hosted-mobile-threshold.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/10-hosted-mobile-chamber.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/11-hosted-owner-preview-clean.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/12-hosted-studio-regression.png`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/13-hosted-legacy-negative.png`

This release report commit adds:

- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_RELEASE_BASELINE_REPORT.md`
- Release-lock addenda in the P2 hosted smoke, P2 report, hosted smoke, and local QA reports.

## 4. Files Intentionally Not Committed

Not committed:

- Hosted Room 11 content/media changes.
- S4A Chamber Management stash contents.
- `.env.local`
- `.env.presence-controlled-launch.frontend-production.local`
- Any credentials, auth state, cookies, tokens, Playwright storage state, traces, HARs, or local logs.

## 5. Secret Hygiene Result

Secret hygiene passed.

Scans covered pending committable text files for:

- Supplied owner email/password.
- Auth/bearer token shapes.
- Vercel token names.
- Supabase token/service key names.
- `ROOM11_OWNER_TOKEN`.
- Access/refresh/session token names.
- Env/auth/storage-state filenames.

Only expected false positives appeared: public-output tests intentionally contain forbidden-term strings such as `access_token`, `refresh_token`, and `service_role` inside restricted-term assertions. No actual secret values were found.

Evidence screenshots were PNG-only; no JSON, HAR, trace, HTML, env, auth, or storage-state files were present in the evidence bundle.

## 6. Local QA Result

All requested local QA passed:

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

Known non-blocking warnings:

- Node direct TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Next/Turbopack still warns about multiple lockfiles and inferred workspace root.

## 7. S4A Status

S4A remains parked:

```txt
stash@{0}: On feature/presence-ecosystem-alpha: park S4A chamber management safety-audited local work
```

No S4A chamber-management code was found in the working tree under `app`, `components`, `lib`, or `tests`.

## 8. Hosted Media/Content Caveat

The hosted P2 renderer baseline is clean, but hosted Room 11 still contains a prior blue `Harmless V1B Test / Hosted Smoke Image` asset.

This pass did not mutate hosted data. Final client-facing Gallery/GGM screenshots should wait until a separate controlled content/media correction pass restores final curation.

## 9. Content/Media Correction Readiness

Controlled content/media correction can begin after this baseline is pushed and reviewed.

Conditions for the next pass:

- Use a controlled data-only procedure.
- Do not change renderer code.
- Do not un-stash S4A.
- Preserve payload hygiene and lifecycle cleanup checks.
- Recapture Gallery/GGM screenshots after content correction.
