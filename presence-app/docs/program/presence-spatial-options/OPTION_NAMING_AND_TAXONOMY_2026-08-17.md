# Presence option naming and taxonomy

Date: 2026-08-17
Scope: A naming system for Presence spatial options, specified tightly enough to implement against
Status: **Proposal only.** Defines naming and status vocabulary. Grants no admission, clearance or approval to anything.

## Why this exists

Three id conventions are currently live in the codebase and they do not agree:

| Convention | Example | Where |
|---|---|---|
| Admitted procedural component | `presence.room-shell@1.0.0` | `lib/presence/spatial/registry.ts` |
| Extracted candidate | `candidate.table.old-church-modeling-interior-sce-ffd7-017@0.1.0` | candidate registry |
| Room-kit candidate | `candidate.roomkit.warehouse-17b3@0.1.0` | candidate registry |

Candidate ids are machine-generated and unreadable by design — they encode source and a hash so
they stay stable when new files are ingested. That is correct for the ingestion pipeline and
wrong for a product palette. **An owner should never see `candidate.chair.interior-7-3bc1-013`.**

This document defines the product-facing layer that sits above both.

## The eight option kinds

| Kind | What it is | Id namespace | Placement |
|---|---|---|---|
| **Room Kit** | A whole enterable space: shell, floor, walls, lighting and material defaults | `presence.roomkit.*` | n/a — a Room *is* the kit |
| **Object** | A physical-inspired thing placed in a room: furniture, fixtures, structure | `presence.object.*` | floor, wall, surface |
| **Surface** | An object whose purpose is to *carry* other things; exposes anchors | `presence.surface.*` | floor, wall |
| **Display Primitive** | A spatial arrangement rule for many Pieces at once | `presence.display.*` | free, anchored |
| **Media Surface** | A single carrier for one assigned media ref | `presence.media.*` | wall, surface, rack |
| **Material Preset** | A named PBR treatment bound to one material slot | `presence.material.*` | n/a |
| **Skin** | A named bundle of material presets, colours and decals | `presence.skin.*` | n/a |
| **Action** | A visitor-facing intent attached to a Piece | `presence.action.*` | n/a |

**Impossible Displays** are not a ninth kind. They are Display Primitives whose arrangement rule
has no physical analogue. Keeping them in `presence.display.*` is deliberate: it means an owner
swapping a Grid Wall for a Constellation Archive is changing one option value, not migrating
between systems.

## Id grammar

```
presence.<kind>.<slug>@<version>
```

- `presence.` — reserved for platform-owned options. Never used for client-specific content.
- `<kind>` — one of `roomkit`, `object`, `surface`, `display`, `media`, `material`, `skin`, `action`.
- `<slug>` — lowercase kebab-case, 2–4 words, describing *what it is*, never who it is for.
- `@<version>` — see below.

Ids must satisfy the existing `ID_PATTERN` (`^[a-z0-9][a-z0-9._:-]{0,119}$`), which this grammar does.

### Versioning

Two version tracks already exist and must be kept apart:

| Track | Pattern | Meaning |
|---|---|---|
| Admitted | `1.0.0`, `2.1.0` | Satisfies `VERSION_PATTERN` (`^[1-9]…`). A real registry component. |
| Candidate | `0.1.0` | **Deliberately fails** `VERSION_PATTERN`. Cannot be admitted by accident. |
| Future | `@future` | A named intent with no implementation. Never resolvable at runtime. |

This is an existing safety property, not a new invention: the ingestion pipeline stamps `0.1.0`
precisely so a candidate cannot be dropped into the admitted registry. Preserve it.

### Naming rules for the public-facing name

1. **Describe the thing, not the client.** "Dark Boutique Shell", never "Mobstar Room".
2. **Two to four words.** It has to fit in a palette tile.
3. **Plain English over jargon.** "Projection Wall", not "Emissive Media Field".
4. **No superlatives, no marketing.** "Display Island", not "Premium Hero Island".
5. **Name the spatial idea, not the source.** The brutalist kit becomes "Ribbed Concrete Room",
   not "Brutalist VR Room Baked".
6. **Avoid material words in the name when the material is swappable.** "Gallery Wall" takes any
   wall preset; calling it "White Wall" would lie the moment someone re-skins it. Where a
   material *is* the identity — "Stone Display Island" — naming it is correct.

## Status vocabulary

Two separate axes, frequently conflated. Keep them apart.

### Admission status — *may this be used, and where?*

```
candidate-review-required          pipeline output; unreviewed
candidate-cleared-for-internal-use single-context review passed; internal only
admitted-presence-component        second-context review passed; real library component
```

Currently: 126 registry entries are `candidate-review-required`, 6 are cleared for internal use,
**0 are admitted**. Nothing in this taxonomy changes that.

### Availability status — *does it exist yet?*

```
available-now-procedural   registered component, zero asset payload
available-now-candidate    reviewed candidate export, internal use only
needs-implementation       composable from existing parts, not yet a named option
needs-art-pass             exists, visual quality not sufficient
needs-scale-review         exists, absolute scale unconfirmed
future-primitive           named intent only
```

An option is offerable to an owner only when admission is at least
`candidate-cleared-for-internal-use` **and** availability is `available-now-*`.

## Worked examples

| Public-facing name | Internal id | Kind | Status |
|---|---|---|---|
| White Cube Gallery | `presence.roomkit.white-cube@future` | Room Kit | needs-implementation |
| Dark Boutique Shell | `presence.roomkit.dark-boutique@1.0.0` | Room Kit | available-now-procedural |
| Ribbed Concrete Room | `presence.roomkit.ribbed-concrete@0.1.0` | Room Kit | available-now-candidate |
| Ribbed Showroom Wall | `presence.object.ribbed-wall@1.0.0` | Object | available-now-procedural |
| Soft Divider Drape | `presence.object.drape-divider@1.0.0` | Object | available-now-procedural |
| Display Island | `presence.surface.display-island@1.0.0` | Surface | available-now-procedural |
| Stone Display Island | `presence.surface.stone-island@0.1.0` | Surface | available-now-candidate |
| Product Plinth | `presence.surface.product-plinth@1.0.0` | Surface | available-now-procedural |
| Suspended Rack | `presence.surface.suspended-rack@1.0.0` | Surface | available-now-procedural |
| Projection Wall | `presence.media.projection-wall@1.0.0` | Media Surface | available-now-procedural |
| Framed Media Surface | `presence.media.framed-media@1.0.0` | Media Surface | available-now-procedural |
| Text / Sign Card | `presence.media.sign-card@1.0.0` | Media Surface | available-now-procedural |
| Grid Wall | `presence.display.grid-wall@1.0.0` | Display Primitive | available-now-procedural |
| Spherical Gallery | `presence.display.spherical-gallery@future` | Display Primitive | future-primitive |
| Orbital Carousel | `presence.display.orbital-carousel@future` | Display Primitive | future-primitive |
| Constellation Archive | `presence.display.constellation-archive@future` | Display Primitive | future-primitive |
| Timeline Spiral | `presence.display.timeline-spiral@future` | Display Primitive | future-primitive |
| Nocturnal Black Gallery | `presence.skin.nocturnal-black-gallery@1.0.0` | Skin | available-now-procedural |
| Warm Nocturnal Boutique | `presence.skin.warm-nocturnal-boutique@1.0.0` | Skin | available-now-procedural |
| Polished Charcoal Floor | `presence.material.floor-polished-charcoal@1.0.0` | Material Preset | available-now-procedural |
| Enquire | `presence.action.enquire@1.0.0` | Action | available-now-procedural |
| Listen | `presence.action.listen@1.0.0` | Action | available-now-procedural |

## The candidate → option mapping problem

A product option must be **stable** across re-ingestion. Candidate ids are stable per source
file, but a re-ingest with different settings can change which objects clear the export cap.

**Recommendation:** never expose a candidate id as an option id. Introduce a thin alias:

```
presence.surface.stone-island@0.1.0
  └── backing: candidate.table.old-church-modeling-interior-sce-ffd7-017@0.1.0
```

The option id is the product contract and never moves. The backing ref may be repointed —
to a different candidate, or eventually to a procedural implementation — without any layout,
saved room or owner-facing name changing. This also means an option can graduate from
`available-now-candidate` to `available-now-procedural` invisibly, which is the desired
end state for most of them.

## Layout contract, unchanged

Naming does not alter how a room stores an option. Layouts reference; they never inline geometry:

```json
{
  "componentId": "presence.surface.display-island",
  "version": "1.0.0",
  "transform": { "position": [1.2, 0, -0.4], "rotation": [0, 1.57, 0], "scale": [1, 1, 1] },
  "materialSlotOverrides": { "tabletop": "tabletop-pale-sculptural" },
  "skinRefs": [], "mediaRefs": [], "actionRefs": []
}
```

Client identity arrives through `materialSlotOverrides`, `skinRefs`, `mediaRefs` and
`actionRefs` on the nine shared material slots — `wall`, `floor`, `tabletop`, `rack-metal`,
`fabric`, `paper`, `projection`, `poster-decal`, `logo-accent`. **No option ever produces a
per-client GLB.**

## Implementation notes for a later session

1. The alias layer is the only new data structure required — a map from option id to backing
   component/room-kit ref plus public name, category, status and description.
2. Room Kits need a real container type. Today a "room kit" is either a candidate GLB or an
   implicit shell-plus-materials composition; options 1, 3, 4, 7, 8 and 9 in the first-options
   doc are all "shell + material style + lighting profile" triples with no home.
3. Display Primitives need an arrangement-rule contract (input: N Pieces; output: N transforms)
   before any impossible display can be built. That contract is the real unlock, and it is
   worth designing once rather than per-primitive.
4. Every option needs a declared fallback for mobile, reduced motion and no-WebGL. The existing
   semantic fallback already covers component placements; Display Primitives will need their own
   ordering rule so a Constellation Archive degrades to a sensible list rather than a random one.
