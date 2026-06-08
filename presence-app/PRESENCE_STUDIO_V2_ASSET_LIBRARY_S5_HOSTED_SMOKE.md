# Presence Studio V2 Asset / Media Library Foundations S5 Hosted Smoke

Date: 2026-06-09
Scope: Hosted deployment and smoke verification for S5 Asset / Media Library Foundations.

## 1. Deployment

Production alias:

```txt
https://your-presence.vercel.app
```

Deployment URL:

```txt
https://presence-c9nmbuzw5-emadhatu-2110s-projects.vercel.app
```

Deployment ID:

```txt
dpl_2w6Lyj9UfKiyj6PFUdokG12t3Mni
```

Vercel status: `READY`

Created: `Tue Jun 09 2026 00:07:17 GMT+1000`

Base local commit:

```txt
04886d37c0e4d05fcf81a673ef8d6f38b680a8f5
```

Note: Vercel inspect did not report a Git source commit. This deployment was run from the local S5 working tree, which includes uncommitted S5 code, tests, reports, and evidence on top of the base commit above.

## 2. Local Pre-Deploy QA

Passed:

```txt
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts
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
npx.cmd playwright test presence-studio-v2-asset-library.spec.ts --project=chromium
```

Node unit total: 48 passed.

Playwright local total: 14 passed.

Known warnings:

- Node direct TypeScript tests emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next/Turbopack warns about multiple lockfiles and inferred workspace root.

## 3. Hosted Studio Asset Panel Result

Command:

```txt
npx.cmd playwright test presence-studio-v2-asset-library-hosted-smoke.spec.ts --project=chromium --workers=1 --retries=0
```

Result:

```txt
1 passed (17.1s)
```

Verified:

- Studio V2 editor mounts at `/studio/11/editor`.
- S1/S2/S3 editor surfaces remain present: top chrome, room outline, inspector, threshold/chamber/archive tabs.
- Room Assets panel appears.
- Derived asset cards appear from hosted Room 11 object data.
- Asset detail view works.
- Media health checklist appears.
- Used-in action selects/points to the originating object.
- Replace URL flow is visible as `Replace image URL` and does not imply upload, crop, or storage.
- Corrected hosted Room 11 content shows no `Possible test asset` warning.
- Protocol-relative URL handling is covered by unit tests and no hosted Room 11 asset was incorrectly labelled local/public.
- Malformed threshold/hero media handling is covered by unit tests; no hosted malformed media was observed.
- No destructive hosted replace was performed in the S5 smoke.

Hosted Room 11 advisory state observed:

- Duplicate clean artwork URL count: 2. This is advisory only and not a renderer or payload hygiene failure.
- Public-visible media count: 3.
- Mobile-visible media count: 3.

## 4. Owner Preview Result

Route:

```txt
https://your-presence.vercel.app/studio/11/editor/preview
```

Result: PASS.

Verified:

- Owner preview renders the sanitized public V2 output.
- No Room Assets panel, media health checklist, asset warnings, replace URL controls, or S5 test IDs leak into preview.
- No editor chrome leak observed.

## 5. Public Render Result

Routes:

```txt
https://your-presence.vercel.app/p/ggm-christina-goddard
https://your-presence.vercel.app/presence/ggm-christina-goddard
```

Result: PASS.

Verified:

- Public P2 Gallery/GGM renderer remains clean.
- Lightbox/focus opens and Escape closes it.
- Mobile public output remains clean.
- No asset panel labels, warnings, health checklist, replace controls, or editor-only test IDs leak publicly.

## 6. Legacy Negative Result

Route:

```txt
https://your-presence.vercel.app/p/hesmaddw
```

Result: PASS.

Verified:

- Legacy room remains legacy.
- No V2 public renderer.
- No S5 asset panel leakage.

## 7. Hosted Payload Hygiene

Scanner:

```txt
node scripts\hosted-payload-hygiene.mjs
```

S5 editor-only terms were added to the hosted scanner.

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

Routes scanned:

- `/p/ggm-christina-goddard`
- `/presence/ggm-christina-goddard`
- `/room/11/key`
- mobile `/p/ggm-christina-goddard`

## 8. Full Hosted Lifecycle

Command:

```txt
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

```txt
1 passed (20.8s)
```

Cleanup/restoration: PASS. The lifecycle spec restored the original hosted Room 11 published/draft config through its existing cleanup path. Post-lifecycle payload hygiene remained `TOTAL_VIOLATIONS: 0`.

## 9. Evidence

Evidence path:

```txt
docs/program/evidence/presence-studio-v2-asset-library-s5-hosted/
```

Captured:

- `01-hosted-room-assets-panel.png`
- `02-hosted-media-health-checklist.png`
- `03-hosted-asset-detail-view.png`
- `04-hosted-used-in-state.png`
- `05-owner-preview-clean.png`
- `06-public-gallery-clean.png`
- `07-mobile-public-clean.png`
- `08-legacy-negative.png`

## 10. Guardrails

- No S4A unstash.
- S4A remains parked in `stash@{0}`.
- No S4A chamber-management code found in `app`, `components`, `lib`, or `tests`.
- No hosted content replacement was performed during the S5 asset panel smoke.
- Full lifecycle mutation was controlled and restored.
- No credentials were written to files.
- Exact credential scan returned no hits.
- No env files, auth state, traces, HARs, or logs are staged.

## 11. Verdicts

- Hosted S5 editor readiness: ready for operator-led pilots.
- Hosted owner preview readiness: ready.
- Hosted public output readiness: ready.
- Hosted payload hygiene readiness: ready.
- Hosted lifecycle readiness: ready.
- Controlled operator-led pilot readiness: ready with operator support.
- Public self-serve onboarding readiness: not ready.

S5 baseline can be locked after review.
