# GGM Faithful Recreation — V2 Upgrade Review

Date: 2026-05-23
Renderer key: `ggm-faithful-room-v1` (unchanged; renderer rebuilt around
the block model under the same key — there is still one GGM Room, no
duplicate).
Canonical slug: `ggm-christina-goddard` (was `ggm`).
Reference adapted: `C:\Dev\tools\12-principlesbrutalist-scroll-page-with-gsap`
— choreography concepts (block destinations, ghost text layers,
IntersectionObserver per-block reveals, custom cursor + scroll progress,
SplitText-style staggers) were borrowed; the brutalist visual style was
not.

## 1. Summary of visual changes

The page no longer scrolls as a single continuous document. It is now a
sequence of **four spatial blocks (scene plates)**:

| # | Block | What it does |
|---|---|---|
| 01 | Artwork Field | Full-viewport artwork stage, mix-blend nav, SVG liquid morph on slide change, layered SVG dither, brand ghost, RoomKey chip (when present), liquid UI + counter |
| 02 | Work Wall | Asymmetric 12-col wall hang of all 8 works, ghost word "wall" behind, paper tiles with hover lift + image scale |
| 03 | Practice Studio | About content composed as a workbench: pinned studio note (asterisk pin + tilt + shadow), strand cards, working-path timeline card, glide-rail inspire board |
| 04 | Calling Card | Contact content composed as a paper object: wax seal, corner marks, debossed inner border, presence enquiry CTA folded into the card itself |

Premium motion / texture additions:

- **Liquid morph** on slide transitions uses an SVG `feTurbulence` +
  `feDisplacementMap` filter driven by `useLiquidMorph()` (asymmetric
  ease 0 → ~0.92 → 0). Real wave displacement, no Three.js.
- **Dither film** is two layered SVG noises (fractalNoise 0.92 +
  turbulence 0.34) blended with `mix-blend-mode: soft-light`. Reads as
  intentional film grain + halftone, costs zero runtime CPU, screenshot
  stable.
- **Ghost words** behind each block (`wall`, `studio`, `invite`) set
  spatial identity at 32vw with `text-stroke`.
- **Right-edge chapter index** syncs active block via
  IntersectionObserver. Click any chapter to jump.
- **Custom cursor** (small mix-blend-difference dot) that grows on
  `data-hover` / `a` / `button` elements.
- **1px scroll progress** at the top edge.
- **Per-block staggered reveals** via `.blockReveal` /
  `.blockRevealChild` with inline `--i` custom property.

Chrome and motion are short-circuited under `prefers-reduced-motion`
and on touch / coarse-pointer devices.

## 2. Before / after assessment against source

| Axis | V1 score | V2 score | Notes |
|---|---|---|---|
| First impression | 9 / 10 | 9.5 / 10 | Brand ghost, real liquid morph, premium dither |
| Typography | 7.5 / 10 | 7.5 / 10 | Haffer still unavailable (Inter Tight fallback) |
| Palette | 10 / 10 | 10 / 10 | Unchanged |
| Layout | 9 / 10 | 9.5 / 10 | Block destinations replace single-scroll narrative |
| Image treatment | 9.5 / 10 | 9.5 / 10 | Wall block adds asymmetric 12-col hang |
| Motion | 7 / 10 | 9 / 10 | Liquid morph + cursor + chapter index + per-block stagger |
| Content | 10 / 10 | 10 / 10 | All 8 works, all timeline entries, all strands, all inspire captions |
| Mobile | 9 / 10 | 9 / 10 | Blocks degrade to natural scroll, chapter index hidden, calling card seal repositioned |
| Presence integration | 9 / 10 | 9.5 / 10 | Enquiry folded into card; graph actions stay as quiet bottom strip |
| **Aggregate** | **9 / 10** | **9.4 / 10** | |

The Room no longer feels like a generic scrolling Presence template
under a paper veneer. It feels like a Christina Goddard world divided
into four destinations.

## 3. Remaining fidelity gaps

1. **Haffer XH font** — still unavailable. Inter Tight is the closest
   safe substitute. Resolvable by dropping a licensed Haffer copy at
   `presence-app/public/fonts/` and adding `@font-face`.
2. **Source's home page Osmo loader** — deliberately not reproduced
   (vendor code not redistributable). The Presence Room paints the
   first slide immediately — better first impression behaviour.
3. **Three.js inter-slide morph (the wave is shader-driven on source)**
   — our SVG `feDisplacementMap` produces a real wave but is bounded by
   what SVG filters can do. The source's GPU shader produces a more
   organic, multi-channel ripple. Closing this gap would require
   bundling Three.js or a WebGL micro-runtime.
4. **Bottom zoom/blur** as the visitor approaches the footer — not
   re-added. Block model makes this less necessary because the calling
   card now BECOMES the destination at the foot of the page.
5. **Home hover-reveal companion card** — not added. Card hover scale
   was preserved.

## 4. Screenshots path

All screenshots are under
`docs/program/evidence/presence-ggm-faithful-recreation-proof/screenshots/`:

- `presence-ggm-room-{desktop,mobile}.png` — first viewport.
- `presence-ggm-room-full-{desktop,mobile}.png` — full-page roll.
- `presence-ggm-work-detail-{desktop,mobile}.png` — work detail.
- `presence-ggm-work-detail-full-{desktop,mobile}.png` — full work detail.
- `presence-ggm-gallery-{desktop,mobile}.png` + `-card-*` — beta gallery
  with GGM card showing artwork cover + "First pilot" pill + correct
  canonical slug.
- `presence-ggm-roomkey-entry-{desktop,mobile}.png` — RoomKey loader
  (universal, while awaiting a real backend token).
- `source-ggm-{home,home-late,work,about}-{desktop,mobile}.png` — source
  live demo captures for parity comparison.
- **NEW**:
  `screenshots/v2-blocks/01-artwork-field-{desktop,mobile}.png`
  `screenshots/v2-blocks/02-work-wall-{desktop,mobile}.png`
  `screenshots/v2-blocks/03-practice-studio-{desktop,mobile}.png`
  `screenshots/v2-blocks/04-calling-card-{desktop,mobile}.png`
  `screenshots/v2-blocks/01-artwork-field-reduced-{desktop,mobile}.png`

## 5. Verification ran

- ✓ `npm run typecheck` — passed.
- ✓ `npm run build` — passed (`Compiled successfully`; 50 routes; GGM
  routes intact).
- ✓ `node scripts/capture-ggm-screenshots.mjs` — 30 screenshots captured
  including the 4 v2 block captures × 2 viewports + 1 reduced-motion
  variant × 2 viewports.
- ✓ Live DOM probe at `/p/ggm-christina-goddard`:
  - 4 block IDs present (`ggm-block-field/wall/studio/card`).
  - Chapter index rendered.
  - Calling card seal rendered.
  - Artist email surfaced; no operator email; no `platform_admin`; no
    `localhost` in user-facing copy; correct external link to source
    portfolio.
- ✓ Non-GGM regression (`/p/rooms-underground-dj`):
  - No `ggm-module` classes leaked.
  - No `chapterIndex` leaked.
  - No `callingCard` leaked.
  - Original DJ-room content still renders ("Mira K", "Berghain").
- ✓ RoomKey regression (`/r/test-stub`):
  - Universal "Opening Room" loader still appears.
  - No `ggm-module` / `chapterIndex` leakage onto non-GGM tokens.
- ✓ Reduced-motion screenshot at `/p/ggm-christina-goddard#ggm-block-field`
  with `reducedMotion: "reduce"` — artwork is still the first signal,
  chapter index visible, animations short-circuited, dither film
  hidden by CSS.

Not run from local (require hosted env):
- `playwright.first-pilot-ggm.config.ts`
- `playwright.auth-permanence.config.ts`

## 6. GO / NO-GO recommendation

**Visual sign-off: GO.**

The v2 pass restores the premium feeling the source demands. The Room
is now four spatial destinations with their own atmosphere; the liquid
morph and dither read as expensive rather than cheap; the calling card
is an object rather than a footer; the studio is a workbench rather
than a list of paragraphs. Reduced-motion, mobile, RoomKey, owner
analytics, public redaction, and non-GGM rooms are all unchanged.

**Full pilot launch: NO-GO until hosted smoke completes** — same gate
as v1. Specifically:

1. Backend persistence of `metadata.custom_presence.style_dna.renderer_key
   = "ggm-faithful-room-v1"` on the canonical slug `ggm-christina-goddard`.
2. Hosted `playwright.first-pilot-ggm.config.ts` run with
   `PRESENCE_PILOT_GGM_ROOM_SLUG=ggm-christina-goddard` + the rest of
   the env block.
3. Hosted auth permanence run.
4. Owner / operator visual sign-off on `/p/ggm-christina-goddard` and
   `/r/<real-token>` against production.
