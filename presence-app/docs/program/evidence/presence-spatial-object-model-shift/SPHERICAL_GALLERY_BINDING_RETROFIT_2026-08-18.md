# Spherical Gallery Binding Retrofit - 2026-08-18

## Status

Acceptance classification: `internal-experimental retrofit evidence`.

This note records a bounded retrofit of `presence.spherical-gallery@1.0.0` onto the host-targeted content binding contract. It is not component admission, Mobstar creative acceptance, public launch readiness, backend persistence, publishing, commerce, multiplayer, audio/video playback proof, or a production/client self-serve claim.

## Why Retrofit Was Needed

Spherical Gallery existed as a P0 impossible-display primitive with twelve authored `sphere-cell-*` anchors and semantic fallback, but it did not yet prove the newer host-binding contract:

- ordered owner content as `contentBindings`
- host-level `contentArrangement`
- compiler-derived display slots/render items
- explicit overflow
- fallback rows/actions generated from bound content
- saved layouts that store references/specs instead of per-piece derived transforms

The previous risk was treating Spherical Gallery as a fixed-slot display surface. That would cap the proof at the authored twelve cells and make future owner content appear dropped or require storing derived child placements.

## New Spherical Arrangement Behaviour

Added `spherical` as a first-class `SpatialArrangementKind`.

The pure arrangement path now:

- sorts bindings by `order`, then id
- derives orbital slot transforms deterministically from binding order/count and optional seed
- supports 3, 12, 20 and 40 piece counts through the same function
- keeps every binding represented by a compiled slot and fallback row
- uses explicit overflow state when visible capacity is below total content
- preserves semantic order for fallback and overflow rows

The authored Spherical Gallery component remains the reusable host. The arrangement math is generic to the `spherical` arrangement kind rather than branching on a fixture, client slug, Mobstar id, BBB id, or candidate-specific renderer path.

## Host Binding

The internal arranger can now select Spherical Gallery, bind image/video/audio media references, and save a host placement with:

```json
{
  "contentArrangement": {
    "kind": "spherical",
    "overflowPolicy": "overflow-list",
    "capacity": 40,
    "seed": "presence.spherical-gallery@1.0.0:arranger-spherical-gallery"
  }
}
```

Bound owner content remains in `room.contentBindings`. The saved layout does not store `binding-*` child placements.

Audio/video media kinds are preserved honestly at the model/action/fallback level. This pass does not claim media playback.

## Content Count Tests

Automated unit coverage verifies spherical arrangement derivation for:

- 3 bindings
- 12 bindings
- 40 bindings

The overflow proof binds 20 content records to a Spherical Gallery host, then lowers visible capacity to 12. Compile result:

- layout JSON: 15,015 bytes
- stored derived `binding-*` placements: 0
- content bindings: 20
- derived `presence.piece-plane@1.0.0` render items: 20
- visible: 12
- overflow: 8
- generated semantic fallback rows: 20

No raw `.glb` or `.gltf` source path is introduced by this retrofit.

## Overflow Behaviour

Overflow remains explicit. Content above visible capacity is not silently dropped:

- compiled slots still exist for every binding
- overflowed slots are marked non-visible
- `SpatialContentOverflowState` reports total, visible, overflow count, page count and rejection state
- semantic fallback includes all bound content rows, including overflowed content

`reject-over-capacity` still rejects new bindings at capacity and preserves the last valid draft.

## Fallback Behaviour

Semantic fallback preserves every bound row and link-like action:

- `open-link`
- `listen`
- `watch`
- `enquire`

The mobile fallback remains an ordered gallery/card list. It is fallback-safe if WebGL, GLB, Draco, or impossible-display rendering fails.

## Screenshot

Evidence screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/17-spherical-gallery-binding-retrofit.png`

The screenshot shows the internal arranger with Spherical Gallery selected, spherical arrangement active, three bound media references, zero overflow at three items, and the mobile semantic fallback preserving listen/watch links.

## Payload Impact

No eager public bundle or public route was added. The arrangement change is TypeScript/runtime logic only and reuses the existing procedural Spherical Gallery and `presence.piece-plane@1.0.0` render path.

Measured 20-binding layout proof remains below the 100 KB layout ceiling at 15,015 bytes.

## What Remains Experimental

- Spherical Gallery remains `creativeStatus: prototype`.
- Spherical Gallery remains `admissionStatus: not-evaluated`.
- The display is an internal impossible-display primitive, not a production-admitted component.
- No audio/video playback is claimed.
- No client-specific creative acceptance is claimed.
- No public publishing or launch readiness is claimed.

## Tests Run

Baseline before edits:

- `git status --short --branch`
- `npm run test:spatial` - passed, 143/143
- `npm run test:spatial-assets` - passed, 30/30
- `npx tsc --noEmit` - passed
- `npm run build` - passed with existing Next multiple-lockfile/root warning

During retrofit:

- `npm run test:spatial` - first run exposed an over-broad test assertion; fixed assertion only
- `npm run test:spatial` - passed, 145/145
- `npx tsc --noEmit` - passed
- `npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "spherical"` - passed, 1/1 with clean exit
- `PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1` focused spherical capture run printed the test as `ok`, wrote the screenshot, then hit the already documented Windows Playwright teardown hang and was interrupted

Final validation is recorded in the task closeout.

## Rollback Notes

Rollback is bounded:

- remove `spherical` from `SpatialArrangementKind` and validator allow-list
- remove `sphericalSlotTransform` and seed offset helper from `arrangements.ts`
- remove the Spherical Gallery binding-capacity extension
- remove the Spherical Gallery default/selector option in the internal arranger
- remove the spherical unit/E2E assertions and this evidence note

This would return Spherical Gallery to the earlier internal primitive state without affecting public/auth/backend/publish paths.
