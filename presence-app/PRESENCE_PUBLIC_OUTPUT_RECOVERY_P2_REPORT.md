# Presence Public Output Recovery P2 Report

Date: 2026-06-07
Scope: Gallery/GGM public renderer art-direction polish
Status: Deployed and hosted-smoked; renderer baseline ready with hosted media-content caveat

## Objective

Move Gallery/GGM public output from deployable P1 quality toward high-quality pilot presentation without changing Studio editor behavior, backend contracts, feature gating, public payload shape, or hosted data.

S4A Chamber Management remains parked in `stash@{0}` and was not included.

## P2 Polish Implemented

- Added a Gallery-only threshold-to-chamber transition band so the dark threshold dissolves into the gallery wall instead of hard-cutting.
- Refined the threshold CTA from a filled pill into a thinner text-first portal mark with a circular entry glyph and stronger focus-visible state.
- Removed visible numbered chamber index styling from Gallery threshold wayfinding; wayfinding remains accessible but no longer reads as app navigation.
- Changed Gallery chamber titles into small wall-placard labels instead of oversized webpage section headings.
- Reworked Gallery object captions into wall-label treatment with rule, smaller title, uppercase meta, and restrained detail reveal.
- Added curatorial hierarchy with the first image-led Gallery object treated as the lead artwork.
- Added restrained hover/focus interactions for artwork frames and portal/link objects.
- Implemented lightweight public-safe artwork focus/lightbox using sanitized public image/title/meta/detail only.
- Kept mobile Gallery output designed: threshold bridge, accessible CTA, placard-sized chamber labels, visible artwork focus control, and mobile-safe focus view.

## Files Changed

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `tests/e2e/presence-public-output-gallery-polish.spec.ts`
- `tests/e2e/presence-public-output-recovery-p2-capture.spec.ts`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_REPORT.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_REPORT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `docs/program/presence-studio-v2-public-output-quality/PRESENCE_PUBLIC_ROOM_OUTPUT_QUALITY_AUDIT.md`
- `docs/program/evidence/presence-public-output-recovery-p2/`

## Tests Run

Passed:

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

Notes:

- The P2 capture spec reported its single test as `ok` and wrote all screenshots, then the shell wrapper timed out during Playwright web-server teardown. Evidence files are present.
- Direct Node TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Build and Playwright still emit the existing Turbopack workspace-root warning due multiple lockfiles.
- `v2 s4-7.pdf` was not found under `presence-app` or the accessible `C:\Dev\Flora_fauna` tree, so this pass applied the supplied high-level principles from the prompt: room as instrument, clean public renderer, no fake features, mobile recovery, reduced motion, and honest state.

## Evidence

```txt
docs/program/evidence/presence-public-output-recovery-p2/
```

Captured:

- `01-gallery-threshold-transition-desktop.png`
- `02-threshold-to-chamber-bridge.png`
- `03-refined-cta-portal-mark.png`
- `04-softened-gallery-wayfinding.png`
- `05-gallery-label-chamber-entry.png`
- `06-wall-label-artwork-treatment.png`
- `07-artwork-focus-lightbox.png`
- `08-gallery-mobile-threshold.png`
- `09-gallery-mobile-chamber.png`
- `10-owner-preview-clean.png`
- `11-legacy-negative.png`

## Payload Hygiene

Public payload hygiene remains clean through:

- `lib/presence/render/publicPayload.test.ts`
- `tests/e2e/presence-public-payload-hygiene.spec.ts`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`
- `tests/e2e/presence-public-output-gallery-quality.spec.ts`
- `tests/e2e/presence-public-output-gallery-polish.spec.ts`

The new artwork focus view uses only sanitized public image/title/meta/detail and does not expose editor handles, internal config names, hidden state, owner data, or Studio chrome.

## Remaining Visual Gaps

- Non-gallery worlds still need their own public-output recovery passes.
- Full image curation still depends on pilot content quality and public-safe media selection.
- Lightbox focus is intentionally minimal: no carousel, no deep artwork archive, no upload/crop, no analytics.
- Hosted verification has now passed; remaining hosted work is content/media correction for final client-facing Gallery/GGM screenshots.

## Art-Direction Audit

**Auditor:** Kimi Code CLI (2026-06-08)
**Score:** **8.3/10**
**Verdict:** **PASS — deploy to hosted smoke**

Full audit:
`PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_ART_DIRECTION_AUDIT.md`

Key findings:
- Threshold cinema improved to 8.5/10 (opening work caption, portal glyph, image drift).
- Threshold-to-chamber transition improved to 8.1/10 (gradient bridge band).
- Gallery atmosphere improved to 8.4/10 (placard headings, wall labels, editorial grid).
- Lightbox/focus added at 7.9/10 (museum matting, curatorial caption, mobile stack).
- Mobile experience improved to 8.0/10 (threshold preserved, placard labels, focus trigger always visible).
- Hover/micro-interactions added at 8.1/10 (frame offset, image lift, shadow deepen).
- All P1 art-direction gaps closed.
- Remaining P2/P3 polish: lightbox backdrop opacity, close button shape, prev/next navigation, CTA label copy.

## Art-Direction Audit Recommendation

Pre-deploy audit recommendation: **deploy to hosted smoke.** P2 met all deploy thresholds:
- Overall ≥ 8.3/10 ✅
- Threshold ≥ 8.0/10 ✅
- Gallery/chamber ≥ 8.0/10 ✅
- Mobile ≥ 7.5/10 ✅
- Payload hygiene passes ✅
- No editor/system leakage ✅
- No S4A leakage ✅
- Legacy rooms unaffected ✅

Hosted preview/public/legacy/payload hygiene checks have now passed. Address lightbox backdrop opacity as the first P3 polish item.

## Hosted Deployment And Smoke - 2026-06-08

P2 was deployed to production and hosted-smoked after the Kimi art-direction audit passed.

Deployment:

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
- Commit: `f9673c80cb163c3007b8deedeedcc29d2848e9ee`
- S4A: still parked in `stash@{0}` and not deployed.

Hosted verification:

- Gallery/GGM P2 hosted public smoke: `1 passed (40.6s)` on warmed rerun.
- Owner preview: ready; P2 renderer appears with no editor chrome leakage.
- Studio regression: ready; Studio V2 editor mounts with S1/S2/S3 surfaces intact.
- Legacy negative: ready; `https://your-presence.vercel.app/p/hesmaddw` remains legacy with no V2/P2 leakage.
- Hosted payload hygiene: `TOTAL_VIOLATIONS: 0` before and after lifecycle.
- Full hosted lifecycle: `1 passed (48.7s)` with cleanup/restoration complete.

Hosted evidence:

```txt
docs/program/evidence/presence-public-output-recovery-p2-hosted/
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_HOSTED_SMOKE.md
```

Hosted content caveat:

- The live Room 11 media state includes a prior blue `Harmless V1B Test / Hosted Smoke Image` asset. This pass preserved hosted data and verified the renderer/deployment baseline. A separate controlled content/media correction pass is recommended before final client-facing Gallery/GGM screenshots are used.

Updated verdicts:

- Gallery/GGM P2 public output: ready at renderer/deployment level, with hosted media-content caveat.
- Owner preview: ready.
- Studio regression: ready.
- Legacy isolation: ready.
- Hosted lifecycle: ready.
- Controlled operator-led pilot: ready with operator support.
- Public self-serve onboarding: not ready.
