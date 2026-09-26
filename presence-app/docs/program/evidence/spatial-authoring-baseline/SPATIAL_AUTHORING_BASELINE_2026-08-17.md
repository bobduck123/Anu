# Presence Spatial Authoring Baseline

## Result

The default-off internal arranger now proves a reusable authoring loop on the Gate 3 object model and generic Three renderer. Mobstar supplies the starting media/skin fixture, but room edits are versioned component references and generic overrides rather than a Mobstar scene branch.

This is an internal operator baseline. It is not a client-facing editor, backend save, publish flow or component-admission decision.

## Reusable palette

The operator can select the locked room shell and floor for material/skin edits, then add 13 movable reusable candidates:

- wall panel and divider
- table, display island and plinth
- display shelf and rack-like rail
- frame/poster surface and projection/media wall
- text/sign card and product display block
- visible light fixture and drape/soft divider

The five new procedural definitions - shelf, sign card, product block, light fixture and drape - remain `prototype` / `not-evaluated`. No component is admitted by this proof.

## Authoring operations proved

- Add from a registry-backed palette.
- Move on the 0.25 m grid and rotate in 15 degree steps.
- Duplicate a fixture and its attached Piece/Action/semantic subtree.
- Delete a fixture and clean its dependent data atomically.
- Assign a compatible rendered material preset and an existing skin preset.
- Assign direct media only to components with an actual piece/projection media surface.
- Assign a credential-free HTTPS action and retain it as a real link in semantic fallback.
- Assign/reorder Pieces on rack, surface and projection anchors.
- Save two browser-local generations, reload, revert, reset, import and export.
- Preview current or saved data through the generic Three lane; use the complete semantic lane on compact/reduced-motion/no-WebGL contexts.

## Saved-data proof

The browser scenario creates a blank Mobstar room, adds an island, shelf, rack, projection wall, light, drape and frame, then customises the frame with:

- `presence.framed-media@1.0.0`
- `poster-decal: poster-archive`
- `skinRef: presence-authoring-contrast-skin`, whose teal poster and amber frame values resolve visibly in the compiled material plan
- `mediaRef: mobstar-media-a`
- an `open-link` Action targeting `https://example.com/mobstar`

It duplicates, moves and deletes the copy, saves the room, reads the browser-local JSON, asserts those references, reloads, and verifies the saved Three canvas fingerprint and component key. The compact fallback exposes the same HTTPS Action as a semantic link.

## Payload evidence

The assembled evidence room displays:

- layout JSON: 6.7 KB against the 100 KB ceiling
- eager runtime assets: 43.0 KB against the 3 MB ceiling
- total runtime assets: 244.1 KB against the 12 MB ceiling
- raw GLB/GLTF runtime assets: none

These are internal test-fixture values shown by the compiler-backed UI meters, not production hosting estimates.

## Visual evidence

- [Blank reusable room](screenshots/01-before-blank-room.png)
- [Saved assembled room in generic Three](screenshots/02-after-saved-room.png)
- [Compact semantic fallback with assigned Action](screenshots/03-mobile-semantic-fallback.png)

The screenshots prove workflow and renderer data flow, not final art direction. Gate 4 Mobstar remains a separate 1.86/4 RETURN.

## Known limitations

- Browser-local persistence only; no server sync or publish behavior.
- Operator UI is functional, not a polished client self-serve product.
- No undo/redo, multi-select, scale handles, arbitrary uploads or camera-path editing.
- The light fixture is visible component geometry; actual room lighting remains selected by a room lighting profile.
- Direct media is intentionally limited to registered piece/projection media surfaces.
- Skin material/colour presets render; decal asset layers are not yet a renderer capability and are not claimed by this baseline.
- Mobile preserves content/actions but places internal operator controls before the compact visitor preview.
- Optimized model candidates remain outside the authoring-baseline room. A later Draco runtime packet added a generic optional GLB render-geometry resolver, but authoring still treats proxy/procedural geometry as the source of truth and candidate admission remains separate.

## Rollback

Revert only the Spatial Authoring Baseline commit. Do not revert Gate 3 `99c3618` or Gate 4 RETURN `8a009e5`. No database, deployed route or production data rollback is required. Browser-local proof data can be removed with the existing reset/remove controls.
