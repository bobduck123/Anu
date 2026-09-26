# The first Presence spatial options

Date: 2026-08-17
Scope: A proposed first authoring palette of 34 options
Status: **Proposal only.** Nothing here is admitted, licence-cleared, production-ready, self-serve, publish-ready or accepted for any client. "Available now" means *the component exists in the internal spatial registry today*, not that it is shipped or approved.

## How to read this

Each option maps to one of:

- **`available-now-procedural`** — a component ref already registered in `lib/presence/spatial/registry.ts`. Zero asset payload, real material slots, responds to lighting profiles.
- **`available-now-candidate`** — a reviewed candidate export exists in `assets/presence-spatial/candidates/`. Internal use only, not admitted.
- **`needs-implementation`** — composable from what exists, but not yet a named option.
- **`needs-art-pass`** / **`needs-scale-review`** — exists but blocked on a specific, named piece of work.
- **`future-primitive`** — the impossible-display lane. No implementation exists.

Priorities: **P0** = needed for a credible first palette. **P1** = strong second wave. **P2** = worthwhile, not urgent.

Customisation everywhere is by **material preset, skin, colour, decal, logo and media ref** on shared slots. No option creates a per-client GLB.

---

## Room shells and interiors

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 1 | **White Cube Gallery** | `presence.room-shell` + `white-gallery` + `gallery-soft` | room-kit | shell | needs-implementation | **P0** |
| 2 | **Dark Boutique Shell** | `presence.boutique-shell` | room-kit | shell | available-now-procedural | **P0** |
| 3 | **Nocturnal Gallery** | `presence.room-shell` + `nocturnal-black-gallery` | room-kit | shell | needs-implementation | **P0** |
| 4 | **Concrete Warehouse** | `presence.room-shell` + `industrial-concrete` | room-kit | shell | needs-implementation | P1 |
| 5 | **Ribbed Concrete Room** | `candidate.roomkit.warehouse-17b3` | room-kit | shell | available-now-candidate / needs-art-pass | P1 |
| 6 | **Long Arcade Gallery** | `candidate.roomkit.unknown-interior-a5e1` | room-kit | shell | available-now-candidate / needs-scale-review | P1 |
| 7 | **Paper Studio** | `presence.room-shell` + `soft-paper-room` + `warm-timber-studio` | room-kit | shell | needs-implementation | P1 |
| 8 | **Archive Room** | `presence.room-shell` + `archive-paper` | room-kit | shell | needs-implementation | P1 |
| 9 | **Blackout Projection Room** | `presence.room-shell` + `projection-blackout` | room-kit | shell | needs-implementation | **P0** |
| 10 | **Listening Room** | shell + acoustic treatment + seating | room-kit | shell | needs-implementation | P2 |

**Descriptions and customisation**

1. **White Cube Gallery** — the neutral default every visual artist expects. Quiet white walls, pale floor, soft even light. *Customise:* wall/floor presets, accent colour, hung media. *Fallback:* semantic list of works. The single most reusable shell on the platform; it should be the default new-room option.
2. **Dark Boutique Shell** — low-reflectance charcoal architecture for fashion, drops and product-first presences. *Customise:* wall/floor/rack presets, accent, logo decal.
3. **Nocturnal Gallery** — dark gallery for photography, film stills and nocturnal work, where white would blow out the pieces.
4. **Concrete Warehouse** — raw industrial volume for large work, installations, club and community events.
5. **Ribbed Concrete Room** — the strongest extracted kit. Sculptural fluted walls. *Blocked on:* baked-lighting compatibility check against Presence lighting profiles.
6. **Long Arcade Gallery** — processional arcaded hall, natural rhythm for a sequence of works. *Blocked on:* 53.7 m span and 12.3 m ceiling need scale confirmation (suggested 0.26).
7. **Paper Studio** — warm, tactile, timber-and-paper working space for writers, makers, designers.
8. **Archive Room** — low-glare archival treatment for collections, community records, cultural memory.
9. **Blackout Projection Room** — near-black volume built around one emissive surface. For film, video art, DJs, projection work.
10. **Listening Room** — a seated, acoustic-feeling space built for audio rather than images. Genuinely underserved by every other option here.

## Structure — walls, dividers, floors

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 11 | **Gallery Wall** | `presence.wall-panel` | object | wall | available-now-procedural | **P0** |
| 12 | **Ribbed Showroom Wall** | `presence.ribbed-wall` | object | wall | available-now-procedural | **P0** |
| 13 | **Room Divider** | `presence.divider-wall` | object | floor | available-now-procedural | P1 |
| 14 | **Floor Plate** | `presence.floor-slab` | object | floor | available-now-procedural | P1 |
| 15 | **Soft Divider Drape** | `presence.drape-divider` / `candidate.shelf.retopo-g-555780-0ae2-013` | object | floor | available-now-procedural + candidate variant | **P0** |

11. **Gallery Wall** — the hanging surface. Two faces, decal and logo slots. Everything else in a gallery hangs off this.
12. **Ribbed Showroom Wall** — vertical fluting for directional rhythm and depth. Reproduces the best quality of the brutalist kit at zero asset payload.
13. **Room Divider** — free-standing double-sided partition for sub-dividing a space without new rooms.
14. **Floor Plate** — material-swappable ground plane; the cheapest way to change a room's whole read.
15. **Soft Divider Drape** — fabric division for fitting areas, stage backdrops, intimate corners. A reviewed candidate curtain exists as a higher-fidelity variant.

## Surfaces — tables, islands, plinths

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 16 | **Display Island** | `presence.rounded-island` | surface | floor | available-now-procedural | **P0** |
| 17 | **Product Plinth** | `presence.display-plinth` | surface | floor | available-now-procedural | **P0** |
| 18 | **Stone Display Island** | `candidate.table.old-church-modeling-interior-sce-ffd7-017` | surface | floor | available-now-candidate | **P0** |
| 19 | **Display Table** | `presence.display-table` | surface | floor | available-now-procedural | P1 |
| 20 | **Display Bay** | `presence.display-bay` | surface | floor/wall | available-now-procedural | P1 |
| 21 | **Product Riser Blocks** | `candidate.chair.interior-7-3bc1-013` | surface | floor/surface | available-now-candidate / needs-scale-review | P1 |

16. **Display Island** — rounded central island; the natural focal point of a boutique or showroom floor.
17. **Product Plinth** — the gallery/museum standard. One object, elevated, lit.
18. **Stone Display Island** — the best object in the candidate library: 7.8 KB, clean sculptural slab on a stepped base. *Note:* originates as a church altar; provenance framing is a human decision.
19. **Display Table** — larger multi-object surface with a tabletop anchor grid.
20. **Display Bay** — shelved recess for grouped or serial work.
21. **Product Riser Blocks** — stacked sculptural blocks for sneakers, sculpture, zines, merch. *Blocked on:* scale confirmation.

## Racks, shelves and carriers

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 22 | **Suspended Rack** | `presence.suspended-rack` | object | floor | available-now-procedural | **P0** |
| 23 | **Garment Hanger** | `presence.garment-hanger` | object | rack | available-now-procedural | **P0** |
| 24 | **Display Shelf** | `presence.display-shelf` | object | wall/floor | available-now-procedural | P1 |
| 25 | **Archive Wall** | shelf system + `paper-archive` | object | wall | needs-implementation | P1 |

22. **Suspended Rack** — hanging rail with repeated slot anchors. The load-bearing fixture for any fashion presence, and completely absent from the extracted library.
23. **Garment Hanger** — the per-item carrier that sits in a rack slot. Takes fabric presets and per-garment media.
24. **Display Shelf** — wall or floor shelving with dividers and front lips, for records, books, product.
25. **Archive Wall** — flat-file / plan-chest / box-file wall for collections and cultural records. A named gap: `archive` is a supported room type with archival material presets, but no archive furniture exists anywhere yet.

## Media surfaces

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 26 | **Projection Wall** | `presence.projection-wall` | display | wall | available-now-procedural | **P0** |
| 27 | **Framed Media Surface** | `presence.framed-media` | display | wall | available-now-procedural | **P0** |
| 28 | **Piece Plane** | `presence.piece-plane` | display | wall/surface/rack | available-now-procedural | **P0** |
| 29 | **Text / Sign Card** | `presence.text-sign-card` | display | wall/surface | available-now-procedural | P1 |
| 30 | **Poster Stack** | flyer-stack primitive | object | surface | needs-implementation | P2 |

26. **Projection Wall** — large emissive media field. Video, campaigns, live visuals, film.
27. **Framed Media Surface** — framed single work with back plate, frame bars and a media plane. The gallery workhorse.
28. **Piece Plane** — the generic content carrier that mounts to walls, surfaces, racks or projection cells. This is how an owner's actual Pieces enter a room.
29. **Text / Sign Card** — wall label, room title, artist statement, price card. Unglamorous and essential.
30. **Poster Stack** — a takeable stack of flyers/zines/posters on a surface. Strong for community orgs, gigs and DIY culture.

## Fixtures and props

| # | Option | Source | Category | Placement | Status | Pri |
|---|---|---|---|---|---|---|
| 31 | **Display Light Fixture** | `presence.light-fixture` | object | floor | available-now-procedural | P1 |
| 32 | **Studio Light Stand** | `candidate.chair.interior-7-3bc1-000` | object | floor | available-now-candidate / needs-scale-review | P2 |
| 33 | **Showroom Seat** | `candidate.decorative-prop.interior-7-3bc1-009` | object | floor | available-now-candidate / needs-scale-review | P2 |
| 34 | **Listening Station** | seat + audio surface + Action | object | floor | needs-implementation | P1 |

31. **Display Light Fixture** — visible fixture with base, pole, shade and glow accent. Reads as intentional lighting design; actual illumination stays with the lighting profile.
32. **Studio Light Stand** — tripod studio light. Credible for photographers and fashion. *Blocked on:* 0.86 m recorded height is implausible.
33. **Showroom Seat** — open wire-frame armchair; visually light so it does not block small rooms. *Blocked on:* 0.38 m recorded footprint is doll-sized.
34. **Listening Station** — a seat plus an audio surface plus a `listen` Action. `listening-station` already exists as a Surface type in the model with no component behind it. The clearest unserved audience on the platform: DJs, musicians, oral-history archives, radio and podcast makers.

---

## Impossible / hybrid displays — the differentiator

These are the options that make Presence *spatial publishing* rather than a room simulator.
None exists. All are `future-primitive`. They are listed last but they are not least: options
1–34 make Presence credible, and these make it distinctive.

| # | Option | Internal id (proposed) | Description | Pri |
|---|---|---|---|---|
| 35 | **Spherical Gallery** | `presence.display.spherical-gallery` | Works arranged on the inside of a sphere; the visitor stands at the centre and turns. No floor, no walls, no horizon. Ideal for a body of work with no natural sequence. | P1 |
| 36 | **Orbital Carousel** | `presence.display.orbital-carousel` | Pieces orbit a still centre at varying radii and speeds. Browsing by waiting rather than walking. Strong for drops, releases and rotating collections. | P1 |
| 37 | **Constellation Archive** | `presence.display.constellation-archive` | Pieces suspended in dark volumetric space, positioned by relationship rather than geometry, with visible links between related works. For archives, research bodies and cultural memory. | P1 |
| 38 | **Timeline Spiral** | `presence.display.timeline-spiral` | A helix through space where distance along the spiral is time. Career retrospectives, organisational history, seasonal collections. | P2 |
| 39 | **Infinite Corridor** | `presence.display.infinite-corridor` | A procedurally endless hall that generates bays as the visitor advances. For collections with no fixed size. | P2 |
| 40 | **Gravity Well Vitrine** | `presence.display.gravity-well` | A single hero piece held in a slow orbit of satellite detail views. Product launches, one-object exhibitions. | P2 |

**Why these matter:** every option in sections 1–34 could, in principle, be a photograph of a
real room. Options 35–40 could not exist anywhere but in a digital space, and they are the
strongest argument for why an artist, label, gallery or community organisation would choose a
Presence over a website with images on it.

**Recommended first impossible display:** *Constellation Archive*. It serves the widest set of
audiences (archives, artists with deep back catalogues, community orgs, researchers), reuses
the existing `piece-plane` carrier, needs no new material system, and degrades gracefully to a
semantic list — which matters because it must remain accessible on mobile and to screen readers.

---

## Palette summary

| Status | Count |
|---|---|
| `available-now-procedural` | 15 |
| `available-now-candidate` (internal use only) | 6 |
| `needs-implementation` | 9 |
| `future-primitive` | 6 |
| **Total proposed** | **34** |

**P0 count: 13.** That is a credible first authoring palette: three shells, a wall, a drape,
three surfaces, two rack components and four media surfaces. It is enough to author a gallery,
a boutique and a projection room without touching a single extracted asset.

## Deliberate breadth check

This palette was tested against audiences beyond Mobstar:

| Audience | Served by |
|---|---|
| Visual artist | White Cube Gallery, Framed Media, Plinth, Piece Plane, Text Card |
| Fashion brand / label | Dark Boutique Shell, Suspended Rack, Garment Hanger, Display Island |
| Gallery / curator | White Cube, Nocturnal Gallery, Long Arcade, Plinth, Sign Card |
| DJ / musician | Blackout Projection Room, Listening Room, Listening Station, Projection Wall |
| Community org | Paper Studio, Poster Stack, Text Card, Archive Wall |
| Performer | Blackout Projection Room, Drape, Display Light Fixture |
| Archive / cultural memory | Archive Room, Archive Wall, **Constellation Archive** |
| Studio / maker | Paper Studio, Display Table, Display Shelf |

Every audience has at least three options and at least one shell. No audience is served only
by boutique fixtures, which was the specific overfitting risk to avoid.
