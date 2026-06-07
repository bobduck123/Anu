# Presence Public Output Recovery P2 Hosted Smoke

Date: 2026-06-08
Production alias: `https://your-presence.vercel.app`
Deployment URL: `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
Deployment ID: `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
Vercel inspect: `https://vercel.com/emadhatu-2110s-projects/presence/FjWacd3Tjxka9PpnmHgifq6dFV2J`
Commit: `f9673c80cb163c3007b8deedeedcc29d2848e9ee`
Branch: `feature/presence-ecosystem-alpha`
Room tested: Room 11, `ggm-christina-goddard`
Legacy room tested: `hesmaddw`
API: `https://anu-back-end.vercel.app`
Scope: Public Output Recovery P2 Gallery/GGM only. S4A remained parked in `stash@{0}` and was not deployed.

## 1. Preflight

Commands run:

```txt
git status
git stash list
git diff --stat
```

Result:

- Working tree was clean before P2 hosted smoke artifacts were added.
- `stash@{0}` remained `park S4A chamber management safety-audited local work`.
- `git diff --stat` was empty at preflight.
- No env files, credentials, auth state, or local credential artifacts were staged.
- S4A chamber-management code was not present in the working tree.

## 2. Local Pre-Deploy QA

All requested local gates passed:

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

- Direct Node TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Build and Playwright still emit the existing Turbopack workspace-root warning due multiple lockfiles.

## 3. Deployment

`vercel --prod` was not available on PATH in this shell. Deployment completed with:

```txt
npx vercel@latest --prod
```

Result:

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ca262tvaz-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_FjWacd3Tjxka9PpnmHgifq6dFV2J`
- Vercel project: `emadhatu-2110s-projects/presence`
- Target: production
- Status: Ready
- Region: `iad1`
- Build: Next 16.2.7, 29 static pages, 0 errors

## 4. Hosted Public Output Smoke

Spec added and run:

```txt
npx.cmd playwright test presence-public-output-recovery-p2-hosted.spec.ts --project=chromium --workers=1
```

Result:

- Initial sandboxed attempt was blocked by network access before hosted data was touched.
- First escalated run passed on retry after production alias warm-up.
- Warmed rerun passed cleanly: `1 passed (40.6s)`.

Verified on `https://your-presence.vercel.app/p/ggm-christina-goddard` and `https://your-presence.vercel.app/presence/ggm-christina-goddard`:

- Threshold-to-chamber gradient bridge appears.
- CTA portal mark appears, is text-first, and keeps an accessible tap target.
- Chamber index is visually softened with no visible numbered `01` style labels.
- Chamber headings read as uppercase wall placards with rule treatment, not webpage H2s.
- Artwork wall-label treatment appears.
- Lead artwork hierarchy appears.
- Hover/focus state changes are visible.
- Lightweight artwork focus/lightbox opens, shows only public-safe image/title/meta/detail, and closes with Escape.
- Mobile threshold and chamber remain usable.
- No editor chrome, control-plane classes, restricted config names, or fake live/social proof appeared in the public renderer.

Hosted content caveat:

- The currently hosted Room 11 media/content includes a prior blue `Harmless V1B Test / Hosted Smoke Image` asset. The P2 renderer and smoke checks are clean, but the hosted media state is not the final client-facing Gallery/GGM curation. That content state pre-existed this pass and was preserved by lifecycle restoration.

## 5. Owner Preview And Studio Regression

Owner credentials were supplied through runtime environment variables only and were not written to files.

Owner preview:

- URL: `https://your-presence.vercel.app/studio/11/editor/preview`
- Result: ready.
- Draft preview banner rendered.
- Upgraded P2 public renderer appeared.
- Threshold transition appeared.
- No editor handles/chrome leaked into the preview renderer.
- No restricted renderer terms were found.

Studio regression:

- URL: `https://your-presence.vercel.app/studio/11/editor`
- Result: ready.
- Studio V2 root mounted.
- S1/S2/S3 editor surfaces remained visible: top chrome, outline, inspector, Threshold/Chamber/Archive tabs, and chamber tabs.
- P2 public output changes did not affect editor layout.
- Legacy owner editor shell did not mount for Room 11.

## 6. Legacy Negative

Exact URL used:

```txt
https://your-presence.vercel.app/p/hesmaddw
```

Result: ready.

- Legacy room remained on the legacy public renderer.
- No `.presence-studio-v2-public` renderer was present.
- No `.v2-public-threshold-transition` treatment was present.
- No Gallery/GGM P2 CSS treatment leaked into the legacy room.

## 7. Hosted Payload Hygiene

Hosted payload hygiene script was run before and after the full hosted lifecycle smoke:

```txt
node scripts\hosted-payload-hygiene.mjs
```

Pre-lifecycle result:

```txt
TOTAL_VIOLATIONS: 0
PASS: true
```

Post-lifecycle result:

```txt
TOTAL_VIOLATIONS: 0
PASS: true
```

Additional public marker check after lifecycle found no `Phase E V2 hosted smoke` residue on the public Room 11 route.

## 8. Full Hosted Lifecycle Smoke

Command:

```txt
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

- `1 passed (48.7s)`.
- Real owner sign-in completed.
- V2 editor mounted.
- Controlled edit/save/preview/publish/public lifecycle completed.
- Cleanup/restoration completed by the spec.
- Post-lifecycle payload hygiene remained clean.
- Post-lifecycle public marker scan found no smoke residue.

## 9. Evidence

Evidence path:

```txt
docs/program/evidence/presence-public-output-recovery-p2-hosted/
```

Screenshots captured:

| # | File | Purpose |
|---|------|---------|
| 01 | `01-hosted-gallery-threshold-desktop.png` | Hosted Gallery/GGM threshold desktop |
| 02 | `02-hosted-threshold-to-chamber-bridge.png` | Threshold-to-chamber bridge |
| 03 | `03-hosted-chamber-gallery-placards.png` | Chamber/gallery placards |
| 04 | `04-hosted-wall-label-artwork-treatment.png` | Artwork wall-label treatment |
| 05 | `05-hosted-lead-artwork-hierarchy.png` | Lead artwork hierarchy |
| 06 | `06-hosted-cta-portal-mark.png` | CTA portal mark |
| 07 | `07-hosted-hover-focus-state.png` | Hover/focus state |
| 08 | `08-hosted-lightbox-open-state.png` | Lightbox open state |
| 09 | `09-hosted-mobile-threshold.png` | Mobile threshold |
| 10 | `10-hosted-mobile-chamber.png` | Mobile chamber |
| 11 | `11-hosted-owner-preview-clean.png` | Owner preview clean |
| 12 | `12-hosted-studio-regression.png` | Studio regression |
| 13 | `13-hosted-legacy-negative.png` | Legacy negative |

## 10. Files Changed By Hosted Pass

- `tests/e2e/presence-public-output-recovery-p2-hosted.spec.ts`
- `docs/program/evidence/presence-public-output-recovery-p2-hosted/`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_HOSTED_SMOKE.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_REPORT.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_ART_DIRECTION_AUDIT.md`
- `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `docs/program/presence-studio-v2-public-output-quality/PRESENCE_PUBLIC_ROOM_OUTPUT_QUALITY_AUDIT.md`

## 11. Remaining P3 Polish

- Lightbox backdrop opacity/bleed.
- Lightbox close button shape.
- Previous/next navigation in lightbox.
- More atmospheric CTA label.
- Mobile threshold wayfinding.
- Hosted Room 11 content/media restoration to final Gallery/GGM curation, separate from renderer code.

## 12. Verdicts

- Hosted Gallery/GGM P2 public output readiness: ready at renderer/deployment level, with hosted media-content caveat.
- Hosted owner preview readiness: ready.
- Hosted Studio regression readiness: ready.
- Live legacy isolation readiness: ready.
- Hosted lifecycle readiness: ready.
- Controlled operator-led pilot readiness: ready with operator support; correct hosted smoke-image media before using screenshots as final client-facing evidence.
- Public self-serve onboarding readiness: not ready.

## 13. Baseline Lock

The P2 renderer/deployment baseline can be locked after review of this evidence bundle. S4A remains parked in `stash@{0}` and absent from deployed product code. Hosted Room 11 media/content should be corrected in a separate controlled data pass before final public storytelling screenshots are treated as client-facing.

## 14. Release Baseline Lock - 2026-06-08

P2 renderer baseline was locked in Git without hosted content mutation.

- Baseline commit: `4bbfce9dcbbd884dc9780391fcec353186dd7b24`
- Commit message: `feat(public-output): deploy hosted-verified gallery polish`
- Push target: `origin/feature/presence-ecosystem-alpha`
- Release report: `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_RELEASE_BASELINE_REPORT.md`
- Secret hygiene: passed; no credentials or auth artifacts committed.
- Local QA: passed after hosted smoke.
- S4A: still parked in `stash@{0}`.

Controlled content/media correction may begin after this baseline is pushed and reviewed.
