# Mobstar Gate 4 component shortlist

Date: 2026-08-17  
Gate: Mobstar Gate 4 — dark luxury streetwear showroom  
Source registry: `assets/presence-spatial/candidates/manifests/candidate-registry.json`

> **Status: internal-use candidates only.**
> Nothing in this document is an admitted Presence component. Nothing is production-ready or
> public-launch-ready. Source clearance is an owner declaration recorded as-is — no independent
> legal verification was performed, and the original provenance metadata is preserved unchanged.

## How this shortlist was produced

Two stages, deliberately separated:

1. **Automated filter** over the candidate registry — runtime asset present, inside budget, has a thumbnail, has material slots, has anchors, plausible showroom scale, and not from an excluded source. This narrows the field; it never selects.
2. **Recorded visual review** — every selected or rejected row below was judged by opening its rendered thumbnail. Metadata alone was not trusted, and that turned out to matter.

| Metric | Value |
|---|---|
| Registry components | 118 |
| Registry room kits | 8 |
| Passed the automated filter | 35 |
| Visually reviewed | 11 |
| Selected for Gate 4 | 6 |
| Rejected on sight | 3 |

### Why visual review was not optional

`candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` scored well on every automated
measure: right category, 1.83 x 2.49 m, flat, 264 KB, inside budget, slots and anchors
present. Its thumbnail shows a third party's baked brand graphic reading "ENJOY YOUR
TIME WITH COFFEE". A metadata-only shortlist would have promoted another brand's
identity into the Mobstar showroom.

The heuristic categories were also wrong on most of what proved useful: the best display
plinth is filed as `table`, the product risers as `chair`, the seating as
`decorative-prop`, the lighting fixture as `chair`, and the drape as `shelf`.

## Selection criteria

- useful for a dark luxury streetwear showroom
- good silhouette when viewed shape-only
- usable scale, or an explicitly recorded scale doubt
- low payload and inside its budget tier
- clear material slots
- at least one anchor
- a rendered thumbnail good enough to judge from
- not obvious junk, service equipment or a grouped extraction
- not a redundant duplicate of a better candidate
- no third-party brand or franchise identity baked into geometry

## Selected — `use-for-mobstar-gate4`

Cleared for internal Gate 4 use. See the internal-use manifest and bridge.

| Candidate | Observed as | Role | Dimensions (m) | Size | Visual | Scale | Fit | Budget |
|---|---|---|---|---|---|---|---|---|
| `candidate.chair.interior-7-3bc1-000` | Studio light head on a collapsible tripod stand — a lighting fixture, not a chair | display-lighting-fixture | 0.41 x 0.86 x 0.43 | 323.8 KB | 3/4 | 2/4 ⚠ | 3/4 | within-budget |
| `candidate.chair.interior-7-3bc1-013` | Three stacked chunky sculptural blocks forming a stepped riser — not a chair | product-riser | 0.35 x 0.49 x 0.42 | 11.6 KB | 3/4 | 2/4 ⚠ | 4/4 | within-budget |
| `candidate.decorative-prop.interior-7-3bc1-009` | Wire-frame tub armchair with a thin seat pad | showroom-seating | 0.38 x 0.32 x 0.38 | 51.8 KB | 3/4 | 1/4 ⚠ | 2/4 | within-budget |
| `candidate.roomkit.warehouse-17b3` | Brutalist interior shell with vertical ribbed/fluted concrete walls and a stepped ceiling | showroom-shell | 10.70 x 4.22 x 6.79 | 668.2 KB | 3/4 | 4/4 | 3/4 | within-budget |
| `candidate.shelf.retopo-g-555780-0ae2-013` | Full-height gathered fabric curtain / drape — not a shelf | soft-division-drape | 0.29 x 2.07 x 1.13 | 127 KB | 3/4 | 3/4 | 3/4 | within-budget |
| `candidate.table.old-church-modeling-interior-sce-ffd7-017` | Clean rectangular stone slab on a recessed stepped base — reads as a sculptural plinth, not a table | display-island | 1.57 x 0.78 x 2.56 | 7.8 KB | 4/4 | 3/4 | 4/4 | within-budget |

### `candidate.chair.interior-7-3bc1-000`

- Observed as: Studio light head on a collapsible tripod stand — a lighting fixture, not a chair
- Source: `source.interior-7` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-000.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- A visible studio light is a credible showroom prop for a streetwear brand and supports the campaign/photography framing.
- Recorded height of 0.86 m is short for a light stand; the stand may be extracted collapsed, or the source scale is off.
- 323.8 KB, within the simple-component budget but the heaviest of the selected props.
- Geometry only — it emits nothing. Actual lighting comes from the Gate 4 lighting profile, not from this mesh.

### `candidate.chair.interior-7-3bc1-013`

- Observed as: Three stacked chunky sculptural blocks forming a stepped riser — not a chair
- Source: `source.interior-7` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-013.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Stacked raw blocks are a current streetwear-retail display idiom; this is a strong Mobstar fit despite the wrong category guess.
- 0.35 x 0.49 x 0.42 m is a plausible riser, but absolute scale is inherited from a source whose units are unconfirmed.
- 11.6 KB. Cheap enough to place several across the floor.
- needs-3d-review to confirm the blocks are solid and the stack is stable-looking from all sides.

### `candidate.decorative-prop.interior-7-3bc1-009`

- Observed as: Wire-frame tub armchair with a thin seat pad
- Source: `source.interior-7` | pipeline category guess: `decorative-prop`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.interior-7-3bc1-009.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Good open wire silhouette that will not visually block a small showroom floor.
- Recorded dimensions of 0.38 x 0.32 x 0.38 m are far too small for a real armchair, so the source scale is wrong or the extraction is partial.
- scaleConfidence scored 1 for that reason; do not place without a 3D scale pass.
- 51.8 KB. Fit is moderate: it reads more cafe than luxury streetwear and may be replaced by an authored bench.

### `candidate.roomkit.warehouse-17b3`

- Observed as: Brutalist interior shell with vertical ribbed/fluted concrete walls and a stepped ceiling
- Source: `source.brutalist-interior-vr-room-baked-source-untitled` | pipeline category guess: `warehouse`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.warehouse-17b3.webp`
- The strongest architectural match in the batch for a dark luxury showroom: heavy ribbed concrete reads as sculptural rather than domestic.
- Metre-scaled at 10.7 x 4.2 x 6.8, so no rescale is needed — rare in this batch.
- 668 KB textured, comfortably inside the 3 MB room-kit eager budget.
- Directly compatible with the ribbed-wall primitive and warm-nocturnal-boutique style added in the Gate 4 art-direction lane.
- Thumbnail views the shell from outside; interior read still needs a 3D pass before it drives final art direction.

### `candidate.shelf.retopo-g-555780-0ae2-013`

- Observed as: Full-height gathered fabric curtain / drape — not a shelf
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `shelf`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.shelf.retopo-g-555780-0ae2-013.webp`
- Convincing cloth folds. Useful as a fitting-area division or a soft backdrop behind a garment display.
- 2.07 m tall is a credible drape height and consistent with a metre-scaled source.
- 127 KB. Maps cleanly onto the fabric material slot, so it can take fabric-garment-dark from the Gate 4 palette.
- Single-sided cloth: check backface behaviour in 3D before placing it where both sides are visible.

### `candidate.table.old-church-modeling-interior-sce-ffd7-017`

- Observed as: Clean rectangular stone slab on a recessed stepped base — reads as a sculptural plinth, not a table
- Source: `source.old-church-modeling-interior-scene` | pipeline category guess: `table`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.table.old-church-modeling-interior-sce-ffd7-017.webp`
- The standout find of the batch. Silhouette is clean, symmetrical and reads immediately as a premium central display island.
- 1.57 x 0.78 x 2.56 m is a usable island footprint at a natural 0.78 m display height.
- 7.8 KB shape-only — two orders of magnitude inside the simple-component budget.
- Originally a church altar; stripped of texture it carries no religious signal, but a reviewer should confirm that framing is acceptable.
- Pairs with the rounded-island / display-bay primitives in the Gate 4 lane as the authored counterpart.

## Deferred — `maybe-use-later`

Competent but not right for this direction, or not reviewed in this pass.

| Candidate | Observed as | Role | Dimensions (m) | Size | Visual | Scale | Fit | Budget |
|---|---|---|---|---|---|---|---|---|
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012` | not visually reviewed in this pass | - | 0.45 x 1.19 x 0.45 | 137.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-020` | not visually reviewed in this pass | - | 0.32 x 0.99 x 0.32 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-023` | not visually reviewed in this pass | - | 0.33 x 1.04 x 0.33 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.interior-7-3bc1-008` | not visually reviewed in this pass | - | 0.37 x 0.41 x 0.30 | 47.9 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.interior-7-3bc1-012` | not visually reviewed in this pass | - | 0.30 x 0.48 x 0.33 | 35.2 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.interior-7-3bc1-014` | not visually reviewed in this pass | - | 0.51 x 0.49 x 0.47 | 11.7 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.chair.pottery-007-0ae2-006` | Terracotta vase with flowering stems | - | 0.43 x 0.67 x 0.37 | 324.8 KB | 3/4 | 3/4 | 1/4 | within-budget |
| `candidate.column.coffee-shop-gld-coffee-shop-0ae2-011` | not visually reviewed in this pass | - | 0.22 x 0.56 x 0.24 | 143.8 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.column.interior-7-3bc1-015` | not visually reviewed in this pass | - | 0.15 x 1.53 x 0.15 | 7.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.decorative-prop.coffee-shop-gld-coffee-shop-0ae2-008` | not visually reviewed in this pass | - | 0.23 x 0.24 x 0.55 | 13.7 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.decorative-prop.interior-7-3bc1-016` | not visually reviewed in this pass | - | 0.05 x 0.35 x 0.22 | 2.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.shelf.interior-7-3bc1-018` | not visually reviewed in this pass | - | 0.55 x 3.71 x 0.47 | 2.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.sofa.sofa-001-0ae2-003` | not visually reviewed in this pass | - | 3.41 x 1.25 x 2.59 | 751.2 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.table.coffee-shop-gld-coffee-shop-0ae2-000` | not visually reviewed in this pass | - | 0.63 x 0.63 x 1.41 | 2464.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-007` | not visually reviewed in this pass | - | 0.01 x 1.33 x 1.23 | 359.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-016` | not visually reviewed in this pass | - | 0.27 x 0.85 x 0.27 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-017` | not visually reviewed in this pass | - | 0.28 x 0.86 x 0.28 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-018` | not visually reviewed in this pass | - | 0.28 x 0.88 x 0.28 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-019` | not visually reviewed in this pass | - | 0.29 x 0.92 x 0.29 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-021` | not visually reviewed in this pass | - | 0.30 x 0.92 x 0.30 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-022` | not visually reviewed in this pass | - | 0.26 x 0.83 x 0.26 | 87.5 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.interior-7-3bc1-004` | not visually reviewed in this pass | - | 1.38 x 0.36 x 1.31 | 56.7 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.interior-7-3bc1-005` | not visually reviewed in this pass | - | 0.62 x 0.33 x 1.03 | 50.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.interior-7-3bc1-006` | not visually reviewed in this pass | - | 0.99 x 0.33 x 0.49 | 50.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.interior-7-3bc1-010` | not visually reviewed in this pass | - | 0.96 x 0.35 x 0.44 | 39.6 KB | n/a | n/a ⚠ | n/a | within-budget |
| `candidate.unknown-object.texturescom-persiancarpets0012-1-alphama-ffd7-010` | not visually reviewed in this pass | - | 1.23 x 0.49 x 2.78 | 21.2 KB | n/a | n/a ⚠ | n/a | within-budget |

### `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-020`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-020.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-023`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-023.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.interior-7-3bc1-008`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-008.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.interior-7-3bc1-012`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-012.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.interior-7-3bc1-014`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-014.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.chair.pottery-007-0ae2-006`

- Observed as: Terracotta vase with flowering stems
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `chair`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.chair.pottery-007-0ae2-006.webp`
- Competently modelled and could suit a warmer, more domestic Presence.
- Florals work against the dark luxury streetwear direction, so it is deferred rather than rejected outright.

### `candidate.column.coffee-shop-gld-coffee-shop-0ae2-011`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `column`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.column.coffee-shop-gld-coffee-shop-0ae2-011.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.column.interior-7-3bc1-015`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `column`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.column.interior-7-3bc1-015.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.decorative-prop.coffee-shop-gld-coffee-shop-0ae2-008`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `decorative-prop`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.coffee-shop-gld-coffee-shop-0ae2-008.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.decorative-prop.interior-7-3bc1-016`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `decorative-prop`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.interior-7-3bc1-016.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.shelf.interior-7-3bc1-018`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `shelf`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.shelf.interior-7-3bc1-018.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.sofa.sofa-001-0ae2-003`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `sofa`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.sofa.sofa-001-0ae2-003.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.table.coffee-shop-gld-coffee-shop-0ae2-000`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `table`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.table.coffee-shop-gld-coffee-shop-0ae2-000.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-007`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-007.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-016`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-016.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-017`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-017.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-018`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-018.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-019`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-019.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-021`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-021.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-022`

- Observed as: not visually reviewed in this pass
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-022.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.interior-7-3bc1-004`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-004.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.interior-7-3bc1-005`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-005.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.interior-7-3bc1-006`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-006.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.interior-7-3bc1-010`

- Observed as: not visually reviewed in this pass
- Source: `source.interior-7` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-010.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

### `candidate.unknown-object.texturescom-persiancarpets0012-1-alphama-ffd7-010`

- Observed as: not visually reviewed in this pass
- Source: `source.old-church-modeling-interior-scene` | pipeline category guess: `unknown-object`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.texturescom-persiancarpets0012-1-alphama-ffd7-010.webp`
- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.
- Passed the automated filter but was not visually reviewed in this pass; treat as unassessed.

## Blocked — `needs-manual-cleanup`

Would need splitting or repair before it could be used.

| Candidate | Observed as | Role | Dimensions (m) | Size | Visual | Scale | Fit | Budget |
|---|---|---|---|---|---|---|---|---|
| `candidate.sofa.sofa-0ae2-002` | A complete lounge seating set — sofa, two tub chairs, coffee table and two planters extracted as one object | - | 3.41 x 1.29 x 2.59 | 751.2 KB | 3/4 | 3/4 | 1/4 | within-budget |

### `candidate.sofa.sofa-0ae2-002`

- Observed as: A complete lounge seating set — sofa, two tub chairs, coffee table and two planters extracted as one object
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `sofa`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.sofa.sofa-0ae2-002.webp`
- The extraction is a grouping, not a component: six distinct objects share one node in the source.
- Would need splitting before any of its parts could be used, and the resulting sofa still reads cafe-lounge rather than showroom.
- 751 KB for the whole group.

## Rejected — `reject`

Not usable for Mobstar. Reasons are recorded so they are not re-litigated.

| Candidate | Observed as | Role | Dimensions (m) | Size | Visual | Scale | Fit | Budget |
|---|---|---|---|---|---|---|---|---|
| `candidate.shelf.coffee-vending-machine-station-0ae2-004` | Coffee vending machine with 'COFFEE POINT' lettering modelled into the housing | - | 0.80 x 2.35 x 1.29 | 737.4 KB | 3/4 | 4/4 | 0/4 | within-budget |
| `candidate.table.bovenkap-0ae2-001` | Rounded appliance hood or waste-bin housing | - | 0.95 x 1.15 x 0.95 | 586.5 KB | 2/4 | 3/4 | 0/4 | within-budget |
| `candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` | Wall panel carrying a third-party baked brand graphic reading 'ENJOY YOUR TIME WITH COFFEE' | - | 1.83 x 2.49 x 0.03 | 263.6 KB | 2/4 | 3/4 | 0/4 | within-budget |

### `candidate.shelf.coffee-vending-machine-station-0ae2-004`

- Observed as: Coffee vending machine with 'COFFEE POINT' lettering modelled into the housing
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `shelf`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.shelf.coffee-vending-machine-station-0ae2-004.webp`
- **Rejection reason: Third-party branded fixture with baked lettering; wrong fixture type for a streetwear showroom.**
- Well modelled and correctly scaled at 2.35 m tall, but semantically wrong and brand-contaminated.

### `candidate.table.bovenkap-0ae2-001`

- Observed as: Rounded appliance hood or waste-bin housing
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `table`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.table.bovenkap-0ae2-001.webp`
- **Rejection reason: Service equipment, not showroom furniture.**
- 586 KB for an object with no showroom role.

### `candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014`

- Observed as: Wall panel carrying a third-party baked brand graphic reading 'ENJOY YOUR TIME WITH COFFEE'
- Source: `source.coffee-shop-gld-coffee-shop` | pipeline category guess: `wall`
- Thumbnail: `assets/presence-spatial/candidates/thumbnails/candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014.webp`
- **Rejection reason: Another brand's identity is baked into the geometry.**
- By metadata alone this looked like an ideal 1.83 x 2.49 m media wall: right size, right category, flat, 263 KB.
- On sight it is unusable. Baking a third party's brand into shared component geometry is exactly what the component-reference model exists to prevent.
- This single row justifies the cost of thumbnail-driven review over metadata scoring.

## Roles the batch cannot fill

The ingested collection is interiors — a church, a coffee shop, two living rooms, a
spaceship and two baked VR rooms. It contains **no retail garment fixtures at all**, so
the fixtures most central to a streetwear showroom cannot be extracted and must be
procedural for this gate.

| Role | Why it is missing | Recommended fallback |
|---|---|---|
| `garment-rack` | The candidate registry contains zero rack-category components. No ingested source is a retail environment, so no garment rail or rack exists to extract. | `suspended-rack` — Use the suspended-rack primitive from the Gate 4 art-direction lane with the rack-matte-black preset. This is the single most important Mobstar fixture and must be procedural for this gate. |
| `garment-carrier` | No garment, hanger or mannequin geometry exists anywhere in the batch. | `garment-hanger` — Use the garment-hanger primitive with fabric-garment-dark and fabric-garment-signal so individual Pieces can be hung on rack slot anchors. |
| `projection-media-wall` | No projection-surface candidate exists. The only large flat panel in the batch carries a third-party baked brand graphic and was rejected on sight. | `projection-grid` — Use the projection-grid primitive with projection-campaign-warm. Campaign media must be an assigned media ref, never baked geometry. |
| `poster-archive-surface` | No poster or frame candidate exists in the registry. | `framed-media` — Use the framed-media primitive with poster-decal slots so archive imagery stays a swappable media ref. |
| `wall-treatment` | No standalone wall-treatment component is usable. The ribbed surface exists only inside the brutalist room kit, and the only extracted wall panels are franchise geometry or branded graphics. | `ribbed-wall` — Use the ribbed-wall primitive with wall-charcoal, or mine the ribbed surface out of the brutalist room kit in a later pass. |

Every recommended primitive already exists in the Gate 4 art-direction lane's extension
of `SpatialPrimitiveKind`, so no new model work is required to fill these gaps.

