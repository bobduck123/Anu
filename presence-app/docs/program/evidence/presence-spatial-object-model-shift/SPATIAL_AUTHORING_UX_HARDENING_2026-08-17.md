# Spatial Authoring UX Hardening

Date: 2026-08-17

## Result

The internal Spatial Object Model arranger now gives operators clearer component capability labels, actionable invalid-edit diagnostics and a compact saved-layout inspector.

This remains internal Gate 4A workflow evidence only. It is not a client self-serve editor, backend save path, publish flow, public route change, launch-readiness claim, Mobstar creative acceptance or component admission decision.

## What Changed

- Palette objects now show concise capability tags derived from registered component metadata.
- Rejected edits show operator-readable diagnostic titles and guidance instead of only raw validation codes.
- The last valid draft and Three preview remain active after rejected edits.
- A saved-layout inspector summarizes layout state without requiring raw JSON export first.
- Focused unit and e2e coverage was extended for the new operator-visible behavior.

## Palette Capability Examples

Tags are derived from `ARRANGER_COMPONENT_OPTIONS` plus the registered spatial component definition:

- `presence.display-table@1.0.0`: `floor-placeable`, `surface-host`, `media-capable`, `skin-capable`, `material-slots`, `action-capable`, `proxy-only`, `fallback-safe`.
- `presence.framed-media@1.0.0`: `wall-placeable`, `media-capable`, `skin-capable`, `material-slots`, `action-capable`, `proxy-only`, `fallback-safe`.
- `presence.light-fixture@1.0.0`: `free-placeable`, `skin-capable`, `material-slots`, `action-capable`, `proxy-only`, `fallback-safe`.
- Optional GLB-capable components report `glb-optional` through the same generic metadata path.

No Mobstar-specific renderer branch was introduced for these labels.

## Invalid-Mutation Examples

The operator UI now maps validator/mutation codes into clearer messages, including:

- `unsafe-link` -> `Invalid action URL`; guidance requires credential-free HTTPS links.
- `room-bounds` -> `Outside room bounds`; guidance explains the last valid position is preserved.
- `unsupported-slot` / `preset-slot` -> `Unsupported material`; guidance points operators back to supported slots and presets.
- `media-surface` -> `Incompatible media`; guidance explains the object has no direct media/decal/projection surface.
- `anchor-capacity` -> `Capacity exceeded`; guidance asks the operator to choose another host or remove an assigned Piece.
- `anchor-type` -> `Incompatible host`; guidance explains the selected object cannot host that Piece or media type.

The focused e2e path verifies an invalid `http://` action URL produces a visible diagnostic and preserves the selected valid placement before a valid `https://` URL is accepted. Existing spatial unit coverage continues to assert failed movement, anchoring, capacity, material and media mutations return the original room unchanged.

## Saved-Layout Inspector

The inspector is a compact QA panel, not a raw JSON dump. It shows:

- layout size
- object count
- component refs used
- selected object id
- selected component id/version
- transform
- material overrides
- media refs
- skin refs
- action refs
- semantic/proxy fallback status
- optional GLB status where present

Manual QA screenshot:

`docs/program/evidence/presence-spatial-object-model-shift/screenshots/04-authoring-ux-hardening-inspector.png`

Observed inspector state for a selected framed-media object included:

- component: `presence.framed-media@1.0.0`
- material overrides: `poster-decal: poster-archive, rack-metal: rack-matte-black`
- media/skin refs: `media mobstar-media-a / skin presence-authoring-contrast-skin`
- action refs: `open-link-arranger-framed-media:open-link`
- fallback: `semantic row: Abstract generated garment placeholder A`
- GLB status: `proxy-only`

## Payload Impact

The hardening changes are UI/test/evidence only. The saved-room schema, layout JSON shape, compiler contract, renderer adapter contract, proxy geometry and semantic fallback data model did not change.

The existing reconstructed authoring-baseline layout remains the relevant payload reference:

| Metric | Bytes |
| --- | ---: |
| Layout JSON | 7,151 |
| Browser-local draft envelope | 7,339 |
| Eager compressed runtime assets | 44,000 |
| Lazy Draco decoder bytes | 0 |
| Total compressed runtime assets | 250,000 |

The authoring-baseline room remains proxy/procedural and does not require GLB or Draco geometry.

## Verification

Baseline checks before changing files:

- `cmd /c git status --short --branch` - recorded dirty `feat/spatial-authoring-baseline` branch.
- `cmd /c npm run test:spatial` - PASS, 111/111.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next workspace-root warning.

Post-change checks:

- `cmd /c npm run test:spatial` - PASS, 112/112.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next workspace-root warning.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "spatial authoring baseline"` - PASS, 1/1, clean exit.

## Manual QA

Manual QA used a local flagged dev server at `http://127.0.0.1:3101/internal/spatial-object-model`.

The Browser plugin invocation did not return usable control documentation in this session, so Playwright was used as the fallback browser harness. The manual probe confirmed:

- HTTP 200 for the internal route.
- Heading: `Spatial object arranger`.
- Palette tags visible for the framed-media component.
- Inspector reflects selected framed-media component, overrides, media, skin, action, fallback and proxy-only GLB status.
- Screenshot written to the evidence folder.

One sandbox console issue was observed for a blocked external font request (`ERR_NETWORK_ACCESS_DENIED`). No application error was observed.

## Scope Boundaries

- No public route behavior changed.
- No auth, tenant, backend, publish, commerce, payment or production persistence behavior changed.
- No self-serve, launch-readiness, Mobstar acceptance, commerce or multiplayer claim is made.
- No component was marked admitted.
- No raw asset ingestion or raw GLB/GLTF source was introduced by this hardening task.
- Proxy geometry remains the authoring/fallback source of truth.

## Limitations

- The inspector is compact operator QA, not a full debug console.
- Diagnostics show the first guidance message plus the current validation issue list; they are not a full undo/redo history.
- Persistence remains browser-local only.
- The internal operator UI is not a polished mobile editor.
- The known Windows Playwright webServer teardown hang for the full spatial suite remains documented separately and was not made the focus of this task.

## Rollback

Rollback is file-scoped:

- Remove the palette capability tag helper and UI tags.
- Remove the diagnostic title/advice presentation.
- Remove the saved-layout inspector panel.
- Revert the focused unit/e2e expectations and this evidence note.

No database, deployment, auth, route-guard, publish or production-data rollback is required because none was changed.
