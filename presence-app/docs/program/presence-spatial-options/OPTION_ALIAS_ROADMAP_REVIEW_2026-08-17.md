# Option alias roadmap review — operator language and first real options

Date: 2026-08-17
Scope: Review of the implemented option alias layer against operator/client language, and a recommendation on which deferred options to build first
Status: **Docs-only review.** Nothing here admits any option or component. No claim is made about public launch, self-serve, Mobstar acceptance, commerce, multiplayer or production readiness. No code, generated JSON or runtime asset was modified.

Reviewed against the implementation as it stands in `lib/presence/spatial/optionAliases.ts`,
`candidateOptions.ts` and `registry.ts`, not against any earlier proposal.

---

## 1. Executive verdict

**The alias layer is well built and under-populated. The most valuable next work is not building new options — it is exposing the ones that already exist.**

Three findings drive everything below, and all three are verifiable from the source:

1. **8 of 22 registered components have no operator-facing option alias.** Among them are
   `presence.garment-hanger` — the per-item carrier a fashion label needs — and
   `presence.piece-plane`, which is *how an owner's actual content enters a room at all*.
   These are built, tested, procedural and invisible to an operator.
2. **4 of the 5 candidates already cleared for internal use have no alias.** Only the stone
   plinth is exposed. The drape, the product risers, the light stand and the armchair are
   reviewed, cleared and unreachable.
3. **Coverage is concentrated on two audiences.** Of the eight target audiences, galleries and
   fashion labels are well served. DJs, performers, community organisations, archives and
   studios have **no room kit and almost no objects**. Two of the three room kits are
   gallery/boutique; the third is a deferred candidate.

The naming is mostly serviceable but leans retail and leans system-vocabulary. Roughly a third
of the names would not survive contact with a community-org operator or a musician.

There is also one real structural inconsistency worth fixing before the palette grows: the
`optionId` namespace and the `kind` field disagree with each other in several places, and the
palette grouping function exposes internal provenance ("Candidate Finds") as a user-facing
category.

**Recommended posture:** spend the next round on exposure and breadth, not on new geometry.
The cheapest credibility gain available is roughly a dozen alias entries over components that
already work.

---

## 2. Operator-language naming fixes

The test applied: *would a musician, a community arts coordinator or a small label understand
this name without being told what it does?*

### Names that are too technical or system-facing

| Current | Problem | Suggested |
|---|---|---|
| `Text / Sign Card` | A slash in a product name is a UI smell. "Sign card" is not language anyone uses. | **Wall Label** (or "Room Sign") |
| `Framed Media Surface` | "Media Surface" is system vocabulary borrowed from the model layer. | **Framed Work** |
| `Soft Divider Drape` | Two jargon words. Operators say "curtain". | **Curtain** |
| `Light Fixture` | Generic; describes a category, not a thing. | **Floor Spotlight** |
| `Dark Boutique Shell` | "Shell" is architectural/internal. Operators choose rooms, not shells. | **Dark Boutique** |
| `Product Block` | Reads as a system primitive, and duplicates "Product Plinth" (below). | **Riser Block** |

### Names that are too retail- or Mobstar-specific

Presence is not a retail platform. These names quietly tell a gallery or an archive that the
option is not for them.

| Current | Problem | Suggested |
|---|---|---|
| `Product Plinth` | A gallery shows *works*, an archive shows *items*, a DJ shows *records*. "Product" excludes all three. | **Plinth** |
| `Product Block` | Same. | **Riser Block** |
| `Ribbed Showroom Wall` | "Showroom" is retail. The same geometry is a strong gallery and performance wall. | **Ribbed Wall** |
| `Suspended Rack` | Fine for fashion; opaque elsewhere. Acceptable to keep — racks genuinely are a fashion fixture — but the description must not assume garments. | Keep, broaden description |

### Names that are fine

`Projection Wall`, `Gallery Wall`, `Display Island`, `Listening Station`, `Archive Wall`,
`Ribbed Concrete Room`, `Spherical Gallery`, `Orbital Carousel`. These are concrete and
readable.

`White Cube Gallery` is art-world insider language, but it is *the* term for the thing and
galleries will search for it. Keep it, and carry a plain description ("plain white gallery
room with even light").

### The naming collision that matters most

Four options currently compete in the same conceptual space with names that do not
differentiate them:

```
Display Island    (presence.rounded-island)
Product Plinth    (presence.display-plinth)
Product Block     (presence.product-display-block)
Stone Display Island (candidate stone plinth)
```

An operator cannot tell from these names which to pick, and "Display Island" versus "Stone
Display Island" reads as two grades of the same product rather than two different shapes.
Suggested split by *what it is for*, not by geometry:

| Suggested name | Backing | Intent |
|---|---|---|
| **Display Island** | `presence.rounded-island` | Large central island, several items |
| **Plinth** | `presence.display-plinth` | One item, elevated |
| **Riser Block** | `presence.product-display-block` | Small, groupable, scatterable |
| **Stone Plinth** | candidate stone plinth | The heavier sculptural variant |

### Room kit naming consistency

The three kits use three different patterns: `<X> Shell`, `<X> Gallery`, `<X> Room`. Pick one.
Recommendation: no suffix where the name already reads as a place (**Dark Boutique**,
**White Cube Gallery**, **Ribbed Concrete Room**).

---

## 3. Current option taxonomy review

### What exists

18 aliases and 3 room-kit containers:

| Kind | Count | Status |
|---|---|---|
| Room kits | 3 | 2 procedural, 1 needs-art-pass |
| Objects (structure, fixtures, racks, soft) | 5 | all available-now-procedural |
| Surfaces | 3 | all available-now-procedural |
| Display / media surfaces | 3 | all available-now-procedural |
| Candidate components | 1 | available-now-candidate |
| Deferred | 2 | needs-implementation |
| Future primitives | 2 | `@future` |

The status vocabulary, the `admissionStatus: "not-admitted"` invariant, the raw-model-path
guard in `validatePresenceOptionAliases()` and the refusal in `resolvePresencePlacementOption`
to place anything not `available-now-*` are all sound. **Those safety properties should not be
loosened as the palette grows.**

### Inconsistency 1 — namespace and `kind` disagree

```
presence.surface.display-island   → kind: "display-primitive"
presence.surface.product-plinth   → kind: "object"
presence.surface.product-block    → kind: "object"
```

Three options in the `surface.` namespace, two different kinds, no operator-visible
difference. Separately:

```
presence.display.projection-wall     → kind: "media-surface"
presence.media.framed-media-surface  → kind: "media-surface"
presence.media.text-sign-card        → kind: "media-surface"
```

Two namespaces (`display.`, `media.`) collapsing to one kind. The namespace split currently
carries no meaning.

**Recommendation:** make the namespace the single source of truth and derive `kind` from it, or
drop one of the two. A reasonable rule: `display.` = arrangement rules for *many* Pieces
(current and future impossible displays); `media.` = carriers for *one* assigned media ref.
Under that rule `projection-wall` is a `media.` option, not a `display.` one.

### Inconsistency 2 — the palette exposes internal provenance

`presenceOptionPaletteGroups()` returns a group labelled **"Candidate Finds"**. That is
internal pipeline language. An operator does not care that an option came from an extracted
GLB rather than procedural code; they care what it looks like and whether they can use it.
Provenance belongs in metadata and in review docs, not in a palette heading.

The same function groups by `kind`, which produces **"Display / Media Surfaces"** — a slash
heading again, and system vocabulary.

**Recommendation:** group by what an operator is trying to do:
*Rooms · Walls & Structure · Surfaces & Display · Media & Signage · Lighting · Soft
Furnishing · Coming Soon.*

### Inconsistency 3 — "Future / Deferred" conflates two different promises

The group mixes `needs-implementation` (Listening Station, Archive Wall — buildable now, just
not built) with `future-primitive` (Spherical Gallery, Orbital Carousel — no arrangement
contract exists yet). Those are very different commitments and should not sit under one label.

### Category strings are ad hoc

`structure`, `soft-architecture`, `fixtures`, `racks`, `surfaces`, `display-media`, `audio`,
`archive`, `future-displays`, `boutique`, `gallery`, `candidate-interior`. Mixed abstraction
levels, and `soft-architecture` is architect jargon. Worth normalising when the grouping is
reworked.

### Audience coverage — the real gap

| Audience | Room kit | Objects | Verdict |
|---|---|---|---|
| Galleries / curators | White Cube Gallery | wall, plinth, framed work, label | **served** |
| Visual artists | White Cube Gallery | same | **served** |
| Fashion labels | Dark Boutique | rack, island, ribbed wall | **served** (but no hanger alias) |
| DJs / musicians | none | none | **unserved** |
| Performers | none | curtain only | **unserved** |
| Community orgs | none | label only | **unserved** |
| Archives | none | Archive Wall (deferred) | **unserved** |
| Studios / makers | none | none | **unserved** |

**Five of eight audiences have no room to stand in.** This is the single largest taxonomy
problem, and it is a breadth problem rather than a naming one.

---

## 4. P0 options to implement next

P0 is defined here as: *needed before the palette can be shown to anyone who is not a gallery
or a fashion label.* Ordered by value-per-unit-effort.

### P0.1 — Expose the 8 already-built components (alias entries only)

No new geometry. These components are registered, rendered and tested today:

| Component | Suggested option name | Why P0 |
|---|---|---|
| `presence.piece-plane` | **Artwork / Piece** | This is how an owner's own content enters a room. Its absence is the most consequential gap in the palette. |
| `presence.garment-hanger` | **Garment Hanger** | The per-item carrier for the rack. Fashion is currently a rack with nothing on it. |
| `presence.display-shelf` | **Shelf** | Records, books, zines, product. Serves DJs, archives, studios, community orgs at once. |
| `presence.display-table` | **Table** | Workshop, studio, community, meeting contexts. |
| `presence.display-bay` | **Display Bay** | Grouped or serial work. |
| `presence.divider-wall` | **Room Divider** | Sub-dividing a space without a new room. |
| `presence.retail-rack` | (fold into Suspended Rack, or **Floor Rack**) | Two rack components exist; decide which is the option. |
| `presence.candidate-display-island` | (resolve against Display Island) | Duplicate naming risk. |

**Effort:** roughly a dozen `aliasComponent(...)` entries. **Impact:** the palette roughly
doubles, and three unserved audiences gain usable objects.

### P0.2 — Expose the 4 remaining cleared candidates

Already reviewed and cleared for internal use, already exported, already thumbnailed, and
currently unreachable:

| Candidate | Suggested name | Note |
|---|---|---|
| `candidate.shelf.retopo-g-555780-0ae2-013` | **Curtain** | Serves performers and studios; no scale doubt |
| `candidate.chair.interior-7-3bc1-013` | **Riser Blocks** | `needs-scale-review` must be carried on the alias |
| `candidate.chair.interior-7-3bc1-000` | **Studio Light Stand** | `needs-scale-review` |
| `candidate.decorative-prop.interior-7-3bc1-009` | **Wire Chair** | `needs-scale-review`; weakest of the four |

The alias layer already has a `needs-scale-review` status and refuses to place anything not
`available-now-*`, so the honest path is available without weakening any guard.

### P0.3 — Two more room kits: **Blackout Room** and **Studio**

Both are `shell + material style + lighting profile` triples with existing parts:

- **Blackout Room** — `presence.room-shell` + `projection-blackout` + a dark lighting profile,
  starter placements: projection wall, curtain, floor spotlight.
  Unblocks **DJs, performers and film/video artists** in one move.
- **Studio** — `presence.room-shell` + `warm-timber-studio` or `soft-paper-room` +
  `gallery-soft`, starters: table, shelf, wall label.
  Unblocks **studios, makers and community orgs**.

`projection-room` and `studio` are already valid `RoomType` values, and the material styles
already exist. The only genuinely missing piece is a darker lighting profile for the blackout
room; `gallery-soft` will read wrong there.

### P0.4 — Fix the naming collisions and the palette grouping

Section 2's renames plus the grouping rework in section 3. Cheap, and it gets harder to change
once operators have saved rooms referencing the names.

---

## 5. P1 and P2 options

### P1

| Option | Rationale | Blocked on |
|---|---|---|
| **Listening Station** | Currently `needs-implementation`. The clearest unserved audience — DJs, musicians, oral-history archives, radio and podcast makers. `listening-station` already exists as a Surface type in the model with nothing behind it. | Composite of seat + audio surface + `listen` Action; needs a composite-option pattern, which does not exist yet |
| **Archive Wall** | Currently `needs-implementation`. `archive` is a supported RoomType with `paper-archive` and `poster-archive` presets and no furniture at all. | Storage-wall geometry; could start as `display-shelf` with archive materials |
| **Archive Room kit** | Completes the archive audience. | Archive Wall first |
| **Poster Stack** | Takeable stack of flyers/zines. Strong for community orgs, gigs, DIY culture. Cheap geometry. | New primitive |
| **Notice Board** | Community orgs' single most recognisable object. | New primitive |
| **Ribbed Concrete Room** promotion | Already an alias at `needs-art-pass`. | Baked-lighting compatibility check against Presence lighting profiles |

### P2

| Option | Rationale |
|---|---|
| **Stage / Riser Platform** | Performers. Currently nothing raises a performer above a floor. |
| **Long Arcade Gallery** | The 159 KB candidate arcade kit; needs scale confirmation first |
| **Bench / Seating Row** | Galleries and performance rooms both need somewhere to sit |
| **Vitrine / Display Case** | Archives and museums; protects the "do not touch" reading |
| **Constellation Archive** | First impossible display — see section 6 |

---

## 6. Options to keep deferred

### Keep deferred, and be honest about why

| Option | Current status | Why it should stay deferred |
|---|---|---|
| **Spherical Gallery** | `future-primitive` @future | No arrangement-rule contract exists. Building one impossible display without that contract means building the contract badly, once, in the wrong place. |
| **Orbital Carousel** | `future-primitive` @future | Same. Also needs a motion/reduced-motion story that does not exist. |

Both are correctly modelled today: `implementationStrategy: "future-primitive"`,
`placementType: "none"`, no component ref, and the resolver refuses to place them. That is
honest and should not change until the contract lands.

### The prerequisite nobody has scheduled

Every impossible display needs one shared thing: **an arrangement-rule contract** — given N
Pieces and a volume, produce N transforms, plus a deterministic ordering for semantic fallback.

This is the real unlock, and it is worth designing **once** rather than per-primitive. It is
also the piece that makes Presence spatial *publishing* rather than a room simulator, so it
should not drift indefinitely. Recommendation: schedule the contract at P1 even while the
primitives themselves stay P2.

**First impossible display, when the contract exists: Constellation Archive.** It serves the
widest audience (archives, artists with deep catalogues, researchers, community memory),
reuses the existing `piece-plane` carrier, needs no new material system, and degrades naturally
to an ordered semantic list — which matters because it has to remain usable on mobile and with
a screen reader.

### Deferred candidate room kits — leave alone

Six of the eight candidate room kits have no alias, correctly. The coffee shop is over budget
and carries third-party branding; `interior-7` is building exteriors rather than a room; the
great drawing room is an unreviewable photogrammetry hull; the Venator kit is franchise IP.
None should be aliased.

---

## 7. Missing options

Beyond the unexposed components in section 4, these have no alias, no component and no entry:

| Missing | Audience | Note |
|---|---|---|
| **Stage / performance platform** | performers, musicians | Nothing elevates a performer |
| **Seating row / bench** | galleries, performance, listening | Only a wire chair candidate exists |
| **Notice board / pinboard** | community orgs | Recognisable, cheap, high value |
| **Poster stack** | community orgs, gigs | Cheap geometry |
| **Vitrine / case** | archives, museums | Signals "look, don't touch" |
| **Hanging banner / textile sign** | community, cultural orgs | Culturally important for many orgs |
| **Doorway / threshold** | all | `doorway` is a SpatialObjectType with no component; rooms currently connect abstractly |
| **Dark / blackout lighting profile** | DJs, performers, film | Only three profiles exist, none dark |
| **Audio surface** | DJs, archives | `listening-station` Surface type has nothing behind it |

**Honest note on the asset library:** none of these can be filled from the extracted candidate
library. It contains no stage, no bench, no vitrine, no board, no banner and no audio
furniture — the ingested sources were a church, a coffee shop, two living rooms, a spaceship
and two baked VR rooms. Every item above needs procedural implementation or new authored work.
That is a statement about the source collection, not a criticism of the ingestion pipeline.

---

## 8. Recommended Codex implementation order

Ordered so each step is independently shippable and none blocks on a decision that has not been made.

| # | Work | Type | Effort | Unblocks |
|---|---|---|---|---|
| 1 | Alias the 8 unexposed registered components | alias entries only | S | Fashion (hanger), all owners (Piece), DJs/archives/studios (shelf, table) |
| 2 | Alias the 4 remaining cleared candidates, carrying `needs-scale-review` | alias entries only | S | Performers (curtain), display variety |
| 3 | Apply the section 2 renames and de-duplicate the four surface names | rename | S | Operator comprehension; cheapest now, costly later |
| 4 | Rework `presenceOptionPaletteGroups()` to operator-facing groups; remove "Candidate Finds" | small refactor | S | Palette legibility |
| 5 | Reconcile `optionId` namespace with `kind`; pick one rule for `display.` vs `media.` | small refactor | S | Prevents taxonomy drift as the palette grows |
| 6 | Add a dark/blackout lighting profile | new profile | S | Prerequisite for step 7 |
| 7 | **Blackout Room** and **Studio** room kits | 2 kit containers | M | DJs, performers, film, studios, community orgs |
| 8 | Archive Wall (shelf + archive materials), then Archive Room kit | component + kit | M | Archives |
| 9 | Composite-option pattern, then Listening Station | new pattern + option | M | Musicians, oral history, radio/podcast |
| 10 | Poster Stack, Notice Board, Bench, Stage | 4 components | M | Community orgs, performers |
| 11 | **Arrangement-rule contract** for display primitives | new contract | L | Every impossible display |
| 12 | Constellation Archive as the first impossible display | future primitive | M | The platform's differentiator |

Steps 1–5 are all small, involve no new geometry, and together roughly double the palette while
making it legible. **They are the highest-value work available and should go first.**

### Guards to preserve throughout

- `admissionStatus: "not-admitted"` on every option; nothing here proposes admitting anything.
- `resolvePresencePlacementOption` must keep refusing anything not `available-now-*`.
- The raw-model-path guard in `validatePresenceOptionAliases()` must keep rejecting
  `.glb`/`.gltf`/`.blend` in option source refs.
- Candidate-backed options keep `available-now-candidate`, their warning flags and their
  scale-review status; exposure is not clearance.
- Option ids are the stable product contract. Once an operator can save a room against
  `presence.object.gallery-wall`, that id must not move — which is exactly why the renames in
  step 3 should happen before, not after.
