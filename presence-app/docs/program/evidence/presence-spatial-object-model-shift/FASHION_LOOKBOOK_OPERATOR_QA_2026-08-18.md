# Fashion / lookbook operator QA — garment rack binding and Mobstar metadata

Date: 2026-08-18
Scope: Operator workflow and product review for a fashion/lookbook authoring scenario using the repaired rack binding chain
Status: **Internal authoring evidence only.** Nothing here admits any component or option, and no claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness.

Baseline at review: `npm run test:spatial` — **148 passed, 0 failed** at the start of this review; **152 passed, 0 failed** on re-check at the end (a concurrent session added 4 tests during the review). `npx tsc --noEmit` — **0 errors** in both runs.

---

## 1. Executive verdict

**The binding chain is fixed. The visual result is not yet a rack.**

The repair is real and complete. Every blocker recorded in the previous operator QA is closed,
verified in source:

| Previous blocker | Status |
|---|---|
| `garment` accepted by no host | **Fixed** — explicit `garment` branch in `hostSupportsPieceType` |
| `suspended-rack` hosts nothing (`rack` anchor kind unhandled) | **Fixed** — rack category checks rack anchors accepting `piece` |
| `garment-hanger` has `anchors: []` | **Fixed** — now a `surface` anchor accepting `piece`/`action` |
| `video` not accepted by framed media | **Fixed** |
| `collection` not accepted by listening station | **Fixed** |

An operator can now create six garment pieces in the internal Piece Library, bind them to a
suspended rack, get a deterministic ordered arrangement, and keep every label, caption and
action in the semantic fallback. That is a working authoring path and a genuine step forward.

Two things stop it being usable as a lookbook today, and neither is a regression:

1. **Garments lie flat on the rail.** The `row` arrangement returns
   `rotation: [-PI/2, 0, 0]` at `y = height/2 + 0.08`. Probed on an 8.4 x 4 x 1.8 m
   suspended rack, garments sit face-up at 2.08 m — laid horizontally across the top of the
   rack rather than hanging from it. There is no rack-specific arrangement kind; the four
   available are `grid`, `row`, `wall-grid`, `spherical`.
2. **Spacing does not fill the host.** The row pitch is a fixed 0.72 m, so six garments span
   3.60 m of an 8.4 m rack and bunch in the middle 43% of the rail. A rack only looks full at
   exactly capacity.

So the honest read: **the data model now supports a lookbook; the spatial result does not yet
read as one.** That is a smaller and much better-defined problem than the one this chain had
yesterday.

Separately, and important for planning: **no real Mobstar product metadata exists anywhere in
this repository.** See section 2.

---

## 2. Real vs synthetic metadata basis

**Searched, and none found.** Every Mobstar reference in the repo was inspected.

| Source | What it actually contains |
|---|---|
| `lib/presence/spatial/fixtures/mobstar.ts` | 12 assets, **all** `safety: "generated-placeholder"`, locators of the form `generated:mobstar/piece-a`, attribution "Generated internal placeholder" |
| `lib/presence/spatial/fixtures/mobstarGate4.ts` | 14 assets marked `public-safe`, but locators are art-direction **studies**: `garment-dark.webp`, `garment-light.webp`, `garment-signal.webp`, `product-study.webp`, `archive-study.webp`, `campaign-wall.webp`, `logo-mark.webp` |
| Semantic labels in those fixtures | "Dark garment candidate", "Pale garment candidate", "Footwear and headwear study", "Candidate Mobstar identity" — generic candidates, not products |
| `assets/presence-spatial/candidates/*.mobstar-gate4.json` | Component/room-kit selection metadata only; no product data |
| Repo-wide search for `sku`, `colourway`, `colorway`, `garment_type`, `lookbook` | No matches in Presence spatial code or fixtures |

**Conclusion: there is no real Mobstar product data — no SKUs, no garment names, no colourways,
no sizes, no prices, no availability, no photographer or stylist credits.** The Gate 4 fixture
imagery is generated study material, not photography of real product.

A second finding worth flagging: **neither Mobstar fixture uses `pieceLibrary` at all** (zero
occurrences in both files). The Mobstar fixtures predate the Piece Library, so the repaired
garment/rack binding chain has **never been exercised against Mobstar content**. All evidence
in this report — including the previous QA's — comes from synthetic bindings.

### Synthetic data used in this review

All garment data below is **synthetic operator-test data**, invented for QA. It makes no claim
about any real Mobstar product:

```
Look 01 — Dark Overshirt      Look 04 — Utility Pant
Look 02 — Pale Layer          Look 05 — Heavy Hood
Look 03 — Signal Tee          Look 06 — Cap
```

### Real metadata that is missing and would be needed

Before any genuine Mobstar lookbook could be authored, the following would have to be supplied
by the product owner — none of it can be inferred or invented:

- Actual garment names and the drop/collection they belong to
- Look numbering and intended look order
- Colourways and size/fit ranges
- Product photography and any campaign film, with usage rights
- Availability or release status per look
- Photographer, stylist and model credits
- The destination for an enquiry action (a real URL or intake path)

---

## 3. Scenario results

### Scenario 1 — Basic rack lookbook (6 garments)

Six synthetic garment pieces bound to a suspended rack (`presence.suspended-rack`, category
`rack`, 12 rack anchors accepting `piece`, 8.4 x 4 x 1.8 m).

Binding succeeds. Probe results:

| Garments | Visible | Overflow | Pages | Fallback rows | Actions kept | X span |
|---|---|---|---|---|---|---|
| 6 | 6 | 0 | 1 | 6 | yes | 3.60 m of 8.4 m |
| 12 | 12 | 0 | 1 | 12 | yes | 7.60 m of 8.4 m |
| 18 | 12 | 6 | 2 | **18** | yes | 7.60 m of 8.4 m |

**Can the operator understand where garments will appear?** Not reliably. The arrangement is
deterministic and ordered, but nothing in the authoring UI previews slot positions, and the
result — flat garments at 2.08 m spanning only the centre of the rail — will not match the
operator's mental model of a rack.

**Does fallback preserve all garment labels and actions?** Yes, completely. All 18 rows survive
at capacity 12, each carrying its label, caption, piece type and its `enquire` action. Sample:

```
placementId: binding-rack-1-g01
label:       Look 01 — Dark Overshirt
description: Piece type: garment. Synthetic look 1
actionRefs:  [enquire-1]
```

Nice detail found in `compile.ts`: garment bindings and rack-anchored bindings automatically
receive `fabric: "fabric-neutral"` as a material override, so garments pick up a fabric slot
without the operator configuring one.

### Scenario 2 — Rack → hanger → garment chain

`presence.garment-hanger` now has a `surface` anchor accepting `piece` and `action`, and sits
in `GARMENT_DISPLAY_COMPONENTS`, so it can host a garment. `presence.suspended-rack` and
`presence.retail-rack` both host garments via their rack anchors.

**Is the current interaction understandable without rack-slot targeting?** No. The model is
coherent — a rack has 12 rack anchors, a hanger is a garment carrier, a garment binds to
either — but the operator has no way to see or choose *which* slot anything lands in. Binding
appends by `order`; position is a consequence, not a choice.

Free placement of hangers is disabled, which is the right call for now: without slot targeting,
a freely-placed hanger would float unattached to any rail.

The practical consequence is that the rack and the hanger are today two independent ways to
show a garment rather than a composed chain. Nothing lets an operator hang *this* garment on
*that* hanger at *that* slot.

### Scenario 3 — Product / display surface path

`GARMENT_DISPLAY_COMPONENTS` covers `display-bay`, `display-plinth`, `display-shelf`,
`product-display-block`, `rounded-island`, `candidate-display-island` and `garment-hanger`.
These accept `garment` directly, and their `surface`/`wall` anchors also accept
`product, image, flyer, archive-item, gallery, collection` through the general branch.

**Can this serve a lookbook before rack visuals are final? Yes — and this is currently the
better path.** A display island with garments and a plinth with footwear, arranged `grid`, sits
upright and reads correctly, because the grid branch places pieces on the host's front face
rather than laying them flat. An operator wanting a credible lookbook today should use display
surfaces, not the rack.

### Scenario 4 — Campaign / media wall path

Framed media now accepts `image, video, text, link, archive-item, flyer`; projection hosts
accept `image, video, gallery, collection`; archive wall remains the broadest host.

Campaign context authors cleanly: a projection wall for campaign film, framed works for
lookbook stills, an archive wall for past drops. `watch` and `open-link` actions both exist as
real runtime kinds with an `href`, and `pieceActionCompatible` enforces that `watch` requires a
`video` or `gallery` piece.

This is the strongest path in the fashion scenario and needs no further work to be usable.

### Scenario 5 — Mobile / fallback path

Verified rather than assumed. Every binding produces exactly one semantic row including
overflowed ones; every row retained its action refs across all probe configurations; piece type
is stated in the description; captions carry through; overflowed rows are annotated
`Overflow item N of M`. `compile.ts` merges arrangement fallback rows into
`plan.semanticFallback`, so bound garments reach the semantic renderer.

Fashion-specific labelling that is **missing** from fallback: no size, colourway, look number,
collection or availability appears, because none of those fields exist (section 7). A screen
reader currently hears "Look 01 — Dark Overshirt. Piece type: garment." and nothing more.

### Scenario 6 — Metadata review

Covered in detail in section 7.

---

## 4. What works now

- **Garment binding works end to end** — library piece, host compatibility, ordered binding,
  deterministic arrangement, compiled slots, semantic fallback.
- **Rack anchor kind is handled properly**, gated on the anchor actually accepting `piece`
  rather than on the component id, so future rack components inherit the behaviour.
- **Automatic fabric material override** for garment and rack-anchored bindings.
- **Overflow is honest**: 18 garments on a capacity-12 rack shows 12, counts 6 overflowed and
  keeps all 18 reachable in fallback with actions intact.
- **Determinism holds** — bindings sort by `order` then `id`, so the arrangement is stable and
  input-order independent.
- **Campaign/media path is complete**, including video on framed media.
- **Free hanger placement is correctly disabled** rather than shipped half-working.

## 5. What fails or feels awkward

| Finding | Severity | Evidence |
|---|---|---|
| Garments lie flat on the rail (`rotation: [-PI/2,0,0]` at `height/2 + 0.08`) | **High** | `arrangements.ts` row branch; probed at y = 2.08 m |
| No rack-specific arrangement kind | **High** | `SpatialArrangementKind` = grid / row / wall-grid / spherical |
| Fixed 0.72 m pitch does not fill the host | Medium | 6 garments span 3.60 m of an 8.4 m rack |
| Operator cannot see or choose a slot | **High** | no slot preview or targeting in the arranger |
| Rack and hanger are not composable | Medium | no way to bind a garment to a hanger *on* a rack slot |
| Garment visuals are procedural proxies | Medium | known and documented limitation |
| No fashion metadata fields | **High** | see section 7 |
| Overflow invisible in authoring UI | Medium | only discoverable from the compiled arrangement |

## 6. Rack-slot targeting requirements

What a rack-slot targeting interaction must do, specified tightly enough to implement:

**Selection and display**
1. Selecting a rack host reveals its slots as discrete, numbered, individually selectable
   targets, ordered left-to-right along the rail.
2. Each slot shows occupied/empty state and, when occupied, the bound garment's label.
3. Slot count comes from the arrangement `capacity`, not from the component's baked anchor
   count, so capacity stays content-driven.

**Placement operations**
4. "Add garment to next open slot" — the default one-click action.
5. "Add to slot N" — explicit targeting of a chosen empty slot.
6. Move a garment left/right by one slot, swapping with an occupant rather than overwriting.
7. Remove a garment from a slot, leaving it in the Piece Library.
8. Reorder must rewrite binding `order` values, since `order` is the single source of truth for
   both the 3D arrangement and the fallback sequence.

**Capacity and overflow**
9. Show `visible / capacity` and any overflow count in the authoring UI, not only in the
   compiled output.
10. Adding beyond capacity must be possible but visibly marked as overflow — never a silent
    refusal and never silent loss.

**Preview and feedback**
11. Preview the selected garment's media before and after binding.
12. When a host rejects a piece, state the reason. `hostSupportsPieceType` returns a bare
    boolean today, so a refusal is currently unexplained.

**Ordering and fallback**
13. Slot order, binding order and semantic fallback order must remain identical at all times.
14. Reordering must not change any transform stored in the layout — slots stay derived.

**Deliberately out of scope for this step**
15. No free-floating hanger placement until slots exist to attach to.
16. No drag-and-drop in 3D; list-based slot controls are sufficient and far cheaper to make
    keyboard-accessible.

## 7. Garment metadata gaps

`SpatialPieceLibraryItem` currently carries: `id`, `pieceType`, `label`, `caption`, `mediaRefs`,
`actionRefs`, `tags`, `collectionRefs`, `safety`, `createdAt`, `updatedAt`.

For fashion/lookbook use:

| Field | Present? | Needed for | Note |
|---|---|---|---|
| Title | yes (`label`) | all | Adequate |
| Caption | yes | all | Adequate |
| Garment type | **no** | filtering, fallback labelling | Could start as a `tag` |
| Size / fit | **no** | lookbook, enquiry | No numeric or range field exists |
| Colourway | **no** | variants | The most-requested fashion field |
| Collection / drop | partial (`collectionRefs`) | grouping by season/drop | Works, but untyped and unlabelled |
| Look number / order | partial (binding `order`) | look sequence | Binding order is per-host; a look number is a property of the garment |
| Image / video media | yes (`mediaRefs`) | all | Adequate; video now bindable to framed media |
| Action link / enquiry | yes (`enquire`, `open-link` with `href`) | enquiry | Resolves to a link, **not** an intake form — state this honestly to operators |
| Availability / status | **no** | drops, sold-out states | Would need a neutral status enum, not commerce |
| Credit (photographer / stylist) | **no** | attribution | Routine industry requirement |
| Price | **no** | — | **Do not implement.** See section 10 |

`tags` and `collectionRefs` are carrying all of this today. They are a reasonable interim, but
they cannot be rendered as structured fallback labelling, and they cannot be validated.

## 8. Fashion / lookbook fallback findings

- Preservation is complete: labels, captions, piece type, actions and overflow annotation all
  survive, verified across 6, 12 and 18 garment probes.
- Ordering is correct and matches binding order.
- **What is missing is fashion-specific labelling, not preservation.** A lookbook fallback row
  should read closer to *"Look 03 — Signal Tee. Garment, Spring drop, colourway Signal Red.
  Enquire."* Today it reads *"Look 03 — Signal Tee. Piece type: garment."*
- No "3 of 12" positional marker for visible items; only overflowed items carry position text.
- The word "garment" appears in fallback via the generic `Piece type: {type}.` template. For a
  fashion audience "Garment" as a bare type label is acceptable but not informative.

## 9. Recommended Codex implementation task

**"Rack Slot Targeting UI + Garment Order Controls" — with one addition: a hanging row arrangement.**

The slot targeting work in section 6 is the right next task, but shipping it against the
current `row` arrangement would let operators precisely position garments that still lie flat.
The two should land together, and the arrangement half is small.

Bounded scope:

1. **Add a `rack-row` arrangement kind** (or a rack branch inside `row`): pieces upright
   (no -PI/2 rotation), hanging *below* the rail rather than above the host centre, facing the
   viewer, with pitch derived from host width and visible count so the rail fills rather than
   bunching at a fixed 0.72 m.
2. **Rack slot targeting UI** per section 6 items 1–14.
3. **Rejection reasons** — return a reason from host compatibility instead of a bare boolean,
   and surface it (item 12). This is small and pays off across every host, not just racks.

Explicitly not in this task: garment visual quality, free hanger placement, drag-and-drop,
metadata schema changes.

**Second priority, separate task:** add structured fashion metadata — garment type, colourway,
size/fit, look number, availability status, credit — and render it into fallback labelling.
This is what turns a working binding into a usable lookbook, and it needs real product data
from the owner before it can be validated against anything.

## 10. What not to build yet

- **Commerce of any kind.** No price field, no cart, no checkout, no payment. If a price ever
  appears it should be display-only text under a separate, explicitly scoped decision. Nothing
  in this review assumes or recommends commerce.
- **Free-floating hanger placement**, until slots exist to attach to.
- **Drag-and-drop slot assignment.** List-based controls first; they are keyboard-accessible by
  default and much cheaper to get right.
- **Garment visual/art quality work.** Proxy geometry is the correct authoring source of truth,
  and improving it is an art-direction task with its own review, not part of slot targeting.
- **Real Mobstar content loading.** The fixtures contain no real product data, and none should
  be invented. This is blocked on the owner supplying it.
- **Backend persistence, publish flow, public routes, auth or tenant changes.** Browser-local
  save/reload remains the boundary.

---

## Boundaries

This review is internal authoring evidence. It does not admit any component or option, does not
constitute Mobstar creative acceptance, and makes no claim about public launch, client
self-serve, commerce, multiplayer, publishing or production readiness. All garment data used is
synthetic operator-test data and asserts nothing about any real product.

Findings are grounded in source inspection, the 148-test baseline, and read-only arrangement
probes executed outside the repository. No screenshots were captured. The documented Windows
Playwright `webServer` teardown hang was out of scope.
