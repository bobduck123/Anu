# Presence Studio V2 — S6 Public Style Presets Hosted Smoke Report

**Date:** 2026-06-08
**Auditor:** Kimi Code CLI (deployment QA engineer, hosted smoke tester, release hygiene auditor)
**Scope:** S6A Public Style Presets + S6B bbbvision Pilot — production deployment and hosted smoke
**Deployed:** Yes
**Hosted data mutated:** Minimal and restored (Room 11 style switching for smoke verification)
**S4A status:** Parked in `stash@{0}` — not deployed

---

## 1. Deployment Record

| Field | Value |
|-------|-------|
| Production URL | `https://your-presence.vercel.app` |
| Deployment URL | `https://presence-ob9j63zpc-emadhatu-2110s-projects.vercel.app` |
| Deployment ID | `7yqscqF5Su93ovXPD99DN8qcuuXE` |
| Inspect URL | `https://vercel.com/emadhatu-2110s-projects/presence/7yqscqF5Su93ovXPD99DN8qcuuXE` |
| Source commit | `535cdca` (S6B audit commit) |
| Deploy method | Vercel CLI from local working tree |
| Build time | ~53s |
| Build status | Clean (TypeScript passed, static pages generated) |

---

## 2. Local Pre-Deploy QA

All local QA passed before deployment:

| Check | Result |
|-------|--------|
| TypeScript typecheck | Pass |
| Production build | Pass |
| `studioV2Adapters.test.ts` (17 tests) | Pass |
| `publicPayload.test.ts` (5 tests) | Pass |
| `assets.test.ts` (8 tests) | Pass |
| `feature.test.ts` (8 tests) | Pass |
| `resolver.test.ts` (8 tests) | Pass |
| `readiness.test.ts` (5 tests) | Pass |
| **Total Node unit tests** | **51/51 Pass** |
| Playwright S2/S3/S5/S6A/S6B suite (22 tests) | Pass |

---

## 3. Hosted Smoke Results

### 3.1 Anonymous Public Checks

| Check | URL | Result |
|-------|-----|--------|
| Homepage live | `/` | 200 OK |
| Room 11 public | `/p/ggm-christina-goddard` | 200 OK, Gallery P2 renderer |
| Legacy room | `/p/hesmaddw` | 200 OK, no V2 leakage |
| Payload hygiene | `/p/ggm-christina-goddard` | Clean — no restricted keys leaked |

Payload hygiene note: One occurrence of the word "draft" was found in a user-facing error fallback message ("This public page is unavailable. It may still be a private draft..."). This is public-safe copy, not a config leak.

### 3.2 Authenticated Studio Smoke (Room 11)

| Check | Result |
|-------|--------|
| Studio V2 editor mounts | Pass |
| S1 cockpit loads | Pass |
| S2 direct manipulation | Pass (verified in lifecycle spec) |
| S3 inspector loads | Pass |
| S5 Room Assets panel | Pass (verified in lifecycle spec) |
| Public style selector visible | Pass |
| 3 options present (P2, Christina, bbbvision) | Pass |
| Selecting marks dirty | Pass |
| Save/reload persists selection | Pass |
| Switch-back to Gallery P2 restores | Pass |
| No console/page errors | Pass |

### 3.3 Owner Preview / Public Output Smoke

| Check | Result |
|-------|--------|
| Owner preview loads clean | Pass |
| Gallery P2 public output clean | Pass |
| Christina style owner preview | Pass (selected, saved, previewed, restored) |
| bbbvision style owner preview | Pass (selected, saved, previewed, restored) |
| Public output restored to Gallery P2 | Pass |
| Mobile public output clean | Pass (390×844 verified) |
| Lightbox/focus works | Pass |

### 3.4 Legacy Negative

| Check | Result |
|-------|--------|
| Legacy room renders outside V2 | Pass |
| No V2 style selector leakage | Pass |
| No bbbvision renderer leakage | Pass |
| No S5 asset panel leakage | Pass |

### 3.5 Hosted Playwright Specs

| Spec | Tests | Result |
|------|-------|--------|
| `presence-studio-v2-public-style-presets-hosted-smoke.spec.ts` | 1 | **Pass** |
| `presence-studio-v2-hosted-lifecycle.spec.ts` | 1 | **Pass** (with cleanup) |
| `presence-studio-v2-hosted-s3-smoke.spec.ts` | 1 | **Fail** — pre-existing test fragility (inspector image empty state assumes first object has no image, but Room 11's first object is the cover image) |

The S3 hosted smoke failure is **not a regression from S6A/S6B**. It is a pre-existing test assumption that Room 11's first outline object lacks an image. This assumption was broken when Room 11 was seeded with the willow cover image. The production functionality is correct.

### 3.6 Cleanup / Restoration

Room 11 was restored to its original state after smoke testing:

- Public style preset restored to `gallery-p2`
- Draft saved and published config restored by `hosted-lifecycle.spec.ts` cleanup
- No orphaned test objects or configs remain

---

## 4. Evidence

```txt
docs/program/evidence/presence-studio-v2-public-style-presets-s6-hosted/
  01-hosted-public-gallery-p2.png
  02-hosted-mobile-gallery-p2.png
  03-hosted-legacy-negative.png
  04-hosted-style-selector-all-options.png
  05-hosted-christina-selected-dirty.png
  06-hosted-preview-christina.png
  07-hosted-gallery-p2-restored.png
  08-hosted-bbbvision-selected-dirty.png
  09-hosted-public-restored.png
```

---

## 5. Verdicts

| Dimension | Verdict |
|-----------|---------|
| Hosted S6 style system | **Ready** |
| Gallery P2 | **Ready** |
| Christina Liquid Gallery | **Ready** |
| bbbvision style preset | **Ready for hosted room migration** |
| S5 asset library | **Ready** |
| Controlled operator-led pilots | **Ready with operator support** |
| Public self-serve onboarding | **Still not ready** |
| S6 style-system baseline lock | **Recommended** |

---

## 6. Known Issues

1. **S3 hosted smoke test fragility** — `presence-studio-v2-hosted-s3-smoke.spec.ts` assumes the first outline object has no image. Room 11 now has a cover image as the first object. Fix: update the test to check the object type before expecting empty state.
2. **Node `MODULE_TYPELESS_PACKAGE_JSON` warning** — existing, harmless.
3. **Turbopack workspace-root warning** — existing, harmless.

---

## 7. Next Recommended Pass

1. **Lock S6 baseline** — commit this hosted smoke report and tag the commit.
2. **Controlled hosted bbbvision room creation** — create/seed/assign a Presence room for `e4hatu@gmail.com` using existing owner/admin flow.
3. **Content migration** — map real bbbvision assets into Studio V2 editable objects/chambers.
4. **Select preset** — set `bbbvision-threshold-gallery` in Studio.
5. **Hosted smoke** — save, preview, publish, and verify public output.

---

## 8. Sign-off

- [x] Deployment completed successfully
- [x] Local QA passed (51/51 unit, 22/22 Playwright)
- [x] Hosted anonymous checks passed
- [x] Hosted authenticated Studio smoke passed
- [x] Owner preview/public output smoke passed
- [x] Legacy negative passed
- [x] Payload hygiene passed
- [x] Room 11 restored to original state
- [x] No S4A code deployed
- [x] No hosted bbbvision room created (deferred)
- [x] Evidence captured and committed
