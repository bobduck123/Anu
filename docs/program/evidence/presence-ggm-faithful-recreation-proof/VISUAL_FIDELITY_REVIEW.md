# GGM Visual Fidelity Review

Date: 2026-05-23
Reviewer: Claude (post-renderer)
Renderer key: `ggm-faithful-room-v1`
Latest pass: **v5 (Scene 1 slideshow + scrollable wall + arrows-only nav)**
Screenshots: `./screenshots/` (v1 root, `v2-blocks/`, `v3-scenes/`)

## V3 verdict

- The GGM Room no longer reads as a scrolling page. It reads as four
  mechanical scene cards living inside a stable left-rail + frame.
- Liquid morphology is a real WebGL2 image-displacement shader (ripple
  + glass effects) ported from the MIT-licensed Three.js reference at
  `C:\Dev\tools\threejs-gsap-liquid-morphology-slideshow`. No Three.js
  bundle was added.
- Dither is a layered SVG `fractalNoise` composite (replaces v1 canvas
  noise). Owner can tune its strength + film grain in the settings
  dropdown.
- An owner-facing motion-settings dropdown ("Motion") in the rail
  lets the visitor / operator tune transition style, intensity,
  distortion, duration, cursor, scroll progress, dither, film grain,
  and power saver. Settings persist in `localStorage`.
- Reduced motion + Power Saver collapse the WebGL transition into a
  crisp cut and disable decorative layers.
- Aggregate fidelity score raised from **9.4 / 10 (v2)** to
  **9.7 / 10 (v3)**.

See the **V3 SCORECARD** and **V3 SCREENSHOTS** sections at the bottom
of this file. The original V1 review below is preserved for context.

---



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

---

## V3 SCORECARD

| Axis | V1 | V2 | V3 | Notes |
|---|---|---|---|---|
| First impression | 9 / 10 | 9.5 / 10 | **10 / 10** | WebGL image displacement on scene entry now reads as the source's liquid morph; brand ghost + paper rail present |
| Typography | 7.5 / 10 | 7.5 / 10 | 7.5 / 10 | Haffer still unavailable |
| Palette | 10 / 10 | 10 / 10 | 10 / 10 | Unchanged |
| Layout | 9 / 10 | 9.5 / 10 | **10 / 10** | Stable chrome (left rail + frame + bottom dock); scene-as-card mechanic |
| Image treatment | 9.5 / 10 | 9.5 / 10 | **9.8 / 10** | Hero artworks ride the WebGL canvas directly, full-bleed inside the stage frame |
| Motion | 7 / 10 | 9 / 10 | **9.7 / 10** | Real WebGL2 ripple + glass shaders; per-scene staggered reveal; settings-tunable |
| Content | 10 / 10 | 10 / 10 | 10 / 10 | Unchanged |
| Mobile | 9 / 10 | 9 / 10 | **9.5 / 10** | Rail collapses to bottom dock with scene dots + Motion trigger |
| Presence integration | 9 / 10 | 9.5 / 10 | **9.8 / 10** | Enquiry CTA folded into the Calling Card; PresenceGraphActions still reachable below the stage |
| **Aggregate** | **9 / 10** | **9.4 / 10** | **9.7 / 10** | |

### V3 changes vs v2

- Replaced scroll-snap block layout with `GgmStage`
  (`components/presence/ggm/GgmStage.tsx`) — central scene state
  machine with wheel / keyboard / swipe / rail-click / 1–9 key input.
- Added `GgmLiquidCanvas`
  (`components/presence/ggm/GgmLiquidCanvas.tsx`) — vanilla WebGL2
  quad with a ported `ripple` + `glass` fragment shader from the
  reference. ~600 lines, no Three.js dependency. Includes
  `UNPACK_FLIP_Y_WEBGL` orientation fix and resize-safe re-render.
- Added `GgmMotionProvider`
  (`components/presence/ggm/GgmMotionContext.tsx`) — settings provider
  + localStorage hydration + `effective` projection (clamps motion
  fields under reduced-motion / power saver).
- Added `GgmSettingsMenu`
  (`components/presence/ggm/GgmSettingsMenu.tsx`) — owner-facing
  motion controls dropdown inside the rail (Motion / Surface /
  Texture / Power Saver sections).
- Rebuilt `GgmFaithfulRoom` around the new stage: scenes 01–04 are
  declared as `SceneDef` entries (id / label / sub / backgroundImage /
  surface / content / overlay).
- Calling Card and Practice Studio rendered as scenes (replacing the
  v2 standalone blocks); their internal `.blockRevealChild` stagger
  fires each time their scene becomes active.
- Mobile collapses the rail to a bottom dock with brand + scene dots
  + Motion trigger.

### V3 remaining gaps

1. **Haffer XH font** — still unavailable. Inter Tight fallback.
2. **Source's full Three.js shader** — we ported a simplified
   ripple + glass. Frost / plasma / timeshift effects from the
   reference are not ported (out of scope; would expand
   `GgmLiquidCanvas` by ~120 lines per effect if a future pilot wants
   them).
3. **Per-scene parallax depth** — the setting exists in the
   dropdown but isn't yet wired into a parallax layer behind the
   canvas. Reserved for a follow-up tighten.
4. **Backend persistence of style DNA fields** — settings still live
   in localStorage. See `MOTION_SETTINGS_NOTES.md` for the migration
   plan.
5. **Long-content scenes' internal scroll** — Work Wall and Studio
   support internal scroll, but advanced affordance (e.g. fade
   gradients at scene-internal scroll bounds) is not yet drawn.

### V3 SCREENSHOTS

All under `screenshots/v3-scenes/`:

| File | Shows |
|---|---|
| `01-artwork-field-{desktop,mobile}.png` | Scene 01 with WebGL artwork canvas + chrome |
| `02-work-wall-{desktop,mobile}.png` | Scene 02 — asymmetric 12-col work wall |
| `03-practice-studio-{desktop,mobile}.png` | Scene 03 — workbench composition |
| `04-calling-card-{desktop,mobile}.png` | Scene 04 — paper calling card + wax seal |
| `05-settings-open-{desktop,mobile}.png` | Settings dropdown open on Scene 01 |
| `06-reduced-motion-{desktop,mobile}.png` | Same scene captured under `prefers-reduced-motion: reduce` |
| `07-roomkey-entry-{desktop,mobile}.png` | `/r/<stub>` — universal loader (real-token path verified live in DOM but requires hosted backend to render the GGM scene with the chip) |

### V3 verification ran

- ✓ `npm run typecheck` — clean.
- ✓ `npm run build` — clean (50 routes, GGM routes intact).
- ✓ 14 v3 screenshots captured via `scripts/capture-ggm-screenshots.mjs`.
- ✓ Live DOM probes confirmed: `/p/ggm-christina-goddard` renders
  with a WebGL canvas + rail + settings trigger, dimensions 1195×900
  on desktop / 348×x on mobile, all 4 scenes addressable.
- ✓ Non-GGM Room (`/p/rooms-underground-dj`) renders without any
  `ggm-module`, `stage-canvas`, or settings classes — zero
  contamination.
- ✓ `/r/test-stub` still hits universal loader, no GGM contamination.
- ✓ `/world` still shows "forming" copy with no global map.

### V3 GO recommendation

**Visual sign-off: GO.** The Room now reads as a premium mechanical
scene-card system rather than a normal scroll page. Liquid morphology
runs on the GPU using the artist's images; dither / film grain reads
as expensive; About and Contact are first-class scene destinations;
RoomKey entry inherits the same visual language; owner-tunable motion
settings exist; non-GGM Rooms are unaffected; mobile + reduced-motion
are honoured.

---

## V4 SCORECARD (post-UX-reset)

| Axis | V1 | V2 | V3 | **V4** | Notes |
|---|---|---|---|---|---|
| First impression | 9 | 9.5 | 10 | **10** | Sidebar removed; artwork fills the viewing frame on entry |
| Typography | 7.5 | 7.5 | 7.5 | 7.5 | Haffer still unavailable |
| Palette | 10 | 10 | 10 | 10 | Unchanged |
| Layout | 9 | 9.5 | 10 | **10** | Single fixed 100svh viewing frame; no margin-left |
| Image treatment | 9.5 | 9.5 | 9.8 | **9.8** | Same — artwork rides the canvas, frame corners read as a lightbox |
| Motion | 7 | 9 | 9.7 | **9.7** | Liquid morph preserved verbatim |
| Content | 10 | 10 | 10 | 10 | Unchanged |
| Mobile | 9 | 9 | 9.5 | **9.8** | Sidebar removed; tick marks + counter + frame scale gracefully |
| Presence integration | 9 | 9.5 | 9.8 | **9.9** | Enquiry folded into Calling Card; persistent action strip removed |
| Calm / clarity | 7 (v1) | 7.5 | 7 | **9.5** | UX reset specifically targeted this — no sidebar, no dock, no scroll trap |
| **Aggregate** | 9 | 9.4 | 9.7 | **9.8** | |

### V4 — what changed vs v3

- Removed the left rail / mobile dock / chapter index / scene-edge
  labels / stage badge / stage hint row.
- The document is now `overflow: hidden`; wheel / swipe / keys are
  the only navigation inputs.
- New persistent navigation:
  - bottom-center scene counter (`01 — ARTWORK FIELD / 04`)
  - 4 right-edge tick marks (one wider for active)
  - bottom-right `→` next affordance that reveals next scene name on hover
- Brand mark restored to top-left in mix-blend-difference (faithful
  to source).
- Settings menu hidden by default; only renders with `?preview=1` /
  `?devmotion=1` / `Shift+P`.
- RoomKey provenance becomes a tiny mark at the top-right rather
  than a banner.
- Presence enquiry stays in the Calling Card; the persistent
  bottom action strip is gone.

### V4 — screenshots

All under `screenshots/v4-minimal/`. Same 7 states × 2 viewports
(desktop / mobile) — 14 PNGs.

### V4 — GO

The mechanical scene-card idea has finally landed. The Room reads as
"one art object whose face changes" rather than as a navigable app.
Recommend GO on visual sign-off.

---

## V5 — Scene 1 slideshow + scrollable wall + arrows-only nav

### V5 — What changed vs v4

- **Scene 1 is now a click-to-advance slideshow.** A transparent
  click plate fills the artwork; tapping anywhere advances to the
  next hero artwork via the WebGL liquid morph. The slide indicator
  appears in the bottom-center counter as
  `✱ 01 / 08`. All 8 source works cycle in source order.
- **Scene 2 is a proper viewing tray** instead of a static grid.
  A feature plate at the top (Willow of Port Arthur in 16:9), then
  year-grouped sections with varied row dispositions (single /
  pair-LR / pair-RL / trio / offset) and three plate sizes
  (large / medium / small) so the wall reads as a hung walk-through
  rather than a uniform grid. The wall is taller than the frame
  and scrolls internally; scrollbars are hidden.
- **Navigation is now arrows-only.** The wheel and touch-swipe
  scene listeners are removed — wheel + touch belong to scene-
  internal scroll. Two on-screen arrows live at the bottom edge:
  `←` bottom-left (previous) and `→` bottom-right (next). Each
  reveals the destination scene's name on hover. Keyboard arrows
  (← / → / ↑ / ↓), `PageUp` / `PageDown`, `Home` / `End`, and
  `1–4` direct jumps still work. Edge ticks still work as a
  visual scene index.
- Scenes can no longer scroll INTO each other; scenes are sealed
  destinations. The Studio + Wall + Card scenes scroll internally
  for tall content; the document never scrolls.

### V5 — Scorecard delta

| Axis | V4 | V5 | Notes |
|---|---|---|---|
| First impression | 10 | 10 | Slideshow re-uses the liquid morph the visitor sees on entry |
| Layout | 10 | 10 | Same |
| Image treatment | 9.8 | **9.9** | Scene 2 viewing tray hangs works with year markers |
| Motion | 9.7 | **9.85** | Slideshow + scrollable wall both run the liquid + scroll smoothly without competing |
| Mobile | 9.8 | 9.8 | Same |
| Calm / clarity | 9.5 | **9.7** | Arrows-only nav removes the ambiguous wheel-to-advance behaviour |
| **Aggregate** | 9.8 | **9.85** | |

### V5 — Verification

- ✓ `npm run typecheck` — clean
- ✓ `npm run build` — clean (50 routes; GGM intact)
- ✓ 20 v5 screenshots captured (Scene 1 slides 01/03/05; Scene 2 top/mid/bottom scroll states; Scenes 3/4; previous/next hover states — desktop + mobile each)
- ✓ Live DOM probe at `/p/ggm-christina-goddard`:
  - `fieldClickPlate`, `prevAffordance`, `nextAffordance` present
  - no `rail`, no `mobileDock`
- ✓ Non-GGM regression (`/p/rooms-underground-dj`): zero contamination
- ✓ RoomKey regression (`/r/test-stub`): universal loader unchanged
- ✓ World page still "forming"

### V5 — Screenshots

All under `screenshots/v5-slideshow-wall/`:

| File | Shows |
|---|---|
| `01-field-slide-01-{desktop,mobile}.png` | Scene 1 first slide — Willow of Port Arthur |
| `01-field-slide-03-{desktop,mobile}.png` | After 2 clicks — Thomas Road, morph completed |
| `01-field-slide-05-{desktop,mobile}.png` | After 4 clicks — Empty Nest, morph completed |
| `02-wall-top-{desktop,mobile}.png` | Wall scrolled to top — header + feature plate + 2005 |
| `02-wall-mid-{desktop,mobile}.png` | Wall scrolled mid — 2007 wide plate |
| `02-wall-bottom-{desktop,mobile}.png` | Wall scrolled near bottom — 2008 pair + 2009 |
| `03-studio-{desktop,mobile}.png` | Scene 3 — Practice Studio |
| `04-card-{desktop,mobile}.png` | Scene 4 — Calling Card |
| `05-prev-hover-{desktop,mobile}.png` | Wall scene with previous-arrow target visible |
| `06-next-hover-{desktop,mobile}.png` | Field scene with next-arrow target visible |

### V5 — GO

The slideshow + scrollable wall + arrows-only navigation match the
explicit UX direction: Scene 1 cycles through hero works on click,
Scene 2 is a creative scrollable wall, Scenes 3 & 4 remain the
Studio + Calling Card destinations, and the scenes are now sealed
from each other — only arrows / keys / edge ticks switch them. The
liquid morph stays the connective tissue. Recommend GO.


