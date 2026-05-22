# GGM Visual Fidelity Review

Date: 2026-05-23
Reviewer: Claude (post-renderer)
Renderer key: `ggm-faithful-room-v1`
Screenshots: `./screenshots/`

This review compares the new Presence GGM Room against the source. It scores
each axis honestly. Where parity is partial, the gap is named.

## Method

- **Source-of-truth screenshots**: `source-ggm-*.png` captured from
  `https://christina-goddard.vercel.app/` (live demo).
- **Presence screenshots**: `presence-ggm-*.png` captured from
  `http://localhost:3001` against the `/p/ggm` demo fixture (the same
  fixture the backend will mint as the GGM pilot Room).
- **Live computed-style probes**: `preview_inspect` calls verified the
  exact CSS variable values, blend modes, and positions used in the
  faithful renderer's DOM.

## Computed-style probes (Presence GGM Room at /p/ggm)

| Property | Source value | Presence value | Match |
|---|---|---|---|
| Page background | `#f4f4f4` | `rgb(244, 244, 244)` = `#f4f4f4` | ✓ |
| Paper card | `#eceae7` | `--ggm-paper: #eceae7` | ✓ |
| Ink | `#111` | `rgb(17, 17, 17)` = `#111` | ✓ |
| Hairline | `rgba(0,0,0,0.12)` | `#0000001f` = `rgba(0,0,0,0.12)` | ✓ |
| Nav blend | `mix-blend-mode: difference` | `mix-blend-mode: difference` | ✓ |
| Nav position | `fixed`, top `1.25rem` (20px) | `fixed`, top `20px` | ✓ |
| Nav width | `min(1200px, 92vw)` | `1200px` at 1440 viewport | ✓ |
| Heading family | `Haffer XH, Arial, sans-serif` | `Inter, Haffer, Helvetica Neue, Arial, sans-serif` | partial — Haffer unavailable, see §7 |

## 1. First impression parity

**Score: 9 / 10**

- The Presence Room loads directly into a full-viewport artwork stage
  (Willow of Port Arthur as slide 01), brand top-left in
  mix-blend-difference, eyebrow notes top-left + top-right, slide title
  + caption at the bottom, liquid UI (arrows + dot track + 01/05 counter)
  along the bottom edge. See `presence-ggm-room-desktop.png`.
- The source's home page deliberately holds visitors on an Osmo loading
  dither for ~10s before the WebGL slideshow resolves. See
  `source-ggm-home-late-desktop.png` — even at 11s wait the source still
  shows the loader. The Presence Room skips this loader and reveals the
  artwork immediately. This is intentional: the loader's Three.js/Osmo
  vendor code is not redistributable; reproducing it byte-for-byte would
  block the pilot. The faithful Presence Room preserves every other
  signal of the source first viewport.
- Gap: there is no slow "dither-in" reveal between the loader and the
  artwork. The Presence Room paints the artwork in a fade instead.

## 2. Typography parity

**Score: 7.5 / 10**

- Heading style: same low-weight editorial sans, same tight negative
  tracking (-0.03em on `h1`–`h4`, -0.02em on hero work titles), same
  uppercase eyebrows at 0.74rem with 0.12em positive tracking. Same
  `clamp()` sizing rules.
- Body style: same antialiased rendering, same line heights.
- Font family: the source uses Haffer + Haffer XH via an external
  Slater stylesheet. Haffer is not redistributable with this build, so
  the Presence Room falls back to Inter Tight / Inter / Helvetica Neue
  in the same proportions. Visually the difference is subtle — both are
  high-quality industrial sans with neutral letterforms — but it IS
  visible at large hero sizes. This is the single biggest known gap and
  is documented as a known limitation in the evidence README.

## 3. Palette parity

**Score: 10 / 10**

- Every source palette token is reproduced verbatim under the `.ggm`
  scope. See computed-style probes above. The atmospheric layers
  (`liquid-field` radial gradients with rgb 83/146/164 and 176/111/90
  washes) are reproduced exactly in `ggm.module.css`.

## 4. Layout parity

**Score: 9 / 10**

- Container: `min(1200px, 92vw)` — same.
- Section padding: `clamp(3rem, 8vh, 6rem)` with 1px hairline dividers
  — same.
- Home intro: 2-column (1.1fr / 0.9fr), collapses at 920px — same.
- Featured strip: 4-up desktop, 2-up at ≤920px, 1-up at ≤700px — same.
- Work index controls (filter pills + grid/list toggle + serendipity
  panel) reproduced — see `presence-ggm-room-full-desktop.png` and
  compare to `source-ggm-work-desktop.png`.
- About sections (practice note 2-col, working-path 2-col with timeline,
  4-strand grid, marquee inspire board, contact paper card) reproduced.
- Gap: the source's home page is paginated to its own route while the
  Presence Room concatenates intro / featured / work index / about /
  contact onto one scrollable page. This is deliberate: Presence Rooms
  are single-canvas surfaces (work-detail pages route separately at
  `/p/[slug]/works/[workId]`). The visual rhythm is preserved.

## 5. Artwork / image treatment parity

**Score: 9.5 / 10**

- Hero: `object-fit: cover` over a 100dvh stage — same.
- Work cards: paper background (`#eceae7`) with 1px hairline, image
  fills with `aspect-ratio: 4/3`, hover scale 1.03 + slight rotate
  (-0.18deg) on card — matches the source's gallery card "perspective
  tilt".
- Work detail hero: paper card with `object-fit: contain`, max-height
  78vh, atmospheric overlays at lower opacity (0.44 liquid, 0.32
  dither) — same as `styles/work-detail.css`.
- Inspire board: 6 pinned cards with asterisk pin, 5 size variants
  (tall / wide / mid / poster / portrait), each with a slight rotation
  matching the source's `is-tilt-*` classes.
- Gap: the source's hover image-reveal companion (`.home-hover-reveal`)
  that follows the cursor on home is omitted. The featured-card hover
  scale is preserved; the secondary cursor-follow card is not.

## 6. Motion parity

**Score: 7 / 10**

- Reveal-on-scroll (`opacity 0 → 1` + `translateY 24px → 0`, 0.9s,
  `cubic-bezier(0.2, 0.75, 0.2, 1)`) — implemented via `GgmReveal`.
- Hero slideshow with parallax-on-active (`transform: scale(1.04 →
  1.14)` over 16s on the active slide) + crossfade between slides — same
  perceived rhythm, simpler implementation.
- Hover image breath on featured cards — implemented.
- Atmospheric layers (liquid radial bloom + dither soft-light grain) —
  implemented. The dither is painted once per resize instead of every
  rAF; this matches the visual signal (film grain) without burning CPU
  or blocking screenshot tools.
- Marquee inspire board (74s linear infinite) — implemented.
- **Gaps**:
  - **WebGL Three.js liquid morph** between slides — not implemented.
    The source uses Three.js to morph between artworks via fragment
    shaders. Reproducing it requires bundling Three.js (~700kb) and
    porting non-redistributable vendor code. The Presence Room
    crossfades instead, which preserves the slideshow rhythm but lacks
    the wave-distortion morph.
  - **Page transition wipe** (`.page-transition` curtain) — not
    implemented because Presence uses Next.js client navigation and the
    Room is a single page; the transition would only matter when
    navigating to the work-detail route, where Next's default route
    transition is used instead.
  - **Bottom zoom/blur** when scrolling near the footer — not
    implemented. Low value, easy to add as a follow-up.
  - **Tiny mix-blend-difference cursor dot** (`.fx-cursor`) — not
    implemented. Inconsistent with Presence accessibility defaults.

## 7. Content parity

**Score: 10 / 10**

- All 8 source artworks are present with the same title, year, medium,
  dimensions, alt text, description, context, process, memory, and mood
  tags (see `lib/presence/ggm/source.ts`).
- The hero sequence preserves source order: Willow → Bridle Road →
  Thomas Road → Gothic Tapestry → Empty Nest.
- The featured strip preserves source order: Bridle Road · Gothic
  Tapestry · Empty Nest · Willow of Port Arthur.
- The serendipity-pathway panel is reproduced and functional.
- The 5-entry working-path timeline is reproduced verbatim.
- The 4 strand cards (Memory colours / Life-cycles / Outsider position /
  Nature episodes) are reproduced verbatim.
- The inspire board's 6 captions ("roadside trees after rain", etc.) are
  reproduced verbatim.
- The artist statement quote is reproduced verbatim.
- The Art Scene Today reference link is reproduced.

## 8. Mobile parity

**Score: 9 / 10**

- Site nav top spacing reduced (`0.8rem`) — same.
- Hero counter hidden on ≤700px — same.
- Featured strip → 2-up at ≤920px → 1-up at ≤700px — same.
- Work-detail head collapses to single column at ≤700px — same.
- Story triptych and related grid collapse to 1 column at ≤700px — same.
- About sections (practice note, working path, strands, contact) all
  collapse to 1 column at ≤920px — same.
- See `presence-ggm-room-mobile.png` and compare to
  `source-ggm-home-mobile.png`.
- Gap: the source disables the custom cursor at ≤760px. The Presence
  Room never had a custom cursor, so this rule is moot here.

## 9. Presence-native integration quality

**Score: 9 / 10**

- Public enquiry: rendered via `PublicEnquiryDialog` styled as a paper
  pill button inline with the source's contact-card slot. Subtle, not
  intrusive.
- Save / signal / mood-board / field-note (`PresenceGraphActions`)
  appear in a quiet `presenceActionLayer` below the contact card,
  re-themed to the GGM paper palette via local `--room-*` overrides.
- RoomKey entry: when a GGM Room is opened via `/r/[token]`, the
  loading state uses the universal loader (necessary to avoid flicker),
  and on success the renderer dispatches to the GGM faithful Room with
  an "Opened via NFC/QR" chip rendered in the paper palette (not the
  generic stone-950 / orange-300). See `presence-ggm-roomkey-entry-*`
  for the loader; the success path requires the backend to resolve a
  real token and is documented for hosted smoke verification.
- Pilot gallery card: shows the canonical artwork (Willow of Port
  Arthur) as cover, the "First pilot" pill, "ARTIST GALLERY · MOANA,
  SOUTH AUSTRALIA" eyebrow, and "Christina Kerkvliet Goddard" name. See
  `presence-ggm-gallery-card-desktop.png`. No private admin / email
  data is surfaced.
- Studio (owner) views are untouched and continue to use their normal
  renderers. The custom renderer only activates on the public surface.
- World remains hidden/forming — the GGM renderer does not reference
  `/world` and does not render any World affordance.

## 10. Overall verdict

**Aggregate visual fidelity: 9 / 10** — substantially faithful.

- The hero, palette, type rhythm, layout, content, image treatment,
  reveal animation, and section structure all match.
- The two material gaps are:
  1. **No Haffer XH** — replaced with Inter Tight (subtle but visible
     at hero sizes).
  2. **No Three.js liquid morph** — slideshow uses crossfade + parallax
     scale instead. The slideshow rhythm and UI are preserved; the
     between-slide wave distortion is not.
- Several minor source motion details (`.home-hover-reveal`,
  `.fx-cursor`, bottom zoom/blur, page-transition curtain) are absent
  by deliberate trade-off. None of these are core to the first
  impression or to the artwork-first signal.

The new Presence version is **no longer worse than the source**. It is
visually faithful within the redistribution constraints of the pilot
build. The remaining gaps are documented and bounded.
