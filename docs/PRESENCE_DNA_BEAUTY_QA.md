# Presence DNA — Beauty QA checklist (Pass 3 standard)

This is the acceptance harness for any Presence Room rendered through
the Presence DNA system. A room is **not ready to ship** until every
box is checked. Run through the list on desktop AND mobile, and once
with `prefers-reduced-motion: reduce` enabled in the browser.

## The new product law (Pass 3)

> A Presence Room is not a page.
> A Presence Room is an inhabitable digital identity environment.

Existing laws unchanged:
- Industry informs the room. Identity authors the room.
- DNA is the rendering authority. Profession is an input signal, never
  the final layout selector.

A room is now visited, not scrolled. Even when navigation is implemented
with native scroll under the hood, the metaphor must be spatial:
chambers, walls, surfaces, drawers, foyers — not "sections".

## Pass-3 fail conditions (any of these → fail)

1. The room can be understood as a normal single-scroll website.
2. The main experience is hero + sections + CTA.
3. Mobile is merely responsive rather than room-native.
4. Effects are decorative rather than identity-bearing.
5. CodePen-derived effects are pasted in rather than systematised
   (re-typed, re-registered, reduced-motion-safe, mobile-safe).
6. The room has no spatial metaphor.

## The Pass-3 checklist

1. **Room metaphor clarity.** The metaphor (gallery, studio, sound
   room, workshop, foyer, archive) is obvious within five seconds.

2. **Chamber/object model.** The room is composed of named chambers
   (visible in nav rail or dock) and the content within is composed of
   typed `RoomObject`s (wall, table, drawer, floating, portal). No
   raw "sections" remain.

3. **Mobile room navigation.** Mobile uses one of `room_dock`,
   `portal_sheet`, or `floating_index`. Labels use room language
   (Entrance, Wall, Desk, Archive, Sound, Booth, Booking) not generic
   web language (About, Work, Contact).

4. **Atmosphere consistency.** The chosen `AtmosphereLayer` matches
   the world's character. Nocturnal rooms feel nocturnal. Gallery
   rooms feel quiet. Material rooms feel warm. Atmosphere stays
   behind content and is `aria-hidden`.

5. **Object-level interaction.** At least one room object supports an
   identity-appropriate interaction (`inspect`, `expand`, `drag`,
   `play`, `compare`, `open_portal`, etc.). Pure read-only sections
   do not count.

6. **CTA as invitation portal.** The CTA is presented as an
   `InvitationPortal` (card / door / ribbon variant) — not a button
   at the bottom of a contact section.

7. **Reduced-motion room fallback.** With `prefers-reduced-motion:
   reduce`:
   - chamber scroll-snap is disabled; the page reads as a single
     accessible stack
   - `BioluminescentField` draws one static frame, no animation
   - `MagneticHover` does not translate elements
   - `IsometricCardLayer` flattens to a 2D layout
   - all behaviour presets from Pass 1 (`controlled_glitch`,
     `gallery_breath`, `material_reveal`, `editorial_snap`) remain
     reduced-motion-safe

8. **Accessibility + SEO structure retained.**
   - Each chamber is a `<section>` with `aria-label`
   - The main `<main>` element has an `aria-label` containing the
     display name
   - Heading levels are sensible (h1 in `<RoomShell>` threshold,
     h2 per chamber, h3 for objects)
   - All images have `alt` text
   - All interactive elements are keyboard reachable; visible focus
     present on every dock/nav/portal button
   - Without JavaScript, the chambers and their content remain readable
     in document order (semantic fallback label on the shell)

9. **First-screen specificity.** Could you swap the display name for
   another person in the same profession and the room would still feel
   right? If yes, the room is too generic.

10. **No industry template.** Two rooms with the same `practice.field`
    must not share the same world_type, navigation_model, atmosphere,
    and chambers all at once. Verify with the uniqueness engine.

11. **Regenerable from DNA.** Deleting the demo overlay for a room and
    re-inferring DNA must still produce a coherent room (may pick a
    different world; must not crash or render empty chambers).

12. **The proof case.** `rooms-material-carpenter` and
    `rooms-local-carpenter` share `practice.field === "building_trade"`.
    They must feel like two completely different worlds — material
    studio (DeskSurface) vs trust workshop (legacy TrustConversion).
    Uniqueness engine must score the pair well below the threshold
    (0.70). Today: 0.057.

## Pass-4 additional checks (Presence Room Engine v1)

Rooms running through `RoomGraphRenderer` (gallery_room, sound_room,
material_studio today) must additionally pass:

13. **Directional navigation works.** Forward (`ArrowUp` / `Enter` /
    HUD forward / dock forward) advances; left/right turn; back
    retreats. Each direction respects available exits and is disabled
    when no exit exists.

14. **Inspection works.** Tapping or clicking a `RoomObject` opens a
    `PortalPanel`. The panel has focus on its close button on open.
    `Escape` closes the panel. Closing returns focus to the
    previously-focused element. The chamber state is unchanged by
    inspect/close.

15. **Retreat hierarchy.** `Escape` (when inspecting) closes the
    panel first; otherwise retreat steps back through navigation
    history; otherwise retreat is a no-op. Browser back triggers the
    same hierarchy.

16. **Deep linking.** Visiting `/p/<slug>#<chamber-id>` lands directly
    on that chamber. Internal moves update the hash via
    `history.replaceState` (no history pollution).

17. **Reduced-motion fallback.** When `prefers-reduced-motion: reduce`
    is set, the engine renders a flat accessible document with a
    chambers TOC at the top and every chamber stacked vertically as
    `<section>` with full content visible — no camera, no portals, no
    HUD, no dock.

18. **Mobile dock + swipe.** The bottom dock surfaces forward/left/
    right/back as labelled buttons. Horizontal swipe gestures on the
    chamber stage turn left/right (threshold 60px horizontal, must
    dominate any vertical movement).

19. **No body scroll dependency.** The room is the viewport. Vertical
    scroll only exists inside opened portal panels (long text) and
    inside the reduced-motion fallback.

## How to run the audit

```bash
cd presence-app

# 1. Static + uniqueness
npm run typecheck
npm run build
npx tsx lib/presence/uniqueness.test.ts

# 2. Visit the six demo rooms locally
npm run dev
# Open http://localhost:3001/p/<slug> for:
#   rooms-gallery-painter     (GalleryRoom / WallPanels — Pass 3)
#   rooms-underground-dj      (SoundRoom / SpatialChambers — Pass 3)
#   rooms-material-carpenter  (MaterialStudioDesk / DeskSurface — Pass 3)
#   rooms-local-carpenter     (legacy TrustConversion — Pass 1)
#   rooms-community-healer    (legacy ProgramCare — Pass 1)
#   rooms-sharp-consultant    (legacy EditorialIdentity — Pass 2)

# 3. Mobile + reduced-motion + keyboard
#   - Resize to 375 × 812 — verify room_dock or portal_sheet appears
#   - Enable prefers-reduced-motion in DevTools — verify no animations
#   - Tab through the page — verify visible focus and that every
#     chamber is reachable
```
