# Presence spatial candidate review workflow

Date: 2026-08-17
Scope: Human review and admission of ingested spatial candidates
Public status: Nothing described here publishes, deploys or launches anything

## The two-stage rule

The ingestion pipeline produces **candidates**. A candidate is internal option
material. It becomes an admitted Presence library component only after a human
decision recorded in the registry and a promotion through
`promoteCandidateToComponent`.

The pipeline cannot shortcut this. It can only ever write:

```text
status  = candidate-review-required
license = needs-review
quality = not-reviewed, visuallyApproved: false
```

Any other value on generated output is a validation failure, and a run that would
produce one fails instead of writing it.

## Where to review

Everything a reviewer needs is in one generated file:

```text
assets/presence-spatial/candidates/manifests/CANDIDATE_REVIEW.md
```

It lists, for every candidate: id, thumbnail path, source file, category guess and
confidence, dimensions, triangle count, instance count, runtime size, budget
status, licence status and a recommended action. Room kits additionally list their
fallback representation and the component candidates extracted from them.

**Blender is not required for review.** Open the thumbnail. Only rows recommending
`needs-manual-cleanup` are expected to need the model opened.

## Recommended actions

| Action | Use when |
|---|---|
| `approve-as-component` | The object is a usable Presence component candidate as extracted. |
| `approve-as-roomkit` | The interior is usable as a selectable room/interior option. |
| `rename` | The geometry is good but the category or name guess is wrong. Common: `categoryConfidence` is `dimension-heuristic` or `unknown`. |
| `merge` | Several candidates are the same object split across rows, or belong together as one fixture. |
| `reject` | Not useful, not on-brand, or duplicated by a better candidate. |
| `needs-manual-cleanup` | Over budget, wrong scale, a grouping that should be split, or a failed export. |
| `needs-license-review` | Always present. Nothing is cleared until a human checks the declared licence against its source. |
| `needs-texture-preservation` | Shape-only loses the object's identity (posters, projection surfaces, patterned rugs, baked hero pieces). |
| `needs-art-direction-review` | Always present. Silhouette, scale, material response, lighting compatibility, mobile readability and brand fit are human judgements. |

## Recording a decision

Decisions go in the **registry**, not in the review markdown — the markdown is
regenerated from the registry on every run and any edits to it are lost.

Edit `assets/presence-spatial/candidates/manifests/candidate-registry.json`:

1. **Status.** Set `status` to `human-approved-component`, `human-approved-roomkit`
   or `human-rejected`.
2. **Licence.** Check `license.declaredLicense`, `license.declaredAuthor` and
   `license.evidence` against the actual source (Sketchfab page, marketplace
   listing, purchase record). Record where and when the check happened. A declared
   string in a file is a claim, not clearance. Note that this batch's declared
   licences include `SKETCHFAB Standard`, which is not a blanket redistribution
   right, and `CC-BY-4.0`, which requires attribution to be carried through to
   anything published.
3. **Quality.** Record art-direction sign-off on `quality`, with notes. The
   pipeline will never set `visuallyApproved` to `true`.
4. **Scale.** If `scaleReview.required` is set, confirm or reject the suggested
   uniform scale. The pipeline measured but did not rescale.

## Promotion into the Presence component library

Promotion is a separate, explicit act through
`lib/presence/spatial/assets/registry/presenceBridge.ts`:

```ts
promoteCandidateToComponent({
  candidate,                    // must be human-approved
  admittedVersion: "1.0.0",     // must satisfy VERSION_PATTERN
  license: { /* human-decided licence record */ },
  assetId: "asset:...",         // logical asset ref, never a .glb path
});
```

It refuses a candidate that is:

- still `candidate-review-required`;
- missing an exported runtime asset;
- `over-budget` or `not-exported` against its tier;
- carrying an unresolved `scaleReview`;
- given a raw `.glb` / `.gltf` path as its asset id;
- versioned `0.1.0` — candidate versions deliberately fail the admitted version
  pattern, so a candidate cannot be admitted by accident.

A successful promotion returns a `SpatialComponentDefinition` for the existing
registry: shared geometry, material slots, anchors, placement contract, licence,
runtime profile and mobile fallback.

## What still needs a human, and why

| Decision | Why it cannot be automated |
|---|---|
| Licence clearance | Requires checking the source and its terms, and a commercial judgement about internal vs public use. |
| Visual/art-direction approval | Silhouette, material response, lighting compatibility, mobile readability and brand fit are creative judgements against the launch quality bar. |
| Semantic naming | Most source objects are named `Cube.019` or `Object_2`. Only 5 of 118 candidates in the first batch had a confident keyword match. |
| Scale confirmation | Source units are inconsistent and unknowable; the pipeline suggests, a human decides. |
| Splitting grouped extractions | A "Sofa" node may hold a whole seating set. Whether that is one component or five is a design decision. |
| Which objects deserve textures | Texture preservation is an identity and payload trade-off. |
| Which room kits are worth finishing | A product decision about the Presence room library. |

## What is automated, and stays automated

Inspection, classification, interior preservation, object splitting, instance
deduplication, texture stripping, geometry and texture optimisation, bounding
boxes and dimensions, category and placement guesses, material slots, anchors,
thumbnails, budget evaluation, licence-evidence capture, registry generation and
this review document.

Adding more source files means dropping them in the folder and re-running. No
per-object manual work.
