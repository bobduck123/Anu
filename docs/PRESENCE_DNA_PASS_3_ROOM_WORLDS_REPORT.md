# Presence DNA Pass 3 — Room Worlds report

**Status:** Pass 3 complete. The three priority rooms have been
roomified — they are no longer single-scroll websites. A RoomWorld
model, RoomShell, three navigation models, three adapted CodePen
effects, and two mobile room-navigation modes have shipped. Three
previously-converted demo rooms remain, working through the legacy
blueprint chain.

**Branch:** `feature/presence-ecosystem-alpha`
**Date:** 2026-05-19

---

## 1. Summary

Pass 3 introduced a model layer above blueprints:

```
PresenceDNA → RoomWorld → RoomShell → Chambers + RoomObjects
              ↑           ↑           ↑
              new         new         new
```

The RoomShell wraps the room as an environment with an atmosphere
layer, a chamber navigator, scroll-snap chambers, an invitation
portal, and a chosen mobile room nav. The Pass 1/2 blueprint chain is
retained as a graceful fallback for any DNA that doesn't (yet) map to
an implemented world type.

Three CodePen effects from the user-supplied `C:/Dev/tools/` library
have been adapted into typed, reduced-motion-safe, mobile-aware
modules. None of the source code is pasted in.

## 2. Files changed

**New (16):**

Library
- `lib/presence/world/types.ts` — RoomWorld, RoomObject, navigation, atmosphere, transition types.
- `lib/presence/world/select.ts` — `selectRoomWorld(node, dna)` pure resolver.
- `lib/presence/world/registry.ts` — registries + implemented/scaffolded flags + fallbacks.

Shell + Navigation
- `components/presence/world/RoomShell.tsx` — main shell.
- `components/presence/world/ChamberNav.tsx` — desktop chamber rail.
- `components/presence/world/RoomDock.tsx` — mobile dock.
- `components/presence/world/PortalSheet.tsx` — mobile bottom sheet.
- `components/presence/world/AtmosphereLayer.tsx` — atmosphere router.
- `components/presence/world/InvitationPortal.tsx` — CTA-as-portal.

CodePen adaptations
- `components/presence/world/MagneticHover.tsx` — adapted from `digital-character-hover` + `romantic-cs-portfolio-...-cursor-reveal-...`.
- `components/presence/world/BioluminescentField.tsx` — adapted from `bioluminescence` + `cosmos-in-motion-a-3d-particle-study`.
- `components/presence/world/IsometricCardLayer.tsx` — adapted from `isometric-card-grid`.

Room conversions
- `components/presence/blueprints/GalleryRoom.tsx` — painter (WallPanels).
- `components/presence/blueprints/SoundRoom.tsx` — DJ (SpatialChambers, nocturnal atmosphere).
- `components/presence/blueprints/MaterialStudioDesk.tsx` — carpenter (DeskSurface, isometric).

Docs
- `docs/PRESENCE_CODEPEN_ADAPTATION_REGISTER.md` — Phase 2 register.
- `docs/PRESENCE_DNA_PASS_3_ROOM_WORLDS_REPORT.md` — this file.

**Modified (3):**
- `components/presence/PresenceDnaRenderer.tsx` — Pass 3 dispatch: if world is implemented → render via RoomShell + new chamber blueprint, else fall through to the Pass 1/2 chain.
- `app/globals.css` — appended ~750 lines of Pass 3 CSS (RoomShell, chambers, atmosphere variants, magnetic, isometric, dock, portal sheet, invitation portal, three room-specific styles, mobile breakpoints, reduced-motion overrides).
- `docs/PRESENCE_DNA_BEAUTY_QA.md` — replaced with Pass 3 standard.

**Untouched:**
- Backend.
- All Pass 1 blueprints, behaviour presets, signature modules, theme genome, DNA model, demo overlay + profile fixtures, uniqueness engine.

## 3. Current system audit (Phase 1)

Before this pass, every blueprint was a vertical narrative: hero →
story → works/services → proof → contact. The mobile experience was a
responsive stack. Floating index nav (Pass 1) was the only chamber-
adjacent mechanic.

**Most urgent to roomify:** painter (premium expectation hurt most by
section stack), DJ (club metaphor wasted on a page), carpenter
(workshop metaphor wasted on cards).

**Preserved:** PresenceDnaRenderer dispatch, DNA inference + theme
genome, image-treatment + texture system, all four behaviour presets,
the three object-like signatures (MaterialsBoard, BeforeAfterSlider,
QuoteOracle), demo seed data, backend persistence, uniqueness engine.

## 4. RoomWorld model (Phase 3)

A RoomWorld declares **what the room IS**:

```ts
interface RoomWorld {
  world_type: WorldType;                 // 12 types
  navigation_model: WorldNavigationModel; // 10 models
  mobile_nav_mode: MobileRoomNavMode;     // 4 modes
  chambers: RoomChamber[];
  atmosphere: WorldAtmosphere;            // 9 atmospheres
  spatial_depth: WorldSpatialDepth;       // 4 levels
  transition_style: WorldTransitionStyle; // 9 styles
  room_objects: RoomObject[];             // typed inventory
  semantic_fallback_label: string;        // SEO/a11y
}
```

`selectRoomWorld(node, dna)` is pure — given the same node + DNA, it
returns the same RoomWorld. Chambers are derived from DNA + actual
node content (works, services, media_embeds, proof_items). Room
objects are populated from real PresenceNode rows; nothing is
fabricated.

## 5. RoomShell architecture (Phase 4)

`RoomShell` is the default wrapper for any DNA room with an
implemented world type. It owns:

- viewport-aware room environment (`100dvh` shell, internal scroller)
- atmosphere layer (background, `aria-hidden`)
- desktop chamber nav rail (only for `spatial_chambers`, `wall_panels`,
  `desk_surface` navigation models)
- chamber scroll-snap with IntersectionObserver-driven active state
- threshold corner badge with display name + world eyebrow
- CTA slot pinned to bottom-right on desktop, full-width above the
  dock on mobile
- mobile nav switch: `room_dock` or `portal_sheet` based on world

It is SSR-safe: active chamber initialises from the first chamber id
in props; IntersectionObserver is attached only after mount.

Reduced-motion: the global CSS rule disables scroll-snap, animations,
and translates; the shell content remains a normal scrollable column.

## 6. Converted rooms (Phase 5)

### `rooms-gallery-painter` → Gallery Room / WallPanels

- World: `gallery_room`
- Navigation: `wall_panels`
- Atmosphere: `quiet_gallery`
- Chambers: Threshold → Wall → Wall text → Commission → Notes → Invitation
- Mobile nav: `portal_sheet`
- Signature interaction: horizontal wall with pointer-drag + scroll-
  snap. Each frame is a hanging picture with a picture wire / hook
  and a museum label. Magnetic hover on hover.

### `rooms-underground-dj` → Sound Room / SpatialChambers

- World: `sound_room`
- Navigation: `spatial_chambers`
- Atmosphere: `nocturnal` (BioluminescentField particle layer)
- Chambers: Threshold → Booth → Signal wall → Archive → Booking
- Mobile nav: `room_dock`
- Signature interaction: audio decks in the booth, glitch-shimmering
  signal tiles on the signal wall (works rendered with controlled
  glitch + scanline overlay). Threshold title uses Pass 1 `controlled_glitch`
  behaviour for the room name.

### `rooms-material-carpenter` → Material Studio / DeskSurface

- World: `material_studio`
- Navigation: `desk_surface`
- Atmosphere: `warm_material`
- Chambers: Workbench → Shelf → Pathway → Appreciation → Commission
- Mobile nav: `room_dock`
- Signature interaction: IsometricCardLayer tilts the workbench plane
  to host the MaterialsBoard signature (carrying over from Pass 2).
  Shelf cards lift with magnetic hover. Appreciation notes are
  rotated cards with a taped corner.

The three previously-converted rooms (local-carpenter, healer,
consultant) still render through the Pass 1/2 blueprint chain
unchanged. Their proof-case scores are preserved.

## 7. Adapted CodePen modules (Phase 6)

| Source folder | Adaptation | Where used |
|---|---|---|
| `digital-character-hover` + `romantic-cs-portfolio-...-cursor-reveal-...` | `MagneticHover` (rAF + spring + pointer-fine check) | Wall frames in gallery_room, signal tiles in sound_room, shelf cards in material_studio |
| `bioluminescence` + `cosmos-in-motion-...` | `BioluminescentField` (vanilla canvas, density-by-device, visibility-aware) | Nocturnal atmosphere — sound_room today |
| `isometric-card-grid` | `IsometricCardLayer` (CSS-only static tilt with reduced-motion fallback) | Workbench in material_studio (hosts MaterialsBoard) |
| `gsap-draggable-image-gallery` (concept only) | Native CSS scroll-snap + pointer-drag handler in `GalleryRoom`'s HorizontalWall | Wall in gallery_room |

All four obey the rules in `docs/PRESENCE_CODEPEN_ADAPTATION_REGISTER.md`:
typed, registered, reduced-motion-safe, mobile-safe, no global DOM
hacks, no SSR-breaking imports, no source code pasted in.

## 8. Mobile room navigation (Phase 7)

Two mobile room-nav modes shipped:

- **RoomDock** — bottom pill dock with chamber glyph + room language
  label. Active chamber highlighted. Auto-applied to spatial_chambers
  and desk_surface worlds.
- **PortalSheet** — trigger pill spawns a bottom sheet that presents
  the room as destinations with chamber summaries. Auto-applied to
  wall_panels worlds.

Pass 1's `FloatingIndexNav` is retained for legacy/unconverted rooms
that still want it.

Room language confirmed live: Threshold / Booth / Signal wall /
Archive / Booking (DJ); Workbench / Shelf / Pathway / Appreciation /
Commission (carpenter); Threshold / Wall / Wall text / Commission /
Notes / Invitation (painter).

## 9. Beauty QA updates (Phase 8)

`docs/PRESENCE_DNA_BEAUTY_QA.md` was rewritten to a Pass 3 standard.
Six new fail conditions added (single-scroll, hero+sections+CTA,
responsive-only mobile, decorative effects, pasted CodePen, no spatial
metaphor). Twelve new checks added covering room metaphor clarity,
chamber/object model, mobile room nav, atmosphere consistency, object
interaction, CTA as portal, reduced-motion fallback, accessibility +
SEO retention, first-screen specificity, no industry template,
regenerability, and the carpenter proof case.

## 10. Verification results (Phase 9)

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run build` | ✓ Next 16 / Turbopack. All routes generated. |
| `npx tsx lib/presence/uniqueness.test.ts` | ✓ all pairs distinct; carpenter proof case 0.057; required-field check passes; no-`room_type`-in-selector regression passes |
| Browser: `/p/rooms-gallery-painter` | ✓ `world=gallery_room`, `nav=wall_panels`, `atmosphere=quiet_gallery`, 6 chambers, 6 wall frames, 6 chamber-nav items, threshold name "Naoko Sato", CTA slot mounted, no console errors |
| Browser: `/p/rooms-underground-dj` | ✓ `world=sound_room`, `nav=spatial_chambers`, `atmosphere=nocturnal`, 5 chambers (Threshold/Booth/Signal wall/Archive/Booking), 2 booth decks, 6 signal tiles, BioluminescentField canvas mounted, RoomDock mounted, no console errors |
| Browser: `/p/rooms-material-carpenter` | ✓ `world=material_studio`, `nav=desk_surface`, `atmosphere=warm_material`, 5 chambers (Workbench/Shelf/Pathway/Appreciation/Commission), IsometricCardLayer tilted, MaterialsBoard signature mounted, 6 shelf cards, 4 pathway steps, 2 appreciation notes, RoomDock mounted, no console errors |
| Regression: `/p/rooms-local-carpenter` (unconverted) | ✓ falls through to legacy `trust_conversion` blueprint, B/A signature renders, 4 trust pills, no console errors |
| Reduced-motion compliance | ✓ Verified at CSS layer: scroll-snap disabled, all `presence-behaviour-*` motion suppressed, isometric flattened, magnetic transform reset, biolum draws one static frame, oracle cycling stops. Each component also gates via `matchMedia('(prefers-reduced-motion: reduce)')`. |
| No console errors / hydration errors | ✓ across all four rooms above |
| Accessibility basics | ✓ each chamber is `<section aria-label>`, shell is `<main aria-label>`, dock buttons reachable, focus styles present, semantic order preserved without JS |

Screenshot capture in the preview tool timed out on a couple of rooms
(headless browser stalled waiting on Unsplash images to fully load).
DOM-level verification confirmed all structural and behavioural
properties for each room. No console or hydration errors reported by
the dev server.

## 11. Known gaps

1. **Three of six demo rooms not yet roomified.** local-carpenter,
   healer, consultant still render through the Pass 1/2 blueprint chain.
   This was a deliberate Pass 3 scoping decision ("convert three deeply,
   don't shallow-convert all six").

2. **Atmospheres beyond the three implemented are scaffolded.** Six
   atmosphere variants (`paper_archive`, `soft_care`,
   `industrial_editorial`, `civic_field`, `ritual`, `cinematic`)
   currently fall back to `quiet_gallery`, `nocturnal`, or
   `warm_material` via `fallbackAtmosphere`.

3. **Seven navigation models scaffolded.** `archive_drawers`,
   `portal_cards`, `object_orbit`, `floorplan`, `horizontal_gallery`,
   `radial_index`, `scene_stack` exist in types and registry but have
   no component yet.

4. **Adapt-later queue.** 20+ CodePen effects in
   `PRESENCE_CODEPEN_ADAPTATION_REGISTER.md` are queued. The next
   pass should pick 3–4 high-value ones (suggested: scroll-driven
   typography from `12-principlesbrutalist-...`, ImageMaskReveal from
   the romantic cursor-reveal export, frosted edges from
   `frosted-saturated-borders`, archive drawers from
   `puzzle-with-sliding-insertion-after-before`).

5. **WallPanels horizontal-scroll has no progress indicator.** Add a
   small scroll-progress dot rail near the wall on mobile so the user
   knows there's more to pull through.

6. **PortalSheet active state on first paint.** The portal sheet
   trigger shows the most recently active chamber label, but on first
   paint always shows the threshold. Consider syncing on scroll.

7. **DNA persistence does not yet store world_type.** The DNA model
   itself has no `world` category — `selectRoomWorld()` derives the
   world purely from existing DNA signals. A future pass could promote
   `world_type` to a first-class DNA field that the admin can override.

## 12. Successor-agent recommendations

The next pass should, in order of leverage:

1. **Roomify the remaining three rooms.** local-carpenter as a
   `trust_workshop` world (front-of-shop / job-board / quote-desk /
   neighbours / call). healer as a `care_sanctuary` world (threshold /
   ways / pathway / method / begin). consultant as a
   `consultation_office` world (lobby / engagements / voices /
   conversation). Each should ship with a distinct atmosphere variant.

2. **Implement the `archive_drawers` navigation model**, which unlocks
   `archive_room` and `field_room` worlds. The
   `puzzle-with-sliding-insertion-after-before` CodePen is the right
   reference.

3. **Promote `world_type` into Presence DNA.** Allow admins to override
   the resolver via the Studio DNA editor. Add a `metadata.room_world`
   override path mirroring `metadata.presence_dna`.

4. **Add a wall progress indicator** for WallPanels (mobile + desktop).

5. **Ship two more atmosphere variants** — `paper_archive` and
   `soft_care` first, since they unlock visually distinct worlds for
   archives and sanctuaries.

6. **Visual regression baseline.** Use Playwright (already in
   devDependencies) to snapshot the six demo rooms at desktop / mobile
   / reduced-motion. Fix the screenshot stall first by either
   pre-cacheing Unsplash images or stubbing them in a test environment.

## 13. Exact commands

```bash
# Frontend
cd C:/Dev/Flora_fauna/presence-app
npm run typecheck
npm run build
npx --yes tsx lib/presence/uniqueness.test.ts

# Dev
npm run dev   # http://localhost:3001
# Visit:
#   /p/rooms-gallery-painter      (Pass 3 — GalleryRoom)
#   /p/rooms-underground-dj       (Pass 3 — SoundRoom)
#   /p/rooms-material-carpenter   (Pass 3 — MaterialStudioDesk)
#   /p/rooms-local-carpenter      (legacy — TrustConversion)
#   /p/rooms-community-healer     (legacy — ProgramCare)
#   /p/rooms-sharp-consultant     (legacy — EditorialIdentity)

# Switch any unconverted slug to a legacy-only render path (debug)
# by passing forceLegacyBlueprints to PresenceDnaRenderer (e.g. via
# a future Studio preview toggle). No env switch is shipped today.
```

## Pass 3 success criteria — receipt

| Criterion | Status |
|---|---|
| `rooms-gallery-painter` feels like entering a gallery | ✓ WallPanels with hanging frames, museum labels, picture wires, quiet-gallery atmosphere. Threshold card invites the user to "Enter the gallery". |
| `rooms-underground-dj` feels like entering a sound/signal room | ✓ Nocturnal atmosphere with bioluminescent particles, threshold lowercase glitch title, booth with audio decks, signal wall with glitch shimmer tiles, archive prose, booking portal. |
| `rooms-material-carpenter` feels like entering a material studio | ✓ Tilted isometric workbench hosting the MaterialsBoard, warm-material atmosphere, shelf row with magnetic hover, numbered pathway, taped appreciation notes, commission portal. |
| Room metaphor obvious within five seconds | ✓ For all three: world eyebrow ("A quiet gallery" / "Nocturnal signal room" / "A working studio surface") + threshold copy + atmosphere combine to establish the metaphor immediately. |
| Single-scroll websites no longer the final form | ✓ Chambers, atmosphere, mobile dock/sheet — none of the three rooms read as hero + sections + CTA. |
