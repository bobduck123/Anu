# Presence V3 Chamber Dynamics Pass 4 Public Renderer Report

Date: 2026-06-09

## Summary

Pass 4 makes the Studio V2 public renderer consume chamber metadata for bbbvision without changing hosted data or deployment state. bbbvision now resolves threshold, gallery, and practice/about public states from sanitized chamber metadata when available, while preserving the recovered no-metadata fallback flow.

No hosted room 29 mutation was performed. No deploy was run. Hosted smoke was not run.

## Files Changed

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `lib/presence/studio-v2/chambers.ts`
- `lib/presence/studio-v2/chambers.test.ts`
- `tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts`
- `tests/e2e/presence-studio-v2-chamber-dynamics.spec.ts`
- `scripts/hosted-bbbvision-migration-smoke.mjs`
- `docs/program/evidence/presence-v3-chamber-dynamics-p4-public-renderer/qa-results.md`

Regression specs also refreshed screenshot artifacts in existing S5 and public-style evidence folders.

## Metadata Consumption Behaviour

bbbvision now resolves public state chambers in this order:

- Threshold: explicit `metadata.isEntry`, then `metadata.role === "threshold"`, then the recovered heuristic fallback.
- Gallery: `metadata.role === "gallery"`, then explicit default chamber if it is not also the threshold chamber, then fallback gallery object heuristics.
- Practice/about: `metadata.role === "practice"`, then `metadata.role === "about"`, then fallback text/story heuristics.

The renderer uses public-safe data attributes for test observability:

- `data-chamber-role`
- `data-chamber-layout`
- `data-chamber-transition`

These are not rendered as visible visitor labels.

## bbbvision Fallback Behaviour

The no-metadata bbbvision mock still opens on threshold, hides gallery/practice on initial load, enters gallery through Enter, supports previous/next movement, supports keyboard movement, supports practice as a separate state, supports browser back from gallery to threshold, and remains mobile/reduced-motion safe.

Fallback state sections expose `data-chamber-role="fallback"` for test-only verification.

## Public Initial State And Routing

The initial bbbvision public state remains threshold-first. Existing hash/back behaviour is preserved:

- default route opens threshold
- Enter moves to gallery
- `#gallery` and `#practice` remain client-side view states
- browser back can return from gallery to threshold

No Next route rewrite or backend routing change was introduced.

## Public Metadata Leakage

Payload hygiene passed. The bbbvision parity spec also scans visible public text for metadata/CMS labels such as `metadata`, `isEntry`, `isDefault`, `role:`, and `chamber metadata`.

Allowed test-only data attributes are present in HTML, but no editor/chamber metadata labels are visible to visitors.

## Renderer Safety

Gallery P2 and Christina Liquid Gallery are visually unchanged by this pass. Public style preset tests still switch to Christina, preview selected-works sequence, publish, return to Gallery P2, and verify legacy negative behavior.

Legacy rooms remain outside the V2 renderer.

## Tests Run

Required local QA:

- `npm.cmd run typecheck`: pass
- `npm.cmd run build`: pass
- `node --experimental-strip-types --test lib\presence\studio-v2\chambers.test.ts`: 36 passed
- `node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts`: 8 passed
- `node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts`: 8 passed
- `node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts`: 22 passed
- `node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts`: 5 passed
- `node --experimental-strip-types --test lib\presence\render\resolver.test.ts`: 8 passed
- `node --experimental-strip-types --test lib\editor\readiness.test.ts`: 5 passed
- `npx.cmd playwright test presence-studio-v2-bbbvision-parity.spec.ts --project=chromium`: 2 passed
- `npx.cmd playwright test presence-studio-v2-chamber-dynamics.spec.ts --project=chromium`: 16 passed
- `npx.cmd playwright test presence-studio-v2-public-style-presets.spec.ts --project=chromium`: 1 passed
- `npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium`: 3 passed
- `npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium`: 2 passed
- `npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1`: 2 passed

Optional broader regressions:

- `presence-studio-v2-direct-manipulation.spec.ts`: 2 passed
- `presence-studio-v2-asset-library.spec.ts`: 1 passed
- `presence-studio-v2-inspector-usability.spec.ts`: 4 passed
- `presence-public-output-gallery-quality.spec.ts`: 3 passed
- `presence-public-output-gallery-polish.spec.ts`: 3 passed

## Evidence Path

`docs/program/evidence/presence-v3-chamber-dynamics-p4-public-renderer/`

Key evidence:

- `01-studio-style-selector-bbbvision.png`
- `02-owner-preview-threshold.png`
- `03-owner-preview-gallery-active.png`
- `06-owner-preview-practice.png`
- `10-mobile-threshold.png`
- `11-mobile-gallery.png`
- `12-reduced-motion-gallery.png`
- `14-studio-metadata-authored-chambers.png`
- `15-preview-metadata-threshold.png`
- `16-preview-metadata-gallery.png`
- `17-preview-metadata-practice.png`
- `18-public-metadata-threshold.png`
- `19-public-metadata-gallery.png`
- `20-public-metadata-practice.png`
- `qa-results.md`

## Hosted Smoke And Deploy Status

- Hosted smoke: not run.
- Hosted data mutation: none.
- Deployment: not run.
- Hosted room 29 metadata mutation: not required.

`scripts/hosted-bbbvision-migration-smoke.mjs` was updated for future hosted smoke to record threshold/gallery role attributes and detect visible metadata labels, but it was not executed in this pass.

## S4A Status

S4A remains parked in `stash@{0}`:

```txt
stash@{0}: On feature/presence-ecosystem-alpha: park S4A chamber management safety-audited local work
```

No S4A code was unstashed or merged.

## Remaining Limitations

- Metadata consumption is currently implemented for bbbvision as the first stateful consumer. Generic V2 public output still renders chamber content normally.
- Transition/layout metadata is consumed as public state selection and test-visible hints; no global animation engine, WebGL runtime, or GSAP timeline was added.
- **2026-06-08 Gallery Parity Pass** rebuilt the bbbvision gallery view into a spatial constellation layout with mouse parallax and minimal chrome. This is closer to the original but still DOM-based, not canvas. See `PRESENCE_V3_BBBVISION_GALLERY_PARITY_REPORT.md`.
- Hosted room 29 should not be updated or deployed until Kimi audit reviews this pass.

## Audit Readiness

Ready for Kimi audit before hosted deployment.
