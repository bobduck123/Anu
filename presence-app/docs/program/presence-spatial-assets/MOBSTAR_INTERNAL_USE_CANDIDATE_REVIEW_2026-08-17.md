# Mobstar Gate 4 internal-use candidate review

Date: 2026-08-17  
Gate: Mobstar Gate 4  
Manifest: `assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json`  
Bridge: `assets/presence-spatial/candidates/component-bridge.mobstar-gate4.json`  
Shortlist: `assets/presence-spatial/candidates/mobstar-shortlist.json`

> **Status: internal-use candidates only.**
> Nothing in this document is an admitted Presence component. Nothing is production-ready or
> public-launch-ready. Source clearance is an owner declaration recorded as-is — no independent
> legal verification was performed, and the original provenance metadata is preserved unchanged.

## What the three statuses mean here

| Status | Meaning | Used in this pass |
|---|---|---|
| `candidate-review-required` | What the ingestion pipeline writes. Unreviewed. | All 126 registry entries keep this. |
| `candidate-cleared-for-internal-use` | Single-context review passed. Usable inside Mobstar Gate 4 only. | **Granted to the entries below.** |
| `admitted-presence-component` | Second-context review passed; a real Presence library component. | **Granted to nothing.** Enforced in code and by test. |

The candidate registry itself was not mutated. Internal-use clearance is additive
metadata in a separate manifest, so re-running the ingestion pipeline cannot silently
overwrite a review decision, and revoking clearance means deleting one file.

## Source clearance

The product owner confirmed they will source these assets and that source/licence
concerns are cleared appropriately for internal use. That declaration is recorded on
every entry as `user-sourced-cleared-for-internal-use`, alongside:

- `independentLegalVerification: false`
- the original `declaredLicense`, `declaredAuthor`, `declaredCopyright` and licence evidence, carried forward unchanged

No licence field was erased or rewritten. Two of the selected items descend from
`CC-BY-4.0` sources, whose attribution requirement still travels with anything published.

## Selected components (5)

### `candidate.table.old-church-modeling-interior-sce-ffd7-017` — display-island

- **Observed as:** Clean rectangular stone slab on a recessed stepped base — reads as a sculptural plinth, not a table
- Status: `candidate-cleared-for-internal-use`
- Runtime asset: `assets/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb` (optimised candidate export, not a raw source GLB)
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.table.old-church-modeling-interior-sce-ffd7-017.webp`
- Dimensions: 1.57 x 0.78 x 2.56 m | Size: 7.8 KB | Budget: within-budget (simple)
- Material slots: top, legs, base → Presence slots: tabletop, rack-metal
- Anchors (7): center, top-center, front-center, back-center, left-center, right-center, surface-top
- Placement: floor
- Scores — visual 4/4, scale 3/4, Mobstar fit 4/4
- Scale confirmation required: no
- Provenance: licence `CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)`, author `Aurélien Martel (https://sketchfab.com/aurelien_martel)`
- Not admitted because: Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.
- The standout find of the batch. Silhouette is clean, symmetrical and reads immediately as a premium central display island.
- 1.57 x 0.78 x 2.56 m is a usable island footprint at a natural 0.78 m display height.
- 7.8 KB shape-only — two orders of magnitude inside the simple-component budget.
- Originally a church altar; stripped of texture it carries no religious signal, but a reviewer should confirm that framing is acceptable.
- Pairs with the rounded-island / display-bay primitives in the Gate 4 lane as the authored counterpart.

### `candidate.chair.interior-7-3bc1-013` — product-riser

- **Observed as:** Three stacked chunky sculptural blocks forming a stepped riser — not a chair
- Status: `candidate-cleared-for-internal-use`
- Runtime asset: `assets/presence-spatial/candidates/components/candidate.chair.interior-7-3bc1-013.glb` (optimised candidate export, not a raw source GLB)
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-013.webp`
- Dimensions: 0.35 x 0.49 x 0.42 m | Size: 11.6 KB | Budget: within-budget (simple)
- Material slots: frame, fabric, legs → Presence slots: rack-metal, fabric
- Anchors (7): center, top-center, front-center, back-center, left-center, right-center, surface-top
- Placement: floor
- Scores — visual 3/4, scale 2/4, Mobstar fit 4/4 | **needs-3d-review**
- Scale confirmation required: **yes**
- Provenance: licence `SKETCHFAB Standard (https://sketchfab.com/licenses)`, author `dasy444 (https://sketchfab.com/dasy444)`
- Not admitted because: Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.
- Stacked raw blocks are a current streetwear-retail display idiom; this is a strong Mobstar fit despite the wrong category guess.
- 0.35 x 0.49 x 0.42 m is a plausible riser, but absolute scale is inherited from a source whose units are unconfirmed.
- 11.6 KB. Cheap enough to place several across the floor.
- needs-3d-review to confirm the blocks are solid and the stack is stable-looking from all sides.

### `candidate.decorative-prop.interior-7-3bc1-009` — showroom-seating

- **Observed as:** Wire-frame tub armchair with a thin seat pad
- Status: `candidate-cleared-for-internal-use`
- Runtime asset: `assets/presence-spatial/candidates/components/candidate.decorative-prop.interior-7-3bc1-009.glb` (optimised candidate export, not a raw source GLB)
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.interior-7-3bc1-009.webp`
- Dimensions: 0.38 x 0.32 x 0.38 m | Size: 51.8 KB | Budget: within-budget (simple)
- Material slots: primary, secondary, accent → Presence slots: wall, floor, logo-accent
- Anchors (7): center, top-center, front-center, back-center, left-center, right-center, surface-top
- Placement: surface
- Scores — visual 3/4, scale 1/4, Mobstar fit 2/4 | **needs-3d-review**
- Scale confirmation required: **yes**
- Provenance: licence `SKETCHFAB Standard (https://sketchfab.com/licenses)`, author `dasy444 (https://sketchfab.com/dasy444)`
- Not admitted because: Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.
- Good open wire silhouette that will not visually block a small showroom floor.
- Recorded dimensions of 0.38 x 0.32 x 0.38 m are far too small for a real armchair, so the source scale is wrong or the extraction is partial.
- scaleConfidence scored 1 for that reason; do not place without a 3D scale pass.
- 51.8 KB. Fit is moderate: it reads more cafe than luxury streetwear and may be replaced by an authored bench.

### `candidate.chair.interior-7-3bc1-000` — display-lighting-fixture

- **Observed as:** Studio light head on a collapsible tripod stand — a lighting fixture, not a chair
- Status: `candidate-cleared-for-internal-use`
- Runtime asset: `assets/presence-spatial/candidates/components/candidate.chair.interior-7-3bc1-000.glb` (optimised candidate export, not a raw source GLB)
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-000.webp`
- Dimensions: 0.41 x 0.86 x 0.43 m | Size: 323.8 KB | Budget: within-budget (common)
- Material slots: frame, fabric, legs → Presence slots: rack-metal, fabric
- Anchors (7): center, top-center, front-center, back-center, left-center, right-center, surface-top
- Placement: floor
- Scores — visual 3/4, scale 2/4, Mobstar fit 3/4 | **needs-3d-review**
- Scale confirmation required: **yes**
- Provenance: licence `SKETCHFAB Standard (https://sketchfab.com/licenses)`, author `dasy444 (https://sketchfab.com/dasy444)`
- Not admitted because: Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.
- A visible studio light is a credible showroom prop for a streetwear brand and supports the campaign/photography framing.
- Recorded height of 0.86 m is short for a light stand; the stand may be extracted collapsed, or the source scale is off.
- 323.8 KB, within the simple-component budget but the heaviest of the selected props.
- Geometry only — it emits nothing. Actual lighting comes from the Gate 4 lighting profile, not from this mesh.

### `candidate.shelf.retopo-g-555780-0ae2-013` — soft-division-drape

- **Observed as:** Full-height gathered fabric curtain / drape — not a shelf
- Status: `candidate-cleared-for-internal-use`
- Runtime asset: `assets/presence-spatial/candidates/components/candidate.shelf.retopo-g-555780-0ae2-013.glb` (optimised candidate export, not a raw source GLB)
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.shelf.retopo-g-555780-0ae2-013.webp`
- Dimensions: 0.29 x 2.07 x 1.13 m | Size: 127 KB | Budget: within-budget (simple)
- Material slots: wood, frame, base → Presence slots: tabletop, rack-metal
- Anchors (7): center, top-center, front-center, back-center, left-center, right-center, surface-top
- Placement: floor
- Scores — visual 3/4, scale 3/4, Mobstar fit 3/4
- Scale confirmation required: no
- Provenance: licence `none declared`, author `none declared`
- Not admitted because: Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.
- Convincing cloth folds. Useful as a fitting-area division or a soft backdrop behind a garment display.
- 2.07 m tall is a credible drape height and consistent with a metre-scaled source.
- 127 KB. Maps cleanly onto the fabric material slot, so it can take fabric-garment-dark from the Gate 4 palette.
- Single-sided cloth: check backface behaviour in 3D before placing it where both sides are visible.

## Selected room kits (1)

### `candidate.roomkit.warehouse-17b3`

- **Observed as:** Brutalist interior shell with vertical ribbed/fluted concrete walls and a stepped ceiling
- Status: `candidate-cleared-for-internal-use` | category: warehouse
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.warehouse-17b3.glb`
- Dimensions: 10.70 x 4.22 x 6.79 m | Size: 668.2 KB | Budget: within-budget
- **Usage: use-whole-or-mine** — Usable whole as a showroom shell for Gate 4, and worth mining for its ribbed wall surface in a later pass. It is an optimised candidate export, not the 40.8 MB raw source GLB.
- Component candidates extracted from this interior: 1
- Scale confirmation required: no
- The strongest architectural match in the batch for a dark luxury showroom: heavy ribbed concrete reads as sculptural rather than domestic.
- Metre-scaled at 10.7 x 4.2 x 6.8, so no rescale is needed — rare in this batch.
- 668 KB textured, comfortably inside the 3 MB room-kit eager budget.
- Directly compatible with the ribbed-wall primitive and warm-nocturnal-boutique style added in the Gate 4 art-direction lane.
- Thumbnail views the shell from outside; interior read still needs a 3D pass before it drives final art direction.

## Gaps to fill procedurally

Five Mobstar roles have no suitable extracted candidate. The most important is the
garment rack: there is no rack anywhere in the registry, because nothing ingested is a
retail environment.

- **`garment-rack`** → `suspended-rack`. The candidate registry contains zero rack-category components. No ingested source is a retail environment, so no garment rail or rack exists to extract. Use the suspended-rack primitive from the Gate 4 art-direction lane with the rack-matte-black preset. This is the single most important Mobstar fixture and must be procedural for this gate.
- **`garment-carrier`** → `garment-hanger`. No garment, hanger or mannequin geometry exists anywhere in the batch. Use the garment-hanger primitive with fabric-garment-dark and fabric-garment-signal so individual Pieces can be hung on rack slot anchors.
- **`projection-media-wall`** → `projection-grid`. No projection-surface candidate exists. The only large flat panel in the batch carries a third-party baked brand graphic and was rejected on sight. Use the projection-grid primitive with projection-campaign-warm. Campaign media must be an assigned media ref, never baked geometry.
- **`poster-archive-surface`** → `framed-media`. No poster or frame candidate exists in the registry. Use the framed-media primitive with poster-decal slots so archive imagery stays a swappable media ref.
- **`wall-treatment`** → `ribbed-wall`. No standalone wall-treatment component is usable. The ribbed surface exists only inside the brutalist room kit, and the only extracted wall panels are franchise geometry or branded graphics. Use the ribbed-wall primitive with wall-charcoal, or mine the ribbed surface out of the brutalist room kit in a later pass.

## How Gate 4 consumes this

The bridge at `assets/presence-spatial/candidates/component-bridge.mobstar-gate4.json` maps each selected candidate to a role, a runtime
asset, material slots, anchors and a placement, and names the style and lighting this set
targets: `warm-nocturnal-boutique` and `boutique-product-warm`.

Layouts reference components; geometry is never inlined and no per-client GLB is created.
Mobstar identity arrives through material presets, skins and media refs on the shared slots.

## What still requires a human

- Second-context art-direction review before anything becomes `admitted-presence-component`.
- 3D scale confirmation on every entry flagged `needs-3d-review`; three of the six selected components carry unconfirmed absolute scale.
- A decision on whether the display plinth's origin as a church altar is acceptable framing.
- Confirmation that CC-BY attribution will be carried wherever these appear.

