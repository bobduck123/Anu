# Presence spatial asset ingestion pipeline

Date: 2026-08-17
Scope: Internal candidate ingestion for the Presence spatial object model
Public status: Not registered, not admitted, not published, not launch-approved

## What this pipeline is

It turns a folder of raw `.glb` / `.gltf` files into a structured, reviewable
**candidate** library for Presence:

```text
raw source folder
  -> inspect (pure TypeScript glTF parse)
  -> classify source file
  -> preserve complete interiors as room-kit candidates
  -> split into object candidates (Blender, headless)
  -> deduplicate repeated instances
  -> strip textures by default, keep textured exports only where useful
  -> optimise geometry (Draco) and textures (resize + WEBP)
  -> generate metadata, budgets, anchors and material slots
  -> render thumbnails
  -> write the candidate registry
  -> human review and admission (outside this pipeline)
```

It is deliberately **not** an admission pipeline. Nothing it writes is an
admitted Presence component, a cleared licence, an approved visual, or a public
runtime asset.

## What it is not allowed to do

- It never writes, renames, moves or deletes a source file. Sources are opened
  read-only, and a test asserts source bytes and mtimes are unchanged after a run.
- It never sets a licence to anything other than `needs-review`. The candidate
  licence type has a single-value `status`, so the code cannot express clearance.
- It never marks a candidate visually approved. `quality.visuallyApproved` is
  typed `false`.
- It never marks an over-budget or unexported candidate runtime-eligible.
- It never writes into `public/`, so no candidate is reachable from a Presence route.
- It never introduces multiplayer, commerce, payments, publishing or production
  persistence, and it does not touch the public renderer dispatch chain.

`validateCandidateRegistry` enforces each of these at runtime, and the run fails
loudly if a generated registry violates one.

## How to run it

```bash
npm run ingest:spatial-assets -- --source "C:/Dev/presence pieces"
```

Useful options:

```bash
# Structure and reports only; no Blender, no exports, no thumbnails.
npm run ingest:spatial-assets -- --source "<folder>" --inspect-only

# Re-run one file after changing a heuristic.
npm run ingest:spatial-assets -- --source "<folder>" --only living_room --no-incremental

# Also split single-mesh candidates by loose parts (guarded, off by default).
npm run ingest:spatial-assets -- --source "<folder>" --loose-parts
```

`--help` lists every option. Tests:

```bash
npm run test:spatial-assets
```

### What it expects

- A folder of `.glb` / `.gltf` files, nested folders included. Directories named
  `textures` are skipped during discovery.
- Blender on the machine. It is auto-detected under
  `C:\Program Files\Blender Foundation\*\blender.exe`, `$BLENDER_PATH`, or common
  Unix install paths, and can be pointed at explicitly with `--blender`.
- No Blender is not a failure: the run degrades to manifest-level candidates and
  records `blender-unavailable` on every affected candidate.

### What it writes

All output is repo-relative and deliberately outside `public/`:

```text
assets/presence-spatial/source/raw/          optional drop folder for new sources
assets/presence-spatial/source/reports/      per-source JSON + SOURCE_INSPECTION.md
assets/presence-spatial/candidates/components/   candidate object GLBs
assets/presence-spatial/candidates/roomkits/     candidate interior GLBs
assets/presence-spatial/candidates/thumbnails/   WEBP previews
assets/presence-spatial/candidates/manifests/    candidate-registry.json, CANDIDATE_REVIEW.md
```

Generated `.glb` files are git-ignored: they are reproducible from the sources by
re-running the pipeline. Manifests, reports and thumbnails are committed so review
works without regenerating anything.

`runtimeAsset` and `thumbnail` in the registry are **filesystem paths, not URLs**.
Candidates are not served.

## Stage detail

### 1. Inspection (`ingest/gltf.ts`, `ingest/inspect.ts`)

A dependency-free glTF/GLB reader. For GLB it reads the header and JSON chunk
without loading the binary payload, so a 138 MB source costs a few kilobytes of
memory to inspect.

Per source it records: file size, format, glTF version, content hash, node/mesh/
primitive/material/texture/image/animation/camera/light counts, triangle count,
the texture/geometry/other byte split, world bounds, separable objects, embedded
licence metadata and warnings.

**Wrapper descent.** Sketchfab and FBX round-trips wrap an entire scene in
mesh-less empties (`Sketchfab_model` -> `<file>.fbx` -> `RootNode` -> objects).
Treating scene roots as separable objects would yield exactly one candidate per
file, so the walk descends while the level is a single mesh-less node — and
carries the wrapper transforms down with it, because those wrappers hold the unit
scale and the Y-up correction. The descended chain is recorded as
`separationRootPath`. The Blender script applies the same rule.

### 2. Classification (`ingest/classify.ts`)

Signal-counting, not certainty. A source is a complete interior when at least
three of these hold and there is spatial evidence (wide footprint, architectural
naming, or a space-naming path): many meshes, many mesh-bearing nodes, wide
footprint, room-scale height, several materials, architectural names, a source
path naming a space.

Tags are non-exclusive: a baked single-mesh VR room is legitimately both
`single-object-source` and `complete-interior-source`.

`needs-license-review` is applied unconditionally. Every source needs a licence
decision, including the ones with a declared licence string.

### 3. Room-kit preservation

Every complete interior becomes a room-kit candidate. Complete interiors are never
discarded in favour of their parts. The kit records category, dimensions, bounds,
triangle count, the component candidates extracted from it, material slots,
licence, budget, scale review and a fallback representation.

A textured kit is produced when the source is at or under `--max-textured-mb`
(default 80 MB); its images are downscaled to `--max-texture` (default 1024 px)
and re-encoded to WEBP. A shape-only kit is always produced and becomes the
fallback. Heavier sources get shape-only only, with a recorded warning.

### 4. Object extraction (`ingest/blender/extract_candidates.py`)

Headless Blender, one process per source, with a per-source timeout. For each
separable object it duplicates the subtree, clears the parent keeping transform,
moves it to the **floor-centre origin / floor-contact pivot** convention already
used by `SPATIAL_COMPONENT_CATALOG`, exports a GLB and renders a thumbnail.

**Deduplication.** Interior scenes repeat the same chair, rod or planter dozens
of times. Objects are grouped by (triangle count, mesh count, rounded dimensions,
material names) and one candidate represents the group, recording `instanceCount`
and the instance names. In this batch 312 source instances collapsed to 118
shapes. Without it, the export cap fills with identical geometry — duplicating
exactly the meshes a component-reference model exists to share.

**Shape-only by default.** Exports keep geometry, UVs, material slot structure,
material names and base factors. They drop images, cameras, lights, animations,
skins, morph targets and extras. Geometry is Draco-compressed.

**Loose-part splitting** is opt-in (`--loose-parts`) and guarded by a triangle
ceiling and a part cap, because it is the stage most likely to shred a mesh into
meaningless fragments.

Failure is contained: a crash, hang or timeout on one source produces warnings on
that source's candidates and the batch continues.

### 5. Candidate metadata (`ingest/candidates.ts`, `taxonomy.ts`, `anchors.ts`)

Category, placement, material slots and anchors are best-effort and clearly
labelled with `categoryConfidence` (`keyword-match`, `dimension-heuristic`,
`unknown`).

Two lessons are baked into the matcher and worth keeping:

- **Whole-token matching only.** Substring matching made `mat` match `material`
  and `light` match `WallLight`, which miscategorised 53 candidates as rugs and a
  vending machine as a lamp in an earlier run.
- **Names only, not materials, and not authoring defaults.** Material names
  describe surfaces, not identity. `Cube.019`, `Object_2` and `Mesh.1321` carry no
  signal and are excluded from matching and from labels.

Every candidate exposes material slots — descriptive ones (`top`, `legs`,
`fabric`, `projection`, …) plus a mapping onto the nine approved Presence slots —
and at least one anchor. Rack, shelf and counter candidates get repeated slot
anchors when their width supports it.

**Scale is measured, never corrected.** Sources arrive in whatever unit their
author used. When an interior's height falls outside 2.2–12 m the candidate
records `scaleReview.required`, the measured height, and a *suggested* uniform
scale for a human to confirm. The pipeline does not rescale geometry.

### 6. Budgets (`ingest/budgets.ts`)

| Tier | Limit | Applied to |
|---|---|---|
| simple | 1 MB | shape-only candidates under 50k triangles |
| common | 2 MB | shape-only candidates under 250k triangles |
| hero | 5 MB | shape-only candidates at or above 250k triangles, and textured exports |
| roomkit-eager | 3 MB | room-kit runtime exports |
| layout-json | 100 KB | a compiled layout referencing candidates |

Over-budget never fails the run. The candidate keeps its export, is marked
`over-budget`, gets `runtimeEligible: false` and `needs-manual-cleanup`, and stays
source/candidate material. That is the mechanism that keeps a heavy raw model out
of the admitted library.

### 7. Registry and review

`candidate-registry.json` holds every component and room kit plus the tooling
actually used. `CANDIDATE_REVIEW.md` is generated from it. See
[COMPONENT_REVIEW_WORKFLOW.md](COMPONENT_REVIEW_WORKFLOW.md).

## Repeatability

- **Deterministic.** Sources are processed in sorted path order; candidates are
  sorted by id; `--at` fixes the timestamp. Two runs over the same input produce
  an identical registry, and a test asserts it.
- **Stable ids.** A candidate id is `candidate.<category>.<label>-<disc>-<nnn>`,
  where `<disc>` is a short hash of the source asset id. Ids do not move when
  another file is dropped into the source folder. Room kits are
  `candidate.roomkit.<category>-<disc>`.
- **Incremental.** Each source's Blender result is cached against its content
  hash. An unchanged source with all its exports still present is reused; anything
  else re-runs. `--no-incremental` forces a full re-run.
- **Self-cleaning.** After a full run, generated `candidate.*` files no longer
  referenced by the registry are pruned, so the output folders always mirror the
  registry. Pruning is skipped for any run that deliberately describes less than a
  full run — `--only`, `--inspect-only`, or a run with no Blender — so a partial
  run can never delete a full run's exports. It never touches sources.

Dropping more files into the source folder and re-running is the whole workflow.
No per-object manual work is required.

## Integration with the Presence spatial object model

Candidates are written to line up with `lib/presence/spatial/`:

- Ids satisfy `ID_PATTERN`.
- `presenceMaterialSlots` are drawn from the nine approved `SpatialMaterialSlotId`
  values, so a promoted candidate plugs into the existing skin/material-preset system.
- Origin and pivot follow the `floor-center` / `floor-contact` convention already
  recorded in `SPATIAL_COMPONENT_CATALOG`, in metres, Y-up.
- `registry/presenceBridge.ts` converts a reviewed candidate into a
  `SpatialComponentDefinition`, and `candidateLayoutReference` produces the layout
  row a room stores.

A layout references components; it never inlines geometry:

```json
{
  "componentId": "candidate.sofa.sofa-0ae2-002",
  "version": "0.1.0",
  "transform": { "position": [1.2, 0, -0.4], "rotation": [0, 1.57, 0], "scale": [1, 1, 1] },
  "materialSlotOverrides": { "tabletop": "tabletop-warm-stone" },
  "skinRefs": [], "mediaRefs": [], "actionRefs": []
}
```

Client identity is applied through material presets, skins, colours, decals,
logos and media refs. **No new GLB is created for a client skin.**

### The promotion gate

Candidate versions are `0.1.0`, which deliberately fails the admitted
`VERSION_PATTERN` (`^[1-9]...`). A candidate therefore cannot be dropped into the
admitted registry by accident. `promoteCandidateToComponent` refuses a candidate
that is unreviewed, unexported, over budget, unscaled, or given a raw `.glb`
asset path, and requires a human-supplied version, licence and logical asset id.

## Downstream: selection into a gate

Ingestion stops at `candidate-review-required`. Turning candidates into something a
gate can use is a separate, selective pass:

```bash
npm run select:mobstar-components
```

It reads `candidate-registry.json`, applies an automated filter (runtime asset,
budget, thumbnail, slots, anchors, plausible scale, excluded sources), joins that
with a recorded visual review, and writes a shortlist, an internal-use manifest
and a component bridge. It never mutates the candidate registry — internal-use
clearance is additive metadata in separate files, so re-running ingestion cannot
overwrite a review decision.

See [MOBSTAR_COMPONENT_SHORTLIST_2026-08-17.md](MOBSTAR_COMPONENT_SHORTLIST_2026-08-17.md)
and [MOBSTAR_INTERNAL_USE_CANDIDATE_REVIEW_2026-08-17.md](MOBSTAR_INTERNAL_USE_CANDIDATE_REVIEW_2026-08-17.md).

The three admission stages are `candidate-review-required` (what this pipeline
writes), `candidate-cleared-for-internal-use` (single-context review), and
`admitted-presence-component` (second-context review; granted to nothing so far).

## Tooling notes and gaps

- **Blender 5.1.1** did the extraction, Draco compression, texture resizing and
  Workbench thumbnail rendering.
- **gltf-transform** and **gltfpack / meshoptimizer** were not used: neither is
  installed in this environment, and no new dependency was introduced. The
  optimisation stage is a single seam (`export_gltf` in the Blender script plus
  the budget evaluation) if either is added later.
- **KTX2 / Basis** texture compression was not run for the same reason. Textured
  exports use resized WEBP, which is what Blender can do natively.
- Draco-compressed candidates need a Draco decoder to load. This is recorded per
  candidate as `export.geometryCompression`. Run with a future `--no-draco`
  equivalent, or re-export at promotion, if a decoder-free asset is required.
- Thumbnails are Workbench renders: accurate silhouettes and scale, not lighting
  or material studies. They are for triage, not art direction.
