# Presence Studio V2 Asset / Media Library Foundations S5 Report

Date: 2026-06-08
Scope: Editor-only derived asset/media foundations for Studio V2. No hosted data mutation. No deploy.

## 1. S5 Features Implemented

Implemented an honest Room Assets layer that is derived from existing Studio V2 room objects:

- Derived asset registry scans current `StudioV2State.chambers[].objects[]`.
- Room Assets panel appears in the existing left Studio rail.
- Media health checklist reports total media assets, missing URLs, broken/unloaded thumbnails, suspected test assets, duplicate URLs, external URLs, public-visible media, and mobile-visible media.
- Asset cards show thumbnails, object title, chamber/object usage, status badges, and used-in navigation.
- Asset detail view appears in the persistent inspector when an asset is selected.
- Asset detail includes preview, full copyable URL, replace image URL field, object title, object type, chamber label, public/mobile visibility, threshold/hero context, duplicate warning, test/smoke warning, and the note: "Derived from current room objects. Upload library arrives later."
- Replace URL flow updates the selected object's existing `image.src` through Studio V2 state.
- Dirty state appears after replacement.
- Save/reload persists replacement through the existing owner draft API path.
- Owner preview and public render remain clean; asset warnings are editor-only.
- Broken/unloaded thumbnail detection is advisory via editor image load error.

## 2. Files Changed

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `lib/presence/studio-v2/assets.ts`
- `lib/presence/studio-v2/assets.test.ts`
- `lib/presence/studio-v2/index.ts`
- `tests/e2e/presence-studio-v2-asset-library.spec.ts`
- `tests/e2e/presence-studio-v2-asset-library-hosted-smoke.spec.ts`
- `scripts/hosted-payload-hygiene.mjs`
- `docs/program/evidence/presence-studio-v2-asset-library-s5/`
- `docs/program/evidence/presence-studio-v2-asset-library-s5-hosted/`
- `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_REPORT.md`
- `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_AUDIT.md`
- `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_HOSTED_SMOKE.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`

## 3. Model / Adapter Changes

No model fields were changed.

No adapter behavior was changed.

The existing object media shape remains:

```txt
object.image.src
object.image.alt
```

S5 adds `lib/presence/studio-v2/assets.ts`, a pure derived registry helper. It does not alter public payload shape, backend contracts, draft save payload semantics, or public projection.

Post-audit P1 follow-up added `lib/presence/studio-v2/assets.test.ts` and tightened two safety edges in the derived helper:

- Protocol-relative URLs such as `//cdn.example.com/image.webp` are now treated as unsupported rather than local/public paths.
- Threshold/hero auto-detection now uses the same normalized URL test as the asset registry, so malformed non-string `image.src` values cannot be selected as threshold media.

## 4. Derived Now vs Future Library

Real now:

- Derived Room Assets from current object image/media state.
- Status and health advisory checks.
- URL replacement through selected object state.
- Save/reload through existing draft persistence.
- Owner preview/public render hygiene protection.

Deferred future work:

- Real upload.
- Crop/edit pipeline.
- Persistent backend asset table.
- CDN/storage management.
- Version history.
- Multi-replace for duplicate URLs.
- Approval workflow.
- Archive restore workflow.

S5 intentionally avoids showing fake upload/crop/library capabilities.

## 5. Tests Run

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

Known warnings:

- Node direct TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next/Turbopack still warns about multiple lockfiles and inferred workspace root.

## 6. Evidence

Evidence path:

```txt
docs/program/evidence/presence-studio-v2-asset-library-s5/
```

Captured:

- `01-asset-panel-overview.png`
- `02-asset-detail-view.png`
- `03-asset-used-in-state.png`
- `04-missing-image-state.png`
- `05-replace-url-flow.png`
- `06-suspected-test-asset-warning.png`
- `07-media-health-checklist.png`
- `08-owner-preview-clean.png`
- `09-public-render-clean.png`

## 7. Remaining Limitations

- Multi-replace is intentionally deferred; replacing a duplicate URL updates selected object only.
- Broken/unloaded status is detected from browser image load failure during the editor session, not a backend crawl.
- External URL validation is advisory; operators still need to confirm public stability and usage rights.
- Asset registry derives only from Studio V2 object image/media state, not from a persistent upload archive.
- No hosted Room 11 data was mutated in this pass.

## 8. Audit Result

**Auditor:** Kimi Code CLI (2026-06-08)
**Report:** `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_AUDIT.md`
**Verdict:** CONDITIONAL PASS — deploy allowed, fix listed P1 soon.

| Dimension | Score |
|-----------|-------|
| Derived asset registry correctness | 8/10 |
| Asset panel UX honesty | 9/10 |
| Replace URL flow | 9/10 |
| Payload hygiene | Pass |
| S1/S2/S3/P2 regression | Pass |
| S4A parking | Pass |

**Tests:** 14 Playwright passed, 40 Node unit tests passed, TypeScript + build passed.
**Leakage:** No asset warnings, test IDs, or editor-only copy leak to public/preview.
**Honesty:** No fake upload/crop/storage/library implied anywhere.

**P1 fix before next refactor:** Add `lib/presence/studio-v2/assets.test.ts` covering registry derivation, URL validation, and status edge cases.

## 8.1 Post-Audit P1 Unit-Test Closure

Status: complete on 2026-06-08.

Added focused unit coverage for:

- Registry derivation from Studio V2 objects only.
- Object ID, title, type, chamber ID, and chamber label mapping.
- Duplicate URL detection and repeated usage counts.
- Public/mobile visibility counts.
- Empty room and no-media safe registry output.
- URL validation for empty, local/public, external, unsupported, protocol-relative, trimmed, and relative paths.
- Status derivation for missing, broken/unloaded, duplicate, possible test/smoke, external, local/public, and clean valid artwork.
- Smoke/test terms in URL, title, and alt text: `smoke`, `test`, `harmless`, `hosted-smoke`, `v1b`.
- Safety invariants: no input mutation, no raw editor/private config fields in registry output, and tolerance for partial malformed image fields.
- Threshold/hero heuristic: auto-detected as the first public-visible object with a normalized image URL.

Bug fixes made:

- Protocol-relative URLs are no longer misclassified as local/public paths.
- Threshold/hero detection no longer treats truthy malformed `image.src` values as valid image URLs.

Required QA rerun passed in full. S5 is now clean for hosted deployment, pending the normal hosted smoke process. S4A remains parked in `stash@{0}`.

## 9. Hosted Deployment / Smoke

Status: complete on 2026-06-09.

Hosted smoke report:

```txt
PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_HOSTED_SMOKE.md
```

Deployment:

```txt
Production alias: https://your-presence.vercel.app
Deployment URL: https://presence-c9nmbuzw5-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_2w6Lyj9UfKiyj6PFUdokG12t3Mni
Base local commit: 04886d37c0e4d05fcf81a673ef8d6f38b680a8f5
```

Note: Vercel inspect did not report a Git source commit. Deployment was performed from the local S5 working tree on top of the base commit above.

Hosted results:

- Hosted S5 editor smoke: PASS, `1 passed (17.1s)` with retries disabled.
- Owner preview: PASS, no S5 asset panel/warnings/health checklist leakage.
- Public `/p/ggm-christina-goddard`: PASS, P2 Gallery/GGM output remains clean and lightbox/focus works.
- Public `/presence/ggm-christina-goddard`: PASS.
- Mobile public output: PASS.
- Legacy negative `/p/hesmaddw`: PASS, remains legacy with no V2/S5 leakage.
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0` before and after lifecycle.
- Full hosted lifecycle: PASS, `1 passed (20.8s)`, cleanup/restoration complete.

Hosted evidence:

```txt
docs/program/evidence/presence-studio-v2-asset-library-s5-hosted/
```

Hosted advisory note:

- Corrected hosted Room 11 content shows no possible smoke/test asset warning.
- Room 11 currently has duplicate clean artwork URL usage count of 2; this is advisory and expected for the derived S5 health checklist.

## 10. Safety Verdict

Safe for Kimi audit: yes.

Safe to deploy after audit: yes. The Kimi P1 unit-test gap is closed, hosted deployment passed, and hosted smoke is clean.

S4A remains parked in `stash@{0}` and was not touched.

Public self-serve onboarding remains out of scope.
