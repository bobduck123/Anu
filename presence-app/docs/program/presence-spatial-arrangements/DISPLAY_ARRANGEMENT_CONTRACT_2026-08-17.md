# Display arrangement contract

Date: 2026-08-17
Scope: Architecture specification for a shared arrangement layer
Status: **Specification only.** No code was written. Nothing here admits any component or option, and no claim is made about production readiness, public launch, client self-serve, Mobstar creative acceptance, commerce, multiplayer or publishing.

Terminology follows `lib/presence/spatial/model.ts` as it stands today.

---

## 1. Executive summary

Presence currently encodes content placement as **static anchors baked into the component
registry**. Every display primitive carries a hand-written slot list at a fixed capacity:

| Component | Fixed slots |
|---|---|
| `presence.projection-wall@1.0.0` | 32 |
| `presence.spherical-gallery` | 12 |
| `presence.archive-wall` | 12 |
| `presence.suspended-rack` | 12 |
| `presence.display-shelf` | 6 |
| `presence.display-bay` | 6 |
| `presence.rounded-island` | 3 |

The Spherical Gallery is the clearest illustration. Its twelve cells are generated in
`registry.ts` from a hard-coded loop: twelve fixed angles across three fixed height bands. An
owner with 40 works has nowhere to put 28 of them. An owner with 3 works gets a mostly empty
sphere. Neither case is expressible today, and neither is a bug in that component — it is the
predictable result of each primitive inventing its own placement rule.

**The proposal: separate *arrangement* from *geometry*.**

- **Geometry** (the registry, unchanged) owns what a thing looks like, its dimensions, its
  material slots and its structural anchors.
- **Arrangement** (new, shared) owns where the Nth piece of content goes, given N pieces, an
  arrangement kind, and the host's bounds.

Arrangement is a **pure, deterministic function**, not stored data. This matters for payload:
`SPATIAL_LAYOUT_JSON_BUDGET_BYTES` is 100 KB, and storing a transform per piece would consume
it quickly. A saved layout stores an ordered list of piece references plus one arrangement
spec; the compiler derives the transforms. Layout size then grows with *content count*, not
with *content count × transform data*, and an arrangement can be changed by editing one field.

This is also what lets the same content move between displays. An owner's twenty photographs
should be placeable on a wall grid, a spherical gallery or a constellation without re-authoring
anything — only the arrangement spec changes.

---

## 2. Why arrangement is separate from geometry

Four reasons, each observable in the current code.

**1. Capacity is a property of content, not of geometry.** A sphere does not have twelve
sides. Twelve was a reasonable default for a placeholder; it is not a fact about spheres.

**2. The same geometry serves different arrangements.** A projection wall might show one
large video, a 4×3 grid of stills, or a slow sequence. Today those would be three components.

**3. The same arrangement serves different geometry.** A radial arrangement works on a sphere,
a cylinder, a dome and a ring. Today it would be written four times.

**4. Fallback ordering must be arrangement-derived.** `SpatialSemanticItem[]` is the ordered
list a screen reader and the no-WebGL path consume. If ordering lives inside each primitive's
anchor list, every primitive must independently get accessibility right. If ordering is a
property of the arrangement, it is solved once.

Structural anchors stay where they are. A rack's rail height and a plinth's `surface-top` are
genuine geometric facts and should remain in the registry. What moves out is the *content
slot grid*.

---

## 3. How a Piece becomes part of a spatial display

Today the chain stops short:

```
Piece (strategic)  →  ???  →  SpatialPlacement.mediaRef (single string)  →  renderer
```

`SpatialPlacement.mediaRef` is one optional string. One placement carries one media reference.
For a display holding twenty pieces there are only two options today: create twenty placements
(payload and authoring cost), or bind only one (content loss). Neither is acceptable.

Proposed chain:

```
Piece[]  →  Binding (ordered refs + arrangement spec, stored)
         →  arrange() (pure, at compile time)
         →  SpatialArrangedSlot[] (derived transforms)
         →  SpatialRenderItem[] + SpatialSemanticItem[] (existing)
```

The host placement stays a single `SpatialPlacement` carrying the display component. The
binding hangs off it. Slots are derived, never saved.

```ts
// Pseudocode. Not an implementation.
interface SpatialDisplayBinding {
  id: string;
  hostPlacementId: string;          // the SpatialPlacement carrying the display component
  arrangement: SpatialArrangementSpec;
  entries: readonly SpatialBindingEntry[];   // ordered; this order is authoritative
}

interface SpatialBindingEntry {
  pieceRef: SpatialLogicalRef;      // "piece:..." — never an inline blob
  mediaRef?: string;                // resolves against SpatialRoomDefinition.media
  actionRefs: readonly string[];
  label: string;                    // required; the semantic fallback and a11y name
  caption?: string;
  order: number;                    // explicit, stable across re-saves
  pinnedSlotId?: string;            // opt out of automatic arrangement for one entry
  visible: boolean;
}
```

---

## 4. Arrangement types

All ten share one signature. Only `params` differ.

```ts
type SpatialArrangementKind =
  | "grid" | "row" | "stack" | "wall-grid" | "projection"
  | "spherical" | "orbital" | "constellation" | "timeline" | "free-anchor";

interface SpatialArrangementSpec {
  kind: SpatialArrangementKind;
  ordering: SpatialOrderingRule;
  overflow: SpatialOverflowPolicy;
  focus: SpatialFocusPolicy;
  motion: SpatialMotionPolicy;
  params: Record<string, number | string | boolean>;  // kind-specific, validated per kind
  seed?: string;                    // required for any arrangement using pseudo-randomness
}
```

| Kind | Shape | Primary use | Notes |
|---|---|---|---|
| `grid` | Rows × columns on a plane | Wall of works, contact sheet | The default. Most legible. |
| `row` | Single line along an axis | Rack, shelf, sequence | Maps to existing rack/shelf anchors |
| `stack` | Layered along one axis with offset | Poster stack, flyer pile, archive box | Only the top is fully legible; the rest are affordance |
| `wall-grid` | Grid constrained to a wall plane with margins | Gallery hang | Distinct from `grid` by respecting wall bounds and hanging height |
| `projection` | Cells subdividing an emissive field | Projection wall, media wall | Existing 32-cell wall is this at fixed capacity |
| `spherical` | Points distributed on a sphere's inner surface | Spherical gallery | Should use even distribution, not fixed bands |
| `orbital` | Concentric rings at radii, optional rotation | Orbital carousel | Motion-bearing; see reduced-motion rules |
| `constellation` | Points in a volume positioned by relationship | Constellation archive | Needs a relation source; see roadmap |
| `timeline` | Positions along a path parameterised by time | Timeline spiral | Requires a date per entry; see roadmap |
| `free-anchor` | Explicit per-entry slot ids | Hand-placed, escape hatch | Arrangement declines to arrange |

`free-anchor` is deliberate: it preserves today's behaviour and gives authors a way to override
the algorithm without leaving the contract.

### Required fields

Every arrangement spec must carry `kind`, `ordering`, `overflow`, `focus`, `motion`. Every
binding entry must carry `pieceRef`, `label`, `order`, `visible`. **`label` is required, not
optional** — it is the accessible name and the semantic fallback row, and it must not be
derivable-or-absent.

### Optional fields

`caption`, `mediaRef`, `pinnedSlotId`, `seed`, and kind-specific `params`.

### Result shape

```ts
interface SpatialArrangedSlot {
  entryId: string;
  slotIndex: number;                // 0-based; matches ordering
  transform: SpatialTransform;      // relative to the host placement
  visible: boolean;
  page?: number;                    // set when overflow policy paginates
  semanticIndex: number;            // authoritative order for fallback and keyboard nav
}

interface SpatialArrangementResult {
  slots: readonly SpatialArrangedSlot[];
  overflowCount: number;            // entries that received no visible slot
  warnings: readonly string[];
}
```

---

## 5. Ordering rules

Ordering must be explicit, stable and single-sourced, because the same order drives the 3D
layout, the keyboard traversal order and the semantic fallback list.

```ts
type SpatialOrderingRule =
  | { by: "manual" }                          // uses entry.order
  | { by: "piece-created"; direction: "asc" | "desc" }
  | { by: "title"; direction: "asc" | "desc" }
  | { by: "metadata"; key: string; direction: "asc" | "desc" };
```

Rules:

1. **`manual` is the default.** Owners expect the order they set.
2. **Ordering is resolved once**, before arrangement, and the resolved order is authoritative
   everywhere downstream.
3. **Ties break by `entry.order`, then by `pieceRef`.** Never by object key order — the
   existing compiler is deterministic and fingerprinted, and arrangement must not break that.
4. **Sorting must not depend on locale.** Use a fixed collation for `title`.
5. **A missing sort key sinks to the end** and raises a warning; it never throws.

### Overflow policy

Required, because silent content loss is the current failure mode.

```ts
type SpatialOverflowPolicy =
  | { mode: "paginate"; perPage: number }     // slots reused across pages/states
  | { mode: "fit"; minScale: number }         // shrink/densify until minScale, then paginate
  | { mode: "sequence" }                      // one visible at a time, prev/next actions
  | { mode: "truncate"; max: number };        // explicit, and MUST surface overflowCount
```

`truncate` is permitted only when the remainder stays reachable in the semantic fallback.
Content that exists must always be reachable somewhere.

---

## 6. Focus and selection

```ts
type SpatialFocusPolicy =
  | { mode: "none" }
  | { mode: "inspect"; returnToState: string }      // existing "inspect" SpatialActionRef
  | { mode: "carousel"; centerSlotIndex: number }   // one slot is the focus position
  | { mode: "state-per-entry" };                    // each entry gets a SpatialSceneState
```

- Focus reuses the existing `SpatialActionRef` kinds `inspect`, `sequence-previous` and
  `sequence-next` rather than inventing new ones.
- `state-per-entry` must be capacity-guarded: generating a `SpatialSceneState` per entry is
  reasonable for 12 pieces and not for 400.
- Selecting an entry must always be possible **without** motion, for reduced-motion and
  keyboard users.
- Exactly one entry may hold focus. Focus is derived state, never saved into the layout.

---

## 7. Camera and viewport assumptions

Arrangements may assume:

- A single active camera described by the existing `SpatialSceneState`
  (`cameraPosition`, `cameraTarget`, `fieldOfView`).
- A `SpatialCameraPath` with a `clearance` value that placements must not block.
- Y-up, metres, the same convention as the rest of the model.

Arrangements may **not** assume:

- A fixed aspect ratio. Slot legibility must be checked against the viewport, not assumed.
- That the viewer can walk. Some Presences are a single vantage point.
- That the camera can enter the arrangement volume. `spherical` is the exception and must
  declare `viewerInside: true` so camera-path validation can treat it correctly.

Each arrangement kind must declare a **recommended entry state** — where the camera should be
for the arrangement to read. A spherical gallery viewed from outside is a ball of thumbnails;
viewed from inside it is the intended experience.

---

## 8. Interaction assumptions

Available: hover/point, select/activate, keyboard traversal, and the existing raycast
inspection path.

Not available, and arrangements must not require them: drag, multi-touch gestures, gaze dwell,
device orientation, continuous scroll-linked animation. Any arrangement that would *only* work
with one of these is not ready for the contract.

Every interactive slot needs a hit target that remains usable on a small touch screen. When
`fit` shrinks slots below a legible size, the arrangement must paginate rather than produce
targets nobody can hit.

---

## 9. Fallback requirements

Every arrangement must produce a complete `SpatialSemanticItem[]` **from the same resolved
order** as the 3D layout. This is a hard requirement, not a nice-to-have:

1. Every visible entry appears exactly once.
2. Overflowed entries still appear, with their page or sequence position noted.
3. `label` becomes the item label; `caption` becomes the description.
4. `actionRefs` carry through unchanged. **Actions must never be lost in fallback.**
5. Ordering matches `semanticIndex` exactly.

An arrangement that cannot describe itself as an ordered list is not admissible under this
contract. Full detail in the fallback and accessibility rules document.

---

## 10. Accessibility requirements

- **Order is meaning.** The `semanticIndex` sequence must be sensible read aloud.
- **Every entry has an accessible name** — `label`, required.
- **Keyboard reachability** for every entry, in `semanticIndex` order, including overflow pages.
- **Focus must be visible** in both 3D and fallback.
- **No information conveyed by position alone.** If a constellation encodes relationship
  spatially, that relationship must also be stated in text.
- **No information conveyed by motion alone.** If an orbit encodes recency, say so in text.
- **Colour is never the only channel** for state.

---

## 11. Mobile and reduced-motion requirements

Each arrangement declares:

```ts
interface SpatialArrangementCapability {
  mobileStrategy: "same" | "simplified" | "paginated" | "semantic-only";
  reducedMotionStrategy: "same" | "static-snapshot" | "semantic-only";
  minSlotSizeMetres: number;
  maxRecommendedEntries: number;
  requiresViewerInside: boolean;
}
```

- **Reduced motion is not optional.** `SpatialSceneState` already carries
  `reducedMotionStateId`; motion-bearing arrangements must supply a static equivalent that
  preserves order and reachability. An orbital carousel under reduced motion becomes a still
  ring, not an empty room.
- **Mobile may reduce fidelity but never content.** Dropping to `semantic-only` — already the
  declared `mobileFallback` for `presence.spherical-gallery` — is acceptable; silently showing
  fewer pieces is not.
- `maxRecommendedEntries` should produce an authoring warning, not a hard failure.

---

## 12. Arrangement versus physical placement

| | Physical placement | Arrangement |
|---|---|---|
| Answers | Where does this *object* sit in the room? | Where does the *Nth piece of content* sit within a display? |
| Stored | Yes — `SpatialPlacement.transform` | No — derived at compile time |
| Authored by | Dragging in the arranger | Choosing a kind and ordering content |
| Cares about | Collision, clearance, camera path, floor contact | Legibility, order, capacity, focus |
| Unit | One component instance | One display, many pieces |

They compose: an arrangement is always resolved **relative to a host placement**. Moving a
projection wall moves everything on it; nothing needs re-arranging.

Collision is deliberately out of scope for arrangement. Slots are content *within* a display's
own volume, which is why the display component's placement contract already uses
`parent-contained` semantics for its piece carriers.

---

## 13. How arrangement works with `optionRef`

`SpatialPlacement.optionRef` already exists and points at a `PresenceOptionAlias`. Arrangement
slots in beside it:

- An **option** may declare a `defaultArrangement`, so choosing "Archive Wall" yields a
  sensible grid without further configuration.
- The **owner may override** the arrangement without changing the option. Same wall, different
  layout.
- A **future-primitive option** (`presence.display.orbital-carousel@future`) may declare its
  intended arrangement kind before any geometry exists. The option resolver already refuses to
  place anything not `available-now-*`, so declaring intent stays honest.
- Options remain the stable product contract. **Arrangement kinds are internal vocabulary and
  should not leak into operator-facing names.**

Suggested option-side addition (illustrative only):

```ts
interface PresenceOptionAlias {
  // ...existing fields unchanged...
  defaultArrangement?: SpatialArrangementSpec;
  supportedArrangements?: readonly SpatialArrangementKind[];
}
```

---

## 14. Two gaps this contract exposes

Both are real today and worth naming before implementation.

**1. `SpatialMediaRef.kind` has no audio or video.** It is
`"image" | "poster" | "logo" | "placeholder"`. Meanwhile `PieceType` includes `audio` and
`video`, and `presence.listening-station` exists as a component. A listening station cannot
currently bind the audio it exists to play.

**2. Runtime `SpatialActionRef` kinds do not cover the strategic `ActionType` set.** Runtime
offers `inspect`, `navigate-state`, `sequence-previous`, `sequence-next`,
`disabled-placeholder`. Strategic `ActionType` includes `listen`, `watch`, `open-link`,
`enquire` and others. Binding needs a defined mapping, or actions will be silently dropped.

Neither needs solving inside the arrangement contract, but both block the content binding
contract. See the binding document.

---

## 15. Implementation notes

- `arrange()` must be **pure and deterministic**: same inputs, same outputs, no clock, no
  `Math.random` without a `seed`. The compiler is fingerprinted and a non-deterministic
  arrangement would break cache identity.
- It should live beside the compiler and run **before** render-plan assembly, so both the
  renderer and the semantic fallback consume one result.
- Validation should reject an unknown `kind`, params that fail the kind's schema, an entry
  whose `pieceRef` does not resolve, a missing `label`, and a `truncate` policy that would make
  content unreachable.
- Start with `grid`, `row` and `wall-grid`. They cover most real use, they are easy to verify,
  and they retrofit the existing fixed-anchor displays without new geometry.
