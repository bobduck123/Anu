# Operator scenario QA — Piece Library, room kits, host binding and option authoring

Date: 2026-08-18
Scope: Product workflow and compatibility review against the current implementation
Status: **Internal evidence only.** Nothing here admits any component or option. No claim is made about public launch readiness, client self-serve readiness, Mobstar creative acceptance, commerce, multiplayer, publishing or production readiness. This is not an art-direction pass.

Baseline at time of review: `npm run test:spatial` — **148 passed, 0 failed**; `npx tsc --noEmit` — **0 errors**.

---

## 1. Executive verdict

**The authoring spine works. The fashion path does not, and one policy name over-promises.**

An operator can genuinely create a Piece once in the internal Piece Library, select a host,
bind the piece, get a deterministic arrangement, save and reload, and keep every label, caption
and action in the semantic fallback. That is a real workflow, and four of the six scenarios
below can be assembled today.

Two findings are load-bearing and were confirmed directly in source, not inferred:

1. **The `garment` piece type is accepted by no host at all.** The token `garment` does not
   appear anywhere in `hostSupportsPieceType` (`lib/presence/spatial/arranger.ts:1471-1493`).
   It is a valid `PieceType`, it validates as a library item, and it can never be bound.
2. **The rack-and-hanger chain cannot carry content.** `presence.suspended-rack` exposes 12
   anchors of `kind: "rack"` that accept `"piece"`, but the host-compatibility fallback only
   matches anchors of kind `"wall"` or `"surface"`, so the rack falls through to `return false`.
   `presence.garment-hanger` has `anchors: []` outright. Both render; neither hosts anything.

Together those mean the fashion/lookbook scenario — the one Presence has the most existing
fixtures for — is the **weakest** scenario in practice. A lookbook can be assembled from
plinths, islands and framed work, but the garment rack is decoration.

The third notable finding is honest-but-mislabelled: all four overflow policies currently
resolve to the same visible count. `visibleBindingCount` returns `capacity` on every branch
(`arrangements.ts:70-75`). Content is **not** lost — every overflowed binding still produces a
fallback row with its actions intact — but `paginate` implies reachable pages, and there is no
page field on a slot and no way to reach page 2 in 3D.

Nothing here is a regression. These are the expected edges of a young authoring layer, and all
three are cheap to close.

---

## 2. Scenarios reviewed

Six scenarios were reasoned through against the implementation; the arrangement behaviour in
scenarios 4 and 5 was additionally probed empirically (see section 9).

| # | Scenario | Assemblable today? |
|---|---|---|
| 1 | Artist / gallery room | **Yes** |
| 2 | Fashion / lookbook room | **Partially** — no garment binding, rack inert |
| 3 | DJ / music room | **Yes**, with honest no-playback caveats |
| 4 | Community / archive room | **Yes** — strongest scenario |
| 5 | Impossible display / spherical gallery | **Yes** |
| 6 | Studio / portfolio room | **Yes** |

### Scenario 1 — Artist / gallery room

Room kit `presence.roomkit.white-cube-gallery` (procedural, `white-gallery` + `gallery-soft`)
with starter placements for gallery wall, product plinth, framed media and text card.

Framed work and piece plane accept `image, text, link, archive-item, flyer`. Six to twelve
image/text pieces bind cleanly. `open-link` exists as a real runtime action kind carrying an
`href`, so an artist's "see full work" link survives to fallback.

Works. The one friction: **`video` is not accepted by framed media**, so a video work must go
to a projection host or the spherical gallery. For a video artist that is a surprising
restriction — a framed moving image is a normal gallery object.

### Scenario 2 — Fashion / lookbook room

Room kit `presence.roomkit.dark-boutique` with ribbed wall, display island, suspended rack and
projection wall starters.

This is where the system breaks down, for the two reasons in section 1. Concretely:

- A `garment` piece cannot be bound to **anything**.
- `presence.suspended-rack` (12 `rack` anchors accepting `piece`) hosts nothing, because the
  compatibility fallback only recognises `wall`/`surface` anchors.
- `presence.garment-hanger` has no anchors at all.

**Is `garment-hanger` actually useful or only visible?** On this evidence, **only visible.** It
is geometry with no binding surface.

What does work: `presence.rounded-island` (Display Island, `surface` anchor) and
`presence.display-plinth` both accept `product`, so a lookbook can be built from plinths and
islands with `product`/`image`/`flyer` pieces, plus framed work and a projection wall. An
`enquire` action exists as a runtime kind with an `href` — though that makes an enquiry a link,
not an intake form, which is the honest current state.

So the scenario is completable, but not in the way its own fixtures suggest.

### Scenario 3 — DJ / music room

`presence.listening-station` accepts `audio, link, text`. Media kinds now include `audio` and
`video` (asset-ref `oneOf` in `validate.ts`), and `pieceMediaCompatible` requires `audio` pieces
to carry `audio` media — so the binding chain is type-safe end to end.

Action kinds `listen` and `watch` exist and carry an `href`, and `pieceActionCompatible`
enforces that `listen` requires an `audio` piece and `watch` requires `video` or `gallery`.
Those guards are good: they prevent a "listen" button on a photograph.

**Is the lack of playback honestly handled?** Yes, structurally — `listen` resolves to an
`href` rather than a fake transport control, so nothing pretends to play in-scene. Actions are
preserved in fallback (verified in section 9).

What a real musician would still need: a track list with durations (no duration field exists on
a library item), track ordering within one release, and artwork separate from the audio ref.
Today a five-track EP is five sibling pieces with no grouping other than tags/`collectionRefs`.

### Scenario 4 — Community / archive room

`presence.archive-wall` is the most generous host in the system: `archive-item, image, text,
flyer, event, link, gallery, collection`. Twelve to thirty pieces bind without trouble, and this
is the scenario the current implementation serves best.

Overflow behaves honestly (section 9): at 24 pieces against capacity 12, twelve render and
**all twenty-four** appear as fallback rows, the overflowed ones annotated
`Overflow item N of M`.

Metadata gaps for real community/archive use are the limiting factor, not the plumbing:

- **No date field.** `createdAt`/`updatedAt` are record timestamps, not the item's date. A 1974
  flyer catalogued today reads as 2026.
- **No stable identifier** for an archive item — arguably the defining field of archive content.
- **No provenance or rights statement**, which community and cultural archives routinely need.
- **No credit/contributor field.**

`tags` and `collectionRefs` exist and carry real weight here; they are the only grouping tools.

### Scenario 5 — Impossible display / spherical gallery

`presence.spherical-gallery` accepts `image, video, text, link, gallery, collection`.

The retrofit landed well. `sphericalSlotTransform` now uses a golden-angle Fibonacci
distribution with a seeded offset, replacing the earlier twelve fixed cells across three fixed
height bands. Slot scale falls off as `2.9/sqrt(count)` (clamped 0.34–0.78), so density is
handled rather than ignored. Capacity comes from the arrangement spec, not from baked anchors.

At 3, 12 and 24 pieces the arrangement is stable, deterministic and loses nothing to fallback
(section 9). This is a genuine improvement over the pre-retrofit state, where content past
twelve had nowhere to go.

**Missing interaction/focus affordances:** there is no focus policy on the arrangement — no
"bring slot N to the front", no sequence stepping through sphere cells, and no declared
viewer-inside hint, so nothing tells the camera it should be inside the sphere rather than
looking at a ball of thumbnails. Selection exists at the placement level; it is not
arrangement-aware.

### Scenario 6 — Studio / portfolio room

Achievable with a neutral shell, framed work for finished pieces, a text card for statement
copy, and a display island for process objects. `link` pieces cover contact and commissions via
`open-link`.

This is quietly one of the better-served cases and needs no new hosts — only the same date and
credit metadata the archive scenario wants.

---

## 3. What worked

- **Piece-once, bind-many.** The Piece Library (`SpatialPieceLibraryItem`) with `mediaRefs`,
  `actionRefs`, `tags`, `collectionRefs` and a `safety` flag genuinely avoids duplicating
  content per placement. The arranger surfaces it as section `04A Piece Library`.
- **No derived child placements are stored.** Bindings store refs and order; slot transforms are
  derived in `arrangeSpatialContentBindings`. Layout size scales with content count, not with
  content count times transform data.
- **Determinism holds.** Identical inputs give byte-identical output, and re-ordering the input
  array changes nothing because bindings sort by `order` then `id`. This protects the
  fingerprinted compiler.
- **Fallback is wired all the way through.** `compile.ts:131-134` merges every arrangement's
  `fallbackRows` into `plan.semanticFallback`, so bound content reaches the semantic renderer.
- **Type-safe media and action binding.** `pieceMediaCompatible` and `pieceActionCompatible`
  stop audio actions on images and image media on audio pieces.
- **Validator coverage is strong.** Exact-key checks, missing media/action detection, hosts
  without a `contentArrangement` rejected, and the 100 KB layout budget enforced.

## 4. What failed or felt awkward

| Finding | Severity | Evidence |
|---|---|---|
| `garment` accepted by no host | **High** | `arranger.ts:1471-1493` — token absent |
| `suspended-rack` hosts nothing (`rack` anchor kind unhandled) | **High** | `arranger.ts:1489-1491` matches only `wall`/`surface` |
| `garment-hanger` has `anchors: []` | **High** | `registry.ts` |
| All four overflow policies clamp identically | Medium | `arrangements.ts:70-75` |
| `paginate` computes `pageCount` but slots carry no page; page 2 unreachable in 3D | Medium | `SpatialCompiledContentSlot` has no page field |
| `video` not accepted by framed media | Medium | `arranger.ts:1473` |
| `text-sign-card` has no anchors, so "Text Panel" is not a binding host | Low | `registry.ts` |
| No focus/selection policy on arrangements | Medium | no focus field on `SpatialContentArrangement` |
| `row` lays pieces flat (`rotation: [-PI/2,0,0]`) at `height/2` | Low | `arrangements.ts` — a surface layout, not a hanging row |

The `row` behaviour is worth a note: it places pieces face-up on top of the host, which is
right for a table or plinth and wrong for anything hanging. Since the rack cannot host content
anyway, this has not yet bitten.

## 5. Host compatibility matrix review

| Host | Allowed today | Should probably add | Should stay unsupported | Actions today | Missing actions | Fallback quality | Recommended change | Priority |
|---|---|---|---|---|---|---|---|---|
| **Framed Work / Piece Plane** | image, text, link, archive-item, flyer | **video** (framed moving image), event | audio, garment, product | inspect, open-link, enquire | watch (blocked by no video) | Good | Add `video` | **P0** |
| **Projection Wall** | image, video, gallery, collection | flyer, event | audio, garment | inspect, watch, open-link, sequence | — | Good | None | P2 |
| **Archive Wall** | archive-item, image, text, flyer, event, link, gallery, collection | — (already broadest) | audio, garment, product | inspect, open-link, enquire | — | **Strong** | Add item metadata (section 6) | P1 |
| **Listening Station** | audio, link, text | **collection** (a release or set) | image-only, garment | listen, open-link, inspect | transport/sequence within a set | Good | Add `collection`; add duration | **P0** |
| **Spherical Gallery** | image, video, text, link, gallery, collection | flyer, archive-item | audio, garment, product | inspect, watch, open-link | focus/sequence to a cell | Good | Add focus policy | P1 |
| **Garment Rack / Hanger** | **none** | **garment, product, image** | text, audio | n/a — cannot bind | all | **Broken** | Handle `rack` anchor kind; give hanger anchors; add `garment` | **P0** |
| **Display Island / Plinth** | image, text, link, product, event, flyer, archive-item, gallery, collection | garment | audio, video | inspect, enquire, open-link | — | Good | Add `garment` | P1 |
| **Text Panel** (`text-sign-card`) | none — not a binding host | text (if it should host) | everything else | own label/media only | — | n/a | Decide: host or self-contained media surface | P2 |

## 6. Piece type and metadata gaps

**Piece types that exist but cannot be used:** `garment` (no host). This is the only fully
orphaned type.

**Missing fields on `SpatialPieceLibraryItem`:**

| Field | Needed by | Why |
|---|---|---|
| `date` (content date, typed) | archives, retrospectives, community orgs | `createdAt` is a record timestamp; a 1974 flyer reads as 2026 |
| `identifier` | archives | The defining field of an archive item |
| `credit` / `contributor` | all | Attribution is a routine cultural-sector requirement |
| `rights` / provenance note | archives, community | Often mandatory for public display |
| `durationSeconds` | audio, video | A track list without durations is not a track list |
| `altText` (distinct from `label`) | all visual | Label and alt text are different jobs |
| `dimensions` / medium | galleries, artists | Standard wall-label content |

`tags` and `collectionRefs` exist and are doing a lot of work in their absence.

## 7. Action and media mapping gaps

Runtime `SpatialActionRef` now covers `inspect`, `navigate-state`, `sequence-previous`,
`sequence-next`, `open-link`, `listen`, `watch`, `enquire`, `disabled-placeholder`. That is a
real improvement — `listen`/`watch`/`open-link`/`enquire` all carry an `href`.

Remaining gaps against strategic `ActionType`:

| Strategic action | Runtime status | Note |
|---|---|---|
| `view` | folded into `inspect` | Fine |
| `book`, `RSVP` | no runtime kind | Events cannot be actioned; blocks community/event use |
| `buy`, `donate` | no runtime kind | Correct to omit — **no commerce assumption** |
| `enter-room`, `unlock-room` | no runtime kind | Room-to-room navigation not expressible |

`enquire` resolving to an `href` means an enquiry is a link out, not an intake path. That is
honest today and should be stated as such wherever it appears to an operator.

Media kinds now include `audio` and `video`. No remaining gap found.

## 8. Fallback findings

Verified rather than assumed:

- Every binding produces exactly one fallback row, **including overflowed ones** — 24 rows for
  24 bindings at capacity 12.
- Every row retained its `actionRefs` in all twelve probe configurations.
- Overflowed rows are annotated `Overflow item N of M`; the piece type is stated in the
  description, and the caption carries through.
- Rows are keyed by a derived, sanitised placement id (`contentBindingPlacementId`), capped at
  120 characters to satisfy the id pattern.
- The validator requires a semantic fallback item for any interactive or media placement.

Gap: fallback row **order** follows binding `order`, which is correct, but there is no explicit
"3 of 24" position marker for visible items — only overflowed items get positional text.

## 9. Layout and payload findings

Empirical probe of `arrangeSpatialContentBindings` (host 4.8 x 4.8 x 4.8 m, seed `qa`), run
read-only from outside the repository:

| Kind | Capacity | n | Visible | Overflow | Pages | Fallback rows | Actions kept |
|---|---|---|---|---|---|---|---|
| spherical | 12 | 3 / 12 / 24 | 3 / 12 / 12 | 0 / 0 / 12 | 1 / 1 / 2 | 3 / 12 / 24 | yes |
| grid | 12 | 3 / 12 / 24 | 3 / 12 / 12 | 0 / 0 / 12 | 1 / 1 / 2 | 3 / 12 / 24 | yes |
| wall-grid | 8 | 3 / 12 / 24 | 3 / 8 / 8 | 0 / 4 / 16 | 1 / 2 / 3 | 3 / 12 / 24 | yes |
| row | 6 | 3 / 12 / 24 | 3 / 6 / 6 | 0 / 6 / 18 | 1 / 2 / 4 | 3 / 12 / 24 | yes |

Determinism: identical output across repeated calls — **true**. Order-independence: reversed
input array gives identical output — **true**.

Budgets: `SPATIAL_LAYOUT_JSON_BUDGET_BYTES` is 100 KB and enforced in `validateRoomBudgets`,
alongside a 3 MB eager and 12 MB total compressed-asset ceiling. Because bindings store refs
and order only, a 30-piece archive room is well inside budget; the derived slots never enter
the saved layout.

No payload risk was found in any scenario at the counts tested.

## 10. Operator language and UX findings

- The arranger surfaces the library as **`04A Piece Library`** with an internal-piece count.
  The numbered-section convention is legible but the label "Piece" is Presence-internal
  vocabulary; operators say "work", "track", "item" or "photo" depending on discipline.
- Binding feedback messages are clear and specific — for example *"Bound {label} from the
  internal Piece Library to {host}"*.
- **Nothing tells an operator why a host rejects a piece.** `hostSupportsPieceType` returns a
  bare boolean. A fashion operator dragging a garment onto a rack gets a refusal with no
  explanation, and the true reason ("no host accepts garments") is not discoverable.
- Overflow is not surfaced in the authoring UI as a warning; the operator learns about it only
  by reading the compiled arrangement.
- "Capacity" is an arrangement field the operator must set without guidance on sensible values
  per host.

## 11. Does the compatibility matrix need changes?

**Yes — three changes, one of them blocking.**

1. **Blocking:** make the rack chain functional. Handle `anchor.kind === "rack"` in
   `hostSupportsPieceType`, give `presence.garment-hanger` anchors, and add `garment` to the
   accepted types for rack/hanger/island/plinth. Without this, `garment` is dead weight in the
   model and the fashion fixtures are decorative.
2. **Should do:** add `video` to framed media/piece plane. A framed moving image is ordinary
   gallery content and its absence is surprising.
3. **Should do:** add `collection` to listening station so a release or DJ set is one bindable
   thing rather than N sibling pieces.

Everything else in the matrix is defensible as-is. Archive Wall's breadth is correct.
Excluding `audio` from visual hosts and `garment` from projection hosts is correct.

## 12. Review matrix scores

Scored 1–4, not inflated. These describe internal authoring capability only.

| Scenario | Completeness | Piece creation | Host binding clarity | Arrangement | Fallback | Operator understandability | Payload safety | Readiness for next impl. |
|---|---|---|---|---|---|---|---|---|
| 1 Artist / gallery | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 |
| 2 Fashion / lookbook | **1** | 3 | **1** | 3 | 4 | 2 | 4 | 2 |
| 3 DJ / music | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 |
| 4 Community / archive | **4** | 3 | 3 | 3 | 4 | 3 | 4 | 3 |
| 5 Spherical gallery | 3 | 3 | 3 | **4** | 4 | 2 | 4 | 3 |
| 6 Studio / portfolio | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 |

Fallback scores 4 across the board because it was empirically verified to lose nothing.
Fashion scores 1 on completeness and host binding for the reasons in sections 2 and 4.
Spherical gallery scores 2 on understandability because nothing guides the camera inside the
sphere or explains capacity.

## 13. Recommended next implementation task

**Make the garment/rack binding chain work, and add `garment` to the compatibility matrix.**

Concretely, in one change:

1. Extend `hostSupportsPieceType` to handle `anchor.kind === "rack"` (accepting
   `garment, product, image`).
2. Give `presence.garment-hanger` real anchors so it can host a bound garment.
3. Add `garment` to the accepted types for rack, hanger, display island and plinth.
4. Add `video` to framed media and `collection` to listening station while in the same file.

This is small, well-bounded, unblocks the only fully-orphaned piece type, and converts two
existing components from decorative to functional. It also makes the fashion scenario — the one
with the most existing fixtures — actually completable.

**Second priority:** surface a *reason* when a host rejects a piece, so operators can learn the
matrix from the UI instead of from source.

**Third:** decide whether `paginate` should page in 3D or be renamed to match its real
behaviour (visible-to-capacity, remainder in fallback). Either is fine; the current name
promising more than it does is not.

---

## Boundaries

This review is internal authoring evidence. It does not admit any component or option, does not
assess visual quality or art direction, and makes no claim about public launch, client
self-serve, Mobstar creative acceptance, commerce, multiplayer, publishing or production
readiness. No screenshots were captured; findings are grounded in source inspection, the test
baseline and a read-only arrangement probe run outside the repository.

The documented Windows Playwright `webServer` teardown hang was not investigated and was out of
scope for this task.
