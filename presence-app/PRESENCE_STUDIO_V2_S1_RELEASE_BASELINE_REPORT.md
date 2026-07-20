# Presence Studio V2 S1 Release Baseline Report

Date: 2026-06-05

## Executive Verdict

Studio Recovery S1 has been locked as a durable release baseline candidate for the already-deployed Room 11 pilot state.

No S2 direct manipulation work was started. No product behavior, backend contract, auth, save/reload, preview, publish, payload sanitisation, feature gating, or hosted data was changed in this baseline pass.

## Deployment Being Baseline-Locked

```txt
Production URL: https://your-presence.vercel.app
Deployment URL: https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC
Commit at deploy time: f81fca829742939ad24865521d5c2d52f3a4bdfb
```

The production deployment was made from a dirty local working tree. This release-baseline pass commits the deployed S1 product code, tests, smoke helpers, reports, and safe evidence so the hosted state is represented in Git before S2 begins.

## Git Status Before Cleanup

Branch:

```txt
feature/presence-ecosystem-alpha
```

Modified tracked files:

```txt
PRESENCE_STUDIO_V2_HOSTED_SMOKE.md
PRESENCE_STUDIO_V2_LOCAL_QA.md
PRESENCE_STUDIO_V2_VISUAL_PARITY_REPORT.md
components/presence-studio-v2/PresenceStudioV2Editor.tsx
components/presence-studio-v2/PresenceStudioV2Panels.tsx
components/presence-studio-v2/PresenceStudioV2Room.tsx
components/presence-studio-v2/presence-studio-v2-public.css
components/presence-studio-v2/presence-studio-v2.css
tests/e2e/presence-studio-v2-draft-preview.spec.ts
tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts
tests/e2e/presence-studio-v2-visual-parity-capture.spec.ts
```

Untracked release artifacts:

```txt
PRESENCE_STUDIO_V2_HOSTED_VISUAL_SMOKE_REPORT.md
PRESENCE_STUDIO_V2_P1_VISUAL_POLISH_AND_TEST_REPORT.md
PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md
PRESENCE_STUDIO_V2_QA_REPORT.md
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_AUDIT.md
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_REPORT.md
PRESENCE_STUDIO_V2_VISUAL_PARITY_QA.md
docs/program/evidence/presence-studio-v2-hosted-visual-smoke/
docs/program/evidence/presence-studio-v2-p1-visual-polish/
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
docs/program/evidence/presence-studio-v2-studio-recovery-s1/
scripts/cleanup-hosted-v2-draft-from-published.mjs
scripts/hosted-payload-hygiene.mjs
scripts/hosted-studio-recovery-s1-smoke.mjs
scripts/hosted-visual-smoke-v2.mjs
scripts/hosted-visual-smoke.mjs
tests/e2e/presence-studio-v2-studio-recovery-s1-capture.spec.ts
```

One temporary probe script, `scripts/recheck-desktop-p.mjs`, was removed from the baseline set because it was a one-off generated recheck helper rather than durable release evidence.

## Change Categorisation

Product code required for hosted S1:

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `components/presence-studio-v2/presence-studio-v2-public.css`

Tests required for hosted S1:

- `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`
- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`
- `tests/e2e/presence-studio-v2-visual-parity-capture.spec.ts`
- `tests/e2e/presence-studio-v2-studio-recovery-s1-capture.spec.ts`

Reusable release/smoke helpers:

- `scripts/cleanup-hosted-v2-draft-from-published.mjs`
- `scripts/hosted-payload-hygiene.mjs`
- `scripts/hosted-studio-recovery-s1-smoke.mjs`
- `scripts/hosted-visual-smoke-v2.mjs`
- `scripts/hosted-visual-smoke.mjs`

Reports and safe evidence:

- Presence Studio V2 S1, visual parity, hosted smoke, local QA, P1 polish, and prototype-superiority reports.
- Screenshot evidence under `docs/program/evidence/presence-studio-v2-*`.

Intentionally not committed:

- `.env.local`
- `.env.presence-controlled-launch.frontend-production.local`
- `test-results/.last-run.json`
- `.next/`
- `node_modules/`
- Playwright reports/caches
- One-off `scripts/recheck-desktop-p.mjs`

## Secret Hygiene

Secret scan was run before staging.

Patterns checked included:

```txt
owner email/password markers
PRESENCE_E2E_OWNER_PASSWORD
PRESENCE_E2E_OWNER_EMAIL
ROOM11_OWNER_TOKEN
VERCEL_TOKEN
Supabase service-role markers
Bearer token patterns
JWT-looking token patterns
.env*
Playwright auth-state artifacts
```

Result:

- No owner credential, bearer token, Vercel token, Supabase service-role token, JWT-looking token, or `ROOM11_OWNER_TOKEN` match was found in the committable working tree.
- `.env.local` and `.env.presence-controlled-launch.frontend-production.local` exist locally and are ignored by `.gitignore`.
- `test-results/.last-run.json` is ignored and not committed.
- Hosted screenshots do not contain sign-in forms, passwords, bearer tokens, or auth-state views.

Rotation requirement: none found from this repository scan.

## Dependency Audit Triage

Command:

```powershell
npm audit --json
```

Summary:

```txt
2 moderate
1 high
0 critical
```

Findings:

| Package | Severity | Path | Runtime-facing | Fix |
| --- | --- | --- | --- | --- |
| `next@16.2.4` | High | direct production dependency | Yes | `next@16.2.7` available, semver patch |
| `postcss@8.4.31` | Moderate | transitive through `next` | Build/server dependency path | fixed by `next@16.2.7` |
| `ws@8.20.0` | Moderate | transitive through `@supabase/realtime-js` | Production dependency tree, mainly Node/WebSocket path | fix available, likely dependency update/resolution |

Recommendation:

- Do not run `npm audit fix` inside the S1 baseline commit because it would change deployed dependency behavior and make the baseline diverge from the smoke-tested deployment.
- Open a separate dependency patch to upgrade `next` from `16.2.4` to at least `16.2.7`, regenerate the lockfile, rerun the full local gate, then redeploy/smoke.
- Triage `ws` separately through Supabase package update or lockfile resolution. Avoid broad audit fix until the dependency tree impact is inspected.

## Final Local QA

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

Warnings:

- Direct TypeScript node tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Next build and Playwright web server still warn about multiple lockfiles and inferred Turbopack root.
- Build output reports `.env.local` loaded locally; this file remains ignored and was not committed.

## Commit And Push Status

Baseline product commit:

```txt
7a27ec30abebf871f13ccda3830378542f16115d
```

Branch:

```txt
feature/presence-ecosystem-alpha
```

Push status:

```txt
Pushed to origin/feature/presence-ecosystem-alpha
```

Relationship to deployment:

- The deployed production build was created from dirty local state based on `f81fca829742939ad24865521d5c2d52f3a4bdfb`.
- Baseline commit `7a27ec30abebf871f13ccda3830378542f16115d` supersedes that dirty deployment state in Git by committing the S1 product code, tests, reports, smoke scripts, and safe evidence.
- Report/status commits after the baseline may supersede the product commit with documentation-only changes and do not alter product behavior.

## S2 Readiness

S2 direct manipulation can begin only after this release baseline commit is pushed.

S2 still includes:

- direct drag-to-move
- resize handles
- rotation handles
- stronger in-canvas spatial editing
- possible undo/redo and grouping design

Public self-serve onboarding remains out of scope.


---

## Dependency Patch Applied (Post-Baseline)

**Date:** 2026-06-04
**Commit:** `b0b5bf1`

The dependency audit triage from the baseline report was executed as a separate targeted patch.

### Changes

| Package | Before | After |
|---------|--------|-------|
| `next` | `16.2.4` | `16.2.7` |
| `@supabase/supabase-js` | `2.105.3` | `2.107.0` |

### Results

- **High severity Next issues:** Resolved (DoS, middleware bypass, XSS, cache poisoning, SSRF)
- **ws moderate issue:** Resolved (realtime-js@2.107.0 no longer depends on ws)
- **postcss moderate issue:** Deferred — Next 16.2.7 still bundles postcss@8.4.31; Tailwind already provides postcss@8.5.14 at top level

### QA

Full local QA rerun after patch:
- TypeScript: pass
- Build: pass
- Node tests: 40/40 pass
- Playwright smoke: 7/7 pass

No product behavior changes. No secrets committed.

### S2 Status

**Cleared to begin.** Dependency runway is clean.
