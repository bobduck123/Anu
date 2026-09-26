# Invisible garment carrier spec — shirt, pant, shoe

Date: 2026-08-19
Scope: Implementation-ready specification for invisible garment carriers integrated with rack-row authoring and Piece Library garment metadata
Status: **Specification only.** No code was written. Nothing here admits any component or option, and no claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness.

Source models in `C:\Dev\presence pieces` were inspected **read-only**. Nothing there was moved, copied, converted or modified.

---

## 1. Executive summary

**The generic clothing model is a mannequin, not a garment.** It supplies placement, scale,
orientation, hanging behaviour, bounds, selection and inspection behaviour. It contributes
**no visible silhouette**. What the visitor sees is the client's own artwork, carried on
separate visible layers attached to that invisible carrier.

This matters because garments differ in exactly the ways a fixed mesh cannot express: sleeve
length, collar width, hem shape, pant cut, shoe profile. A visible generic shirt would impose
one silhouette on every design bound to it. An invisible carrier with alpha-masked artwork lets
each design define its own outline.

Three things make this the right architecture rather than a workaround, and all three are
confirmed in the current codebase:

1. **The mechanism already exists.** `threeGeometryCache.ts` builds each primitive from parts
   of the shape `{ geometry, position, rotation, scale, materialSlot, materialSide,
   mediaSurface }`, and parts flagged `mediaSurface: true` receive the bound media texture via
   `material.map`. Carrier structure and artwork layer are already separable concepts.
2. **`presence.garment-hanger` is already 90% of the pattern** — a media-surface plane plus a
   visible bar and hook. What is wrong is *which* geometry carries the artwork (see below).
3. **The payload argument is decisive.** Every inspected source is dominated by textures that
   an invisible carrier discards entirely. The shirt is 28 MB of which **0.36 MB is geometry**.

**The one thing that must not happen** is applying the artwork as the same material as the
carrier. If the carrier is invisible because its material opacity is zero, artwork sharing that
material disappears with it. Carrier visibility and artwork visibility must be independent
materials on independent geometry.

### The specific defect this spec corrects

`garmentHangerParts()` currently builds the artwork surface as an eight-point `THREE.Shape`
approximating a shirt — fixed shoulder slope, fixed sleeve stubs, fixed hem:

```
shape.moveTo(-width * 0.12, height * 0.38);   // collar
shape.lineTo(-width * 0.48, height * 0.24);   // sleeve
...
part(new THREE.ShapeGeometry(shape), [0, 0, depth / 2], "fabric", "double", true);
```

That polygon **is** an imposed garment silhouette, which is what the product intent forbids.
It also uses a single `"double"`-sided plane, so front and back necessarily show the same
image — a back print is not expressible today.

**The fix is small and precise:** replace the silhouette `ShapeGeometry` with a plain
rectangular `PlaneGeometry`, let the artwork's alpha channel define the outline, and split it
into separate front and back planes.

---

## 2. Source garment model inspection

Read-only inspection of `C:\Dev\presence pieces`, performed with the existing GLB/glTF
inspection library. **No file was mutated.**

### Shirt — `combat_shirt_-_gameready_-_rigged_-_metahuman/scene.gltf`

| Property | Value |
|---|---|
| Format | `.gltf` + `scene.bin` + 3 PNG textures |
| Total size | **28 MB** (geometry **0.36 MB**, textures **27.15 MB**) |
| Triangles | 6,297 |
| Meshes / materials | 1 / 1 (`Combat_Shirt.002`) |
| Nodes | **361** — a full rig skeleton |
| Skinned | **Yes** |
| Vertex attributes | POSITION, NORMAL, TANGENT, **TEXCOORD_0/1/2**, JOINTS_0, WEIGHTS_0 |
| Bounds | 0.0096 x 0.0072 x 0.003 — roughly **1 cm**; scale is wrong |
| Licence | SKETCHFAB Standard, author Karnaval |
| Warnings | `skinned-meshes-present`, `scale-check-required`, `huge-texture-payload` |

- **Likely article:** shirt/torso. **Usable as a carrier: yes, after preparation.**
- **Optimisation needed:** strip all 27 MB of textures (an invisible carrier needs none),
  de-rig (361 nodes and JOINTS/WEIGHTS are dead weight without animation), rescale by roughly
  100x, and re-export as GLB.
- **Draco:** not required at 6,297 triangles. Geometry is already tiny.
- **UVs:** three UV sets and tangents present — unusually good, which matters only if Stage C
  (true UV decals) is ever pursued.
- **Verdict: defer to Stage B.** Genuinely promising, but needs a de-rig, rescale and strip
  pass before runtime use.

### Pant — `GLTF/GLTF/GLTF Single Object/DG100110.gltf` (and `GLTF Multiple Objects/` variant)

| Property | Value |
|---|---|
| Format | `.gltf`, pretty-printed JSON |
| Size | **725,530,655 bytes (~692 MB) each — ~1.4 GB for the two variants** |
| Buffers | `data:application/octet-stream;base64,…` embedded |
| Images | `data:image/png;base64,…`, **8192 x 8192** |
| Other | Contains a `Light` node; matrix translation values of 150/300 suggest centimetre-or-larger units |

- **Likely article:** trousers/pant (vendor read-me describes a 3D apparel modelling service).
- **Usable as a carrier: not in this form.** A 692 MB pretty-printed JSON with base64-embedded
  buffers and 8K PNGs is roughly three orders of magnitude past any Presence budget. Base64
  inflates binary by ~33% before the JSON whitespace is counted.
- **Optimisation needed:** severe — convert to binary GLB, drop both 8K textures entirely
  (invisible carrier), remove the light, rescale, then Draco. Expected result is a few hundred
  kilobytes, but that is a conversion job, not a config change.
- **Draco:** likely yes once converted, depending on final triangle count.
- **Verdict: do not use now.** Replace with a procedural carrier for Stage A. Revisit only
  after a conversion pass, and only if a procedural pant carrier proves insufficient.
- The existing spatial asset ingestion pipeline is the right tool for this conversion and
  already does exactly this (strip textures, Draco, budget report) — but it must be pointed at
  a copy, and its outputs are candidate material, not runtime assets.

### Shoe — `nike-shoe-r/source/Nike shoe rechts .glb`

| Property | Value |
|---|---|
| Format | `.glb` |
| Size | 12.36 MB (geometry 2.01 MB, textures 10.34 MB, 4 images) |
| Triangles | **90,522** — 14x the shirt, for a much smaller object |
| Vertex attributes | **POSITION, TEXCOORD_0 only** — no normals, no tangents |
| Bounds | 1.00 x 0.53 x 0.48 m — a **one-metre shoe**; scale wrong by ~3-4x |
| Licence | **none embedded**; no `license.txt` in the folder |

- **Likely article:** shoe. **Usable as a carrier: not recommended.**
- **Three independent blockers:** (a) it is a **Nike** shoe — third-party brand IP, and the
  mesh silhouette *is* the trademarked product form even when invisible; (b) **no licence
  metadata or sidecar exists**, so provenance is unknown; (c) 90k triangles with no normals is
  poor quality for the payload.
- **Verdict: do not use.** Use a procedural shoe carrier. If a GLB shoe carrier is ever wanted,
  source a generic, licence-clear model. This is a product/legal decision, not a technical one,
  and it should not be worked around.

### Not garment sources

`zines/` (5 PDFs) and `copy-because-i-keep-breaking-everything/` (a web `dist` bundle) are in
the same folder but are not garment models. They are out of scope here; the zines may be
relevant later as `flyer`/`archive-item` content, and would need their own licence review.

### Should any of these be copied into an internal candidate path?

Not yet, and not by this task. If and when the shirt is prepared for Stage B, it should go
through the existing ingestion pipeline into
`assets/presence-spatial/candidates/components/`, keeping its SKETCHFAB Standard licence
metadata and `candidate-review-required` status. The pant should follow only after conversion.
The shoe should not be copied at all.

---

## 3. Architecture decision

### `GarmentCarrier`

A garment carrier is a composition of five things, of which only two are ever visible:

| Element | Visible? | Purpose |
|---|---|---|
| **Carrier geometry** | **No** (debug-only) | Scale, orientation, bounds, hang point, selection volume, inspection framing |
| **Artwork layers** | **Yes** | The client's front/back/side/top imagery; alpha defines silhouette |
| **Hanger hardware** | Yes | Bar and hook — physically real, correctly visible |
| **Rack-slot anchor** | No | Where the carrier attaches on the rail |
| **Inspection anchor** | No | Where the camera goes when a garment is inspected |
| **Semantic card** | n/a | The fallback representation |

### Non-negotiable rules

1. **Carrier material and artwork material are different materials on different geometry.**
   Setting carrier opacity to 0 must have no effect on artwork visibility. This is the single
   rule that makes the whole model work.
2. **Alpha defines the silhouette.** Artwork planes are plain rectangles. The image's alpha
   channel produces the sleeve, collar, hem or shoe outline. **No carrier geometry may impose a
   garment outline.**
3. **Front and back are separate single-sided planes.** One double-sided plane cannot carry a
   different back print, which is a normal requirement for apparel.
4. **The layout stores references, never image data.** Consistent with the existing
   `SpatialLogicalRef` contract and the 100 KB `SPATIAL_LAYOUT_JSON_BUDGET_BYTES`.
5. **Selection and collision come from the carrier bounds**, not from the artwork planes, so a
   garment stays clickable regardless of how much of its image is transparent.

---

## 4. Article-specific carrier design

### Shirt

- Invisible torso/sleeve volume providing bounds and hang point.
- **Front artwork plane** at `+z`, single-sided, facing the viewer.
- **Back artwork plane** at `-z`, single-sided, rotated 180 degrees.
- Optional later: left/right sleeve planes, angled outward.
- Suggested proportions: roughly 0.55 m wide x 0.75 m tall, hung so the shoulder line sits just
  below the rail.
- Alpha-masked PNG or WebP defines collar, sleeve and hem. A long-sleeve and a cropped tee bind
  to the same carrier and look correctly different.

### Pant

- Invisible leg volume, narrower and taller than the shirt.
- **Front and back artwork planes**, same rule.
- Optional later: side-seam/stripe plane.
- Suggested proportions: roughly 0.42 m wide x 0.95 m tall, hung from a waistband line.
- Alpha defines cut — tapered, wide, cropped, flared — without any geometry change.

### Shoe

Shoes are **not naturally front/back**, and forcing that model would produce a bad result.

- Recommended primary view: **outer side**, which is how footwear is photographed and displayed.
- Suggested fields, in priority order:
  - `outerSideImage` — primary
  - `topImage` — three-quarter/top view, second
  - `innerSideImage` — optional
  - `soleAccentImage` — optional, deferred
  - `displayImage` — fallback when nothing article-specific is supplied
- A shoe carrier should present as a small angled plinth-style display rather than a hanging
  item; shoes do not hang from rails.
- **Defer** any UV-mapped or wrapped shoe treatment until a licence-clear model with normals
  exists. The inspected shoe has neither.

---

## 5. Garment Piece Library metadata

Extending `SpatialPieceLibraryItem`, which today carries `id`, `pieceType`, `label`, `caption`,
`mediaRefs`, `actionRefs`, `tags`, `collectionRefs`, `safety`, `createdAt`, `updatedAt`.

### Minimum for Stage A

| Field | Type | Notes |
|---|---|---|
| `garmentArticleType` | `"shirt" \| "pant" \| "shoe" \| "generic"` | Selects the carrier; `generic` is a flat hanging plane |
| `frontImageRef` | media ref | Resolves against `room.media` |
| `backImageRef` | media ref | Optional; falls back to front or to a plain material |
| `displayImageRef` | media ref | Used when article-specific refs are absent |
| `label`, `caption`, `actionRefs`, `tags`, `collectionRefs` | existing | Already present |

### Optional / future

`sideImageRef`, `topImageRef`, `innerSideImageRef`, `outerSideImageRef`, `sleeveImageRef`,
`colourway`, `garmentType`, `sizeRange`, `fit`, `lookNumber`, `dropName`, `availabilityLabel`,
`credit`, `altText`.

`altText` is worth pulling forward: it is the accessible name for the artwork and is distinct
from `label`.

**No price, cart, checkout or payment field.** `availabilityLabel` is a display string only and
introduces no commerce behaviour.

---

## 6. Rack-row integration

Building on the rack-row work already recommended in
`FASHION_LOOKBOOK_OPERATOR_QA_2026-08-18.md`:

- The **carrier** attaches to a rack slot; the artwork hangs from it. The operator binds a
  garment piece, not a carrier — the carrier is selected automatically from
  `garmentArticleType`.
- Artwork hangs **upright below the rail**, facing outward. This is the correction to the
  current `row` arrangement, which returns `rotation: [-PI/2, 0, 0]` and lays pieces flat on top
  of the host.
- **Slot order = binding order = fallback order**, always. `order` on the binding remains the
  single source of truth.
- **Pitch derived from host width and visible count**, not the current fixed 0.72 m — six
  garments currently span only 3.60 m of an 8.4 m rack.
- **Overflow stays explicit** and every overflowed garment keeps a fallback row, as it does now.
- **Inspection** moves the camera to the garment's inspection anchor near the rack. The rack
  stays visible; the artwork stays visible; the carrier stays invisible.

---

## 7. Rendering strategy

### Stage A — procedural carriers, no GLB dependency

Invisible procedural carrier volumes plus visible artwork planes, built as geometry template
parts exactly like every other primitive. No external model, no loader, no decoder, no network
dependency, no licence question.

### Stage B — GLB carrier

Use a prepared shirt/pant GLB as the invisible carrier mesh, loaded lazily through the existing
`SpatialRenderGeometry` `glb` contract with its mandatory `fallbackPrimitive`. Artwork planes
remain separate visible geometry and are unaffected if the GLB fails.

### Stage C — true UV/decal mapping

Artwork mapped onto carrier UVs rather than onto planes. The shirt has three UV sets and
tangents, so this is possible eventually. Not required, and not recommended soon.

### Recommendation: **build Stage A first, and do not treat Stage B as near-term.**

This is not merely the easier path — for two of three articles the GLB route is blocked on real
work, and for the third on licensing:

- **Shirt:** needs de-rigging (361 nodes), a ~100x rescale, and a 27 MB texture strip.
- **Pant:** needs a 692 MB to sub-megabyte conversion before it can be considered at all.
- **Shoe:** blocked on brand IP and absent licence, which no amount of engineering resolves.

Stage A also produces a better product outcome: a procedural carrier has *no* silhouette to
impose, which is precisely the stated intent.

---

## 8. Material and visibility rules

| Element | Material rules |
|---|---|
| Carrier base | `opacity: 0`, `transparent: true`, `depthWrite: false`, not raycast-blocking for artwork; or simply not added to the scene outside debug mode |
| Carrier debug | A debug toggle renders it as a wireframe or low-opacity ghost. **Authoring aid only** |
| Artwork planes | `opacity: 1`, `transparent: true` **or** `alphaTest ~0.5`, `side: FrontSide`, `map` = the bound image |
| Hanger bar / hook | Fully opaque, `rack-metal` slot — genuinely visible hardware |

Notes for implementation:

- **`transparent`, `opacity` and `alphaTest` do not currently appear anywhere in
  `components/presence-spatial/`.** Materials are `MeshStandardMaterial` created without them.
  Alpha support is the one genuinely new rendering capability this spec requires.
- Prefer **`alphaTest`** over full transparency for garment artwork. It writes depth correctly
  and avoids the sorting artefacts that a rail of twelve overlapping transparent planes would
  otherwise produce. Reserve full `transparent` blending for soft-edged artwork that needs it.
- Texture mapping itself already exists — `TextureLoader`, `material.map` and the
  `mediaSurface` part flag are all in place — so artwork binding is an extension of a working
  path, not a new one.
- Shadows and outlines must be **off by default** for carriers. A shadow cast by an invisible
  generic torso would reintroduce exactly the silhouette this design removes. Allow it only as
  an explicit opt-in.

---

## 9. Save/reload contract

**Stored in the saved layout:**

- Garment piece refs (`piece:…`) and `garmentArticleType`
- Media refs for front/back/side/top, as ids resolving against `room.media`
- `contentBindings` with `order`, `label`, `caption`, `actionRefs`
- The arrangement spec (kind, capacity, overflow policy, seed)
- Material/skin refs where used

**Never stored:**

- Raw image bytes, base64 or data URIs
- Raw GLB source paths, and never a path into `C:\Dev\presence pieces`
- Derived per-piece transforms — slots stay derived, as they are today
- Signed or expiring URLs
- Per-client duplicate GLBs

The existing validator already rejects `.glb`/`.gltf` locators and enforces the 100 KB layout
budget; both invariants must continue to hold with garment bindings present.

---

## 10. Semantic fallback

A garment row should carry: title, article type, front/back media labels where present,
caption, collection/drop tag, action links, overflow status and rack order.

This mostly works today — every binding produces a fallback row with label, caption, piece type
and actions, including overflowed ones. What is missing is **fashion-specific labelling**: a row
currently reads *"Look 03 — Signal Tee. Piece type: garment."* and should read closer to
*"Look 03 — Signal Tee. Shirt, front and back artwork. Spring drop. Rack position 3 of 12.
Enquire."*

Fallback must stay complete when the GLB fails, WebGL is unavailable, an image fails to load,
or reduced-motion/mobile paths are used. Because Stage A has no GLB and artwork failure leaves
the label and actions intact, the Stage A fallback story is strong by construction.

---

## 11. Operator UX requirements

Internal arranger controls needed:

1. Choose `garmentArticleType` when creating a garment piece.
2. Assign front image; assign back image.
3. Assign side/top image where the article supports it.
4. Bind a garment to a rack slot (next open slot, or a chosen slot).
5. Move a garment left/right; remove it from the rack, keeping it in the Library.
6. Inspect a garment.
7. **Carrier debug toggle** — show the invisible carrier while authoring.
8. **Warn on missing front/back image** — a garment with no artwork is an invisible carrier and
   nothing else, which would otherwise look like a bug.
9. Show capacity and overflow in the authoring UI, not only in compiled output.
10. State a reason when a host rejects a piece.

Item 8 deserves emphasis: with this architecture, "no artwork" and "broken" look identical in
the viewport. The authoring UI has to distinguish them.

---

## 12. Risks and limitations

| Risk | Note |
|---|---|
| **Alpha image quality** | The whole silhouette depends on the client's alpha channel. Hard-edged or haloed cut-outs will look wrong, and Presence cannot fix that downstream. Operators need guidance on export settings. |
| **Wrong proportions** | Carrier bounds are fixed per article; a long coat on a shirt carrier will overflow or float. Consider per-piece aspect-ratio scaling driven by the artwork's own dimensions. |
| **Sleeve/collar/hem variation** | Solved by alpha for the *outline*, but a garment whose artwork is much wider than the carrier will visually escape its bounds. |
| **Shoes are not front/back** | Handled by using side/top fields, but it means the shoe path diverges from shirt/pant and needs its own UX. |
| **Depth reading** | An invisible carrier removes shading cues. A rail of flat planes can read as cardboard cut-outs. Mitigate with slight per-slot rotation, a soft contact shadow on the rail rather than under the garment, and careful lighting. |
| **Transparency sorting** | Twelve overlapping transparent planes on one rail is a classic sorting hazard. `alphaTest` avoids most of it. |
| **Selection without visible geometry** | Raycast must target carrier bounds, not the artwork plane, or a garment becomes unclickable wherever its image is transparent. |
| **Mobile performance** | Stage A is cheap — a few planes per garment. The risk is texture memory: twelve garments x two 2K images each is significant. Cap artwork resolution and lazy-load off-screen slots. |
| **Media preparation burden** | This architecture moves work onto whoever prepares the artwork. That is the right trade — it buys per-design silhouettes — but it should be stated plainly rather than discovered. |

---

## 13. Implementation recommendation for Codex

**Build Stage A. Do not use any source GLB at runtime in this task.**

Bounded scope, in order:

1. **Add alpha support to the material path** — `transparent`, `opacity` and `alphaTest` on
   media-surface materials. This is the only new rendering capability required.
2. **Replace the hard-coded shirt silhouette in `garmentHangerParts()`** with a plain
   rectangular artwork plane, and split it into separate single-sided **front** and **back**
   planes. Keep the bar and hook visible.
3. **Add procedural invisible carriers** for `shirt`, `pant`, `shoe` and `generic`, each
   providing bounds, hang point, inspection anchor and article-appropriate artwork planes
   (front/back for shirt and pant; outer-side/top for shoe).
4. **Add the minimum garment metadata** — `garmentArticleType`, `frontImageRef`,
   `backImageRef`, `displayImageRef` — and validate them.
5. **Rack-row arrangement**: upright, hanging below the rail, pitch derived from host width.
6. **Rack slot targeting UI** and the operator controls in section 11, including the
   carrier debug toggle and the missing-artwork warning.
7. **Fashion-specific fallback labelling** per section 10.

Explicitly **not** in this task: any use of the inspected GLB files, garment visual art
quality, UV decals, per-piece aspect scaling, or metadata beyond the four minimum fields.

**Follow-up task, separately scoped:** prepare the shirt for Stage B — de-rig, rescale, strip
textures, re-export as GLB through the existing ingestion pipeline, and record it as a
`candidate-review-required` component. Only then consider a lazy GLB carrier. The pant needs
its 692 MB conversion first. **The shoe should not be prepared at all** until a licence-clear,
non-branded model is sourced.

---

## Boundaries

This is an internal architecture specification. It admits no component, constitutes no Mobstar
creative acceptance, and makes no claim about public launch, client self-serve, commerce,
multiplayer, publishing, backend persistence or production readiness. Source models in
`C:\Dev\presence pieces` were read only and were not modified, moved or copied. No raw or
unoptimised GLB is proposed for runtime use.
