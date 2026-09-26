# Display fallback and accessibility rules

Date: 2026-08-17
Scope: Rules that prevent spatial displays — especially impossible ones — from losing content
Status: **Specification only.** No code was written. Nothing here admits any component or option, and no claim is made about production readiness, public launch, client self-serve, Mobstar creative acceptance, commerce, multiplayer or publishing.

---

## The governing rule

> **Content that exists must always be reachable. A display may lose its shape, its motion, its materials and its third dimension. It must never lose a piece, a label, or an action.**

Everything below follows from that. Treat this document as a **gate** on new display
primitives, not a checklist to complete afterwards.

A useful test for any new primitive: *if the 3D never loads at all, does the owner still have a
publication?* If the answer is no, the primitive is not ready.

---

## 1. Semantic fallback rows and cards

The existing `SpatialSemanticItem` is the contract:

```ts
interface SpatialSemanticItem {
  placementId: string;
  label: string;
  description?: string;
  actionRefs: readonly string[];
}
```

Rules:

1. **Every visible bound entry produces exactly one semantic item.** Not fewer.
2. **Order matches `semanticIndex`** from the arrangement result, exactly. The list and the
   3D layout must never disagree about sequence.
3. **`label` is required** — it comes from the binding entry, where it is also required.
4. **`description` carries the caption**, and any meaning that was encoded spatially.
5. **`actionRefs` carry through unchanged.** Actions are never dropped in fallback.
6. **Overflowed entries still appear**, annotated with their page or sequence position.

Point 4 is the one most easily missed. If a constellation places related works near each other,
the fallback must *say* they are related — "Cluster: early works (4 items)". If an orbit encodes
recency, the fallback must state the ordering. Spatial meaning that exists only as position is
inaccessible meaning.

A room already has `SpatialFallbackPresentation` (eyebrow, title, summary, accent and background
colours, optional hero/brand media). Fallback should look like an intentional publication, not
an error page.

---

## 2. Keyboard navigation

- Every interactive entry is reachable by keyboard, in `semanticIndex` order.
- Tab moves between entries; Enter/Space activates the primary action.
- Arrow keys may move within an arrangement where that is natural (a grid), but must never be
  the *only* way to reach something.
- Overflow pages are reachable: paginated arrangements need keyboard-accessible page controls;
  `sequence` arrangements need the existing `sequence-previous` / `sequence-next` actions.
- **No keyboard trap.** Entering an inspect state must always offer a way back — the
  `inspect` focus policy already carries `returnToState`.
- Focus order must not be affected by 3D depth, camera position or draw order.

---

## 3. Reduced motion

`SpatialSceneState.reducedMotionStateId` already exists. Motion-bearing arrangements must use it.

| Motion | Reduced-motion equivalent |
|---|---|
| Orbiting/rotating arrangement | Static ring at a defined angle; same order, same reachability |
| Camera fly-through between focus states | Instant cut |
| Parallax, drift, float | None |
| Auto-advancing sequence | Manual advance only |
| Inspection displacement/zoom | Instant state change, no interpolation |

Rules:

- Reduced motion must **never** reduce content. A still orbit shows the same pieces.
- No arrangement may depend on motion to be legible. If a carousel only makes sense rotating,
  it is not admissible.
- Auto-advance is prohibited under reduced motion; the visitor drives.
- Respect the OS-level preference; do not require an in-app toggle to find.

---

## 4. Mobile constraints

- **Fidelity may drop; content may not.** `mobileFallback.strategy: "semantic-only"` — already
  declared on `presence.spherical-gallery` — is an acceptable outcome. Silently showing fewer
  pieces is not.
- Touch targets must remain usable. When `fit` overflow would shrink slots below the
  arrangement's `minSlotSizeMetres`, paginate instead of producing unhittable targets.
- Assume a single-finger tap. No multi-touch gesture may be the only route to an action.
- Assume constrained memory and bandwidth: prefer thumbnails, defer full media until requested,
  and honour the existing eager/lazy asset split.
- Do not assume the visitor can walk the space. Some viewports get one vantage point.

---

## 5. No-WebGL path

When WebGL is unavailable, blocked or fails to initialise:

- Render the semantic fallback immediately — **do not** wait on a timeout or show an error first.
- Present it as the publication it is, using `SpatialFallbackPresentation`.
- Preserve full ordering, labels, captions and actions.
- Never show a raw technical error to a visitor.
- The owner's content must be fully readable and actionable in this path.

This path is also what search engines and link previews will see, so it should be good on its
own merits rather than treated as degradation.

---

## 6. Missing media path

Media may be absent, unresolved, expired or still loading.

| Situation | Behaviour |
|---|---|
| Media still loading | Reserve the slot's space; show a neutral placeholder. **Never reflow the arrangement.** |
| Media missing/unresolved | Keep the slot, show the label and caption as text, keep actions live |
| Alt text present, image absent | Show alt text as visible content |
| No alt text and no media | Show the label; log an authoring warning |
| Signed/expiring URL failed | Treat as missing; never surface the URL or the error |

The arrangement must be computed from **entry count**, not from how many media resolved. A
display whose layout changes as images arrive is disorienting, and a display that omits failed
entries silently loses content.

---

## 7. Failed GLB / Draco path

`SpatialRenderGeometry` already carries the right escape hatch:

```ts
{ kind: "glb"; url; compression: "none" | "draco"; decoderPath?; fallbackPrimitive: SpatialPrimitiveKind; runtimeSizeKb; decoderSizeKb? }
```

Rules:

- **`fallbackPrimitive` is mandatory and must be used.** If the GLB fails, the Draco decoder
  fails to load, or the fetch times out, render the procedural primitive.
- Procedural/proxy geometry remains the authoring and fallback source of truth; the GLB is a
  visual upgrade, never a dependency.
- A failed visual asset must not block arrangement, content binding, actions or fallback.
- Never block first paint on a lazy GLB.
- Failures are logged for operators, never surfaced to visitors.

The practical consequence: **every display must be usable with zero downloaded model assets.**

---

## 8. Audio unavailable path

Audio is the least reliable medium on the web and needs explicit handling.

- **Autoplay with sound is prohibited.** Playback starts only from a user gesture.
- A listening station must be fully legible in silence: title, duration, track list, artwork.
- If audio fails to load, keep the entry, its metadata and any transcript link; disable the
  play control with an honest reason — the existing `disabled-placeholder` action kind is the
  right mechanism.
- **Provide a transcript reference where one exists.** For spoken-word, oral history and
  community archives this is the primary accessible representation, not a nicety.
- Never make audio the only carrier of meaning.
- Visualisation that reacts to audio is decoration and must be absent-safe.

---

## 9. Action and link preservation

- Actions survive every fallback path. This is the rule most likely to be broken by a
  performance shortcut, and the most damaging when it is.
- An action with no working target renders as `disabled-placeholder` **with a stated reason** —
  never as a dead control and never silently hidden.
- Commerce-shaped actions (`buy`, `donate`) and intake-shaped actions (`enquire`, `book`,
  `RSVP`) render as disabled placeholders until a real path exists. No commerce assumption is
  introduced by showing them.
- External links state their destination and open predictably.
- Actions are keyboard-activatable everywhere they appear.

---

## 10. Captions, labels and focus state

**Labels**
- Every entry has a required `label`, used as its accessible name in both 3D and fallback.
- Labels are content, not decoration — they must not be baked into geometry or textures.
- Room and section labels use the existing `text-sign-card` rather than painted text.

**Captions**
- Optional, and rendered as `description` in fallback.
- Video entries should carry a captions track reference; missing captions raise an authoring
  warning.

**Focus**
- Exactly one entry may hold focus.
- Focus is visible in both 3D and fallback, and not by colour alone.
- Focus is announced with the entry's label and its position ("3 of 24").
- Focus is derived state and is never written into a saved layout.
- Losing focus must never lose scroll or sequence position.

---

## 11. Ordered collection fallback

For `collection` and `gallery` pieces bound into a display:

- Nesting is capped at one level. Deeper structures flatten, with the parent stated in the
  child's description.
- A collection's own label and count appear before its members.
- Member order follows the collection's order, then the arrangement's ordering rule.
- A collection whose members fail to resolve still shows its label and count.
- A collection is never silently expanded past `maxRecommendedEntries`; it paginates.

---

## 12. Acceptance gate for any new display primitive

A primitive should not be considered ready until all of these hold:

1. Produces a complete, correctly ordered `SpatialSemanticItem[]`.
2. Every entry is keyboard reachable and activatable.
3. Declares a reduced-motion strategy that preserves all content.
4. Declares a mobile strategy that preserves all content.
5. Renders usefully with **zero** downloaded model assets.
6. Renders usefully with **zero** resolved media.
7. Preserves every action in every path.
8. States any spatially-encoded meaning in text.
9. Declares an overflow policy; content is never silently dropped.
10. Renders an intentional empty state for zero entries.

Items 5, 6 and 9 are the ones current primitives are most at risk on: the spherical gallery's
twelve fixed cells fail item 9 today, which is why the arrangement retrofit is sequenced first
in the roadmap.
