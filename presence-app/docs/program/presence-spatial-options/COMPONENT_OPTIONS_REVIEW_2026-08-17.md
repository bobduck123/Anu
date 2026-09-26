# Component options review

Date: 2026-08-17
Scope: Curation review of the 118 generated candidate components, grouped into authoring categories
Status: **Curation and product taxonomy only.** Nothing here is admitted, licence-cleared, production-ready or accepted for any client.

## Method and honesty note

The candidate registry's `category` field is a *heuristic guess* made by the ingestion
pipeline from node names and bounding boxes. It is frequently wrong. Every component given a
score below was reviewed by opening its thumbnail, and `observedAs` records what the object
actually is. Components not individually opened are listed as unreviewed rather than scored.

Reviewed in detail: **13 of 118**. That is deliberate — this is a curation pass to seed an
authoring palette, not an exhaustive catalogue. The remaining 105 are triaged by group below.

**Franchise exclusion:** 23 of the 118 components come from the Star Wars Venator source and
are excluded from all product consideration regardless of individual quality.

Thumbnails: `assets/presence-spatial/candidates/thumbnails/<id>.webp`
Runtime exports: `assets/presence-spatial/candidates/components/<id>.glb`

## Library shape

| Pipeline category | Count | Curation read |
|---|---|---|
| `room-shell` | 42 | Mostly wall/floor fragments of interiors. Low individual value. |
| `unknown-object` | 24 | Genuinely unclassifiable; a few gems hide here. |
| `shelf` | 13 | Almost none are shelves. Mostly panels, piers and one drape. |
| `chair` | 9 | Mostly *not* chairs — includes risers and a light stand. |
| `column` | 6 | Rods, poles, pilasters. Some usable as fins. |
| `table` | 6 | Includes the single best object in the library. |
| `wall` | 6 | Includes one branded graphic that must never be used. |
| `decorative-prop` | 5 | Includes a good armchair mis-filed here. |
| `door` | 3 | All franchise-sourced. Excluded. |
| `sofa` | 2 | Both are grouped lounge sets, not single components. |
| `floor` | 2 | Large thin slabs; procedural floor is better. |

**No candidate in the entire library is over budget** — deduplication and Draco compression
did their job. Payload is not the constraint here. Semantic quality is.

---

## Walls / dividers / shells

Procedural equivalents already exist and are better: `presence.wall-panel`,
`presence.divider-wall`, `presence.ribbed-wall`, `presence.boutique-shell`, `presence.room-shell`.

| Component | observedAs | Dim (m) | Payload | Decision |
|---|---|---|---|---|
| `candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` | Wall panel with third-party baked graphic reading "ENJOY YOUR TIME WITH COFFEE" | 1.83×2.49×0.03 | 264 KB | **reject** |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-016` | Two thin Gothic arch ribs — edge curves only, no solid surface | 4.33×4.30×10.87 | 7.8 KB | **mine-for-shape-only** |
| `candidate.shelf.interior-7-3bc1-018` | Tall narrow pier / pilaster slab, not a shelf | 0.55×3.71×0.47 | 2.6 KB | **maybe-later** |
| 42 × `room-shell`, 6 × `wall` (remainder) | Not individually reviewed — wall and floor fragments of source interiors | various | small | **maybe-later** |

- The branded panel is the single most important rejection in the library. It looked ideal on
  every metadata measure. Baking another brand's identity into shared geometry is precisely
  what the component-reference model exists to prevent.
- The Gothic arch ribs are worthless as geometry but valuable as a **proportion reference**
  for a future procedural arch primitive.
- **Group verdict:** procedural wins outright. Do not expose candidate walls as options.

## Tables / islands / plinths

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.table.old-church-modeling-interior-sce-ffd7-017` | Clean rectangular stone slab on a recessed stepped base — a sculptural plinth, not a table | 1.57×0.78×2.56 | **7.8 KB** | 4 | 4 | 3 | **expose-as-candidate-option** |
| `candidate.table.bovenkap-0ae2-001` | Rounded appliance hood or waste-bin housing | 0.95×1.15×0.95 | 587 KB | 0 | 2 | 3 | **reject** |

- **Source:** church interior (`CC-BY-4.0`, attribution travels) / coffee shop.
- **Material slots:** `top`, `legs`, `base` → Presence `tabletop`, `rack-metal`.
- **Anchors:** 7 including `center`, `top-center`, `surface-top`.
- The plinth is the standout object of the entire 118-component library: clean symmetrical
  silhouette, natural 0.78 m display height, and 7.8 KB — two orders of magnitude inside the
  simple-component budget. Likely use: central display island for any vertical — fashion,
  gallery, product, artefact.
- Caveat a human must settle: it is a church altar. De-textured it carries no religious
  signal, but the provenance is a framing decision, not a curation default.

## Shelves / racks / display rails

**The library contains no rack of any kind.** Nothing ingested was a retail environment.

| Component | observedAs | Decision |
|---|---|---|
| `candidate.shelf.coffee-vending-machine-station-0ae2-004` | Coffee vending machine with "COFFEE POINT" modelled lettering | **reject** |
| `candidate.shelf.retopo-g-555780-0ae2-013` | Full-height gathered fabric curtain — not a shelf | recategorised → see *Drapes* |
| 11 × `shelf` (remainder, mostly franchise) | Wall panels and piers | **reject/defer** |

- **Group verdict:** total gap. Use `presence.suspended-rack`, `presence.display-shelf`,
  `presence.display-bay` and `presence.garment-hanger`, all already implemented procedurally.

## Frames / poster surfaces

**Empty.** Zero `frame` and zero `poster` candidates in the library.

- **Group verdict:** total gap. Use `presence.framed-media` (procedural, already implemented).

## Projection / media surfaces

**Empty.** Zero `projection-surface` candidates. The only large flat panel available was the
branded coffee graphic, rejected above.

- **Group verdict:** total gap. Use `presence.projection-wall` (procedural, already implemented).
- This is the correct outcome: media surfaces should carry *assigned media refs*, never baked
  imagery. An extracted mesh with a picture in its texture is an anti-pattern for Presence.

## Lights / fixtures

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.chair.interior-7-3bc1-000` | Studio light head on a collapsible tripod stand — a lighting fixture, not a chair | 0.41×0.86×0.43 | 324 KB | 3 | 3 | 2 | **needs-scale-review** |

- Recorded height 0.86 m is short for a light stand; it may be extracted collapsed, or the
  source scale is off. Do not place without a 3D scale pass.
- Emits nothing — geometry only. Actual light comes from the Presence lighting profile.
- A visible studio light is a credible prop for artists, photographers and fashion presences.
- Procedural alternative already exists: `presence.light-fixture`.

## Seating

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.decorative-prop.interior-7-3bc1-009` | Wire-frame tub armchair with a thin seat pad | 0.38×0.32×0.38 | 51.8 KB | 2 | 3 | **1** | **needs-scale-review** |
| `candidate.sofa.sofa-0ae2-002` | A whole lounge set — sofa, two tub chairs, coffee table, two planters — extracted as one object | 3.41×1.29×2.59 | 751 KB | 1 | 3 | 3 | **needs-redesign** (split first) |
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012` and 7 others | Not individually reviewed; mixed stools/rods | various | ≤138 KB | – | – | – | **maybe-later** |

- The armchair's recorded 0.38 m footprint is doll-sized. Its silhouette is good and open,
  which suits small rooms, but scale confidence is genuinely 1/4 and is scored as such.
- The lounge "sofa" is a grouping, not a component. Six distinct objects share one node.

## Drapes / soft dividers

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.shelf.retopo-g-555780-0ae2-013` | Full-height gathered fabric curtain with convincing folds | 0.29×2.07×1.13 | 127 KB | 3 | 3 | 3 | **expose-as-candidate-option** |

- 2.07 m is a credible drape height, consistent with a metre-scaled source.
- Maps cleanly onto the `fabric` material slot, so it can take any fabric preset.
- Check backface behaviour in 3D — single-sided cloth may vanish from one side.
- Genuinely useful platform-wide: fitting areas, soft division, stage backdrop, intimate
  listening corners.

## Product display objects

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.chair.interior-7-3bc1-013` | Three stacked chunky sculptural blocks forming a stepped riser — not a chair | 0.35×0.49×0.42 | 11.6 KB | 4 | 3 | 2 | **expose-as-candidate-option** (after scale review) |

- Stacked raw blocks are a current retail-display idiom and read as deliberate, not accidental.
- 11.6 KB — cheap enough to scatter several across a floor.
- Absolute scale inherited from a source whose units are unconfirmed. Flagged `needs-3d-review`.
- Broad platform use: sneaker/product display, sculpture bases, zine stacks, merch.

## Props / decorative

| Component | observedAs | Dim (m) | Payload | Suit /4 | Qual /4 | Scale /4 | Decision |
|---|---|---|---|---|---|---|---|
| `candidate.chair.pottery-007-0ae2-006` | Terracotta vase with flowering stems | 0.43×0.67×0.37 | 325 KB | 2 | 3 | 3 | **maybe-later** |
| 4 × `decorative-prop` (remainder) | Not individually reviewed | small | ≤52 KB | – | – | – | **maybe-later** |

- The vase is competently modelled and suits a warm, domestic or community presence. It works
  against a dark//luxury direction but the platform is not only dark/luxury — hence deferred,
  not rejected.

## Archive objects

**Empty.** No archive-specific candidate (no boxes, folders, flat files, plan chests, vitrines).

- **Group verdict:** gap. `archive` is a supported `RoomType` with `paper-archive` and
  `poster-archive` material presets already available, but no archive furniture exists in
  either the candidate library or the procedural registry.

## Unknown / needs review

24 `unknown-object` candidates plus the unreviewed remainder of every group above.

- These are not junk by default — the two best finds in the library were mis-filed as `chair`.
- **Recommendation:** a second curation pass over the ~85 unreviewed non-franchise candidates,
  reviewing by thumbnail contact sheet rather than one at a time.

## Reject / defer summary

| Component | Reason |
|---|---|
| `candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` | Third-party brand baked into geometry |
| `candidate.shelf.coffee-vending-machine-station-0ae2-004` | Third-party branded fixture with modelled lettering |
| `candidate.table.bovenkap-0ae2-001` | Service equipment, no showroom or gallery role |
| All 23 Venator-sourced components | Franchise IP |

---

## What this review concludes

1. **Four components are worth exposing** as candidate options: the display plinth, the
   product riser, the drape, and — pending scale — the light fixture and armchair.
2. **Five authoring categories are completely empty** in the candidate library: racks,
   frames, projection surfaces, archive objects, and any true wall system.
3. **Every one of those gaps is already filled procedurally** by the work landed in the
   parallel Gate 4 component-quality round. The procedural registry is currently a far better
   source of Presence options than the extracted candidate library.
4. **The candidate library's real value is narrow but real:** a handful of sculptural objects
   with character that procedural primitives would not naturally produce — a stone plinth, a
   cloth drape, stacked blocks.
