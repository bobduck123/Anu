# Impossible display roadmap

Date: 2026-08-17
Scope: Sequencing for spatial display primitives that have no physical analogue
Status: **Roadmap proposal only.** No code was written. Nothing here admits any component or option, and no claim is made about production readiness, public launch, client self-serve, Mobstar creative acceptance, commerce, multiplayer or publishing.

---

## Why these matter

Everything Presence currently offers could be a photograph of a real room. That makes Presence
*credible*. It does not make it *necessary*.

Impossible displays are the argument for why an artist, label, gallery, DJ, community
organisation or archive would choose a Presence over a well-made website with images on it.
They are also the clearest expression of "spatial publishing" rather than "3D rooms": 2D work
becoming natively spatial rather than being hung on a simulated wall.

They should not, however, be built one at a time with bespoke placement maths. That is the
mistake the arrangement contract exists to prevent.

---

## Current state

### Spherical Gallery — implemented, fixed capacity

`presence.spherical-gallery@1.0.0` is registered today:

- Primitive `spherical-gallery`, category `projection`, 4.8 m cube bounds.
- **12 hard-coded anchors** generated in `registry.ts` — twelve fixed angles across three
  fixed height bands (`y = 0.95 / 0 / -0.95`), each `capacity: 1`.
- `performanceTier: "hero"`, `mobileFallback: "semantic-only"` with the note that fallback is
  an ordered gallery/card list with the same media and actions.
- Exposed as `presence.display.spherical-gallery` under category `future-displays`.

**Honest read:** this is a well-formed placeholder that proves the primitive can exist, render
and declare a fallback. It is not yet a working display, because content cannot drive it. An
owner with 40 works loses 28; an owner with 3 gets a sparse ball. The distribution is also
banded rather than even, which will read as three stacked rings rather than a sphere.

It is the perfect **first retrofit target** for the arrangement contract: replace the fixed
anchor loop with `kind: "spherical"`, an even distribution, and an overflow policy. That
retrofit validates the contract against something already shipped.

### Orbital Carousel — correctly deferred

`presence.display.orbital-carousel@future` — `future-primitive`, `placementType: "none"`, no
component ref, resolver refuses to place it. This is honest and should stay.

**Why it should remain deferred until the arrangement contract exists:** an orbital carousel is
almost entirely arrangement. Its geometry is trivial — pieces on rings — and essentially all of
its behaviour is ordering, radius/angle distribution, focus position, overflow and motion. Built
before the contract, it would hard-code every one of those decisions in registry anchors,
exactly as the spherical gallery did, and then have to be unpicked. Built after, it is close to
a params-only addition.

It also carries the platform's first hard reduced-motion obligation: a carousel that does not
rotate must still be a usable, ordered display.

---

## Why Constellation Archive is probably the best next primitive

Assessed against five criteria:

| Criterion | Constellation | Orbital | Timeline | Projection Void |
|---|---|---|---|---|
| Audience breadth | archives, artists with deep catalogues, researchers, community memory, galleries | fashion, product, events | archives, retrospectives, orgs | film, video, DJs, performers |
| Reuses existing parts | `piece-plane` carrier, existing materials | `piece-plane` | `piece-plane` | projection wall + a dark lighting profile |
| New systems required | a relationship source | motion + reduced-motion story | a typed date field | a dark lighting profile |
| Degrades to a list | naturally — grouped by cluster | yes, but ring position may carry meaning | **excellently** — chronological list is genuinely useful | yes |
| Risk of overclaiming | low | medium (motion can imply interactivity that is not there) | low | medium (a void can read as "broken/empty") |

**Constellation Archive wins on breadth and on fallback quality.** It serves the audiences
currently least served by Presence, it needs no new material system, no motion story and no
lighting work, and its fallback — a grouped, related list — is genuinely valuable rather than a
consolation prize.

**Its one real prerequisite** is a relationship source: what decides which pieces sit near each
other. Without it, "constellation" is scatter with extra steps. Options, cheapest first:

1. **Explicit tags or collection membership** on the Piece. Cheapest, most predictable,
   owner-controllable. Recommended starting point.
2. **Shared metadata** (date range, medium, contributor). Automatic, occasionally surprising.
3. **Owner-authored links** between pieces. Most expressive, most authoring effort.

Recommendation: ship with (1), and make the clustering rule visible to the owner so the layout
is explicable rather than magical.

---

## What each remaining primitive needs

### Timeline Spiral

**Needs a typed date per entry.** `Piece.createdAt` exists but is a *record* timestamp — when
the row was made, not when the work was made. A 1974 photograph catalogued last week would
place at 2026. `Piece.metadata` is `Record<string, string | number | boolean | null>` so a date
can live there, but it is untyped and unvalidated.

Also needs: a time-axis scale policy (linear time, or even spacing regardless of gaps — a
career with a ten-year gap looks broken under linear time), and a legibility rule for dense
clusters.

**Its fallback is its strength.** A chronological list is a first-class archive view, so
Timeline Spiral is unusually safe to build — but only after the date field exists.

### Projection Void

Bounded emissive media in near-black space with no visible room. Needs:

- **A dark/blackout lighting profile.** Only `spatial-core-neutral`, `gallery-soft` and
  `boutique-product-warm` exist. Under any of them a void reads as a grey room.
- A spatial-orientation cue, so the visitor is not lost in the dark.
- An empty-state that reads as intentional rather than failed.

Mostly a lighting and material problem rather than an arrangement one, which makes it a good
low-risk P2: it reuses `projection` arrangement directly.

### Sound-reactive display

**Recommend deferring indefinitely, and being explicit about why.** It cannot satisfy the
accessibility and fallback rules as currently framed:

- Audio requires a user gesture to start, so its default state is silent and inert.
- Its meaning is carried entirely by motion, which reduced-motion users must be able to opt out
  of — leaving nothing behind.
- It cannot degrade to an ordered list without losing the entire premise.

A **listening station with visualisation as decoration** is achievable and honest. A display
whose *content* is the reaction to sound is not, under these rules. Worth revisiting only if
the accessibility story changes.

---

## Recommended order

The suggested ordering in the brief was P0 contracts, P1 constellation, P1 orbital, P2
timeline, P2 projection void, P2 sound-reactive. **I largely agree, with three adjustments.**

| Priority | Work | Change from suggested | Why |
|---|---|---|---|
| **P0** | Display arrangement contract | as suggested | Everything else depends on it |
| **P0** | Owner content binding contract | as suggested | Displays without content bindings are empty |
| **P0.5** | **Retrofit Spherical Gallery onto the contract** | **added** | Validates both contracts against something already shipped, before new primitives are built on them. Cheap and de-risking. |
| **P1** | Constellation Archive | as suggested | Widest audience, best fallback, fewest new systems |
| **P1** | Orbital Carousel | as suggested | Near params-only once the contract exists; forces the reduced-motion story early, which is good |
| **P2** | Projection Void | moved earlier in P2 | Blocked only on a lighting profile — smallest remaining dependency |
| **P2** | Timeline Spiral | as suggested | Blocked on a typed date field, which is a model change |
| **Deferred** | Sound-reactive display | **moved out of P2** | Cannot meet the fallback/accessibility rules; see above |

The one substantive addition is **P0.5**. Retrofitting the spherical gallery is the difference
between a contract that is believed to work and one that is known to. It also immediately fixes
a real defect — silent content loss past twelve pieces.

The one substantive removal is sound-reactive. Keeping it on a roadmap it cannot reach is a
promise that will not be kept.

---

## What each primitive proves, and what it must not claim

| Primitive | Proves | Must not claim |
|---|---|---|
| **Spherical Gallery** (retrofit) | Arrangement can drive a shipped primitive; capacity follows content | Not admitted; not art-directed; twelve-cell version is a placeholder |
| **Constellation Archive** | Relationship can be expressed spatially and still degrade to text | Not a search system, not a knowledge graph, not a research tool |
| **Orbital Carousel** | Motion-bearing displays can meet reduced-motion rules | Not a product carousel with commerce; no purchase path exists |
| **Projection Void** | Presence can hold a non-room space that still feels intentional | Not a venue, not a streaming or broadcast surface |
| **Timeline Spiral** | Time can be a spatial axis with a first-class list fallback | Not a verified historical record; dates are owner-supplied |
| **Sound-reactive** | — | Should not be promised at all until accessibility is solved |

Across all of them: none is admitted, none is production-ready, none implies client self-serve,
none carries commerce or multiplayer, and none is evidence of public launch readiness. The
existing option layer already encodes this correctly — `admissionStatus: "not-admitted"`, and a
resolver that refuses to place anything not `available-now-*`. **Those guards should hold
through every step of this roadmap.**

---

## Honest limitations

- The candidate asset library cannot help here. It contains no primitive suited to any of these
  displays; every one is procedural work.
- Impossible displays are the hardest things in Presence to art-direct, because there is no
  photograph to compare against. Expect more design iteration than the room kits needed.
- Each one increases the surface area of the accessibility story. The fallback rules document
  should be treated as a gate, not a checklist item.
- Performance is unmeasured. `presence.spherical-gallery` is tagged `performanceTier: "hero"`,
  and no budget work has been done for a constellation holding hundreds of pieces. A capacity
  guard should land with the first real content binding, not after.
