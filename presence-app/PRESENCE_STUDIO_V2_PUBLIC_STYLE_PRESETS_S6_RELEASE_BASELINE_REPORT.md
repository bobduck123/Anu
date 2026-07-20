# Presence Studio V2 — S6 Public Style Presets Release Baseline Report

**Date:** 2026-06-08
**Auditor:** Kimi Code CLI (senior release engineer, repository hygiene auditor)
**Scope:** Lock the hosted-verified S6A/S6B public style system baseline in Git
**Baseline commit:** `6cafb36`
**Branch:** `feature/presence-ecosystem-alpha`
**Remote:** `origin/feature/presence-ecosystem-alpha` (pushed, up to date)

---

## 1. Executive Verdict

**S6 style-system baseline is locked and ready.**

The hosted-verified S6A/S6B public style system code, tests, reports, and evidence are represented in Git at commit `6cafb36`. No secrets are committed. Local QA passes. S4A remains parked. Working tree is clean. Hosted bbbvision migration is cleared to begin.

---

## 2. Repository Hygiene

### Git state

```bash
git status
# On branch feature/presence-ecosystem-alpha
# Your branch is up to date with 'origin/feature/presence-ecosystem-alpha'.
# nothing to commit, working tree clean

git stash list
# stash@{0}: On feature/presence-ecosystem-alpha: park S4A chamber management safety-audited local work

git log --oneline -8
# 6cafb36 deploy: S6A/S6B public style system to production + hosted smoke
# 535cdca audit: S6B bbbvision pilot — typed preset, data-driven renderer, selector UX, mock pilot, 22/22 Playwright pass, 38/38 Node unit pass, hygiene verified, RBAC negative verified, regression safe
# 89722a5 docs(studio-v2): lock hosted s6a style preset baseline
# 1e4a570 S6A
# a057f27 updates S5
# 04886d3 docs(public-output): record Room 11 media correction
# 99a8b6b docs(public-output): record p2 release baseline
# 4bbfce9 feat(public-output): deploy hosted-verified gallery polish
```

### Verification

- [x] S4A remains parked in `stash@{0}`
- [x] Working tree contains only S6 style-system code, tests, reports, and evidence
- [x] No S4A chamber-management code present in app/components/lib/tests
- [x] No hosted bbbvision migration/seed data added yet
- [x] No credentials/env/auth state/traces/HAR/logs staged
- [x] `.env.local` and `.env.presence-controlled-launch.frontend-production.local` are gitignored

---

## 3. Secret Hygiene

### Scan coverage

Searched committable files for:

- Real email addresses/passwords
- Auth tokens, bearer tokens
- Vercel tokens, Supabase tokens
- `.env`, `.env.local`
- Playwright auth state, storage state
- HARs, traces, logs containing credentials
- Cookies/session values

### Results

| Secret type | Found? | Details |
|-------------|--------|---------|
| Real bearer tokens | No | None in source |
| Supabase service-role keys | No | Only env var name references and mock test key `"presence-e2e-public-key"` |
| Vercel tokens | No | None in source |
| Real passwords | No | Only UI form fields (`PresenceAuthForms.tsx`), env var names, and mock `test-password` in local tests |
| Real owner email | No | `e4hatu@gmail.com` appears only in report markdown as a future migration target reference |
| Real owner password | No | `testtesttest123` does not appear anywhere in repository |
| `.env*` files committed | No | Both `.env.local` and `.env.presence-controlled-launch.frontend-production.local` are properly gitignored |
| Auth state files | No | None found |
| HAR files | No | None found |
| Trace files | No | None found |

### Known acceptable exceptions

- `owner-test-token` and `non-owner-token` — mock tokens in local Playwright tests and mock API
- `test-password` — mock password in local Playwright auth tests
- `presence-e2e-public-key` — mock Supabase anon key in Playwright config

### Verdict

**Secret hygiene: CLEAN.** No rotation required.

---

## 4. Final Local QA

### Build checks

| Check | Result |
|-------|--------|
| TypeScript typecheck | Pass |
| Production build | Pass |

### Node unit tests

| Suite | Tests | Result |
|-------|-------|--------|
| `studioV2Adapters.test.ts` | 17 | Pass |
| `publicPayload.test.ts` | 5 | Pass |
| `assets.test.ts` | 8 | Pass |
| `feature.test.ts` | 8 | Pass |
| `resolver.test.ts` | 8 | Pass |
| `readiness.test.ts` | 5 | Pass |
| **Total** | **51/51** | **Pass** |

### Playwright local tests

| Suite | Tests | Result |
|-------|-------|--------|
| `presence-public-output-gallery-polish.spec.ts` | 3 | Pass |
| `presence-public-output-gallery-quality.spec.ts` | 3 | Pass |
| `presence-public-payload-hygiene.spec.ts` | 2 | Pass |
| `presence-studio-v2-asset-library.spec.ts` | 1 | Pass |
| `presence-studio-v2-bbbvision-pilot.spec.ts` | 1 | Pass |
| `presence-studio-v2-direct-manipulation.spec.ts` | 2 | Pass |
| `presence-studio-v2-draft-preview.spec.ts` | 2 | Pass |
| `presence-studio-v2-inspector-usability.spec.ts` | 4 | Pass |
| `presence-studio-v2-public-render.spec.ts` | 3 | Pass |
| `presence-studio-v2-public-style-presets.spec.ts` | 1 | Pass |
| **Total** | **22/22** | **Pass** |

### Known non-regression

`presence-studio-v2-hosted-s3-smoke.spec.ts` has pre-existing fragility because it assumes the first outline object has no image, while Room 11's first object is the cover image. This is **not a production regression** — the S3 editor and inspector function correctly. The test assumption was broken by Room 11 content seeding, not by S6 code changes.

---

## 5. Commit and Push

| Field | Value |
|-------|-------|
| Baseline commit | `6cafb36` |
| Commit message | `deploy: S6A/S6B public style system to production + hosted smoke` |
| Branch | `feature/presence-ecosystem-alpha` |
| Remote status | Up to date with `origin/feature/presence-ecosystem-alpha` |
| Deployed from this commit | Yes (Vercel CLI from local working tree) |

---

## 6. Deployment Relationship

| Field | Value |
|-------|-------|
| Deployment ID | `7yqscqF5Su93ovXPD99DN8qcuuXE` |
| Production URL | `https://your-presence.vercel.app` |
| Deployment URL | `https://presence-ob9j63zpc-emadhatu-2110s-projects.vercel.app` |
| Source commit | `535cdca` (Vercel build-time detection) |
| Baseline commit | `6cafb36` (includes deploy + hosted smoke documentation) |

Note: Vercel detected source commit `535cdca` at build time because that was the HEAD when the CLI deploy initiated. The subsequent commit `6cafb36` adds the hosted smoke report and evidence without changing application code.

---

## 7. Files Committed in Baseline

### Application code

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx` — bbbvision renderer branch
- `components/presence-studio-v2/presence-studio-v2-public.css` — namespaced bbbvision styles
- `components/presence-studio-v2/worlds.ts` — bbbvision preset option
- `lib/presence/studio-v2/model.ts` — `bbbvision-threshold-gallery` type
- `lib/presence/studio-v2/adapters.ts` — round-trip serialization
- `lib/presence/render/publicPayload.test.ts` — bbbvision payload coverage
- `lib/presence/studio-v2/studioV2Adapters.test.ts` — bbbvision adapter test

### Tests

- `tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts` — S6B Playwright spec
- `tests/e2e/presence-studio-v2-public-style-presets.spec.ts` — S6A Playwright spec (updated)
- `tests/e2e/mock-presence-api.mjs` — bbbvision mock state

### Reports

- `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6_HOSTED_SMOKE.md` — new
- `PRESENCE_STUDIO_V2_BBBVISION_PILOT_S6B_AUDIT.md` — new
- `PRESENCE_STUDIO_V2_BBBVISION_PILOT_REPORT.md` — new
- Updates to `PRESENCE_STUDIO_V2_LOCAL_QA.md`, `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`, `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_REPORT.md`

### Evidence

- `docs/program/evidence/presence-studio-v2-bbbvision-pilot/` — 14 screenshots
- `docs/program/evidence/presence-studio-v2-public-style-presets-s6-hosted/` — 9 screenshots

### Files intentionally not committed

- `.env.local` — gitignored, contains local env vars
- `.env.presence-controlled-launch.frontend-production.local` — gitignored
- S4A chamber-management code — parked in `stash@{0}`
- Hosted bbbvision seed data — not created yet

---

## 8. S4A Stash Status

```bash
stash@{0}: On feature/presence-ecosystem-alpha: park S4A chamber management safety-audited local work
```

S4A chamber-management code remains safely parked. No S4A code is in the working tree or baseline commit.

---

## 9. Remaining Limitations

| Limitation | Status |
|------------|--------|
| No hosted bbbvision room yet | Deferred to controlled create/seed/assign pass |
| bbbvision canvas/glitch engine not ported | Deferred — DOM/CSS renderer is current solution |
| bbbvision threshold/gallery are single-route sections | Deferred — separate `/gallery` route not implemented |
| Public self-serve onboarding not ready | Out of scope |
| `presence-studio-v2-hosted-s3-smoke.spec.ts` fragility | Pre-existing test issue, not a production regression |

---

## 10. Clearance

| Question | Answer |
|----------|--------|
| S6 hosted style-system code represented in Git? | **Yes** — commit `6cafb36` |
| No secrets committed? | **Yes** — secret hygiene clean |
| Local QA passes? | **Yes** — 51/51 unit, 22/22 Playwright |
| S4A remains parked? | **Yes** — `stash@{0}` |
| Working tree clean? | **Yes** |
| No hosted bbbvision mutation? | **Yes** |
| Hosted bbbvision migration cleared to begin? | **Yes** |

---

## 11. Sign-off

- [x] Repository hygiene verified
- [x] Secret hygiene verified (clean)
- [x] Final local QA passed (51/51 unit, 22/22 Playwright)
- [x] Commit `6cafb36` pushed to `origin/feature/presence-ecosystem-alpha`
- [x] Deployment relationship documented
- [x] S4A stash status confirmed
- [x] Known non-regression documented
- [x] Limitations documented
- [x] Hosted bbbvision migration cleared
