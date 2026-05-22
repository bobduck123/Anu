# Current GGM Presence Failure Review

Date: 2026-05-23
Reviewer: Claude (pre-renderer)
Object reviewed: the public GGM Room as it renders today through the
existing `PortfolioRenderer` → `PresenceDnaRenderer` chain.

## Verdict (blunt)

The current GGM Presence Room is **not acceptable**. It is the generic DNA
chain rendering a watercolour artist as if she were any other gallery-room
node, with none of the source-site signals that make Christina Kerkvliet
Goddard's portfolio feel like itself. It would not have passed visual sign-off
even if the source did not exist; once compared against the live demo, the
gap is launch-blocking.

## How it currently renders

1. `app/(public)/p/[slug]/page.tsx` calls `fetchDemoOrPublicNode(slug)` and
   passes the node to `PortfolioRenderer`.
2. `PortfolioRenderer` (non-legacy) immediately delegates to
   `PresenceDnaRenderer`.
3. `PresenceDnaRenderer.tsx:43` resolves DNA, derives a `ThemeGenome`, and
   then either:
   - dispatches to a Pass 3 room-world component (most likely
     `GalleryRoom` for GGM, because the world type resolves to
     `gallery_room`),
   - or falls through to one of the Pass 1/2 blueprint rooms
     (`EditorialIdentityRoom`, `NocturnalSonicRoom`, …).
4. `GalleryRoom` (`components/presence/blueprints/GalleryRoom.tsx`) builds
   a chamber-based `RoomGraph` and renders it through `RoomGraphRenderer`
   with `GallerySlot` and `makePortalRenderer`.
   - This is a *navigable graph*: Threshold → Wall → Wall text → Commission
     → Notes, each with its own exits. The visitor "walks" the room with
     forward / left / right / back, NOT the source's scroll narrative.

## What is wrong, line by line

### Hero / first viewport
- **Source**: full-viewport artwork stage with parallax cover image,
  atmospheric overlays, mix-blend-difference nav, liquid UI bottom row,
  counter `01 / 05`, and dither hint.
- **Current Presence**: chamber Threshold with a single artwork, generic
  type system, no atmosphere, no slideshow, no counter, no liquid UI.
  Brand sits in a normal header bar instead of mixing with the artwork.
- **Impact**: the first impression is wrong. The visitor does not see
  Christina's work *first*.

### Navigation language
- **Source**: scroll-narrative single page with route-based subpages.
- **Current Presence**: forward/left/right/back room-graph navigation.
- **Impact**: GGM is a portfolio, not a "navigable chamber" world. The
  graph adds friction and breaks the source pacing.

### Typography
- **Source**: Haffer XH headings at `clamp(2.2rem, 7vw, 5.8rem)`, tight
  tracking, low weight; uppercase eyebrows at 0.74rem / 0.12em tracking.
- **Current Presence**: theme genome typography defaults (resolved
  through `deriveThemeGenome`). For most paths this yields
  `editorial_serif` (Georgia) or a system sans, neither of which matches
  the GGM editorial sans.
- **Impact**: the page does not read editorially; serif fallback
  especially fights the artwork.

### Palette
- **Source**: `#f4f4f4` bg, `#eceae7` paper, `#111` ink, `#6a6a6a` muted,
  `rgba(0,0,0,0.12)` rule.
- **Current Presence**: theme genome `gallery_white` or `warm_neutral`,
  but applied through CSS variable mapping that ends up too bright (pure
  whites and stone-50 backgrounds), with rule lines as `--p-border` at
  higher opacity than the source hairlines.
- **Impact**: the page looks generic-clean rather than paper-quiet.

### Section rhythm
- **Source**: 1200px / 92vw container, 1px hairline section dividers,
  `clamp(3rem, 8vh, 6rem)` vertical padding. No rounded card chrome.
- **Current Presence**: stacks of rounded cards with shadows, often a
  `rounded-3xl` Tailwind class on every section. Borders are heavier.
- **Impact**: every section becomes a "card" — flat editorial rhythm
  disappears.

### Hero artwork treatment
- **Source**: cover-fit on home hero (the painting becomes the stage);
  contain-fit on work detail (the painting is preserved in full).
- **Current Presence**: cards crop the works to portrait/landscape grid
  tiles regardless of the painting's natural aspect ratio.
- **Impact**: paintings are cropped destructively, which is the single
  worst thing an art portfolio can do.

### Motion
- **Source**: dither intro, liquid morph, scroll reveal, page transition
  wipe, bottom zoom/blur, mix-blend cursor, hover image breath, marquee
  inspire board.
- **Current Presence**: room graph navigation transitions, generic fade.
  None of the GGM motion language survives.
- **Impact**: the room does not feel like GGM.

### Content order
- **Source**: artwork → practice intro → featured strip → work index →
  work detail → about → contact. Each route is its own surface.
- **Current Presence**: a chamber graph that exposes "Threshold / Wall /
  Wall text / Commission / Notes". The mapping is not isomorphic with the
  source; "Commission" in particular implies commission-on-demand which
  is not the GGM offering.
- **Impact**: misrepresents the artist's practice.

### About surface
- **Source**: practice note (2-col), working-path timeline (5 entries),
  4 strand cards, infinite-marquee inspiration board, contact paper card.
- **Current Presence**: the room-graph chamber labelled "Notes" exposes
  long_story / bio in a single column with no timeline or inspire-board
  treatment.
- **Impact**: the about story is severely flattened.

### Work detail surface
- **Source**: paper hero with atmospheric layers, contained painting,
  head with title/meta/description/pager, memory prompt overlay,
  Context/Process/Memory story triptych, statement quote, related grid.
- **Current Presence**: standard `/p/[slug]/works/[id]` route renders via
  the existing PortfolioRenderer treatment which is a generic 2-column
  works detail with no memory overlay and no triptych.
- **Impact**: the work detail's "memory" semantics — central to Christina's
  practice — are absent.

### RoomKey entry
- **Source equivalent**: there is no NFC entry on the source site, but
  the *spirit* the entry should preserve is "this is GGM, opening from a
  tap" — Christina's identity and the artwork must be the first thing
  visible.
- **Current Presence**: `RoomKeyEntry` renders a dark stone-950 surface
  with orange-300 accents, generic for every Presence Room. It does not
  reflect the GGM palette or typography even when the Room is GGM.
- **Impact**: the GGM brand vanishes the moment a guest taps an NFC tag.

### Pilot/beta gallery card
- **Current Presence**: the GGM Room appears in `/gallery` as a generic
  `presence-room-card` whose `data-tone` is picked from `TONE_BY_MODE`
  (probably `quiet` or `wood`). The card uses the standard cover or
  profile image, the standard `Enter Room →` link, and standard chrome.
- **Impact**: at the discovery surface, GGM looks like every other Room.

## Ugly / generic components to be replaced for GGM

- `GalleryRoom.tsx` chamber dispatch (not used for GGM after recovery).
- The PresenceDnaRenderer fallthrough that selects
  `EditorialIdentityRoom` or `GalleryRoom` for GGM.
- The current RoomKey palette when the Room is GGM.

## Pieces worth keeping

- `PresenceGraphActions` (save / field note / mood board / signal) — these
  are Presence-native and should be embedded **subtly** in the GGM page,
  not styled away.
- `PublicEnquiryDialog` — the enquiry submission path; we will style its
  trigger as a GGM paper pill button.
- `resolveRoomKey()` / `RoomKeyEntryPayload` — unchanged.
- `fetchDemoOrPublicNode` / `fetchPublicNode` — unchanged.
- `PortfolioRenderer` entry — we will branch within it (or within
  `PresenceDnaRenderer`) when a custom renderer key matches, leaving the
  rest of the chain intact.

## Confidence

High. The current GGM page either dispatches to `GalleryRoom`
(room-graph) or to one of the editorial blueprints; in either case the
source-site signals listed above are absent. Re-rendering through the new
GGM-specific renderer is the only realistic path to faithful parity.
