# Presence Pass 6 — Natural motion, three new dynamics, visual chooser

**Status:** Pass 6 complete. The Room Engine ships shared motion
tokens and a per-room onboarding hint. Three new engagement dynamics
are live as standalone, reusable React components — `orbit_constellation`,
`object_tableau`, `portal_cascade` — each with its own demo route, its
own visual identity, its own interaction grammar, its own reduced-
motion fallback. A visual chooser at `/presence-chooser` shows all
four dynamics as cards with animated micro-previews, plus atmosphere
swatches and motion-profile previews.

**Branch:** `feature/presence-ecosystem-alpha`
**Date:** 2026-05-20

---

## 1. Summary

```
Pass 5 → camera depth, pre-mounted neighbours, object skins
Pass 6 →
  • shared motion tokens (CSS custom properties)
  • RoomOnboardingHint (first-visit overlay per worldId)
  • dynamicRegistry — chamber_walk + orbit + tableau + cascade
  • three new dynamic shells, each standalone + accessible
  • PresenceWorldChooser — visual entry point with live previews
  • CodePen audit extended (4 new adaptations, 7 reviewed-but-deferred)
  • useFlipInspect — scaffolded for shared-element panel transitions
```

The chamber-walk engine is unchanged — Pass 5's three demos remain.
The three new dynamics are completely separate code paths, free to
feel substantially different.

## 2. Files changed

**New library files (4):**
- `lib/presence/world/motion.ts` — shared easing curves and durations as TS constants + a CSS-vars stringifier.
- `lib/presence/world/dynamicRegistry.ts` — registry of four dynamics with label, summary, feeling, suitedFor, matchSignals.
- `lib/presence/world/dynamicRegistry.test.ts` — 7 unit tests.
- `components/presence/world/engine/useFlipInspect.ts` — FLIP / shared-element capture hook (returns fromRect + shouldAnimate; scaffolded for portal panel adoption).

**New engine pieces (1):**
- `components/presence/world/engine/RoomOnboardingHint.tsx` — first-visit overlay per worldId, localStorage-gated, dismissible.

**New dynamic shells (3):**
- `components/presence/world/dynamics/OrbitConstellation.tsx` — central mark + orbiting satellites, rotation via left/right, focus via forward, inspect via Enter or tap.
- `components/presence/world/dynamics/ObjectTableau.tsx` — tilted surface with horizontal clusters, pointer-driven tilt, forward zooms in.
- `components/presence/world/dynamics/PortalCascade.tsx` — layered portals stacked in depth, forward folds forward, branch tabs left/right.

**New chooser components (5):**
- `components/presence/world/chooser/PresenceWorldChooser.tsx` — the page.
- `components/presence/world/chooser/EngagementDynamicPreviewCard.tsx` — single dynamic card.
- `components/presence/world/chooser/DynamicMiniPreview.tsx` — animated CSS micro-previews per dynamic.
- `components/presence/world/chooser/AtmospherePreviewStrip.tsx` — 9 atmosphere swatches.
- `components/presence/world/chooser/MotionProfilePreview.tsx` — 4 motion-profile tiles with pulse-glyph.

**New public routes (4):**
- `/presence-chooser` — visual entry point.
- `/dynamics/orbit` — live OrbitConstellation demo (Heron Strategy fixture).
- `/dynamics/tableau` — live ObjectTableau demo (Salt & Grain workshop fixture).
- `/dynamics/cascade` — live PortalCascade demo (Mira K. tour fixture).

**Modified (4):**
- `lib/presence/world/graph.ts` — added Pass 6 object kinds (`case_study`, `testimonial`, `press`).
- `lib/presence/world/useRoomNavigator.ts` — exports `makeRoomNavigatorReducer` + `NavigatorAction` (test seam).
- `components/presence/world/engine/RoomGraphRenderer.tsx` — mounts `RoomOnboardingHint` for every world graph.
- `app/globals.css` — ~580 lines appended: motion tokens, onboarding overlay, three full dynamic stylesheets, chooser + micro-preview keyframes.

**Updated docs (1):**
- `docs/PRESENCE_CODEPEN_ADAPTATION_REGISTER.md` — extended with Pass 6 adaptations (cosmic-clock, isometric-card-grid + infinite-grid, editorial-fashion-slider + multi-stage-comparator + time-traveling-art-gallery, frosted-saturated-borders extension) plus 7 deferred entries.

**Untouched:**
- Backend (no changes this pass).
- Pass 1–5 blueprints, signature modules, theme genome, DNA model, demo overlay, uniqueness engine.
- The three converted Pass 5 demo rooms — they continue to use `RoomGraphRenderer`, now with the onboarding hint mounted on first visit.

## 3. The three new dynamics

### Orbit Constellation (`/dynamics/orbit`)

- World feeling: cinematic, networked, relational.
- Best for: consultants, performers, multi-disciplinary identities, organisations, cultural networks.
- Interaction:
  - **left/right** rotates the constellation 45° per input
  - **forward / Enter** focuses the satellite currently closest to north (and inspects it)
  - **back / Escape** unfocuses
  - **tap** any satellite to inspect
- 12 satellites distributed across 3 orbital radii (7 per ring, staggered). Centre mark is a glowing dot with the entity name beneath. Each satellite counter-rotates so labels stay upright. Reduced-motion drops to a vertical list of satellites.
- Verified live: 12 satellites mounted, 4 HUD buttons, no console errors.

### Object Tableau (`/dynamics/tableau`)

- World feeling: tactile, grounded, human.
- Best for: makers, artists, healers, tradies, food/craft/local business.
- Interaction:
  - **pointer movement** tilts the entire surface (skipped on touch + reduced-motion)
  - **left/right** moves between clusters
  - **forward / Enter** zooms the focused cluster
  - **back / Escape** returns to the whole surface
  - **tap** any object to inspect
- 4 clusters (Materials, Pieces on the bench, Pinned notes, Commission). Objects are positioned with per-object x/y/rotation offsets so the arrangement reads as physical placement.
- Verified live: 4 clusters, first cluster ("Materials") focused, 11 objects, 4 HUD buttons, no console errors.

### Portal Cascade (`/dynamics/cascade`)

- World feeling: theatrical, editorial, kinetic.
- Best for: performers, venues, events, organisations, launches.
- Interaction:
  - **branch tabs** (top): switch between named tracks (Tour, Studio, Booking)
  - **left/right** moves between branches
  - **forward / Enter** folds forward one layer in the active branch
  - **back / Escape** folds back one layer
  - **tap** any object in the front layer to inspect
- 3 branches, each with 1–3 layers in depth. Layers behind the front are `pointer-events: none` and `inert`.
- Verified live: 3 branches with "Tour" active, "Tonight" as the front layer, 3 layers in cascade, no console errors.

## 4. The visual chooser

`/presence-chooser` is the visual entry point. It renders:

- **Header** — "How will visitors move through your Presence?" with a one-line explanation that previews on every card mean you don't have to imagine.
- **4 dynamic cards** — each with a live animated micro-preview, a one-line summary, a "feeling" tag (calm / cinematic / tactile), suited-for tags, and an "Enter demo" link.
- **Atmosphere strip** — 9 atmosphere swatches (quiet gallery, nocturnal signal, warm material, paper archive, soft care, industrial editorial, civic field, ritual, cinematic). Each shows the background gradient + accent dot.
- **Motion profile strip** — 4 profiles (calm, cinematic, kinetic, minimal) each with a 3-dot pulse glyph tempo-coded to the profile's speed.

Mini-previews are CSS-only and SSR-safe. Each respects
`prefers-reduced-motion`. The chooser is structured to consume a
future backend Customisation Manifest v1 — today the data comes from
`dynamicRegistry.ts` and the local atmosphere/motion arrays inside
the respective preview components.

## 5. Pass-5 improvements (Mission A)

| Area | Improvement |
|---|---|
| Natural motion tokens | `--presence-ease-calm`, `--presence-ease-exit`, `--presence-ease-nudge`, `--presence-ease-breath`, `--presence-ease-snap` + 6 duration tokens; reduced-motion overrides drop durations to 0–100ms. |
| Onboarding | `RoomOnboardingHint` mounts on first visit per `graph.id`; localStorage-gated; describes five-gesture model (forward/left/right/back/inspect). |
| Object believability | Pass 5 skin polish stays; new Pass 6 motion tokens drive smoother hover/focus on every object via `--presence-ease-nudge`. |
| World onboarding | Hint card explicitly answers: where am I, how do I move, what can I inspect, how do I retreat, how do I contact. |
| Shared-element inspect | `useFlipInspect` shipped as a primitive (capture-fromRect + reduced-motion flag); ready to wire into `PortalPanel` in a follow-up — current panel uses a calm scale-in animation aligned with the new tokens. |

Existing Pass 5 demos are untouched aside from the onboarding hint
mounting and motion-token-driven smoother transitions.

## 6. CodePen audit summary

Four new adaptations entered the register:

| Source folder(s) | Adaptation |
|---|---|
| `cosmic-clock` + `cosmos-in-motion` (concept only) | `OrbitConstellation` |
| `isometric-card-grid` + `infinite-grid` (concept extended) | `ObjectTableau` |
| `editorial-fashion-slider` + `multi-stage-comparator` + `time-traveling-art-gallery` (concept only) | `PortalCascade` |
| `frosted-saturated-borders` (extended) | chooser card hover + onboarding overlay backdrop |

Seven additional folders were reviewed and deferred with reasons
(see `PRESENCE_CODEPEN_ADAPTATION_REGISTER.md`).

## 7. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run build` | ✓ all routes generated; new routes `/presence-chooser`, `/dynamics/orbit`, `/dynamics/tableau`, `/dynamics/cascade` present |
| `npx tsx lib/presence/world/dynamicRegistry.test.ts` | ✓ **7/7** new tests pass |
| `npx tsx lib/presence/world/navigator.test.ts` | ✓ 13/13 (regression) |
| `npx tsx lib/presence/world/audioRegistry.test.ts` | ✓ 7/7 (regression) |
| `npx tsx lib/presence/uniqueness.test.ts` | ✓ carpenter proof case 0.057 holds |
| Browser: `/presence-chooser` | ✓ 4 cards, 4 mini-previews mounted, 9 atmosphere tiles, 4 motion profiles |
| Browser: `/dynamics/orbit` | ✓ 12 satellites + centre + 4 HUD buttons |
| Browser: `/dynamics/tableau` | ✓ 4 clusters, 11 objects, "Materials" focused, 4 HUD buttons |
| Browser: `/dynamics/cascade` | ✓ 3 branches with "Tour" active, 3 layers, "Tonight" at the front |
| Browser: `/p/rooms-gallery-painter` (regression) | ✓ engine shell + 3 pre-mounted slots + onboarding overlay mount |

## 8. Manual QA notes

- All four dynamic cards in the chooser hover-lift smoothly with the new motion tokens (no bounce, no over-shoot).
- Onboarding overlay only appears once per worldId (localStorage `presence-onboarded:<world-id>`); dismissing it sticks across reloads.
- All four dynamics have visible focus rings on tab navigation and respond to `Escape` correctly.
- The mini-previews continue to animate at variable tempos but pause/stop under `prefers-reduced-motion`.
- The Pass 5 demos still keep their Pass 5 behaviour (camera-rig pre-mounts, audio lifecycle, signal-tile glow, gallery-frame physicality).

## 9. Hard rules — receipt

| Rule | Status |
|---|---|
| No demos removed. | ✓ Six demo slugs + three Pass-5 converted rooms continue to exist. |
| Do not collapse all Presences into one format. | ✓ Four dynamics have distinct feelings, distinct interactions, distinct visual identities. |
| Do not make the result a static webpage. | ✓ Every dynamic is directional/spatial. The chooser is the only static page and it shows live animation previews. |
| Do not rely on imagination where preview can be shown. | ✓ Every chooser card has an animated micro-preview. Every dynamic has a live demo. |
| Do not paste CodePen exports wholesale. | ✓ All four Pass-6 adaptations are concept-only with original React/TS implementations. Audit register documents what was lifted vs deferred. |

## 10. Known limitations

1. **FLIP / shared-element transitions are scaffolded but not wired
   into PortalPanel yet.** The `useFlipInspect` hook captures the
   source `fromRect` and exposes a `shouldAnimate` flag, but the
   PortalPanel doesn't yet read it. Wiring requires a panel ref +
   `useLayoutEffect` for the inverse transform — straightforward
   follow-up. Current panel uses the Pass-5 calm scale-in.

2. **Orbit Constellation rotation is discrete (45°), not free.**
   Each left/right input rotates by 45°. A smoother free-rotate
   (with drag / pinch) was out of scope for this pass.

3. **Object Tableau pointer tilt is per-axis only (no gyroscope).**
   Mobile-touch devices skip tilt entirely; only the cluster shift
   and zoom respond to touch input. Adding DeviceOrientation events
   for tablet/phone tilt is a worthwhile follow-up.

4. **Portal Cascade branch transition does not fold sideways.**
   Switching branches resets layers to 0 with the standard fade;
   it does not currently animate a horizontal "deal" between branch
   cards. Pure visual polish for a future pass.

5. **Chooser cards do not yet trigger an actual "apply this
   selection" save.** They visualise the chosen dynamic and link to
   its live demo; persisting the choice to the backend manifest is
   blocked on the Customisation Manifest v1 backend work and was
   intentionally not scoped into this pass.

6. **No tests assert keyboard focus paths inside the dynamics.**
   The reducer/registry tests are pure-logic. Verification of
   directional input was done in-browser. A Playwright pass would
   close this gap.

## 11. Next-pass recommendations

1. **Wire `useFlipInspect` into `PortalPanel`.** The hook is ready;
   the panel just needs to read `fromRect`, compute the inverse, and
   apply it as a CSS variable on entry/exit.
2. **Persist the chooser selection.** When the Customisation Manifest
   v1 backend lands, the chooser becomes a save form too.
3. **DNA → dynamic suggestion.** The registry already has
   `matchSignals`; use them to recommend a dynamic on the chooser
   based on the owner's actual DNA.
4. **Atmosphere preview wire-up.** Today the strip is decorative;
   selecting an atmosphere should preview-apply it inside the live
   chooser-card mini-previews.
5. **A second demo per dynamic.** Each dynamic deserves at least two
   demo fixtures (e.g. orbit for a collective AND a consultant) so
   the variation is visible inside the chooser.

## 12. Exact commands

```bash
cd C:/Dev/Flora_fauna/presence-app
npm run typecheck
npm run build
npx --yes tsx lib/presence/world/dynamicRegistry.test.ts   # 7 new tests
npx --yes tsx lib/presence/world/navigator.test.ts          # 13 regression
npx --yes tsx lib/presence/world/audioRegistry.test.ts      # 7 regression
npx --yes tsx lib/presence/uniqueness.test.ts               # carpenter proof case
npm run dev   # http://localhost:3001

# Pass 6 new surfaces:
#   /presence-chooser              (visual chooser with 4 dynamic cards)
#   /dynamics/orbit                (Orbit Constellation demo)
#   /dynamics/tableau              (Object Tableau demo)
#   /dynamics/cascade              (Portal Cascade demo)

# Pass 1–5 demos unchanged:
#   /p/rooms-gallery-painter       (engine + onboarding hint mounted)
#   /p/rooms-underground-dj
#   /p/rooms-material-carpenter
#   /p/rooms-local-carpenter       (legacy blueprint chain)
#   /p/rooms-community-healer      (legacy)
#   /p/rooms-sharp-consultant      (legacy)
```
