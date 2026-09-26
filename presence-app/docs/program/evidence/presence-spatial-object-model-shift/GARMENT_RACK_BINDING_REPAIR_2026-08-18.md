# Garment/Rack Binding Repair - 2026-08-18

## Status

Acceptance classification: `internal authoring evidence`.

This note records a bounded repair to the internal spatial arranger compatibility matrix. It does not add public routes, backend persistence, upload handling, auth/tenant changes, publish flow, commerce, multiplayer, component admission, Mobstar creative acceptance, playback proof, hosted proof, or launch readiness.

## What QA Found

Operator scenario QA found the fashion/lookbook path was weaker than the rest of the authoring spine:

- `garment` existed as a valid piece type but no host accepted it through the Piece Library binding path.
- `presence.suspended-rack@1.0.0` had `rack` anchors that accepted `piece`, but host compatibility did not treat rack anchors as garment-capable.
- `presence.garment-hanger@1.0.0` rendered as a visible component but had no child content anchor.
- Framed media did not list `video` as a supported Piece Library type.
- Listening Station did not list `collection` as a supported Piece Library type.
- Rejected bindings needed clearer operator-facing reasons.

## Compatibility Changes

The repaired Piece Library host matrix now includes:

| Host | Added or confirmed supported piece types | Notes |
|---|---|---|
| `presence.suspended-rack@1.0.0` | `garment` | Rack anchors are now recognised as garment-capable binding slots. |
| `presence.retail-rack@1.0.0` | `garment` | Same rack-anchor rule as suspended rack. |
| `presence.garment-hanger@1.0.0` | `garment` | Hanger now has a single `surface` child anchor for bound garment content. |
| `presence.rounded-island@1.0.0` | `garment` | Conservative fashion display support. |
| `presence.candidate-display-island@1.0.0` | `garment` | Reuses the same display-surface contract; no candidate admission implied. |
| `presence.display-plinth@1.0.0` | `garment` | Conservative surface display support. |
| `presence.display-shelf@1.0.0` | `garment` | Conservative shelf display support. |
| `presence.display-bay@1.0.0` | `garment` | Conservative bay display support. |
| `presence.product-display-block@1.0.0` | `garment` | Conservative block/plinth display support. |
| `presence.framed-media@1.0.0` | `video` | Metadata/action fallback only; no playback claim. |
| `presence.listening-station@1.0.0` | `collection` | Allows a release, playlist, set, or oral-history group as one bindable item; no playback claim. |

The generic wall/surface fallback rule was not broadened to every host. Archive walls, wall panels, dividers, drape dividers, and generic wall hosts still do not accept `garment` unless explicitly listed above.

## Garment/Rack/Hanger Binding Model

The proven model is:

1. A rack host, such as `presence.suspended-rack@1.0.0`, exposes `rack` anchors that accept `piece`.
2. A `garment` Piece Library item stores media/action refs only.
3. Binding the garment to the rack creates a `SpatialContentBinding` with `pieceRef: piece-library:<id>`.
4. The compiled plan derives `presence.piece-plane@1.0.0` render items at rack anchor positions without writing derived `binding-*` placements into saved JSON.
5. `presence.garment-hanger@1.0.0` now also has a child `surface` anchor, so the documented rack-to-hanger-to-garment chain is valid for fixtures that already place hangers on rack slots.

Direct palette placement of a garment hanger still needs a rack-slot-targeting UI before it should become a normal add button. This repair makes the component content-bearing without pretending that free hanger placement is solved.

## Invalid-Binding Diagnostics

The arranger now returns clearer `piece-host-compatibility` messages. Examples:

- `This host cannot accept garment pieces. Rack binding requires a rack anchor or a garment-capable display surface.`
- `<Host label> accepts image, video, text, link, archive-item, flyer pieces, but not audio.`
- `<Host label> cannot host <type> pieces because it has no compatible Piece binding contract.`

The UI maps this issue to `Incompatible host` and advises the operator to choose a host that lists the selected Piece type under Supported binding types. Rejected bindings return the original room object and do not mutate the draft, preview, saved layout, or binding list.

## Saved JSON / Payload

Measured garment/video/collection proof:

- layout JSON: 10,847 bytes
- Piece Library records: 6
- content bindings: 3
- stored derived `binding-*` placements: 0
- generated fallback rows from bindings: 3
- hosts used: `presence.suspended-rack`, `presence.framed-media`, `presence.listening-station`

Saved JSON carries only IDs and metadata:

- `pieceLibrary`
- `contentBindings`
- `contentArrangement`
- media refs
- action refs

It does not carry upload blobs, `data:` URLs, raw `.blend`, `.glb`, or `.gltf` source paths, signed URLs, expiring URLs, or per-binding derived transforms.

## Fallback Behaviour

Semantic fallback rows preserve garment, video, and collection meaning through `Piece type: ...` descriptions plus the assigned actions:

- garment rows keep their `open-link` detail action
- framed video rows keep `watch` action metadata without claiming playback
- listening collection rows keep `open-link` action metadata without claiming audio playback

If WebGL, media loading, or playback is unavailable, the operator and mobile visitor fallback still expose the bound content as semantic rows and links.

## Screenshot

Focused E2E screenshot path:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/19-garment-rack-binding-repair.png`

The screenshot captures the mobile semantic fallback after saving and reloading the repaired garment rack, framed video, and listening collection bindings.

## Tests Run

Baseline before edits:

- `git status --short --branch`
- `npm run test:spatial` - passed, 148/148
- `npm run test:spatial-assets` - passed, 30/30
- `npx tsc --noEmit` - passed
- `npm run build` - passed with existing Next multiple-lockfile/root warning

Implementation validation:

- `npm run test:spatial` - passed, 152/152
- `npm run test:spatial-assets` - passed, 30/30
- `npx tsc --noEmit` - passed
- `npm run build` - passed with existing Next multiple-lockfile/root warning
- `npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "garment"` - passed, 1/1 with clean exit
- `PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1` focused garment capture run printed the test as `ok`, wrote the screenshot, then reproduced the already documented Windows Playwright webServer teardown hang and was interrupted

## Remaining Limitations

- This is internal browser-local authoring evidence only.
- Garment visuals still use procedural/proxy carriers; this is not final fashion presentation quality.
- Hanger direct palette placement remains disabled until rack-slot targeting is designed.
- Video/listening changes preserve metadata/actions only; they do not prove playback.
- No component or candidate is admitted.

## Rollback Notes

Rollback is bounded:

- remove `garment` from the Piece Library dropdown
- remove garment-specific host compatibility additions from `arranger.ts`
- remove the `presence.garment-hanger` child anchor from `registry.ts`
- remove focused unit/E2E assertions and this evidence note/screenshot

This returns the Piece Library matrix to the previous non-garment path without touching public/auth/backend/publish behavior.
