# Room Kit Option Alias Layer - 2026-08-17

## Scope

This pass adds a bounded internal Presence option alias layer and room-kit container model for the spatial arranger. It does not create public self-serve editing, backend persistence, publish flow, auth changes, tenant changes, commerce, multiplayer, production claims, Mobstar creative acceptance or candidate admission.

The intent is to show operators stable `presence.*` option IDs instead of raw candidate dumps while keeping the renderer backed by existing component refs and fallback-safe procedural geometry.

## What Changed

- Added `SpatialOptionRef` as an optional placement field so saved layouts can retain stable option IDs beside resolved component refs.
- Added `lib/presence/spatial/optionAliases.ts` with validated Presence option aliases, room-kit containers and resolver helpers.
- Added room-kit creation through `createRoomFromPresenceRoomKitOption(...)`.
- Added `addArrangerOption(...)` so available aliases resolve to registered component refs without copying model blobs into layout JSON.
- Updated the internal arranger with separate `Presence room kits` and `Presence options` panels.
- Updated the saved-layout inspector with an `Option alias` row.
- Added unit and focused e2e coverage for alias validation, resolver mappings, deferred states, room-kit compilation, saved JSON payload and renderer branch neutrality.

## Option Aliases Created

Room kit aliases:

- `presence.roomkit.dark-boutique@0.1.0` - available-now-procedural.
- `presence.roomkit.white-cube-gallery@0.1.0` - available-now-procedural.
- `presence.roomkit.ribbed-concrete@0.1.0` - needs-art-pass, candidate room kit, disabled.

Object, display and media aliases:

- `presence.object.gallery-wall@0.1.0`
- `presence.object.ribbed-showroom-wall@0.1.0`
- `presence.object.soft-divider-drape@0.1.0`
- `presence.object.light-fixture@0.1.0`
- `presence.object.suspended-rack@0.1.0`
- `presence.surface.display-island@0.1.0`
- `presence.surface.product-plinth@0.1.0`
- `presence.surface.product-block@0.1.0`
- `presence.display.projection-wall@0.1.0`
- `presence.media.framed-media-surface@0.1.0`
- `presence.media.text-sign-card@0.1.0`
- `presence.candidate.stone-plinth@0.1.0`

Deferred or future aliases:

- `presence.object.listening-station@0.1.0`
- `presence.object.archive-wall@0.1.0`
- `presence.display.spherical-gallery@future`
- `presence.display.orbital-carousel@future`

No option alias is admitted. Candidate-backed options preserve candidate status and warnings.

## Room Kits Created

`presence.roomkit.dark-boutique@0.1.0` resolves to:

- procedural boutique shell;
- floor slab;
- warm nocturnal boutique material style;
- boutique product warm lighting;
- starter ribbed wall, display island, suspended rack and projection wall;
- proxy/semantic fallback.

`presence.roomkit.white-cube-gallery@0.1.0` resolves to:

- procedural room shell;
- floor slab;
- white gallery material style;
- gallery soft lighting;
- starter gallery wall, product plinth, framed media surface and text/sign card;
- proxy/semantic fallback.

`presence.roomkit.ribbed-concrete@0.1.0` remains a candidate review card only. It has no active room creation path in this pass.

## Resolver Contract

The resolver maps stable option refs to current implementation refs:

- `presence.roomkit.dark-boutique@0.1.0` -> procedural shell + floor + starter placements.
- `presence.surface.display-island@0.1.0` -> `presence.rounded-island@1.0.0`.
- `presence.display.projection-wall@0.1.0` -> `presence.projection-wall@1.0.0`.
- `presence.candidate.stone-plinth@0.1.0` -> `candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0`, still candidate and not admitted.

Saved placements keep both:

```json
{
  "componentId": "presence.rounded-island",
  "version": "1.0.0",
  "optionRef": {
    "optionId": "presence.surface.display-island",
    "version": "0.1.0"
  }
}
```

This allows future implementation swaps behind the stable option ID while preserving current renderer compatibility.

## Candidate / Procedural Distinction

- Procedural aliases reference registry components and never require candidate manifests.
- Candidate aliases use candidate source refs only as provenance and keep `available-now-candidate`, `candidate`, `not admitted` and `not production-ready` labels.
- Candidate room kits remain disabled/deferred; they are not transformed into active room templates.
- The original candidate registry is not mutated.
- Raw source paths and raw model blobs are not copied into saved layout JSON.

## Authoring Integration

The internal arranger now shows curated Presence panels ahead of raw candidate review panels:

- `Presence room kits` for stable room-kit refs.
- `Presence options` grouped as Objects, Display / Media Surfaces, Candidate Finds and Future / Deferred.
- Available procedural/candidate placement aliases can be added.
- Deferred/future aliases are visible but disabled.
- The inspector shows selected object id, component ref, stable option alias, transform, material overrides, media/skin/action refs, fallback status and GLB/proxy status.

Raw registry/candidate panels remain available for review continuity, but the stable `presence.*` layer is the intended operator-facing contract.

## Saved JSON / Payload

Measured with `presence.roomkit.dark-boutique@0.1.0`:

- room-kit layout JSON: 6510 bytes;
- eager runtime assets: 44000 bytes from existing public-safe media carried by the draft;
- total runtime assets: 250000 bytes;
- placements: 6.

Measured after adding `presence.surface.display-island@0.1.0`:

- layout JSON: 6985 bytes;
- saved draft envelope: 7179 bytes;
- placements: 7.

The saved envelope remains well under the 100 KB target. No `.blend`, `.glb` or `.gltf` source path is introduced into saved JSON by the alias layer.

## Fallback Behaviour

- Proxy geometry remains the authoring and fallback source of truth.
- Semantic fallback remains operable if WebGL, GLB loading, Draco decoding or mobile rendering fails.
- Available aliases inherit the existing component fallback contract.
- Candidate GLB visual geometry remains optional and lazy where present.
- Future/deferred options are represented as honest option intent only and cannot create active placements.

## Payload / Caching Policy

- Do not include Draco decoder bytes in eager public bundles.
- Load a decoder only when a rendered component declares Draco GLB render geometry.
- Cache the decoder globally once loaded.
- Cache component geometry by `componentId@version`.
- Keep proxy geometry as the authoring and fallback source of truth.
- Keep semantic fallback operable if GLB, Draco, WebGL or mobile rendering fails.
- Do not duplicate GLBs per client skin.
- Do not mark candidate assets admitted from alias/runtime proof alone.
- Do not copy raw GLB/GLTF source into layout JSON.

## Tests Run

Baseline before edits:

- `git status --short --branch`
- `npm run test:spatial` - passed, 121/121.
- `npm run test:spatial-assets` - passed, 30/30.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

Implementation verification:

- `cmd /c npm run test:spatial` - passed, 129/129.
- `cmd /c npm run test:spatial-assets` - passed, 30/30.
- `cmd /c npx tsc --noEmit` - passed.
- `cmd /c npm run build` - passed with the existing multiple-lockfile workspace-root warning.
- `cmd /c "set PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1&& npx.cmd playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep option"` - printed both focused option tests as `ok`, then reproduced the known Windows Playwright webServer teardown hang and was interrupted after a bounded wait.

Focused e2e printed:

```text
ok 1 [chromium] ... candidate options palette exposes deferred room kits and persists placed candidate component refs
ok 2 [chromium] ... option alias palette loads room kits and saves stable option refs
```

It did not exit cleanly after the passing assertions because the already-documented teardown hang recurred.

## Screenshot / Manual QA

Focused screenshot target:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/13-room-kit-option-alias-layer.png`

Captured screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/13-room-kit-option-alias-layer.png` - 1134785 bytes.

Visual proof:

- Presence room-kit panel visible;
- Presence option alias panel visible;
- deferred/future option disabled;
- dark boutique room kit loaded;
- display-island option added;
- inspector shows `presence.surface.display-island@0.1.0`.

## Limitations

- This is an internal authoring contract, not a public client-facing option picker.
- Room-kit containers are lightweight procedural starters, not a full template marketplace.
- Future primitives are named only; they have no renderer implementation.
- Candidate room kits still require art pass, scale review and payload review before becoming active.
- Stable saved option refs are additive; existing saved layouts without `optionRef` remain valid.

## Risks

- Operators may read a stable option ID as admission unless status labels stay visible.
- Aliases can drift from registry implementation refs if future component migrations do not update tests.
- Room-kit starter placement choices are useful for QA but are not final art direction.
- Existing carried media assets still contribute eager bytes even when the room-kit geometry itself is procedural.

## Rollback Notes

Rollback is bounded:

- remove `lib/presence/spatial/optionAliases.ts`;
- remove `optionRef` from `SpatialPlacement` and validator optional keys if no saved aliases need to be read;
- remove `addArrangerOption(...)` and `createRoomFromPresenceRoomKitOption(...)` from `arranger.ts`;
- remove Presence room-kit/option panels and inspector option alias row from the internal arranger;
- remove `optionAliases.test.ts` and the focused e2e alias test;
- remove this evidence note and screenshot.

Core procedural components, candidate manifests, Draco runtime support and public routes remain unaffected.

## Acceptance Classification

Accepted as internal Gate 4A option-alias and room-kit container evidence once final verification passes. Not accepted as public launch readiness, production readiness, Mobstar creative acceptance, backend persistence, publish readiness or component/candidate admission.
