# Rendered fashion / lookbook QA — article-aware rack

Date: 2026-08-19
Scope: Rendered WebGL QA of a mixed-article garment rack in the internal arranger
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No product code was changed by this QA.

---

## 1. Executive verdict

**The rack does not yet read as a lookbook rack in the WebGL lane, and the reason is not what the roadmap assumed.**

Three passes of work — `rack-row`, per-article hang profiles and hanger hardware — are **unreachable through the operator UI**. The arranger's Arrangement select offers only:

```
["wall-grid", "spherical", "grid", "row"]
```

`rack-row` is **not in the list**, and the default state is `wall-grid`
(`SpatialObjectArranger.tsx:165` and the option list at 1388-1391). Every garment an
operator binds to a rack therefore lays out as a **wall grid**, not a hanging rail. The
`defaultArrangementKindForHost` helper added in the hang-profile pass exists and is unit-tested,
but nothing in the UI calls it.

A second, more serious issue surfaced: **the WebGL canvas is lost when the third garment is
bound**, reproducibly, at the first `pant`. The viewport keeps reporting
`data-renderer-lane="three"` while the canvas element count drops to zero, with **no console
errors captured**, and the browser context subsequently closed.

So the honest answer to the primary question is **no** — and the answer to the secondary
question is that per-article inspection `verticalOffset` is clearly **not** the next task.

## 2. Environment and WebGL confirmation

| Item | Value |
|---|---|
| Route | `/internal/spatial-object-model` (internal gate flag enabled via a git-ignored dev env file, removed after QA) |
| Harness | Playwright, chromium project, existing `playwright.config.ts` webServer (`next dev --webpack`) |
| Dev server | Turbopack could **not** be used: it resolves the workspace root to `C:\Dev` and fails on `tailwindcss` / `lucide-react`. Webpack works. |
| Renderer lane | **`three` confirmed** — `data-renderer-lane="three"` with `canvases=1` after the rack was added |
| Teardown | The known Windows Playwright teardown hang did **not** occur in these runs |

**True WebGL was active.** The captured frames are real Three renders, not the semantic lane.

## 3. Scenario content

Built through the internal arranger UI on the Mobstar internal room:

- 1 × `presence.suspended-rack` host (supported binding types reported as `garment`)
- 6 garment pieces: **2 shirt, 2 pant, 1 shoe, 1 generic**
- Front/back artwork assigned via the `04C Garment Artwork` panel where the article supports it;
  the shoe used its display channel
- **Look 06 deliberately left with no artwork** (missing-artwork case)
- One `open-link` action on Look 01
- Inspector reported **"6/6 visible, 0 overflow via overflow-list"**, bound in order Look 01→06
  with correct `primary` / `supporting` roles

All six bound successfully. Article assignment through the UI worked.

## 4. Screenshots

| File | Content |
|---|---|
| `screenshots/2x-viewport-after-1-garments.png` | WebGL viewport, one shirt on the rack |
| `screenshots/2x-viewport-after-2-garments.png` | WebGL viewport, two shirts + accessible room view |

Only these two rendered frames exist, because the canvas was lost from the third garment
onwards. That absence is itself the finding, and no further frames could honestly be captured.

## 5. What the rendered frame actually shows

From `2x-viewport-after-2-garments.png`:

- Two garment artwork planes — coloured placeholder textures — standing **in front of** the rack
  rail, not hanging from it. Consistent with `wall-grid`, which is what the UI actually used.
- The rack reads as a thin dark rail structure behind the garments.
- A pale plinth slab sits beneath, from the Mobstar fixture.
- The room is very dark, so garment planes carry nearly all the visual weight.
- The `Open Look 01 Dark Overshirt` action button renders beneath the canvas.
- The accessible room view lists both looks with `Piece type: garment. shirt carrier QA piece.`
  and the working action link.

## 6. Visual score table

| Dimension | Score /4 | Note |
|---|---|---|
| Rack readability | **1** | Garments grid in front of the rail rather than hanging from it |
| Article differentiation | **1** | Unverifiable — only shirts rendered before canvas loss; and `wall-grid` would flatten article hang differences anyway |
| Artwork visibility | **3** | Artwork planes are clearly visible and correctly textured |
| Hanger / hardware usefulness | **1** | Rail visible but garments are not attached to it; hardware benefit not demonstrable |
| Inspection usefulness | **n/a** | Could not be captured — canvas gone before inspection states |
| Missing-artwork honesty | **3** | Panel warns clearly in the UI; the 3D case could not be rendered |
| Fallback preservation | **4** | Order, captions, piece type and action links all preserved and visible |
| Operator readiness | **1** | The main rack feature is not selectable in the UI |

## 7. What works

- The Three/WebGL lane initialises correctly and renders garments with real textures.
- Garment creation, article assignment and artwork assignment through the `04C` panel all work.
- Binding is correct and ordered; the inspector reports capacity and overflow honestly.
- The accessible room view preserves **order, captions, piece type and action links** exactly.
- The `04B Rack Slots` and `04C Garment Artwork` panels appear as intended.
- The internal gate, robots noindex and persistence-boundary notice all behave.

## 8. What fails

1. **`rack-row` is not offered in the operator UI.** Options are `wall-grid`, `spherical`,
   `grid`, `row`; default `wall-grid`. All rack-row, hang-profile and hardware work is
   therefore unreachable from the arranger.
2. **Canvas loss at the third bound garment.** Reproduced twice at the same point — the first
   `pant`. Lane still reports `three`; canvas count goes to 0; no console errors; browser
   context later closed. Cause **not isolated** in this pass.
3. **Garments read as flat rectangular cut-outs.** The placeholder media has no alpha channel,
   so `alphaTest` has nothing to carve — the silhouette is the plane's rectangle. The alpha
   architecture is sound but **cannot be demonstrated without alpha-masked artwork**.
4. Garments do not visibly relate to the rail, so the hanger hardware cannot do its job.

### Do garments still look like flat cut-outs?

**Yes** — for two compounding reasons: the arrangement is `wall-grid` rather than `rack-row`, and
the QA media has no alpha. Neither is a defect in the carrier architecture, but together they
mean the current operator-visible result is flat panels floating near a rail.

### Do pants, shirts and shoes read differently?

**Unverified.** Only shirts rendered. Under `wall-grid` the per-article `railDrop` is not applied
at all, so even a successful capture would not have shown the hang differences.

## 9. Fallback behaviour

Strong, and the one unambiguous pass. The accessible room view rendered alongside the canvas
with both looks in binding order, correct captions and a working action link, and the 390px
mobile fallback path is the same component already covered by existing tests.

## 10. Inspection-height verdict

**Per-article inspection `verticalOffset` is no longer the right next task.** It was a reasonable
recommendation from unit-level evidence, but rendered QA shows two issues ahead of it:

- inspection cannot even be reached in a mixed-article rack today (canvas loss), and
- refining inspection height for articles whose hang profile is never applied would be polish on
  an unreachable feature.

It should stay on the roadmap, after the two issues below.

## 11. Recommended next implementation task

**Wire `rack-row` into the operator UI, then fix the canvas loss.** Specifically:

1. Add `rack-row` to the Arrangement select, and default the binding arrangement from
   `defaultArrangementKindForHost(host)` rather than the hard-coded `"wall-grid"` state. This is
   small — the helper already exists and is tested — and it is what makes three completed passes
   visible for the first time.
2. Isolate the canvas loss triggered by binding a `pant`. Suspects, in order: the `clamp-bar`
   hardware geometry, the taller pant artwork plane, and geometry-cache keying under mixed
   articles. A focused reproduction is cheap now that the trigger point is known.
3. Only then re-run this rendered QA, ideally with **alpha-masked test artwork** so the silhouette
   architecture can actually be judged.

## 12. Method, for reproduction

A temporary Playwright capture spec drove the arranger, built the mixed rack and captured the
viewport after each bind. It was **removed after the run** rather than left in the suite, because
it fails by design against the current canvas-loss defect and would leave the e2e suite red. To
reproduce: create a spec that opens `/internal/spatial-object-model`, clicks *Create Mobstar*,
adds `presence.suspended-rack`, then creates garment pieces and binds them one at a time,
logging `data-renderer-lane` and the canvas count after each bind.

The internal gate was enabled with a git-ignored `.env.development.local`
(`PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL=1`), removed afterwards.

## 13. Tests run

| Command | Result |
|---|---|
| `npm run test:spatial` | **192 passed, 0 failed** (before and after QA) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| Playwright capture runs | 4 runs; WebGL lane confirmed; canvas loss reproduced twice |

The unit suite is green **and** the rendered result is poor — which is the useful lesson from
this pass. The tests assert the arrangement maths and the geometry contract, and both are
correct; nothing asserted that an operator can *select* the arrangement.

## 14. Risks and limitations

- The canvas-loss cause is **not isolated**; "first pant" is the reproduction point, not a
  diagnosis.
- Only two rendered frames exist, both shirts-only, both under `wall-grid`.
- QA artwork has no alpha channel, so silhouette quality remains unproven.
- Inspection, debug-toggle comparison and the 390px fallback screenshot could not be captured.
- Scores above describe the current operator-visible result, not the underlying architecture.
