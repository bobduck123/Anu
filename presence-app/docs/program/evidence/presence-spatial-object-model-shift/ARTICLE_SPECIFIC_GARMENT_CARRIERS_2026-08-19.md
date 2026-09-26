# Article-specific garment carriers + artwork assignment UI

Date: 2026-08-19
Scope: Article-aware procedural carriers, artwork assignment UI, carrier debug toggle
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No public route, auth, tenant or publish behaviour changed.

Follows [INVISIBLE_GARMENT_CARRIER_STAGE_A_2026-08-19](INVISIBLE_GARMENT_CARRIER_STAGE_A_2026-08-19.md).

---

## 1. What Stage A already had

Invisible carrier plus separate front/back alpha artwork planes; carrier material that cannot
hide artwork; `alphaTest` artwork; carrier selectable through bounds; `rack-row` hanging
garments upright below the rail; rack slot targeting with move/remove; slot order = binding
order = fallback order; `frontImageRef`/`backImageRef`; honest `missingArtwork`; refs-only
saved JSON.

Its stated limitation was that **shirt, pant, shoe and generic all shared one carrier geometry**.

## 2. What this pass added

| Area | Change |
|---|---|
| Carrier geometry | Per-article proportions driven by `garmentArticleType` |
| Artwork roles | Widened from front/back to `front · back · display · outer-side · top` |
| Shoe | Display + outer-side channels instead of a false front/back garment model |
| Aspect | Per-article default aspect plus an optional per-piece `artworkAspect` override |
| Geometry cache | Signature now keys on article and aspect |
| UI | `04C Garment Artwork` panel for article type, artwork refs and aspect |
| Debug | Carrier debug toggle that ghosts the carrier without touching artwork |
| Arranger | `setArrangerPieceGarmentArtwork` mutation, mirrored onto existing bindings |

## 3. Article-specific carrier behaviour

Measured from the real generated templates on the registered 1.05 x 1.7 x 0.2 m carrier:

| Article | Artwork plane (W x H) | Artwork roles | Carrier parts |
|---|---|---|---|
| shirt | 0.99 x 1.33 | front, back | 1 |
| pant | **0.55 x 1.56** | front, back | 1 |
| shoe | **0.90 x 0.58** | **display, outer-side** | 1 |
| generic | 0.97 x 1.43 | front, back | 1 |

A pant plane is narrower and taller than a shirt plane; a shoe plane is wider than it is tall.
Generic preserves Stage A behaviour.

**Cache correctness.** The geometry template signature previously keyed only on component key,
category, geometry and dimensions. Because all four articles share one component with identical
dimensions, they would have collided in the shared template cache and a pant would have reused a
shirt's geometry. Article type and aspect are now part of the signature — verified as **4 of 4
distinct signatures**.

## 4. Shirt / pant / shoe support status

- **Shirt — supported.** Front and back planes, alpha-defined silhouette, broad upper-body
  proportions. Sleeve artwork remains documented-but-unimplemented.
- **Pant — supported.** Front and back planes with tall, narrow proportions and a lower hang
  centre. Alpha defines cut.
- **Shoe — deliberately not modelled as a front/back garment.** It exposes `displayImageRef`,
  `outerSideImageRef` and `topImageRef`, and renders a wide display plane plus an outer-side
  plane with a slight forward tilt. **This is a proxy, not solved footwear.** No UV wrapping, no
  sole/upper separation, no last-shaped geometry. The UI states this to the operator directly:
  *"Shoes use display/outer-side/top artwork. Front/back garment wrapping is not implemented."*
- **Generic — unchanged**, preserving the safe Stage A path.

## 5. Artwork assignment UI

New internal `04C Garment Artwork` panel, shown when the selected Piece Library item is a
garment:

- **Article type** select (shirt / pant / shoe / generic).
- **Artwork aspect** select — "Article default" plus a small bounded set of ratios.
- **Artwork ref selects**, which change by article: front / back / display fallback for
  shirt-pant-generic, and display / outer-side / top for shoe.
- Only existing room media ids are offered, filtered to image/poster/logo kinds.
- **Warnings** rendered inline: missing front artwork, missing back artwork (front is reused
  behind), shoe fallback explanation, and a standing note that carrier geometry is invisible
  proxy quality rather than admitted art.

Backed by `setArrangerPieceGarmentArtwork`, which validates media existence and aspect range,
refuses non-garment pieces, and **mirrors the change onto that piece's existing bindings** so a
garment already on a rack updates without being rebound. Passing `null` clears a ref by deleting
the key rather than storing an empty string.

No upload support, no blobs, no signed URLs — media ids only.

## 6. Carrier debug toggle

A checkbox in the same panel: *"Show carrier bounds (debug only — not final visual quality)"*.

- Default is **off**: carrier `opacity = 0`, `colorWrite = false`.
- On: carrier renders as a faint wireframe ghost (`opacity 0.28`).
- `depthWrite` stays `false` in both modes, so the carrier never occludes artwork.
- **Artwork is untouched by the toggle** — separate materials, separate cache keys.
- State is **UI-local React state only**. It is never written to the room, the draft envelope or
  any saved layout, so it cannot change public meaning.
- The toggle is part of the runtime identity key, so flipping it rebuilds the scene; otherwise
  it would silently do nothing until the next remount.

## 7. Aspect / proportion handling

`SpatialMediaRef` carries **no intrinsic dimensions**, so image-derived sizing is not possible
without an image-processing pipeline, which is out of scope. Instead:

- Per-article defaults: shirt 0.95, pant 0.46, shoe 1.6, generic 0.9 (width / height).
- Optional per-piece `artworkAspect` override, clamped to 0.2–4.0 at both the arranger and the
  validator.
- The artwork plane takes `min(width * maxWidthFactor, height * aspect)`, so a tall coat can be
  taller and a cropped shirt shorter without stretching beyond the carrier's usable area.

This is deliberately bounded: no image inspection, no decode, no processing.

## 8. Rack-row and slot preservation

Verified by test, unchanged from Stage A: slot order = binding order = fallback order; move
left/right reorders deterministically and reversibly; move past either end is refused with a
readable reason; remove keeps order dense; overflow keeps every garment in fallback; save/reload
preserves order and recompiles to identical `semanticFallback`.

Newly verified for this pass: **a garment keeps its own article type and artwork refs across a
reorder**, and those refs survive a save/reload round trip with validation still passing.

## 9. Saved JSON and payload

Stored: piece refs, `garmentArticleType`, the five artwork ref ids, `artworkAspect`, binding
order, labels, captions, action refs, arrangement spec.

Asserted by test: no `data:image` payload, no `.glb`/`.gltf` path, no `presence pieces` source
path, no signature/token query strings, no derived binding placement in `room.placements`, and
the layout stays inside the 100 KB budget.

Debug state is not persisted.

## 10. Fallback behaviour

Unchanged and complete. Every binding still produces exactly one semantic row including
overflowed ones, carrying label, caption, piece type and actions. `missingArtwork` remains
honest: a garment with no artwork in any channel reports `true` rather than rendering an empty
carrier as success, and the UI says so before the operator ever looks at the viewport.

## 11. Tests run

| Command | Result |
|---|---|
| `npm run test:spatial` | **184 passed, 0 failed** (172 at start of this pass; 12 added) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| `npx playwright test … --grep "garment"` | **1 passed (18.9s)** — no teardown hang observed |

`garmentCarrier.test.ts` now holds 32 tests. Added this pass: shirt/pant proportion divergence,
shoe not claiming front/back, generic preserved, carrier invisible and separate for every
article, aspect override affecting geometry and cache signature, per-role artwork resolution
with fallbacks, refs surviving reorder and reload, artwork assignment success and refusal paths,
ref clearing, and payload safety.

Two Stage A tests were rewritten rather than deleted: they asserted on **source text**, which
broke when roles became function arguments and when the carrier gained a debug branch. They now
assert against the **real generated template** (three runs headless for geometry) and against the
precise material invariants. That is a stronger test, not a weakened one.

## 12. Manual QA

- Built real templates for all four articles and measured artwork plane sizes (table in §3).
- Confirmed 4 of 4 distinct geometry-cache signatures.
- Confirmed each article yields exactly one carrier part and keeps visible hanger hardware.
- Confirmed no file under `C:\Dev\presence pieces` was modified.

No screenshots: the change is verified through geometry measurements, material flags and
compiled output. Stage A artwork remains synthetic placeholder media, so a screenshot would show
proxy quality rather than evidence.

## 13. Why the source GLBs remain deferred

Unchanged from the spec, and none was used, copied or converted:

- **Shirt** — 361-node rig, bounds ~1 cm (scale wrong ~100x), 27 MB of textures an invisible
  carrier discards. Needs de-rig, rescale and strip first.
- **Pant** — ~692 MB each (two variants) of pretty-printed JSON with base64 buffers and
  8192x8192 PNGs. Needs conversion before it can be considered.
- **Shoe** — Nike-branded, **no licence metadata or sidecar**, 90,522 triangles with no normals.
  Blocked on licensing, which engineering cannot resolve.

Procedural carriers also remain the better product answer: they impose no silhouette at all.

## 14. Remaining limitations

- Shoe support is a **proxy**: two flat planes with a tilt, not footwear geometry. No UV
  wrapping, no sole/upper separation.
- Sleeve artwork for shirts is documented but unimplemented.
- Aspect comes from defaults or an operator override, never from the image itself — a badly
  proportioned image can still letterbox within its plane.
- Artwork much wider than the carrier is clamped by `maxWidthFactor` rather than expanding the
  carrier.
- The debug toggle rebuilds the scene on flip, which is a visible re-render.
- Article types affect carrier proportions and artwork roles, but **not** rack hang height per
  article — a pant hangs from the same rail point as a shirt.
- Visual quality remains synthetic/proxy evidence, not art direction.

## 15. Rollback notes

Revert:

```
lib/presence/spatial/model.ts
lib/presence/spatial/compile.ts
lib/presence/spatial/validate.ts
lib/presence/spatial/arranger.ts
components/presence-spatial/threeGeometryCache.ts
components/presence-spatial/ThreeSpatialRenderer.tsx
components/presence-spatial/SpatialRoomViewport.tsx
components/presence-spatial/SpatialObjectArranger.tsx
lib/presence/spatial/garmentCarrier.test.ts
```

and delete this document. Every field added is optional, so layouts saved before this pass
remain valid and continue to compile as `generic` carriers. No generated asset, candidate
registry, runtime asset, public route, auth, tenant, backend or publish path was touched.
