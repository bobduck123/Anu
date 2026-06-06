# Presence Studio V2 - S2 Release Baseline Report

Date: 2026-06-06

Branch: `feature/presence-ecosystem-alpha`

Production URL: `https://your-presence.vercel.app`

Pilot room: Room 11 / `ggm-christina-goddard`

## Purpose

Lock the hosted-verified Studio Recovery S2 state before S3 begins.

No product behavior, backend contract, auth, save/reload, preview, publish, payload sanitization, feature gating, or hosted data was changed in this release-baseline pass.

## Git Status Before Cleanup

Initial status showed only hosted S2 verification artifacts as untracked:

```txt
?? PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md
?? docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
?? tests/e2e/presence-studio-v2-hosted-manipulation.spec.ts
```

Tracked diff was empty before documentation updates in this pass:

```txt
git diff --stat
git diff
```

Both returned no tracked changes.

## Change Classification

S2 product code:

- Already represented in Git at `a7cb6d6` (`S2`).

S2 tests:

- `tests/e2e/presence-studio-v2-hosted-manipulation.spec.ts`

Hosted S2 audit/report files:

- `PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md`
- `PRESENCE_STUDIO_V2_S2_RELEASE_BASELINE_REPORT.md`
- `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`

Screenshots/evidence:

- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-guided-mode.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-wild-drag.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-resize.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-rotate.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-after-reload.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-preview.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-public.png`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/hosted-s2-after-cleanup.png`

Generated artifacts intentionally not committed:

- `.next/`
- `node_modules/`
- `.tmp/`
- `test-results/`
- `.next-start-*.log`
- `tsconfig.tsbuildinfo`
- local caches and Python `__pycache__` folders

Secrets/env files intentionally not committed:

- `.env.local`
- `.env.presence-controlled-launch.frontend-production.local`
- other ignored `.env*` files outside this package
- Playwright/browser auth state if present

## Secret Hygiene

Secret search covered the committable text files for known owner credential literals, bearer-token shapes, Vercel/Supabase token patterns, service-role key names, password assignments, and auth-state references. Ignored `.env*` files were also checked with `git check-ignore`.

Result:

- No credential values, tokens, bearer tokens, Supabase secrets, Vercel tokens, or owner password/email values found in committable text.
- The hosted Playwright spec reads credentials from environment variables only.
- `.env*` files are ignored and were not staged.
- Screenshot spot-check did not show credential material.
- No rotation required.

## Local QA

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
npx.cmd playwright test tests\e2e\presence-studio-v2-hosted-manipulation.spec.ts --project=chromium
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
- S2 direct manipulation Playwright: 2 passed.
- Hosted S2 manipulation audit spec: 1 skipped without `PRESENCE_HOSTED_SMOKE=1` as intended.

Warnings:

- Node TypeScript tests emit existing `MODULE_TYPELESS_PACKAGE_JSON` warnings.
- Build/Playwright web server emit existing Turbopack workspace-root warnings.

## Hosted Verification Relationship

Hosted S2 verification already passed before this baseline pass.

Hosted report:

```txt
PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md
```

Evidence:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
```

The hosted-verified S2 product behavior is represented by commit `a7cb6d6`. This baseline commit adds the hosted S2 report, hosted manipulation audit spec, hosted evidence screenshots, and release documentation. It does not alter product runtime behavior.

## Commit / Push

Product S2 commit before this baseline:

```txt
a7cb6d6
```

Release-baseline commit:

```txt
Created by this pass; exact hash is recorded in the final handoff after commit creation.
```

Remote branch:

```txt
origin/feature/presence-ecosystem-alpha
```

## Remaining Risks

- PostCSS moderate vulnerability remains deferred inside the Next build pipeline.
- S3 has not started.
- Public self-serve onboarding remains out of scope.
- Hosted S2 remains limited to Room 11 / explicit pilot IDs.

## Verdict

- S2 product/test/report state is ready to be represented in Git.
- No secrets are staged.
- Local QA passed.
- Hosted S2 verification passed before this pass.
- S3 can begin after this baseline commit is pushed.
