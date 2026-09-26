# Rack-row UI reachability + pant canvas-loss repair

Date: 2026-08-20
Scope: Making `rack-row` reachable in the authoring UI, deriving arrangement defaults from the host, and fixing the WebGL canvas loss triggered by binding a pant
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No public route, auth, tenant or publish behaviour changed.

Fixes both defects raised by [RENDERED_FASHION_LOOKBOOK_QA_2026-08-19](RENDERED_FASHION_LOOKBOOK_QA_2026-08-19.md).

---

## 1. Executive summary

Both defects are fixed and verified in the real Three/WebGL lane.

- **`rack-row` is now offered and is the default for rack hosts.** Three previous passes of rack
  work became reachable for the first time.
- **The pant no longer kills the canvas.** The cause was found, and it was **not** what the QA
  document listed as its leading suspect.

The canvas loss was **not** a GPU fault, invalid geometry or the `clamp-bar` hardware. It was a
**geometry cache key collision** that threw during scene construction; the renderer caught the
throw, reported a runtime failure and unmounted itself. The canvas disappeared with no console
error because nothing was actually crashing — the renderer was shutting down cleanly on an
internal error.

Neither pants nor WebGL were disabled, weakened or special-cased to achieve this.

## 2. Root cause

`components/presence-spatial/threeGeometryCache.ts`.

Every garment article — shirt, pant, shoe, generic — shares one registered component,
`presence.garment-hanger@1.0.0`. An earlier pass correctly added `articleType` and `aspect` to the
geometry **signature**, so the four articles would stop sharing one template. But the **cache key**
was still the component ref alone:

```ts
const template = cache.getOrCreate(item, () => factory(item), disposeSpatialGeometryTemplate);
if (template.componentKey !== item.componentKey || template.signature !== expectedSignature) {
  throw new Error(`Cached geometry template does not match ${item.componentKey}.`);
}
```

So the signature and the cache key disagreed:

1. First shirt — cache miss, shirt template stored under `presence.garment-hanger@1.0.0`.
2. Second shirt — cache hit, signature matches, fine.
3. **First pant — cache hit returns the *shirt* template. The signature check fails and throws.**

The throw happened inside scene construction, which the renderer wraps. It routed to the runtime
failure path, `setRuntimeFailed(true)` unmounted the Three renderer, and the canvas element left
the DOM. The viewport kept reporting `data-renderer-lane="three"` because the lane is chosen by
capability, not by failure — which is exactly why the earlier QA saw a live lane with zero
canvases and no console output.

The signature guard was doing its job. The bug was that the cache could not store what the
signature could describe.

**This is a defect introduced by the article-specific carriers pass**, whose own evidence
([ARTICLE_SPECIFIC_GARMENT_CARRIERS_2026-08-19](ARTICLE_SPECIFIC_GARMENT_CARRIERS_2026-08-19.md)
§3) recorded "4 of 4 distinct signatures" as proof of correctness. Distinct signatures were
necessary but not sufficient: nothing checked that two articles could coexist in one cache.

### Why it looked like a pant problem

The pant was simply the **first article to differ** from what was already cached. The same crash
occurs for a shoe or a generic bound after a shirt, and for a shirt bound after a pant. Article
order, not the pant, was the trigger. The QA's reproduction — "always at the first pant" — was
accurate as an observation and misleading as a diagnosis, because its scenario always bound two
shirts first.

## 3. The fix

The cache is now keyed by the same identity the signature describes, so the two can never
disagree:

```ts
export function spatialGeometryCacheRef(item: SpatialRenderItem): SpatialComponentRef {
  return geometryVariantRef(item, spatialGeometrySignature(item));
}

function geometryVariantRef(item: SpatialRenderItem, signature: string): SpatialComponentRef {
  return { componentId: `${item.componentId}::${hashSignature(signature)}`, version: item.version };
}
```

Any input that changes the produced geometry also changes the cache slot it occupies. The
signature check is kept as a guard rather than removed — it is still the thing that would catch a
future divergence, and weakening it would have hidden the class of bug rather than fixed it.

`spatialGeometryCacheRef` is exported because eviction must address the variant slot too. The
existing "cache eviction owns shared geometry disposal" test was updated to delete the variant
ref; that is a genuine behaviour change, not a test relaxation, and it is the correct behaviour:
two articles of one component are different geometry, not one shared entry.

`SpatialComponentCache` has no size cap, and variants are bounded by article × aspect, so this
does not introduce unbounded growth. `getSpatialGeometryTemplate` is the only production consumer
of the geometry cache.

## 4. Rack-row UI reachability

| Goal | Change |
|---|---|
| A | `SPATIAL_ARRANGEMENT_KINDS` added to `model.ts`; the Arrangement select renders that list instead of a hand-written one |
| B | The default is `defaultArrangementKindForHost(selectedPlacement)`, not a hard-coded `"wall-grid"` |
| C | Binding stores `contentArrangement.kind = "rack-row"`; reload preserves it |

The arrangement state became an **override** (`null` means "follow the host"), so:

- a rack host shows `rack-row (host default)` before the operator touches anything;
- an explicit operator choice still wins;
- **switching host re-derives** rather than carrying the previous host's choice across, so a rack
  never inherits a gallery's arrangement.

Deriving the list from a shared constant is the part that prevents recurrence: the previous list
was hand-written, so `rack-row` was omitted silently and three passes of work sat behind an option
that did not exist.

A now-redundant effect that forced `"spherical"` for `presence.spherical-gallery` was removed,
because the derived host default already returns `spherical` for that component. That is verified
in the browser, not just assumed — see §6.

## 5. Screenshots

| File | Content |
|---|---|
| `screenshots/20-rack-row-arrangement-select.png` | The Arrangement select showing `rack-row (host default)` selected, with all five kinds offered |
| `screenshots/21-pant-bound-canvas-alive.png` | Two shirts and a **pant** bound, canvas alive — the exact state that previously unmounted the renderer |
| `screenshots/22-mixed-rack-row-webgl.png` | Full mixed rack: shirt, shirt, pant, shoe, generic under `rack-row` in the WebGL lane |
| `screenshots/23-mixed-rack-mobile-fallback-390.png` | 390px semantic fallback, all five looks in binding order |

The option list in shot 20 is rendered into the page for capture, because a closed native select
does not show its options in a screenshot.

### What the rendered frames now show

Compared with the previous QA's two shirts-only frames under `wall-grid`:

- Garments **hang from the rail** rather than sitting in a grid in front of it.
- **Per-article hang is visible**: the pant hangs lower and narrower than the shirts, and the shoe
  sits lowest, smallest and forward — the `railDrop` / `rackScale` / `forwardOffset` profiles from
  the hang-profile pass are doing visible work for the first time.
- All five articles coexist in one scene.

**Still true and unchanged:** the artwork is synthetic placeholder media with **no alpha channel**,
so garments still read as rectangular cut-outs. That is the QA's third finding and it is *not*
fixed here — it needs alpha-masked test artwork, not code. The room is also very dark, so the
garment planes carry nearly all the visual weight.

## 6. Tests

| Command | Result |
|---|---|
| `npm run test:spatial` | **200 passed, 0 failed** (192 at start; 8 added) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| `npx playwright test tests/e2e/presence-rack-row-garment.spec.ts` | **2 passed** |

New headless suite `lib/presence/spatial/rackRowUi.test.ts` (8 tests): every implemented
arrangement kind is offered; the UI renders the shared list and derives its default from the host;
rack hosts default to `rack-row` and no non-rack component claims it; binding saves `rack-row` and
reload preserves it with slot/binding/fallback order aligned; every article carrier produces
finite, positive geometry with a finite bounding sphere; a pant compiles with finite transforms; a
mixed rack compiles with finite, positive-scale transforms; and **a shared cache serves every
article of one component instead of colliding**.

New e2e `tests/e2e/presence-rack-row-garment.spec.ts` (2 tests) drives the real browser: asserts
`rack-row` is offered and defaulted, binds all five articles asserting the canvas survives each,
checks the saved layout records `rack-row`, and verifies each host derives its own default.

### The regression test was verified to fail against the bug

A test that never fails against the defect it names is worthless, so the cache key was temporarily
reverted and the new test re-run. It failed with exactly the production error:

```
✖ a shared cache serves every article of one component instead of colliding
  Error: Cached geometry template does not match presence.garment-hanger@1.0.0.
```

and passed again once the fix was restored. It exercises **both article orders** and both a cache
miss and a cache hit, because the original defect was order-dependent.

### Context-loss instrumentation, corrected

The first e2e run reported two `webglcontextlost` events and failed. That assertion was wrong:
`ThreeSpatialRenderer.tsx:262` calls `renderer.forceContextLoss()` **deliberately** during
teardown, so counting raw events reports intentional cleanup as a fault. The instrumentation now
distinguishes a loss on a canvas that is still in the document (a real failure) from one on a
canvas being unmounted (correct disposal), and asserts only on the former.

This is recorded rather than quietly corrected because the wrong assertion would have driven a
wrong fix.

## 7. Pre-existing e2e failures, not caused by this task

`tests/e2e/presence-spatial-object-model.spec.ts` has **6 failing tests**, all from ambiguous
locators introduced by the Piece Library panel:

- `getByLabel("Action label")` also matches **"Piece action label"** (`SpatialObjectArranger.tsx:1331`)
- `getByLabel("Piece media")` matches **two** selects (`:1313` and `:1439`)

These are unrelated to arrangement: the first failing test never touches the Arrangement control
and fails on `Piece media`. They are **not fixed here** because tightening those locators is
Piece Library test-hygiene work outside this task's scope, and this task was told not to broaden.
They are called out because two of them contain the spherical-gallery arrangement assertions, so
those assertions are currently not protecting anything.

**Because those assertions were unavailable, the spherical default was verified directly in the
browser** rather than assumed, and that check is now a permanent test in the new spec (§6).

## 8. Saved JSON and persistence

`contentArrangement.kind` is stored as `"rack-row"` for rack hosts and survives a save/reload
round trip with validation passing. Slot transforms, hang profiles and hardware remain **derived,
never persisted**. The arrangement override is UI-local React state and is never written to the
room. No backend, no new media, no blobs; the layout stays inside the 100 KB budget.

## 9. Fallback behaviour

Unchanged and complete. The 390px semantic fallback carries all five looks in binding order with
piece type and working actions (shot 23). `rack-row` affects 3D placement only.

## 10. Constraints honoured

- No new garment features; no inspection `verticalOffset`; no new display primitives.
- **No source garment GLB was used, copied, converted or modified.** Nothing under
  `C:\Dev\presence pieces` was touched.
- No public route, auth, tenant, backend, publish, commerce or multiplayer change.
- No component or candidate marked admitted.
- **Pants and WebGL were not disabled, and no article was special-cased**, which was an explicit
  failure condition. The fix makes the cache correct for all four articles equally.
- The internal gate was enabled with a git-ignored `.env.development.local`
  (`PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL=1`), removed after the run.

## 11. Remaining limitations

- **Artwork still has no alpha channel**, so silhouette quality remains unproven. This is now the
  single biggest blocker to judging the rack visually.
- The room is very dark; garment planes carry almost all the visual weight.
- The shoe remains a low stand plus flat planes — a rack-display proxy, not footwear geometry.
- Inspection height is still article-agnostic; only the profile *choice* varies.
- The 6 pre-existing locator failures in §7 remain.
- Visual quality is synthetic proxy evidence, not art direction.

## 12. Recommended next task

**Alpha-masked garment test artwork, then re-run the rendered QA.** The carrier architecture,
`rack-row`, hang profiles and hardware are now all reachable and demonstrably working together,
but every remaining visual criticism — flat cut-outs, unreadable silhouettes — traces to
placeholder media with no alpha. Until that exists, further geometry work is polish on something
that cannot be judged.

Per-article inspection `verticalOffset` stays on the roadmap behind it, and it is now genuinely
reachable: a mixed-article rack no longer loses its canvas, so inspection states can finally be
captured.

## 13. Rollback notes

Revert:

```
components/presence-spatial/threeGeometryCache.ts
components/presence-spatial/SpatialObjectArranger.tsx
lib/presence/spatial/model.ts
lib/presence/spatial/rendererGeometryCache.test.ts
```

and delete `lib/presence/spatial/rackRowUi.test.ts`,
`tests/e2e/presence-rack-row-garment.spec.ts` and this document.

**No saved layout needs migrating.** Reverting returns rack hosts to a `wall-grid` default and
restores the cache collision, so a mixed-article rack would lose its canvas again. Layouts already
saved with `contentArrangement.kind = "rack-row"` remain valid, because `rack-row` was already a
supported kind in the model before this task — it was only unreachable from the UI.
