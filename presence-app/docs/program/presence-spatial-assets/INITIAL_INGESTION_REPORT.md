# Initial Presence spatial ingestion report

Date: 2026-08-17
Batch: `initial-presence-ingestion`
Source root: `C:\Dev\presence pieces` (read-only; unchanged by this run)
Tooling: Blender 5.1.1, headless
Public status: Internal candidates only. Nothing admitted, cleared, approved, published or deployed.

## Result

8 source files totalling **463 MB** produced:

| Output | Count | Payload |
|---|---|---|
| Room-kit candidates | 8 | 25.2 MB total |
| Component candidates | 118 (all exported) | 19.2 MB total |
| Thumbnails | 126 | 1.4 MB |
| Source inspection reports | 8 JSON + 1 markdown | 1.6 MB |
| Candidate registry + review doc | 2 | 772 KB |

Budget outcome: **123 within budget, 3 over budget, 0 unmeasurable**.
312 repeated source instances collapsed onto 118 unique shapes.
Full-batch runtime: about 90 seconds.

## Per source

| Source | Size | Separable objects | Component candidates | Room kit | Kit export | Kit size | Budget |
|---|---|---|---|---|---|---|---|
| `brutalist-interior-vr-room-baked/source/Untitled.glb` | 40.8 MB | 3 | 1 | warehouse | textured | 668 KB | within |
| `coffee+shop+GLD/coffee shop.glb` | 99.9 MB | 662 | 24 | boutique | shape-only | 8,539 KB | **over** |
| `interior_7.glb` | 31.2 MB | 51 | 21 | unknown-interior | textured | 2,794 KB | within |
| `living_room_interior_free.glb` | 17.0 MB | 20 | 11 | living-room | textured | 1,476 KB | within |
| `old_church_modeling_-_interior_scene.glb` | 138.0 MB | 36 | 22 | unknown-interior | shape-only | 3,819 KB | **over** |
| `star_wars_the_clone_wars_venator_prefab.glb` | 44.9 MB | 158 | 23 | unknown-interior | textured | 2,097 KB | within |
| `the_great_drawing_room.glb` | 68.1 MB | 15 | 15 | living-room | textured | 6,225 KB | **over** |
| `urban-interior-moody-vr-room-baked/source/Untitled.glb` | 22.9 MB | 1 | 1 | unknown-interior | textured | 159 KB | within |

Every file in this batch classified as a complete interior, so every file
produced a room-kit candidate. That is the correct reading of the collection:
it is a set of interiors, not a set of props.

The payload reduction is the point. A 17 MB living-room source became a
1.48 MB textured room kit inside the 3 MB eager budget, plus 11 shape-only
object candidates. A 40.8 MB brutalist room became a 668 KB kit.

## Category guesses

Room kits: 3 keyword-matched (`boutique` from the coffee shop, `living-room` from
the living room and the great drawing room, `warehouse` from the brutalist room),
4 recorded honestly as `unknown-interior`.

Components: 5 `keyword-match`, 89 `dimension-heuristic`, 24 `unknown`.

That low keyword rate is a property of the sources, not a pipeline defect. Most
objects are named `Cube.019`, `Object_2`, `Mesh.1321` or `G-__555573.001`. The
pipeline records confidence per candidate so a reviewer knows which names to
trust, and `rename` is the recommended action on every non-keyword-matched row.

Distribution: room-shell 42, unknown-object 24, shelf 13, chair 9, table 6,
column 6, wall 6, decorative-prop 5, door 3, sofa 2, floor 2.

## Licensing — nothing is cleared

| Declared licence | Sources |
|---|---|
| `CC-BY-4.0` | 3 (old church, venator prefab, great drawing room) |
| `SKETCHFAB Standard` | 2 (interior_7, living room interior FREE) |
| none found | 3 (both baked VR rooms, coffee shop) |

All 126 candidates are `license.status: needs-review`. Declared strings, authors
and source URLs are captured from `asset.extras` as **evidence**, not clearance.
Three points a reviewer must weigh:

- `SKETCHFAB Standard` is not a blanket redistribution right.
- `CC-BY-4.0` requires attribution to carry through to anything published.
- The Star Wars Venator prefab depicts third-party franchise IP regardless of the
  model's own licence. The filename hint is recorded on the source report.
- The three sources with no embedded metadata have no provenance at all and need
  their origin established before any use.

## Scale

Three candidates carry `scaleReview.required`, with a suggested uniform scale for
a human to confirm:

- living room interior: 25.1 m measured ceiling (suggested scale 0.1274)
- old church interior: 21.4 m measured height — plausible for a nave, still flagged
- urban moody VR room: 12.3 m measured height

The pipeline measured and flagged. It did not rescale anything.

## Over-budget candidates

Three room kits exceed the 3 MB eager budget: the coffee shop (8.5 MB shape-only,
20.3 M triangles), the great drawing room (6.2 MB textured) and the old church
(3.8 MB shape-only). Each is marked `over-budget`, `runtimeEligible: false` and
`needs-manual-cleanup`. They remain candidate material and are not admitted.

No component candidate is over budget after deduplication and Draco compression.

## Manual QA performed

Checked against the generated outputs of the final run:

- At least one complete interior became a room-kit candidate — all 8 did.
- At least one multi-object file produced multiple object candidates — the coffee
  shop produced 24, the venator 23, the church 22.
- At least one candidate has a stripped, shape-only export — all 118 component
  candidates are shape-only with `texturesStripped: true`.
- At least one candidate retains material slots — all 126 expose descriptive slots
  and a mapping onto the nine approved Presence slots.
- Candidate registry generated and passes `validateCandidateRegistry`.
- Review markdown generated with thumbnails, budgets, licences and recommended
  actions for all 126 rows.
- Over-budget assets flagged (3, listed above).
- Source files preserved: byte-for-byte and mtime-identical after the run, with
  no file added to or removed from the source folder. Asserted by test.
- Thumbnails visually inspected (room kit and object samples). Silhouettes and
  scale read correctly; they are triage previews, not art direction.
- Blender absence path exercised via `--inspect-only`: 126 manifest-level
  candidates, all `not-exported`, none runtime-eligible.
- Incremental re-run exercised: unchanged sources reused their cached exports;
  changed heuristics correctly forced a re-run; 256 stale generated files pruned.

## Issues found and fixed during the build

Recorded because each was a real defect the outputs would otherwise have carried:

1. **Wrapper transforms were dropped.** Descending past `Sketchfab_model` to find
   separable objects discarded the wrapper's scale, reporting the living room as
   3781 x 2511 x 5572 instead of 37.8 x 25.1 x 55.7. Wrapper matrices are now
   accumulated during descent.
2. **Substring keyword matching.** `mat` matched `material` and `light` matched
   `WallLight`, producing 53 false "rug" candidates and a vending machine
   classified as a lamp. Matching is now whole-token, material names are excluded
   from categorisation, and authoring defaults (`Cube.019`) no longer signal.
3. **Duplicate instances filled the export cap.** 21 identical rods and 4 identical
   planters each consumed a candidate slot. Objects are now deduplicated by shape
   signature, and the surviving candidate records its instance count.
4. **Uncompressed exports were unusable in a repo.** The coffee-shop room kit was
   61 MB. Draco compression brought it to 8.5 MB and a sofa from 5.3 MB to 769 KB.
5. **Colliding candidate ids.** Two source folders each contain `Untitled.glb`,
   which produced identical ids. The registry validator caught it; ids now carry a
   stable per-source discriminator.

## Known limitations

- `gltf-transform`, `gltfpack`/meshoptimizer and KTX2/Basis were not run: none is
  installed and no new dependency was introduced. Texture optimisation is Blender's
  resize plus WEBP; geometry optimisation is Draco.
- Draco-compressed candidates need a Draco decoder to load. Recorded per candidate
  as `export.geometryCompression`.
- The 24-object export cap means the coffee shop's 289 unique shapes yielded 24
  candidates. Raise `--max-objects` to go deeper.
- Loose-part splitting was left off for this batch.
- Extracted groupings are as good as the source hierarchy: the coffee shop's
  "Sofa" node is a whole seating set, which a reviewer may want split.
- Thumbnails are Workbench renders — silhouette and scale, not lighting or material.
- Category guessing is weak on this batch by necessity; see above.

## What this run did not do

No admission, no licence clearance, no visual approval, no registration into
`SPATIAL_COMPONENTS`, no public route, no publish, no deploy, no hosted proof, no
gate acceptance. The public renderer dispatch chain, auth, tenant isolation,
backend schema and production data were untouched.
