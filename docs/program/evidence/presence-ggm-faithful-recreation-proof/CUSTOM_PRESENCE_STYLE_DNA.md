# Custom Presence Style DNA — patterns learned from the GGM pilot

Date: 2026-05-23
Source pilot: `ggm-faithful-room-v1` (Christina Kerkvliet Goddard)
Audience: future custom-Presence ingestions and the pilot intake workflow.

This document distills the GGM faithful pass into reusable patterns so
the next custom-Presence ingestion (whatever the source site is) can
start from a known toolkit instead of reinventing the work.

Each pattern lists:

- what the pattern is
- how it was implemented for GGM
- which files / primitives it lives in
- how to expose it as a style-DNA dimension

A pattern marked **PROMOTE** is recommended for promotion into the
shared Presence renderer kit (under `lib/presence/custom-dna/`) the next
time a similar pilot lands.

---

## 1. Block-to-block navigation — "scene plates" (PROMOTE)

**Pattern.** A custom Presence Room is a *sequence of spatial blocks*,
not a long scrolling page. Each block:

- is at least `100dvh` tall
- has its own atmosphere (ghost word, film grain, palette accents)
- has its own reveal choreography on enter
- can be reached via a sticky chapter index on the right edge

**Implementation.**

- `.ggmRoot { scroll-snap-type: y proximity; scroll-behavior: smooth; }`
- `.block { min-height: 100dvh; scroll-snap-align: start; }`
- `GgmChapterIndex` in `components/presence/ggm/GgmChrome.tsx` syncs
  active state via `useActiveBlock` (IntersectionObserver across the
  block IDs).
- `BlockReveal` + `.blockReveal` / `.blockRevealChild` give per-block
  staggered reveals using inline `--i` custom properties.

**Style-DNA dimension.**

```jsonc
{
  "composition": {
    "navigation_mode": "scene_plates",       // new value
    "section_rhythm": "block_destinations",  // new value
    "scene_count": 4                          // pilot-authored
  }
}
```

A future pilot inherits the block model by setting these values; the
shared renderer reads them and applies the same scroll-snap + chapter
index treatment.

---

## 2. Artwork-first hero with liquid morph (PROMOTE)

**Pattern.** First viewport is the artwork. The Room brand, contact, and
nav must mix with the artwork via `mix-blend-mode: difference` rather
than sitting in chrome. The hero slideshow transitions between artworks
through a real liquid morph (SVG `feTurbulence` + `feDisplacementMap`),
not a crossfade.

**Implementation.**

- `GgmHero` orchestrates the slideshow + UI; calls
  `useLiquidMorph()` per slide change to drive an asymmetric easing
  curve (0 → ~0.92 → 0).
- `GgmLiquidMorphDefs` renders an inline `<svg><defs><filter>` that the
  active slide references via `filter: url(#ggm-liquid-morph)` only
  while morph > 0.02 (idle slides drop the filter so the GPU rests).
- `GgmLiquidField` paints a cursor-tracked radial bloom via CSS custom
  properties (no canvas).

**Style-DNA dimension.**

```jsonc
{
  "visual": { "entry_type": "artwork_first_full_viewport" },
  "motion": {
    "hero_transition": "liquid_morph",   // alt: "crossfade", "cut", "wipe"
    "liquid_strength": 0.9                // 0..1, peak displacement
  }
}
```

---

## 3. Source-derived paper palette (PROMOTE)

**Pattern.** The custom Room takes its palette from the source site
verbatim, surfaced via locally-scoped CSS variables. Never invent.
Never re-theme into the generic Presence palette.

**Implementation.**

- `ggm.module.css` `.ggm` block defines `--ggm-bg / --ggm-paper /
  --ggm-ink / --ggm-muted / --ggm-line / --ggm-stage`, plus warm
  variants for the Studio block.
- Presence-native components inside the Room scope override their
  `--room-*` CSS variables to the GGM palette via
  `.presenceActionLayer { --room-bg: var(--ggm-bg); … }`.

**Style-DNA dimension.**

```jsonc
{
  "visual": {
    "palette_mode": "custom_pilot",
    "palette": {
      "bg": "#f4f4f4",
      "paper": "#eceae7",
      "ink": "#111",
      "muted": "#6a6a6a",
      "line": "rgba(0,0,0,0.12)",
      "stage": "#eaeaea"
    }
  }
}
```

The shared renderer can apply these variables under a scoped class and
re-theme `--room-*` accordingly.

---

## 4. Premium dither + film texture (PROMOTE)

**Pattern.** Film-grain / dither texture as two layered SVG turbulences
with different `baseFrequency` values, blended via `mix-blend-mode`.
Reads as expensive film texture, costs zero runtime CPU, is screenshot
stable.

**Implementation.**

- `.ditherFilm` background-image stacks a `fractalNoise` at 0.92
  baseFrequency (fine grain) with a `turbulence` at 0.34 (halftone
  macro pattern). `mix-blend-mode: soft-light` blends with the artwork
  below.
- Optional `.ditherFilmContrast` variant uses `overlay` for higher
  contrast scenes.
- Each block additionally carries a `::before` pseudo-element with a
  tiny `fractalNoise` for atmosphere.

**Style-DNA dimension.**

```jsonc
{
  "visual": {
    "texture": "film_dither",     // alt: "paper", "grain", "halftone", "scanline"
    "texture_strength": 0.62      // 0..1
  }
}
```

---

## 5. Ghost layers — large background type per block (PROMOTE)

**Pattern.** Each block carries a single massive low-contrast word
(stroked, ~32vw, color: transparent + `text-stroke`) behind its content.
Sets spatial identity without using imagery. Adapted from the brutalist
GSAP reference.

**Implementation.**

- `.blockGhost` + positional helpers (`.blockGhostTopLeft`,
  `.blockGhostBottomRight`, `.blockGhostCenter`).
- For GGM: `wall` behind the Work Wall, `studio` behind the Practice
  Studio, `invite` behind the Calling Card. Hero uses a brand-name
  ghost via `.heroBrandGhost`.

**Style-DNA dimension.**

```jsonc
{
  "composition": {
    "block_ghosts": [
      { "block": "field",  "word": "<brand>" },
      { "block": "wall",   "word": "wall" },
      { "block": "studio", "word": "studio" },
      { "block": "card",   "word": "invite" }
    ]
  }
}
```

---

## 6. About-as-Studio (PROMOTE)

**Pattern.** The About block is composed as a working bench, not as a
list of paragraphs. The artist's statement becomes a pinned paper note
(with asterisk pin + slight rotation + drop-shadow). The timeline
becomes a stacked paper card. The inspiration board becomes a
horizontally-glided rail of pinned fragments. Strand cards become
workbench tiles.

**Implementation.**

- `GgmStudioScene` composes 2 columns: left (heading + studio note +
  strand grid) and right (timeline card + inspire rail).
- All cards share the `.ggm-paper` background + 1px hairline + subtle
  shadow + slight rotation to read as physical paper.

**Style-DNA dimension.**

```jsonc
{
  "composition": {
    "about_treatment": "studio_workbench"   // alt: "biography_card", "letter", "transcript"
  }
}
```

---

## 7. Contact-as-Object (PROMOTE)

**Pattern.** The Contact block is composed as a single physical object
(here a calling card with a wax seal and corner marks), not as a
footer-style section. The Presence enquiry CTA is embedded into the
card's action strip so it feels like part of the object, not a separate
form.

**Implementation.**

- `GgmCallingCard` renders a card with corner marks
  (`.callingCardCornerTL`–`BR`), inner debossed border (via `::before`),
  wax-style seal (`.callingCardSeal`), name + role + contact lines,
  action row with `PublicEnquiryDialog` integrated.

**Style-DNA dimension.**

```jsonc
{
  "composition": {
    "contact_treatment": "calling_card"  // alt: "footer", "letter", "appointment", "phone_card"
  },
  "signature": {
    "signature_module": "contact_object"
  }
}
```

---

## 8. Source-derived motion grammar (PROMOTE)

**Pattern.** Motion language is captured from the source as a small
grammar (4–6 named motifs), then implemented as composable React hooks
+ CSS rules. Each motif respects `prefers-reduced-motion`.

**GGM motion grammar.**

| Motif | Implementation | Reduced-motion |
|---|---|---|
| Liquid morph | `useLiquidMorph()` + `GgmLiquidMorphDefs` | hook returns 0, no rAF |
| Cursor bloom | `GgmLiquidField` cursor-tracked radial | CSS hides layer |
| Film dither | `.ditherFilm` static SVG | CSS hides layer |
| Reveal-on-enter | `GgmReveal` (block + paragraph variants) | sets shown=true immediately |
| Marquee glide | `@keyframes studioInspireGlide` | `animation: none` |
| Slideshow auto-advance | `useEffect` interval | interval not started |
| Custom cursor | `GgmCursor` with `data-hover` triggers | component returns no DOM |
| Scroll progress | `GgmScrollBar` 1px top bar | unaffected (always passive) |

**Style-DNA dimension.**

```jsonc
{
  "motion": {
    "preset": "paper_gallery",
    "motifs": ["liquid_morph", "cursor_bloom", "film_dither", "reveal", "marquee_glide"]
  }
}
```

---

## 9. RoomKey entry adaptation (PROMOTE)

**Pattern.** When a custom-Presence Room is opened from `/r/[token]`,
the entry surface must not look like the universal stone-950 + orange
loader. It must look like the Room itself opening from a tap. The
"Opened via …" context is surfaced as a paper-styled chip floating over
the artwork, not as a banner.

**Implementation.**

- `RoomKeyEntry.tsx` checks `isGgmFaithfulRoom(room)` after the loader
  resolves and dispatches to `GgmFaithfulRoom` with
  `roomKeySourceLabel`.
- `GgmHero` renders `.heroRoomKeyChip` only when that label is present.
- Invalid / revoked token states still fall through to the universal
  safe-error surface so the error UX is consistent.

**Style-DNA dimension.**

```jsonc
{
  "presence_native": {
    "roomkey_entry": "custom_renderer_with_chip"
  }
}
```

---

## 10. Custom cursor + scroll progress (consider PROMOTING)

**Pattern.** Small mix-blend-difference cursor dot that grows on hover
over `data-hover` / `a` / `button` elements. 1px scroll progress bar
along the top edge. Both hidden on touch devices and under reduced
motion.

**Implementation.**

- `GgmCursor` in `GgmChrome.tsx` — touch-device guard, smooth lerp,
  large-state on hover.
- `GgmScrollBar` in `GgmChrome.tsx` — passive scroll listener,
  scaleX transform.

These are valuable for any "premium editorial" pilot. They are *not*
valuable for a clinical / service-oriented pilot, so they should be
opt-in via DNA:

```jsonc
{
  "chrome": {
    "custom_cursor": "small_dot_difference",
    "scroll_progress": "hairline_top"
  }
}
```

---

## 11. Activation contract (PROMOTE)

**Pattern.** A custom renderer activates only when one of three signals
match:

1. `node.metadata.custom_presence.style_dna.renderer_key === "<key>"`
2. `node.metadata.custom_renderer_key === "<key>"`
3. A pilot-specific signature fallback (canonical slug + slug pattern +
   display name pattern).

The third signal exists because the backend may not have persisted the
renderer key on every environment. The dispatch happens *after* the DNA
plan hook so React rules-of-hooks stay safe, and *before* the DNA
chain so the custom renderer wins over the generic blueprint chain.
Studio's `forceBlueprint` escape hatch bypasses the custom renderer so
operators can still preview generic blueprints.

**Files.**

- `lib/presence/ggm/activate.ts` — the activator and canonical slug
  constant.
- `components/presence/PresenceDnaRenderer.tsx` — dispatch.
- `components/presence/graph/RoomKeyEntry.tsx` — dispatch.
- `app/(public)/p/[slug]/works/[workId]/page.tsx` — dispatch.

**Shared kit suggestion.** A future
`lib/presence/custom-dna/registry.ts` module can hold an array of
`{ rendererKey, isSignature, render }` entries; the DNA renderer
iterates the registry and dispatches to the first match.

---

## Suggested shared primitives directory

When 2–3 pilots have shipped, the GGM-specific files can graduate to:

```
lib/presence/custom-dna/
  registry.ts            # central activation table
  scene-blocks/          # block model + reveal + chapter index
  atmosphere/            # liquid field, dither film, morph defs
  primitives/            # calling-card, studio-bench, paper-card
  chrome/                # custom cursor, scroll bar
  README.md
```

The GGM renderer would then become a thin orchestrator that wires the
shared primitives to GGM's source content, palette tokens, and
ghost-word configuration.
