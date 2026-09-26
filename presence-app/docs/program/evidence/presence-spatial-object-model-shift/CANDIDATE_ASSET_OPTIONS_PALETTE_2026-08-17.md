# Candidate Asset Options Palette - 2026-08-17

## Scope

This pass exposes generated GLB/GLTF candidate assets as internal authoring options. It does not admit any component, does not claim Mobstar creative acceptance, does not create public/client self-serve, and does not change auth, backend persistence, publish flow, commerce, multiplayer or public routes.

The implementation keeps three lanes separate:

- admitted/procedural Presence registry components remain the core authoring palette;
- candidate component options are filtered internal-use refs backed by the generated manifests;
- complete room kits are visible as deferred/disabled review options, not placeable component refs.

## What Changed

- Added compact candidate option metadata in `lib/presence/spatial/candidateOptions.ts`.
- Added five filtered candidate component options from the internal-use manifest.
- Added eight room/interior kit options from the generated candidate registry.
- Registered the selectable candidate components as internal authoring refs at bridge version `1.0.0`.
- Kept source candidate version `0.1.0` as provenance metadata only because that version intentionally cannot satisfy runtime component validation.
- Added a neutral `candidate-options-review` fixture that compiles through the generic spatial renderer path.
- Added an internal arranger panel for room kits and grouped candidate components.
- Added focused unit coverage and a focused Playwright path for the candidate options palette.

## Room / Interior Options

Eight room kits are exposed as review cards:

- `candidate.roomkit.boutique-0ae2` - boutique - 8538.7 KB - over-budget - disabled.
- `candidate.roomkit.living-room-06d0` - living-room - 1475.9 KB - within-budget but needs scale review - deferred.
- `candidate.roomkit.living-room-c197` - living-room - 6225.3 KB - over-budget - disabled.
- `candidate.roomkit.unknown-interior-3bc1` - unknown-interior - 2794.0 KB - deferred.
- `candidate.roomkit.unknown-interior-a5e1` - unknown-interior - 159.3 KB - needs scale review - deferred.
- `candidate.roomkit.unknown-interior-b562` - unknown-interior - 2097.2 KB - deferred.
- `candidate.roomkit.unknown-interior-ffd7` - unknown-interior - 3819.2 KB - over-budget and needs scale review - disabled.
- `candidate.roomkit.warehouse-17b3` - warehouse - 668.2 KB - deferred.

All room kits carry `candidate-review-required`, `not admitted`, `not production-ready` and `room kit only` labels. None are selectable as a placement in this pass.

## Candidate Component Options

Five filtered internal-use component options are exposed, grouped for operator review rather than showing all 118 generated components blindly:

- display: `candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0`, observed as display-island, 7.8 KB, optional Draco visual geometry.
- display: `candidate.chair.interior-7-3bc1-013@1.0.0`, observed as product-riser, 11.6 KB, proxy preview, needs 3D/scale review.
- furniture: `candidate.decorative-prop.interior-7-3bc1-009@1.0.0`, observed as showroom-seating, 51.8 KB, proxy preview, needs 3D/scale review.
- lighting: `candidate.chair.interior-7-3bc1-000@1.0.0`, observed as display-lighting-fixture, 323.8 KB, proxy preview, needs 3D/scale review.
- soft-architecture: `candidate.shelf.retopo-g-555780-0ae2-013@1.0.0`, observed as soft-division-drape, 127.0 KB, proxy preview.

Each option preserves:

- source asset id;
- original candidate version;
- observed-as label;
- category guess;
- dimensions;
- runtime size;
- placement type;
- source material slots;
- Presence material slots;
- anchors;
- GLB/proxy status;
- review status;
- payload status;
- warning flags.

## Authoring Operations Proven

Selectable candidate component refs can be:

- added to the internal arranger;
- selected in the plan/list;
- moved, rotated, duplicated and deleted through the existing arranger mutation path;
- customized with supported material overrides;
- assigned room skins;
- assigned media through compatible anchors;
- assigned HTTPS open-link actions;
- saved, reloaded, exported and imported as layout JSON;
- compiled into the existing Three/semantic renderer path.

The saved layout stores component refs such as:

```json
{
  "componentId": "candidate.table.old-church-modeling-interior-sce-ffd7-017",
  "version": "1.0.0",
  "materialSlotOverrides": {
    "tabletop": "tabletop-gallery-white"
  }
}
```

No raw GLB data or raw source path is written into layout JSON.

## Payload

The `candidate-options-review` fixture compiles with:

- layout JSON: 6818 bytes;
- eager runtime assets: 44000 bytes;
- lazy decoder bytes: 250876 bytes;
- total runtime bytes with lazy Draco decoder counted: 508864 bytes;
- placements: 6;
- actions: 2;
- semantic fallback rows: 2.

The only public candidate GLB currently available is:

- `/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`

That option remains lazy and Draco-backed. The other selected candidate components render as proxy-preview until their runtime GLBs are reviewed, optimized and copied to a public runtime path.

## GLB / Draco / Proxy / Fallback

- Draco decoder is not included in eager public bundles by this pass.
- Optional GLB visual geometry loads only when a rendered component declares Draco GLB render geometry.
- The decoder path remains `/presence-spatial/draco/gltf/`.
- The Draco loader/cache path remains generic and keyed by render geometry, not by candidate identity.
- Component geometry remains cached by component ref.
- Proxy geometry remains the authoring and fallback source of truth.
- Semantic fallback remains operable if GLB, Draco, WebGL or mobile rendering fails.
- Candidate GLBs are not duplicated per skin. Skins/material overrides remain lightweight refs.

## Status Preservation

Candidate options are labelled:

- `candidate`;
- `candidate-review-required` or `candidate-cleared-for-internal-use`;
- `internal-use only` where applicable;
- `not admitted`;
- `not production-ready`;
- `proxy preview` or `Draco visual geometry`;
- `over-budget`, `needs 3D review`, `needs scale review`, `room kit only` where applicable.

No candidate is marked admitted in the Presence component catalog.

## Tests Run

Baseline before edits:

- `git status --short --branch`
- `npm run test:spatial` - passed, 113/113.
- `npm run test:spatial-assets` - passed, 30/30.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

Implementation verification so far:

- `npm run test:spatial` - passed, 121/121.
- `npm run test:spatial-assets` - passed, 30/30.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed with the existing multiple-lockfile workspace-root warning.
- `PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1 npx.cmd playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "candidate options"` - assertion passed, 1/1, then the known Windows Playwright webServer teardown hang reproduced and the session was interrupted.

The focused e2e printed:

```text
ok 1 [chromium] ... candidate options palette exposes deferred room kits and persists placed candidate component refs
```

It did not exit cleanly after the passing assertion because the already-documented teardown hang recurred.

## Screenshot / Manual QA

Focused browser QA target:

- internal route: `/internal/spatial-object-model`;
- room kit panel visible;
- grouped candidate component panel visible;
- Draco-backed display-island candidate added;
- saved-layout inspector shows `candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0`;
- saved JSON contains candidate component refs, material overrides, media refs and action refs.

Screenshot target:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/12-candidate-options-palette.png`

Captured screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/12-candidate-options-palette.png` - 726849 bytes.

## Limitations

- Room kits are not yet room templates or replaceable room shells; they are deferred review options.
- Only one candidate GLB is currently copied to the public runtime candidate path.
- Proxy previews are not final visual review of the candidate GLBs.
- Internal-use clearance is preserved as owner-declared and not independently legally verified.
- Candidate bridge version `1.0.0` is an internal runtime ref version, not admission.
- This pass does not create backend persistence or a publishable asset workflow.

## Risks

- Internal editor bundle now includes compact candidate metadata and additional UI; this should stay internal/default-off.
- Operators may confuse `cleared-for-internal-use` with admission unless the labels remain visible.
- Proxy previews can make a candidate feel more stable than its unreviewed GLB deserves.
- Room kits that are within budget can still be unusable due to scale or art-direction issues.

## Rollback Notes

Rollback is local and bounded:

- remove `lib/presence/spatial/candidateOptions.ts`;
- remove candidate definitions/catalog aggregation from `lib/presence/spatial/registry.ts`;
- remove candidate option imports/panels from `components/presence-spatial/SpatialObjectArranger.tsx`;
- remove candidate-specific tests and the `candidate-options-review` fixture;
- remove this evidence note and any captured screenshot.

Existing core authoring components, existing candidate manifests and the public Draco proof asset remain intact.

## Acceptance Classification

Accepted as internal Gate 4A candidate-options authoring evidence if final verification passes. Not accepted as component admission, Mobstar creative acceptance, production readiness, public launch readiness or client self-serve.
