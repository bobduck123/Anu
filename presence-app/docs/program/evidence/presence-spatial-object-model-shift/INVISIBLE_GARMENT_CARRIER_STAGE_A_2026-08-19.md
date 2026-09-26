# Invisible garment carrier — Stage A

Date: 2026-08-19
Scope: Stage A invisible garment carriers, rack-row arrangement, rack slot targeting
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No public route, auth, tenant or publish behaviour changed.

Implements [INVISIBLE_GARMENT_CARRIER_SPEC_2026-08-19](../../presence-spatial-garments/INVISIBLE_GARMENT_CARRIER_SPEC_2026-08-19.md).

---

## 1. Why the GLB garment sources were not used

Stage A uses **procedural carriers only**. No shirt, pant or shoe source model is loaded,
copied, converted or shipped. The three inspected sources each carry a distinct blocker:

| Source | Blocker |
|---|---|
| `combat_shirt_-_gameready_-_rigged_-_metahuman/scene.gltf` | 361-node rig, bounds ~1 cm (scale wrong ~100x), 27 MB of textures an invisible carrier discards. Needs de-rig, rescale and strip first. |
| `GLTF/.../DG100110.gltf` | ~692 MB each (two variants, ~1.4 GB) of pretty-printed JSON with base64-embedded buffers and 8192x8192 PNGs. Needs conversion before it can be considered. |
| `nike-shoe-r/source/Nike shoe rechts .glb` | Nike-branded third-party IP, **no licence metadata or sidecar**, 90,522 triangles with no normals. Blocked on licensing, which engineering cannot resolve. |

Source files were read only. Verified after the change: no file under `C:\Dev\presence pieces`
was modified, and the three garment folders remain intact.

A procedural carrier is also the better product answer, not merely the easier one: it has **no
silhouette to impose**, which is the entire point of the design.

## 2. Carrier architecture

A garment renders as four parts, of which only two are ever visible:

| Part | Visible | Purpose |
|---|---|---|
| Carrier box | **No** | Bounds, hang point, selection volume |
| Front artwork plane | Yes | Client front print; alpha defines the outline |
| Back artwork plane | Yes | Client back print; independent media |
| Hanger bar + hook | Yes | Physically real hardware |

`SpatialGeometryTemplatePart` gained three fields — `carrier`, `alphaArtwork` and `mediaRole` —
so the separation is expressed in data rather than in renderer branching.

## 3. Hard-coded silhouette removal

`garmentHangerParts()` previously traced an eight-point `THREE.Shape`: fixed shoulder slope,
sleeve stubs and hem. That polygon *was* an imposed garment outline, and it was rendered as a
single `"double"`-sided plane, so front and back necessarily showed the same image.

It is gone. The carrier now builds plain `PlaneGeometry` rectangles and lets the artwork's alpha
channel produce collar, sleeve, hem or shoe outline. A cropped tee and a long coat can share one
carrier and look correctly different.

A test asserts the removal directly against source, with comments stripped so it cannot pass by
matching its own explanatory prose:

```
assert.ok(!body.includes("THREE.Shape"));
assert.ok(!body.includes("lineTo"));
assert.ok(body.includes("PlaneGeometry"));
```

## 4. Alpha material support

Added to the Three material path:

- **`applyArtworkAlpha`** — `alphaTest = 0.5`, `transparent = false`, `depthWrite = true`.
  Alpha testing is preferred over blended transparency so a rail of twelve overlapping garment
  planes does not depend on sort order.
- **`applyCarrierVisibility`** — `opacity = 0`, `colorWrite = false`, `depthWrite = false`,
  `transparent = true`. The mesh stays in the scene, so it still contributes bounds and remains
  selectable across its whole volume rather than only where the artwork is opaque.

**Carrier visibility cannot affect artwork visibility.** The material cache key now includes the
carrier and alpha-artwork flags:

```
`${slot}:${side}:${media}:${carrier ? "carrier" : "visible"}:${alphaArtwork ? `alpha-${role}` : "opaque"}`
```

so a carrier material is never shared with an artwork material. Existing framed and projection
media surfaces are untouched: alpha behaviour applies only to parts explicitly flagged
`alphaArtwork`.

## 5. Front/back print layers

- `SpatialContentBinding` and `SpatialPieceLibraryItem` gained optional `garmentArticleType`,
  `frontImageRef` and `backImageRef`.
- `SpatialRenderItem` gained a `garment` channel: `{ articleType, frontMedia, backMedia,
  missingArtwork }`.
- Media binding gained a `mediaOverride`, so the front plane and the back plane resolve
  **different** media through the same loader.
- A missing back print falls back to the front, so a garment is never blank from behind purely
  because one image was supplied.
- Garment bindings compile through `presence.garment-hanger` rather than a bare
  `presence.piece-plane`.

`missingArtwork` is reported rather than hidden. With an invisible carrier, "no artwork
assigned" and "broken" would otherwise look identical in the viewport.

## 6. Rack-row behaviour

New `rack-row` arrangement kind. Measured on an 8.4 x 4 x 1.8 m suspended rack:

| Garments | Visible | Overflow | Fallback rows | X span | Y | rotation.x |
|---|---|---|---|---|---|---|
| 3 | 3 | 0 | 3 | 7.50 m | 0.70 | 0 |
| 6 | 6 | 0 | 6 | 7.50 m | 0.70 | 0 |
| 12 | 12 | 0 | 12 | 7.50 m | 0.70 | 0 |
| 18 | 12 | 6 | **18** | 7.50 m | 0.70 | 0 |

Both prior defects are fixed:

- **Garments hang upright.** `rotation.x` is `0`, not `-PI/2`. They sit at y = 0.70, below the
  rail rather than laid flat across the top of the host.
- **Pitch derives from host width.** Six garments now span 7.50 m of the 8.4 m rail instead of
  bunching into 3.60 m at a fixed 0.72 m pitch. Span is constant across counts; pitch adapts.

Determinism holds: identical inputs give identical output, and reversing the input array changes
nothing because bindings sort by `order` then `id`.

## 7. Rack slot targeting

Data layer (`lib/presence/spatial/arranger.ts`):

- `arrangerRackSlotState(room, hostId)` — capacity, occupied, open, overflow, and per-slot
  binding id, label, piece type, overflow flag and **missing-artwork flag**.
- `moveArrangerContentBinding(room, hostId, bindingId, ±1)` — move left/right with swap.
- `removeArrangerContentBinding(room, hostId, bindingId)` — remove, preserving remaining order.
- `defaultArrangementKindForHost(host)` — rack anchors default to `rack-row`, wall anchors to
  `wall-grid`, spherical galleries to `spherical`, so operators need not know the vocabulary.

UI (`components/presence-spatial/SpatialObjectArranger.tsx`): a rough internal `04B Rack Slots`
panel listing occupied slots in order with left/right/remove controls, capacity and
overflow counts, and an inline "no artwork assigned" note. Internal authoring only.

## 8. Garment order invariants

Enforced by `withDenseBindingOrder`, which rewrites `order` densely from zero after every move
or removal, and covered by tests:

- slot order = binding order = fallback order
- move left/right reorders deterministically and is reversible
- moving past either end is refused with a readable reason
- remove preserves the remaining order as `[0, 1, 2, …]`
- overflow rows remain in fallback
- save/reload preserves order, and recompiles to an identical `semanticFallback`

## 9. Compatibility diagnostics

`hostPieceCompatibilityMessage` already produced readable reasons and is retained, for example:

- "This host cannot accept garment pieces. Rack binding requires a rack anchor or a
  garment-capable display surface."
- "{host} accepts image, text, link pieces, but not audio."

Added: "This garment is already at the end of the rack." for out-of-range moves, and the
per-slot missing-artwork flag surfaced in the arranger.

Validation additions: `garmentArticleType` must be one of shirt/pant/shoe/generic and may only
appear on garment pieces; `frontImageRef`/`backImageRef` are identifiers, garment-only, and must
resolve to real media in `room.media`.

## 10. Saved JSON and payload

Stored: piece refs, `garmentArticleType`, `frontImageRef`/`backImageRef` as media ids, binding
order, labels, captions, action refs, and the arrangement spec.

Not stored, asserted by test: no `.glb` or `.gltf` path, no `data:image` payload, no
`presence pieces` source path, and no derived binding placement in `room.placements` — slot
transforms remain compile-time derived.

A six-garment room validates and stays well inside `SPATIAL_LAYOUT_JSON_BUDGET_BYTES` (100 KB).

## 11. Fallback behaviour

Unchanged and still complete: every binding produces exactly one semantic row including
overflowed ones, carrying label, caption, piece type and actions. An 18-garment rack at capacity
12 produces 18 fallback rows. Because Stage A loads no GLB, the fallback story is strong by
construction — a garment with no artwork still has a label, a caption and its actions.

## 12. Tests run

| Command | Result |
|---|---|
| `npm run test:spatial` | **172 passed, 0 failed** (was 152 at baseline; 20 added) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| `npx playwright test … --grep "garment"` | **1 passed (25.2s)** — no teardown hang observed |

New suite: `lib/presence/spatial/garmentCarrier.test.ts` (20 tests) covering silhouette removal,
carrier/artwork material separation, alpha application, rack-row geometry and pitch,
determinism, overflow, slot ordering, move/remove invariants, compile behaviour, validation,
payload safety and save/reload.

One pre-existing assertion in `contentBinding.test.ts` was updated: it asserted garments compile
as `presence.piece-plane`, which is the behaviour this task deliberately changes. It now asserts
the carrier component and the garment channel.

## 13. Manual QA

- Rack-row measured at 3/6/12/18 garments (table in section 6).
- Confirmed no file under `C:\Dev\presence pieces` was modified and all three garment folders
  remain intact.
- Confirmed the focused garment e2e passes.
- Confirmed build output and route list are unchanged in shape.

No screenshots were captured: the change is verified through geometry values, material flags and
compiled output rather than appearance, and Stage A artwork is synthetic placeholder media.

## 14. Remaining limitations

- **Article-specific carriers are not yet differentiated.** `garmentArticleType` is carried
  through the model, validated, and exposed on the render item, but shirt/pant/shoe currently
  share one carrier geometry and proportions. Pant and shoe variants are follow-up work.
- **Shoe side/top artwork fields** (`outerSideImage`, `topImage`) are not implemented; shoes
  currently use the front/back channels.
- **No per-piece aspect scaling.** Artwork much wider than the carrier will visually overflow.
- **Carrier debug toggle is not implemented.** The carrier is always invisible; there is no
  authoring view that reveals it.
- **Artwork assignment UI is not implemented.** Front/back refs can be set in data and are
  carried from the Piece Library, but the arranger has no field for assigning them yet.
- **Depth reading** — flat alpha planes on a rail can read as cut-outs. Untested visually.
- Garment visuals remain procedural/proxy quality, as the spec intended for Stage A.

## 15. Rollback notes

Revert these files:

```
lib/presence/spatial/model.ts
lib/presence/spatial/arrangements.ts
lib/presence/spatial/arranger.ts
lib/presence/spatial/validate.ts
lib/presence/spatial/compile.ts
lib/presence/spatial/contentBinding.test.ts
components/presence-spatial/threeGeometryCache.ts
components/presence-spatial/ThreeSpatialRenderer.tsx
components/presence-spatial/SpatialObjectArranger.tsx
```

and delete `lib/presence/spatial/garmentCarrier.test.ts` and this document. No generated asset,
candidate registry, runtime asset, public route, auth, tenant, backend or publish path was
touched, so no other rollback is required. Saved layouts created before this change remain valid:
every new field is optional.
