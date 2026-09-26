# Option Alias Exposure and Language - 2026-08-17

## Scope

This pass reconciles the current spatial component registry, Presence option alias layer and internal operator palette after the P0 primitive implementation. It exposes reusable components and internally cleared candidate objects through stable option aliases, updates operator-facing labels, and separates planned options from future/no-contract display ideas.

This is an internal authoring/catalog evidence pass only. It does not add geometry, public routes, backend persistence, auth, tenant changes, publish behavior, commerce, multiplayer, component admission, Mobstar creative acceptance or public launch claims.

## Registry vs Alias Audit

Current real state after audit:

| Area | Count | Result |
| --- | ---: | --- |
| Presence registered component refs audited | 27 | 22 exposed through option aliases; 5 intentionally hidden |
| Internally cleared candidate component refs audited | 5 | 5 exposed through candidate option aliases |
| Presence room-kit aliases | 3 | 2 available procedural rooms, 1 deferred candidate room |
| Candidate room-kit aliases | 1 | `presence.roomkit.ribbed-concrete@0.1.0`, still needs art pass |

Intentionally hidden registered components:

- `presence.room-shell@1.0.0` - foundation shell; exposed through room options, not as a standalone palette object.
- `presence.floor-slab@1.0.0` - foundation floor; created with rooms and intentionally not added as a loose object.
- `presence.boutique-shell@1.0.0` - room shell for Dark Gallery Room; exposed through the room option only.
- `presence.floor-slab@2.0.0` - Dark Gallery Room floor variant; exposed through the room option only.
- `presence.candidate-display-island@1.0.0` - Draco runtime proof component; use stable candidate object aliases instead of exposing duplicate proof plumbing.

Every other `presence.*` registered component now has an alias, including `presence.piece-plane@1.0.0` and `presence.garment-hanger@1.0.0`.

## Components Newly Exposed

New or newly reconciled procedural aliases:

- `presence.object.divider-wall@0.1.0` -> `presence.divider-wall@1.0.0`
- `presence.object.garment-rack@0.1.0` -> `presence.retail-rack@1.0.0`
- `presence.surface.display-table@0.1.0` -> `presence.display-table@1.0.0`
- `presence.surface.display-plinth@0.1.0` -> `presence.display-plinth@1.0.0`
- `presence.surface.display-block@0.1.0` -> `presence.product-display-block@1.0.0`
- `presence.surface.display-shelf@0.1.0` -> `presence.display-shelf@1.0.0`
- `presence.surface.display-bay@0.1.0` -> `presence.display-bay@1.0.0`
- `presence.display.projection-grid@0.1.0` -> `presence.projection-wall@2.0.0`

Planned aliases with component refs but disabled active placement:

- `presence.work.media-plane@0.1.0` -> `presence.piece-plane@1.0.0`
- `presence.object.garment-hanger@0.1.0` -> `presence.garment-hanger@1.0.0`

These two are visible because they are important operator concepts. They remain `needs-implementation` because direct placement requires host/slot targeting. Today, media planes are created through media assignment, and garment hangers are supported in fixtures/rack contexts rather than direct palette placement.

## Candidate Aliases Added

Internally cleared candidate components now all have stable Presence candidate aliases:

- `presence.candidate.stone-plinth@0.1.0` -> `candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0`
- `presence.candidate.stacked-risers@0.1.0` -> `candidate.chair.interior-7-3bc1-013@1.0.0`
- `presence.candidate.wire-chair@0.1.0` -> `candidate.decorative-prop.interior-7-3bc1-009@1.0.0`
- `presence.candidate.tripod-light@0.1.0` -> `candidate.chair.interior-7-3bc1-000@1.0.0`
- `presence.candidate.fabric-drape@0.1.0` -> `candidate.shelf.retopo-g-555780-0ae2-013@1.0.0`

Candidate aliases preserve:

- `available-now-candidate` status;
- `candidate-cleared-for-internal-use` review status;
- `not-admitted`;
- `candidate`, `internal-use only` and `not production-ready` warnings;
- candidate warning flags such as `needs-3d-review` and `needs-scale-review`;
- provenance source refs without raw `.blend`, `.glb` or `.gltf` paths in alias JSON.

The original candidate registry and manifest were not mutated.

## P0 Primitive Reconciliation

- Archive Wall remains `available-now-procedural`, `not-admitted`, `not production-ready`, grouped under Works & Media.
- Listening Station remains `available-now-procedural`, `not-admitted`, `not production-ready`, grouped under Works & Media. Its fallback explicitly says no audio playback is claimed.
- Spherical Gallery remains `internal-experimental`, `not-admitted`, `not production-ready`, grouped under Future Display Systems with clear impossible-display warning language.

No P0 alias collides with the remaining `presence.display.orbital-carousel@future` future option.

## Naming Changes

Stable option IDs were preserved where changing them could break saved `optionRef`s. Display labels were changed instead.

Updated labels:

- `Dark Boutique Shell` -> `Dark Gallery Room`
- `Ribbed Showroom Wall` -> `Ribbed Feature Wall`
- `Product Plinth` -> `Display Plinth`
- `Product Block` -> `Display Block`
- `Framed Media Surface` -> `Framed Work`
- `Text / Sign Card` -> `Text Panel`
- `Retail rack` concept -> `Garment Rack`
- `Candidate Finds` group -> `Candidate Objects`

Legacy IDs retained for compatibility:

- `presence.object.ribbed-showroom-wall@0.1.0`
- `presence.surface.product-plinth@0.1.0`
- `presence.surface.product-block@0.1.0`
- `presence.media.framed-media-surface@0.1.0`
- `presence.media.text-sign-card@0.1.0`

Where useful, newer clearer aliases were added beside legacy IDs, such as `presence.surface.display-plinth@0.1.0` and `presence.surface.display-block@0.1.0`.

## Palette Group Changes

Room kits are now labelled as `Rooms` in the internal palette.

Presence option groups now use operator/product language:

- Walls & Dividers
- Display Furniture
- Works & Media
- Text & Labels
- Lighting & Atmosphere
- Candidate Objects
- Planned Options
- Future Display Systems

Removed as operator-facing group labels:

- Candidate Finds
- Future / Deferred

Planned Options contains buildable-known concepts that need an authoring interaction before active placement, such as Work / Media Plane and Garment on Hanger. Future Display Systems contains no-contract or future-leaning display system ideas, including Orbital Carousel and the internal-experimental Spherical Gallery.

## Namespace / Kind Reconciliation

Conservative approach:

- Existing IDs are preserved when saved layouts may already reference them.
- New clearer IDs are added for future use instead of breaking old refs.
- `surface.*` is used for display furniture/surfaces.
- `media.*` remains for legacy media-surface IDs.
- `work.*` is introduced for the planned Work / Media Plane concept because it represents owner/client content rather than furniture.
- `candidate.*` is used for internally cleared candidate objects and keeps provenance language in metadata, not as the main group label.
- `display.*` is used for display systems such as projection and impossible/future displays.

Migration note: a later cleanup can migrate legacy `product-*`, `showroom-*`, `media-surface` and `text-sign-card` IDs to clearer IDs once saved-layout migration tooling exists. This pass intentionally does not rewrite saved refs.

## Saved Layout Compatibility

Existing option refs still validate:

- `presence.surface.product-plinth@0.1.0`
- `presence.surface.product-block@0.1.0`
- `presence.object.ribbed-showroom-wall@0.1.0`
- `presence.media.framed-media-surface@0.1.0`
- `presence.media.text-sign-card@0.1.0`
- P0 primitive refs from the previous pass.

Focused e2e saved a room containing:

- `presence.surface.display-island@0.1.0`
- `presence.object.archive-wall@0.1.0`
- `presence.object.listening-station@0.1.0`
- `presence.candidate.stacked-risers@0.1.0`
- `presence.display.spherical-gallery@0.1.0`

Saved JSON remained below 100 KB and contained no raw model refs.

## Tests Run

Baseline before edits:

- `git status --short --branch` - dirty `feat/spatial-authoring-baseline` worktree recorded.
- `cmd /c npm run test:spatial` - PASS, 132/132.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next multiple-lockfile workspace-root warning.

Implementation checks so far:

- `cmd /c npm run test:spatial` - initial FAIL, audit exposed missing `presence.display-shelf@1.0.0` alias.
- `cmd /c npm run test:spatial` - PASS, 136/136 after adding `presence.surface.display-shelf@0.1.0`.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c "set PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1&& npx.cmd playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep option"` - printed both focused option tests as `ok`, captured screenshot, then reproduced the known Windows Playwright webServer teardown hang and was interrupted.

Focused e2e passed assertions:

```text
ok 1 [chromium] ... candidate options palette exposes deferred room kits and persists placed candidate component refs
ok 2 [chromium] ... option alias palette loads room kits and saves stable option refs
```

Final verification:

- `cmd /c npm run test:spatial` - PASS, 136/136.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next multiple-lockfile workspace-root warning.

## Screenshot

Focused screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/15-option-alias-exposure-language.png`
- Size: 1,409,386 bytes

The screenshot captures the internal option palette with operator-facing group labels, planned options, future display systems and candidate object aliases.

## Limitations

- Work / Media Plane and Garment on Hanger are visible planned options, but direct placement still needs host/slot targeting.
- Candidate aliases are internal-use only and still require 3D/art/scale review before any admission decision.
- Spherical Gallery remains internal-experimental and should not be treated as public-ready.
- Legacy option IDs remain in place until a saved-layout migration exists.

## Rollback Notes

Rollback is bounded:

- remove the newly added option aliases;
- revert display labels and palette group names in `optionAliases.ts`;
- revert the room-kit palette heading in `SpatialObjectArranger.tsx`;
- remove the added audit tests and focused e2e assertions;
- remove this evidence note and screenshot link.

No backend, auth, tenant, publish, route, production-data or asset rollback is required.

## Acceptance Classification

Accepted as internal option alias exposure and taxonomy reconciliation evidence once final verification completes.

Not accepted as component admission, candidate admission, Mobstar creative acceptance, public launch readiness, self-serve readiness, backend persistence or publish readiness.
