# GGM Source Review — Claude Pass

Date: 2026-05-23
Source-of-truth inspected:

- Live demo: https://christina-goddard.vercel.app/
- Local source: `C:\Dev\ggm`

This document captures the specific design signals that the Presence GGM
recreation MUST preserve. It is the input to the `ggm-faithful-room-v1`
renderer.

## 1. Identity

- Artist: **Christina Kerkvliet Goddard**
- Location: Moana, South Australia
- Primary practice: watercolour on paper
- Tagline copy: "selected watercolour works"
- Subtitle: "Australian artist working across memory, colour, and lived landscape"
- Practice topics: memory · colour · lived landscape · daily encounter · life-cycles
- Statement quote: "Memory Colours revisits and haunts its sites of episode as a
  way to present how colour can generate memory."
- Reference profile: artscenetoday.com Christina Kerkvliet Goddard entry
- Contact: christina.8@bigpond.com · http://www.ckgoddard.com.au/

## 2. Routes and Content Map

| Route | Role | Required in Presence |
|---|---|---|
| `/` | Full-viewport artwork hero · practice intro · featured strip | Yes — must be first viewport |
| `/work/` | Year-filtered index · grid/list toggle · serendipity pathway panel | Yes — at least filterable index |
| `/work/<slug>/` | Contained artwork hero · memory prompt · context/process/memory triptych · statement · related works | Yes — minimal viable detail surface |
| `/about/` | Practice note · working path timeline · 4 strand cards · animated inspiration board · contact | Yes — about page must exist |
| `/safe/` | Static fallback mirror | Out of scope — Presence-native |

## 3. Asset inventory

Available from `C:\Dev\ggm\assets/images/`:

- `works/` — 8 WebP artworks (bridle-road-2005, thomas-road-2007, goodnight-kiss-2007,
  gothic-tapestry-2008, burgundy-peaches-2008, last-dash-2009, empty-nest-2014,
  willow-of-port-arthur-2019)
- `thumbs/` — 8 matching WebP thumbnails
- `portrait/` — 1 WebP artist portrait

Hero sequence (in order): Willow of Port Arthur · Bridle Road · Thomas Road ·
Gothic Tapestry · Empty Nest.

## 4. Palette (verbatim from styles/global.css)

| Token | Value |
|---|---|
| `--bg` | `#f4f4f4` |
| `--paper` | `#eceae7` |
| `--ink` | `#111` |
| `--muted` | `#6a6a6a` |
| `--line` | `rgba(0, 0, 0, 0.12)` |
| `--accent` | `#ffffff` |
| Hero stage bg | `#eaeaea` |

Atmospheric overlays:

- white liquid bloom
- muted blue-green wash `rgba(83, 146, 164, 0.2)`
- muted warm wash `rgba(176, 111, 90, 0.14)`

## 5. Typography

- Heading family: `Haffer XH, Arial, sans-serif`
- Body family: `Haffer, Arial, sans-serif`
- Weights: low/regular (400)
- Heading tracking: tight (-0.03em on h1-h4, -0.04em on hero h1, -0.02em on work titles)
- Eyebrow / nav: uppercase, positive tracking (0.08em / 0.12em / 0.14em)
- Body smoothing: `-webkit-font-smoothing: antialiased`

Sizes:

- Home intro h2: `clamp(2rem, 5vw, 3.7rem)`
- Page-head h1: `clamp(2.2rem, 7vw, 5.8rem)`
- Work-detail h1: `clamp(2rem, 6vw, 4.8rem)`
- About-way h2: `clamp(2rem, 5vw, 4rem)`
- About-inspire h2: `clamp(2rem, 4.8vw, 4.4rem)`

Haffer is not bundled in `C:\Dev\ggm`; the source loads an external Slater
stylesheet. Faithful recreation must:

- Prefer Haffer (and Haffer XH) only if a redistributable copy is provided.
- Otherwise fall back to a closely-matched safe stack such as
  `"Inter Tight", "Helvetica Neue", Arial, sans-serif` while honouring the
  same tight tracking, low weight, and clamp-based sizes.

## 6. Layout

- Container: `--max: min(1200px, 92vw)`
- `.page-shell` wraps everything to that width
- Sections: vertical padding `clamp(3rem, 8vh, 6rem)` with a top hairline
  (`border-top: 1px solid var(--line)`), except the first section
- Home intro: 2-column desktop (`1.1fr 0.9fr`) collapsing to single column at 920px
- Featured strip: 4 columns desktop, 2 columns at <=920px
- Work index: filter row + serendipity panel + grid; responsive
- Work detail: full-width hero (contain), then memory overlay, then
  3-column story triptych, then statement, then related grid
- About: 2-column "Practice note", 2-column "working path" with vertical
  timeline, 2-column strand grid, marquee "inspire board", 2-column contact

## 7. Nav (mix-blend-difference)

- Fixed, full container width, centered
- `mix-blend-mode: difference` and `color: #fff` — text reads as the inverse
  of whatever artwork sits behind it
- Brand left, three uppercase links right (Work · About · Contact)
- `pointer-events: none` on the bar, restored on its children so the
  artwork below can still receive hover/scroll

## 8. Hero (`.crisp-header`)

- Full viewport, min-height `100dvh`
- Background `#eaeaea`
- Slide list: stacked `data-slideshow="slide"` divs with `is--current` class
- Each slide image is `object-fit: cover` with parallax data attributes
- Atmosphere layers stacked on top: `liquid-field` radial gradient blob and a
  `dither-layer` canvas
- Bottom liquid UI: `prev`, dot-track, `next`, all in `rgba(12,12,14,0.46)`
  with 1px white/40% borders, 999px radius
- Right-center counter `01 / 05` in light tracking
- Top-left and top-right notes describe the motif (`Serendipity pathway ·
  liquid morphology` and `Scroll to dither in · scroll-snap to morph`)
- Bottom title strip — single line of `selected watercolour works`

## 9. Featured strip

- 4 `.featured-card` tiles
- Each tile: artwork, then a bottom gradient with title + small year
- Hover: image `scale(1.06)` over 0.7s ease-out

## 10. Work index

- Filter row: pill buttons for `All` + each present year (2005, 2007, 2008,
  2009, 2014, 2019)
- View toggle: `Grid` / `List`
- Serendipity panel: blurb + "Generate pathway" button → renders a
  short non-linear list of artwork pairings + a note line

## 11. Work detail

- Top crumb `← Back to works`
- `.work-detail__hero`: paper background `#eceae7`, atmospheric layers
  behind, contained image at `max-height: 78vh`, head block beneath with
  h1 (clamp), meta line `YEAR · DIMS · MEDIUM`, description, and a Prev /
  Next pager (pill buttons)
- Memory overlay: prompt copy + button that reveals a 3-field form (Mood /
  Place memory / Time feeling) with a textarea reflection, save/clear, and
  a chip resonance row that surfaces aggregated tags
- Story triptych: Context / Process / Memory in 3 paper-card columns
- Statement quote pulled from artist data
- Related works grid: 3 paper-card tiles

## 12. About

- Page head with eyebrow `About` + h1 `Who is Christina`
- Practice note: 2-col, label + 2 paragraphs
- Working path: 2-col, headline left + vertical timeline right (5 entries)
- Working concerns: 4 paper strand cards in a 2-col grid
- Inspire board: infinite marquee of pinned cards, each with a tilt and an
  asterisk pin (`✱`)
- Contact: paper card with headline + two underlined contact links

## 13. Motion

- Page transition wipe (`.page-transition`), upward on ready, downward on leave
- `[data-reveal]` opacity + 24px Y offset, transitioning over 0.9s with the
  `cubic-bezier(0.2, 0.75, 0.2, 1)` easing
- Tiny `mix-blend-mode: difference` cursor (`.fx-cursor`)
- Hero slideshow with parallax + dither canvas
- Bottom zoom/blur: `scale(1 - progress * 0.07)` + `blur(progress * 10px)`
  applied when scrolling near the footer
- Inspire board marquee: 74s linear infinite
- Featured card image scale on hover

## 14. Reduced motion (must replicate)

`@media (prefers-reduced-motion: reduce)` disables:

- animations + transitions (effectively duration 1ms)
- `.page-transition`, `.liquid-field`, `.dither-layer`, `.fx-cursor`
- `[data-reveal]` ends opaque with no transform

## 15. Mobile (≤700px / ≤760px)

- Cursor reverts to system
- Nav top reduced (0.8rem)
- Nav links shrink (0.74rem, gap 0.7rem)
- Hero counter hidden, liquid UI compressed
- Featured strip becomes 2-col
- Home intro becomes single column
- Work-detail head collapses to single column
- Story triptych and related grid collapse to 1 column

## 16. What Makes the Source Feel Distinctive

1. **Mix-blend-difference nav** — the brand and links read directly off the
   artwork, never sitting in a chrome bar.
2. **Atmospheric layers** behind / in front of the artwork — radial liquid
   bloom and a soft dither canvas that adds film grain without obscuring
   the painting.
3. **Liquid UI** at the bottom of the hero — pill-bordered controls in
   translucent dark glass, contrasting with the bright neutral page.
4. **Paper palette** — `#f4f4f4` page, `#eceae7` paper cards, hairline
   borders at `rgba(0,0,0,0.12)`. Never white-white, never grey-grey.
5. **Tight editorial type** — `Haffer XH` style headlines at `clamp` sizes,
   negative tracking, low weight.
6. **Quiet section rhythm** — 1px hairlines, generous padding, no rounded
   cards in the gallery.
7. **Hover artwork breath** — featured cards scale slightly on hover; the
   work-detail Prev/Next sit as pills, not panel buttons.
8. **Marquee inspire board** with asterisk-pinned, slightly-tilted paper
   cards.
9. **Memory prompt overlay** on each work — Mood / Place / Time / reflection.

## 17. Preserve vs. Adapt

**Preserve exactly:**

- First viewport = artwork-first slideshow with paper palette and the
  difference-blend nav.
- Featured strip composition and gradient meta.
- Work-detail paper hero with `object-fit: contain` and atmospheric layers.
- Story triptych structure (Context / Process / Memory).
- About working-path timeline and 4-strand grid.
- Inspire-board marquee.

**Adapt into Presence-native quietly:**

- Replace `mailto:` enquiry with `PresenceGraphActions` / `PublicEnquiryDialog`,
  styled as paper pill buttons.
- Add an "Opened via NFC/QR" chip on the RoomKey entry page rather than
  the GGM nav, but keep the same palette and type.
- Owner analytics, RoomKey, Save-to-Garden are Presence-native and stay
  out of the public visual hierarchy unless explicitly invoked.

**Defer (do NOT inject):**

- WebGL Three.js morph (license + complexity); replace with a CSS+canvas
  fade slideshow that preserves the parallax, dot UI, and counter.
- Slater external stylesheet (not redistributable); load fallback only.
- Three.js GSAP CDN code (not redistributable for our pilot).

## 18. Renderer Activation

The renderer key is `ggm-faithful-room-v1`. The Presence frontend resolves
the key in this order:

1. `node.metadata.custom_presence.style_dna.renderer_key`
2. `node.metadata.custom_renderer_key`
3. Fallback signature: slug contains `ggm`/`goddard`/`christina-kerkvliet`
   AND `display_name` contains `Christina Kerkvliet Goddard` or
   `Christina Goddard`.

Only when one of these is true does the GGM renderer take over. All other
nodes continue through the existing `PresenceDnaRenderer` chain.
