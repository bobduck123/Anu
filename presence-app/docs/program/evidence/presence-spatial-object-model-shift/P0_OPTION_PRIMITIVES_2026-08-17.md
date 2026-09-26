# P0 Option Primitives - 2026-08-17

## Scope

This pass implements three internal reusable Presence option primitives through the existing registry, option alias, arranger, compiler, Three preview and semantic fallback path:

- `presence.object.archive-wall@0.1.0`
- `presence.object.listening-station@0.1.0`
- `presence.display.spherical-gallery@0.1.0`

This is internal authoring evidence only. It does not add public routes, backend persistence, publish flow, auth changes, tenant changes, commerce, multiplayer, component admission, Mobstar acceptance, production-readiness claims or raw GLB/GLTF source promotion.

## What Changed

- Added generic primitive kinds for `archive-wall`, `listening-station` and `spherical-gallery`.
- Registered three reusable component definitions:
  - `presence.archive-wall@1.0.0`
  - `presence.listening-station@1.0.0`
  - `presence.spherical-gallery@1.0.0`
- Added procedural Three geometry for the three primitives without adding component-specific renderer branches.
- Updated the Presence option alias layer so Archive Wall and Listening Station are `available-now-procedural`.
- Updated Spherical Gallery from future-only metadata to `internal-experimental` with a free-placement authoring anchor.
- Kept every option and component `not-admitted` and explicitly `not production-ready`.
- Extended unit and focused e2e coverage for alias resolution, compilation, option palette availability, material/media/action persistence, semantic fallback, saved JSON payload and raw model hygiene.

## Options Implemented

### Archive Wall

- Option alias: `presence.object.archive-wall@0.1.0`
- Component ref: `presence.archive-wall@1.0.0`
- Status: `available-now-procedural`
- Placement: wall or free at component level; wall placement through the alias.
- Material slots: `wall`, `paper`, `poster-decal`, `rack-metal`
- Authoring behavior: ordered archive/media cells, material overrides, media Piece assignment, open-link Action assignment, move/rotate/save/reload.
- Fallback: semantic ordered rows with the same assigned media/actions.

### Listening Station

- Option alias: `presence.object.listening-station@0.1.0`
- Component ref: `presence.listening-station@1.0.0`
- Status: `available-now-procedural`
- Placement: floor or free at component level; floor placement through the alias.
- Material slots: `tabletop`, `rack-metal`, `logo-accent`
- Authoring behavior: audio/media Piece binding through the existing media Piece contract, title/description via semantic labels, material/skin/action refs, visual procedural object in Three.
- Fallback: semantic listen/open-link rows. No real audio playback is implemented or claimed in this pass.

### Spherical Gallery

- Option alias: `presence.display.spherical-gallery@0.1.0`
- Component ref: `presence.spherical-gallery@1.0.0`
- Status: `internal-experimental`
- Placement: free authoring anchor, not wall-required and not floor-required as a physical display contract.
- Material slots: `projection`, `rack-metal`, `logo-accent`
- Authoring behavior: orbiting image/media Piece positions around a procedural sphere/ring volume, material/skin/action refs, save/reload.
- Fallback: ordered gallery/card list with the same media/actions.

The free anchor is an internal authoring representation. It keeps the impossible-display primitive from becoming a wall-mounted or floor-dependent object while still fitting the current arranger mutation model.

## Authoring Integration

The three primitives are visible in the internal Presence options palette:

- Archive Wall appears under the existing objects/media-surface grouping with component-ref and fallback labels.
- Listening Station appears as an audio object with component-ref and fallback labels.
- Spherical Gallery appears as an internal experimental display primitive and is addable, but remains clearly not admitted and not production-ready.

Operators can add each option, inspect the selected `optionRef` and `componentId@version`, apply material presets, bind media/actions where supported, save to browser-local JSON, reload, and use the existing semantic fallback.

No Mobstar-specific renderer branch was introduced. The proof uses generic `componentId@version`, registry metadata, primitive geometry and existing Piece/Action contracts.

## Saved JSON / Payload

Measured with a blank Mobstar spatial room plus Archive Wall, Listening Station and Spherical Gallery, with media and open-link Actions assigned to each:

| Metric | Value |
| --- | ---: |
| Layout JSON | 9,220 bytes |
| Browser-local draft envelope | 9,408 bytes |
| Placements | 8 |
| Actions | 6 |
| Semantic fallback rows | 6 |
| Raw `.blend` / `.glb` / `.gltf` refs in saved JSON | 0 |

Compiled component keys:

- `presence.archive-wall@1.0.0`
- `presence.floor-slab@1.0.0`
- `presence.listening-station@1.0.0`
- `presence.piece-plane@1.0.0`
- `presence.room-shell@1.0.0`
- `presence.spherical-gallery@1.0.0`

The saved envelope remains below the 100 KB layout target. No raw source model path or raw model blob is introduced.

## Fallback Behaviour

- Proxy/procedural geometry remains the authoring and fallback source of truth.
- Semantic fallback remains operable if WebGL, mobile rendering, GLB loading or Draco decoding fails.
- Media assignment continues to create normal Piece-plane children where the selected component exposes compatible anchors.
- Open-link Actions remain credential-free HTTPS links only.
- Spherical Gallery falls back to an ordered card/gallery list rather than requiring a real 3D spherical client.

## Status / Admission

- Archive Wall: `available-now-procedural`, `not-admitted`, `not production-ready`.
- Listening Station: `available-now-procedural`, `not-admitted`, `not production-ready`.
- Spherical Gallery: `internal-experimental`, `not-admitted`, `not production-ready`.

No option or component is marked admitted. No candidate asset receives admission from this runtime/authoring proof.

## Tests Run

Baseline before source edits:

- `git status --short --branch` - dirty `feat/spatial-authoring-baseline` branch recorded.
- `cmd /c npm run test:spatial` - PASS, 129/129.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next multiple-lockfile workspace-root warning.

Implementation checks:

- `cmd /c npm run test:spatial` - initial FAIL from one stale option-alias assertion that still expected a `needs-implementation` P0 alias.
- `cmd /c npm run test:spatial` - PASS, 132/132 after updating the assertion to the new `internal-experimental` status.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npx tsx scripts\tmp-p0-option-measure.ts` - PASS for payload measurement; temporary script was deleted after use.
- `cmd /c "set PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1&& npx.cmd playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep option"` - printed both focused option tests as `ok`, captured evidence screenshot, then reproduced the known Windows Playwright webServer teardown hang and was interrupted.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next multiple-lockfile workspace-root warning.

Focused e2e passed assertions:

```text
ok 1 [chromium] ... candidate options palette exposes deferred room kits and persists placed candidate component refs
ok 2 [chromium] ... option alias palette loads room kits and saves stable option refs
```

## Screenshot / Manual QA

Focused evidence screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/14-p0-option-primitives.png`
- Size: 1,119,130 bytes

The screenshot captures the internal arranger after adding the P0 option primitives through the Presence options palette and inspecting the saved option/component state.

Manual QA beyond Playwright was not performed in a separate browser session for this pass. The focused Chromium path covered visual availability, option add flows, inspector state, material/media/action edits and saved JSON assertions.

## Limitations

- Listening Station does not play audio; it binds media/action intent only.
- Spherical Gallery is an internal experimental impossible-display primitive, not a production interaction model.
- The procedural visuals are useful operator primitives, not final art direction.
- Current authoring uses existing anchor and Piece contracts; it does not add collection editing, playlist controls or advanced focus choreography.
- The full spatial Playwright suite may still hang after passing assertions during Windows webServer teardown; this pass did not make that teardown issue the product scope.

## Risks

- Operators may overread `available-now-procedural` as admission unless `not-admitted` and `not production-ready` labels remain visible.
- Spherical Gallery needs future interaction design before it can become a public or client-facing primitive.
- Listening Station will need a real audio policy and playback UX if future tasks make it more than media/action intent.
- Archive Wall capacity and ordering are currently represented through registered anchors, not a dedicated bulk collection editor.

## Rollback Notes

Rollback is bounded:

- remove the three primitive kinds from the model and validator;
- remove the three component definitions and material slot metadata from the registry;
- remove the three procedural geometry helpers and switch cases from `threeGeometryCache.ts`;
- return Archive Wall and Listening Station aliases to disabled/deferred metadata if needed;
- return Spherical Gallery to future-only metadata if needed;
- remove the P0-specific unit/e2e expectations;
- remove this evidence note and screenshot.

No database, production data, auth, public route, publish flow or backend rollback is required.

## Acceptance Classification

Accepted as internal P0 option primitive implementation evidence once final verification is complete, with the focused e2e teardown hang documented as the known Windows Playwright webServer issue after passing assertions.

Not accepted as public launch readiness, component admission, Mobstar creative acceptance, production-ready asset approval, self-serve editing, backend persistence or publish readiness.
