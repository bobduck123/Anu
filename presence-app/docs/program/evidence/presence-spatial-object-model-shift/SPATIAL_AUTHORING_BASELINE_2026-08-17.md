# Spatial Authoring Baseline Evidence

Date: 2026-08-17

## Result

The internal Spatial Object Model route now proves a bounded operator authoring loop through the existing Gate 3 registry, compiler, validator, generic Three renderer and semantic fallback.

This is internal architecture/workflow proof only. It is not a client self-serve editor, backend save path, publish flow, public route change, Mobstar creative acceptance or component admission decision.

## Object Palette

The curated registry-backed palette includes:

- `presence.wall-panel@1.0.0`
- `presence.divider-wall@1.0.0`
- `presence.display-table@1.0.0`
- `presence.retail-rack@1.0.0`
- `presence.display-plinth@1.0.0`
- `presence.projection-wall@1.0.0`
- `presence.rounded-island@1.0.0`
- `presence.display-shelf@1.0.0`
- `presence.framed-media@1.0.0`
- `presence.text-sign-card@1.0.0`
- `presence.product-display-block@1.0.0`
- `presence.light-fixture@1.0.0`
- `presence.drape-divider@1.0.0`

The UI exposes role/category and capability cues through the selected object, material slot, media, skin and action controls. Components remain `prototype` / `not-evaluated`; none is marked admitted.

## Authoring Operations Proven

- Create a blank internal Mobstar-like room from reusable component references.
- Add reusable objects from the curated registry-backed palette.
- Select objects from list/plan state.
- Move editable floor/wall fixtures on the 0.25 m grid.
- Rotate editable fixtures in 15 degree steps.
- Duplicate an editable fixture with its child Piece, Action and semantic subtree.
- Delete an editable fixture and clean dependent child data atomically.
- Assign material preset overrides to supported material slots.
- Assign a skin preset without duplicating geometry or media payload.
- Assign direct media to compatible media/projection surfaces.
- Assign existing media as child Pieces to compatible anchors.
- Assign a credential-free HTTPS `open-link` Action.
- Save two browser-local generations.
- Reload saved data.
- Revert to the previous local generation.
- Reset working state.
- Export and import validated JSON envelopes.
- Preview the same validated data through the generic Three renderer.
- Preserve semantic fallback for mobile, reduced-motion and no-WebGL paths.

## Saved JSON Example

The focused browser scenario adds an island, shelf, rack, projection wall, light, drape and framed-media surface, then customizes the framed-media placement. A reconstructed pure-model run produced this persisted placement shape:

```json
{
  "id": "arranger-framed-media",
  "componentId": "presence.framed-media",
  "materialSlotOverrides": {
    "poster-decal": "poster-archive",
    "rack-metal": "rack-matte-black"
  },
  "skinRef": "presence-authoring-contrast-skin",
  "mediaRef": "mobstar-media-a",
  "actionRefs": ["open-link-arranger-framed-media"]
}
```

The corresponding semantic fallback row keeps the same Action reference:

```json
{
  "placementId": "arranger-framed-media",
  "label": "Abstract generated garment placeholder A",
  "actionRefs": ["open-link-arranger-framed-media"]
}
```

## Payload

Current reconstructed authoring-baseline saved room:

| Metric | Bytes |
| --- | ---: |
| Layout JSON | 7,151 |
| Browser-local draft envelope | 7,339 |
| Eager compressed runtime assets | 44,000 |
| Lazy Draco decoder bytes | 0 |
| Total compressed runtime assets | 250,000 |

The room remains below the 100 KB layout ceiling, 3 MB eager ceiling and 12 MB total runtime ceiling. The authoring-baseline room is proxy/procedural; it does not require GLB or Draco geometry.

## Fallback Behaviour

The semantic fallback preserves meaningful object rows, Piece/media labels and assigned Actions. The focused e2e scenario verifies that the assigned HTTPS action appears as a real semantic link on the compact fallback path. Separate Draco evidence verifies that GLB failure keeps proxy geometry and semantic fallback operable.

## Visual Evidence

Screenshots from the authoring baseline evidence packet:

- `docs/program/evidence/spatial-authoring-baseline/screenshots/01-before-blank-room.png`
- `docs/program/evidence/spatial-authoring-baseline/screenshots/02-after-saved-room.png`
- `docs/program/evidence/spatial-authoring-baseline/screenshots/03-mobile-semantic-fallback.png`

These screenshots prove workflow and renderer data flow, not final Mobstar art direction.

## Verification

Current checks run from `C:\Dev\Flora_fauna\presence-app`:

- `cmd /c npm run test:spatial` - PASS, 111/111.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next workspace-root warning.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "spatial authoring baseline"` - PASS, 1/1, clean exit.

The known full spatial e2e Windows webServer teardown hang is documented in `DRACO_RUNTIME_GATE_REVIEW_2026-08-17.md`; it was not re-investigated for this authoring-baseline task.

## Scope Boundaries

- No public route behavior changed.
- No auth, tenant, backend, publish, commerce, payment or production persistence behavior changed.
- No self-serve, launch-readiness, Mobstar acceptance, commerce or multiplayer claim is made.
- No raw GLB/GLTF source is used by the authoring-baseline room.
- Draco GLB support remains optional renderer geometry covered by separate evidence.
- Proxy geometry remains the authoring/fallback source of truth.

## Known Limitations

- Persistence is browser-local only.
- The operator UI is functional, not final client-facing product UX.
- No arbitrary upload, multi-select, scale handles, undo/redo stack or camera-path editor.
- Text/sign card copy editing is not claimed beyond registered component/material/action capabilities.
- Mobile fallback preserves content and Actions, but the internal operator UI itself is not a polished mobile editor.

## Rollback

Revert the spatial authoring baseline files and evidence packet only. No database, deployment, auth, route-guard, publish or production-data rollback is required.
