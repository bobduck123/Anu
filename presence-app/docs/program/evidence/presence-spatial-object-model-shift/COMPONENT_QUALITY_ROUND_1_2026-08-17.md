# Component Quality Round 1

Date: 2026-08-17

## Result

Reusable Presence spatial components received a bounded procedural quality pass across architecture, display surfaces, rack/shelf systems, framed/projection media, lighting and soft-divider primitives.

This remains internal spatial-platform evidence only. It is not public launch readiness, Mobstar creative acceptance, component admission, backend persistence, publish flow, commerce, multiplayer or a public route/auth change.

## What Changed

- Generic `box` primitive rendering now varies by registered component category: shell, floor, wall and surface components render as layered procedural templates instead of single blocks.
- Existing specialty primitives were refined with additional frames, trims, shelves, lips, rails, bases, fixture details, projection/media planes and folds.
- The v1 `projection-field` primitive now marks its projection plane as a media surface, matching the existing projection assignment contract.
- The warm nocturnal boutique material style now resolves to the boutique charcoal wall and blackened steel presets.
- The warm product-first boutique lighting profile received a small additional plinth-edge point light while preserving the same profile id.
- Focused tests now assert priority authoring components are inspectable, layered and still expose the authorable material/media surfaces expected by the operator workflow.

No raw GLB/GLTF source, new candidate asset, component admission status or renderer branch was introduced.

## Components Improved

The quality pass covers these reusable component refs or primitive classes:

| Component / primitive | Quality change |
| --- | --- |
| `presence.room-shell@1.0.0` / shell boxes | Open shell sides, rear wall, ceiling and rail detail via category-level `box` handling. |
| `presence.floor-slab@1.0.0` and `@2.0.0` | Layered slab cap and shallow tile seams. |
| `presence.wall-panel@1.0.0` / divider boxes | Backing panel, trims and media/decal plane. |
| `presence.display-table@1.0.0` and `presence.display-plinth@1.0.0` | Top slab, inset body, base and feet instead of one block. |
| `presence.ribbed-wall@1.0.0` | Top/bottom trim plus ribbed face. |
| `presence.display-bay@1.0.0` | Top frame, vertical dividers and shelf structure. |
| `presence.rounded-island@1.0.0` | Top lip, base and lower plinth detail. |
| `presence.suspended-rack@1.0.0` | Additional rails and floor feet. |
| `presence.display-shelf@1.0.0` | Dividers and front shelf lips. |
| `presence.framed-media@1.0.0` | Separate back plate, four frame bars and media plane. |
| `presence.projection-wall@1.0.0` / `@2.0.0` | Media-safe projection field and grid mullions. |
| `presence.product-display-block@1.0.0` | Inset body, top cap and base detail. |
| `presence.light-fixture@1.0.0` | Base, pole, cone shade, lens and glow accent. |
| `presence.drape-divider@1.0.0` | Rail plus alternating folds. |

## Material And Lighting Treatment

- `warm-nocturnal-boutique` now uses `wall-boutique-charcoal` and `rack-boutique-blackened` through the existing skin/material preset pipeline.
- `tabletop-pale-sculptural`, `rack-boutique-blackened`, `fabric-garment-dark` and `projection-campaign-warm` were tuned for more readable contrast under the existing Three standard material path.
- `boutique-product-warm` keeps its profile id and data contract; only intensity balance and one local plinth-edge point light changed.

The changes are generic renderer inputs. No fixture-specific material or lighting branch was added.

## Authoring Compatibility

The existing internal arranger remains the review fixture:

- Palette objects still derive from `ARRANGER_COMPONENT_OPTIONS` and registered component metadata.
- Components remain movable/editable through add, select, move, rotate, duplicate, delete, material, media, skin and action operations.
- Material overrides still use registered slots and presets.
- The saved-layout JSON shape is unchanged.
- The renderer remains component-ref driven and generic.

Measured template coverage from the authoring review palette:

| Component ref | Primitive | Parts | Material slots surfaced | Media surface |
| --- | --- | ---: | --- | --- |
| `presence.wall-panel@1.0.0` | `box` | 6 | `logo-accent`, `poster-decal`, `wall` | yes |
| `presence.divider-wall@1.0.0` | `box` | 6 | `logo-accent`, `poster-decal`, `wall` | yes |
| `presence.display-table@1.0.0` | `box` | 5 | `logo-accent`, `tabletop` | no |
| `presence.retail-rack@1.0.0` | `rack` | 6 | `rack-metal` | no |
| `presence.display-plinth@1.0.0` | `box` | 5 | `logo-accent`, `tabletop` | no |
| `presence.projection-wall@1.0.0` | `projection-field` | 6 | `projection`, `wall` | yes |
| `presence.rounded-island@1.0.0` | `rounded-island` | 6 | `logo-accent`, `rack-metal`, `tabletop` | no |
| `presence.display-shelf@1.0.0` | `display-shelf` | 10 | `rack-metal`, `tabletop` | no |
| `presence.framed-media@1.0.0` | `framed-media` | 6 | `poster-decal`, `rack-metal` | yes |
| `presence.text-sign-card@1.0.0` | `sign-card` | 2 | `paper`, `poster-decal` | yes |
| `presence.product-display-block@1.0.0` | `product-block` | 4 | `logo-accent`, `rack-metal`, `tabletop` | no |
| `presence.light-fixture@1.0.0` | `light-fixture` | 5 | `logo-accent`, `rack-metal` | no |
| `presence.drape-divider@1.0.0` | `drape-divider` | 15 | `fabric`, `rack-metal` | no |

## Saved JSON And Payload

No saved-layout schema or runtime asset inclusion changed. The Gate 4 candidate fixture remains under the layout and eager budgets:

| Metric | Value |
| --- | ---: |
| Gate 4 layout JSON | 16,736 bytes |
| Gate 4 eager compressed assets | 432,000 bytes |
| Gate 4 total compressed assets | 997,000 bytes |
| Layout budget | 100 KB |
| Eager asset budget | 3 MB |

The quality pass adds procedural Three template parts, not GLB payload. Eager bundle impact is expected to be limited to code size in the existing renderer module; no public eager decoder or candidate model asset was added.

## Fallback Behaviour

- Proxy/procedural geometry remains the authoring and fallback source of truth.
- Semantic fallback rows and actions are generated from the compiled render plan as before.
- Media-bearing primitives still expose explicit `mediaSurface` flags where direct media/projection/poster surfaces exist.
- Manual Playwright QA loaded the Gate 4 review fixture in a headless browser and observed the semantic lane when WebGL/Three was unavailable.

Manual screenshots:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/05-component-quality-round-1-gate4-desktop.png`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/06-component-quality-round-1-gate4-mobile.png`

Observed fallback text included the candidate identity wall, architecture-integrated rack and semantic room view. This confirms the visual pass did not remove the semantic fallback path.

## Verification

Baseline checks before this task:

- `cmd /c git status --short --branch` - dirty `feat/spatial-authoring-baseline` branch recorded.
- `cmd /c npm run test:spatial` - PASS, 112/112 before this task.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next workspace-root warning.

Post-change checks:

- `cmd /c npm run test:spatial` - PASS, 113/113 after adding the component quality assertion.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with the existing Next workspace-root warning.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "spatial authoring baseline"` - PASS, 1/1, clean exit after stopping the manual QA dev server.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "Draco GLB"` - PASS, 2/2, clean exit.

## Scope Boundaries

- No public/default route behavior changed.
- No auth, tenant, backend, publish, commerce, payment, multiplayer or production persistence behavior changed.
- No component was marked admitted.
- No Mobstar creative acceptance or launch readiness is claimed.
- No raw source GLB/GLTF file was introduced.
- No renderer branch depends on Mobstar or a candidate fixture id.

## Limitations

- These are still procedural/proxy assets. They improve reviewability and operator context, but they are not final creative-approved art direction.
- Geometry detail is deliberately low-poly and data-driven; it does not replace a future admitted asset pipeline.
- Headless manual QA fell back to semantic rendering on this run, so the evidence screenshots are fallback-lane screenshots rather than WebGL glamour captures.
- Additional candidate GLBs should reuse the same component-ref, proxy-source and fallback-safe contracts; runtime proof alone should not admit them.

## Rollback

Rollback is file-scoped:

- Revert `components/presence-spatial/threeGeometryCache.ts` to the previous procedural template shapes.
- Revert the small preset/profile changes in `lib/presence/spatial/materials.ts` and `lib/presence/spatial/lighting.ts`.
- Remove the focused quality assertion from `lib/presence/spatial/authoringBaseline.test.ts`.
- Remove this evidence note and screenshots if they are no longer representative.

No database, deployment, auth, route, publish or production-data rollback is required because none was changed.
