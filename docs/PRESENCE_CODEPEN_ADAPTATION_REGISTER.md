# Presence CodePen Adaptation Register

Source library: `C:/Dev/tools/` — exported CodePen experiments. This
document records which sources we have inspected, what idea each
carries, and our adaptation decision. Pass 3 adapts three patterns
into the Presence DNA system. Many more are queued for adapt-later;
none have been pasted in.

Rules every adapted effect must obey:
- typed
- registered (in `lib/presence/world/registry.ts` or signature/behaviour
  registries)
- DNA-selectable
- reduced-motion safe (CSS @media + JS matchMedia)
- mobile safe or mobile-disabled with fallback
- SSR-safe (no `window` access at module top-level)
- no global DOM hacks unless isolated inside a single component

---

## Adapt now (Pass 3)

### 1. `digital-character-hover` + `romantic-cs-portfolio-...-cursor-reveal-...`
**Idea.** Cursor-pulled object: the hovered element follows the pointer
with a soft spring back to centre. The Romantic-cs export also
demonstrates cursor-mask image reveal — we extracted only the magnetic
pull, not the mask layer (queued for adapt-later).

**Classification.** cursor/hover behaviour + object interaction.

**Adaptation.** Re-implemented as `components/presence/world/MagneticHover.tsx`.
Pure React effect + rAF. Honours `prefers-reduced-motion` and
`pointer: fine`. Wraps any `RoomObject`.

**Risks managed.** GSAP and the original's mask-reveal canvas were
dropped. No global pointer listeners — listeners are scoped to the
wrapped element only. Transform is reset on cleanup.

**DNA mapping.** Used by wall objects in `gallery_room` (painter) and
signal tiles in `sound_room` (DJ). DNA does not opt in/out directly;
the world's blueprint chooses to apply it.

---

### 2. `bioluminescence` + `cosmos-in-motion-a-3d-particle-study`
**Idea.** A slow particle field that breathes light. Originally a D3
globe (`bioluminescence`) and a Three.js particle study; both share the
canvas-driven glow pattern.

**Classification.** background atmosphere.

**Adaptation.** Re-implemented as
`components/presence/world/BioluminescentField.tsx` — vanilla canvas,
no D3, no Three.js. Lower particle density on mobile. Pauses on
`visibilitychange`. Reduced-motion = single static frame.

**Risks managed.** Heavy library dependencies excluded. Density capped
per device. ResizeObserver re-seeds on container resize so the field
adapts to dynamic layouts.

**DNA mapping.** Mounted by `AtmosphereLayer` when atmosphere resolves
to `nocturnal`. Tied to `sound_room` worlds today.

---

### 3. `isometric-card-grid`
**Idea.** CSS-only tilted plane (`rotateX(45deg) rotateZ(45deg)`) that
hosts a grid of cards. Originally fixed positioned with scroll-driven
translateY. We extracted the static tilt only; the scroll mechanism is
queued for adapt-later.

**Classification.** spatial navigation + background atmosphere.

**Adaptation.** Re-implemented as
`components/presence/world/IsometricCardLayer.tsx`. Tilt is set as a
CSS variable; reduced-motion and coarse-pointer devices revert to a
flat layout.

**Risks managed.** Continuous animation removed. Inner content can
still be interactive (no `pointer-events: none` traps).

**DNA mapping.** Used by `desk_surface` navigation as the foundation
for `material_studio` (carpenter), hosting the MaterialsBoard
signature.

---

### 4. (Concept only, no code) `gsap-draggable-image-gallery`
**Idea.** Pointer-drag + inertia for a horizontal gallery wall.

**Classification.** gallery behaviour.

**Adaptation.** Concept extracted, GSAP not used. Implemented natively
in `GalleryRoom`'s `HorizontalWall` component using CSS `scroll-snap-type:
x mandatory` + a small pointer-drag handler that adjusts `scrollLeft`.
No external dependencies.

**Risks managed.** GSAP and Draggable plugin omitted. The drag handler
sets `pointer-capture` and gracefully skips when the gesture starts on
a link or button so clicks still work.

**DNA mapping.** `wall_panels` navigation in `gallery_room`. Mobile
gets native touch scrolling without drag intervention.

---

## Pass 6 additions — natural motion + three engagement dynamics

### 5. `cosmic-clock` + `cosmos-in-motion-a-3d-particle-study` (concept only)
**Classification.** orbit/constellation.

**Adaptation.** Extracted the rotating-around-a-centre concept into
`OrbitConstellation.tsx`. Pure CSS-transform implementation — no canvas,
no D3, no Three.js. Rings of satellites at three radii, rotation
controlled by left/right input. The centre and each satellite
counter-rotate so labels stay upright. Reduced-motion drops to a
sorted list. Keyboard navigation built in.

**Risks managed.** No physics engine, no infinite rotation. Each rotate
is a discrete user action (45° increments) so the scene is always
stable between inputs.

### 6. `isometric-card-grid` + `infinite-grid` (concept extended)
**Classification.** tableau / object interaction.

**Adaptation.** The Pass 3 `IsometricCardLayer` already lifted the tilt
pattern. Pass 6 builds on it for the dedicated `ObjectTableau` dynamic:
a horizontal flex surface that tilts with pointer movement and zooms
into the focused cluster on forward. Objects sit at random small
offsets/rotations so the surface reads as physical placement, not a
card grid.

**Risks managed.** Pointer-fine + reduced-motion guards. Mobile
fallback is a stacked flex-column layout. No rAF loops — tilt is
direct pointer → state → CSS variable.

### 7. `editorial-fashion-slider` + `multi-stage-comparator` + `time-traveling-art-gallery` (concept only)
**Classification.** portal / cascade.

**Adaptation.** Inspired the `PortalCascade` dynamic — branches arranged
as tabs, each branch's layers stacked in depth via `translateZ` and
`scale`, with `transform-style: preserve-3d`. Forward unfolds the next
layer; back folds back; left/right changes branch and resets layer to
0. Keyboard + HUD + mobile dock supported.

**Risks managed.** No JS animation loops; transitions are CSS only.
Layers behind the front layer are `pointer-events: none` and `inert`.
Reduced-motion path renders all branches and all layers stacked
vertically as a normal document.

### 8. `frosted-saturated-borders` (extended from Pass 5)
**Classification.** atmosphere / inspect.

**Adaptation.** Now applied to the chooser cards: hover lift +
accent-border highlight + soft shadow. Also extended to the
onboarding overlay backdrop.

### 9. CodePen examples reviewed at Pass 6 but not adopted now

| Source | Why deferred |
|---|---|
| `slack-discord-cyberpunk-2077-redesign-w-preact` | Concept only; chooser tab patterns informed engagement card styling but no code was lifted. |
| `boolean-field-geometry-from-binary-logic` | Visually striking but unclear identity payoff. |
| `physics-of-wiresjavascript` | Strong potential for orbit-decoration backdrop; deferred until orbit gets a "lit night" atmosphere variant. |
| `interactive-image-mosaic` | Tableau direction is now real — mosaic patterns queued for a "mosaic" tableau variant. |
| `safari-fix-css-scroll-driven-scroll-snapping-animations` | Reviewed for `scroll-driven` patterns; deferred — Pass 6's chosen interaction model is direct dispatch, not scroll. |
| `obsidian-gold-landing-template-tailwind-gsap` | Mood reference for editorial atmospheres only. |
| `sweet-pseudo-text-effects` | Will inform per-room typography motion in a future pass. |

---

## Adapt later (queued)

| Source | Idea | Target classification |
|---|---|---|
| `gsap-floating-image-reveal-portfolio` | Floating image reveal on scroll | object interaction / image treatment |
| `menu-thumbnail-flip-animation` | Hover-driven thumbnail flip | gallery behaviour / chamber transition |
| `interactive-image-mosaic` | Mosaic tile interaction | gallery behaviour |
| `cosmos-in-motion-a-3d-particle-study` (full) | 3D constellation particles | background atmosphere (Tier 3) |
| `12-principlesbrutalist-scroll-page-with-gsap` | Brutalist scroll typography | typography behaviour |
| `hyper-kinetic-brutalism` | Kinetic typography entrance | typography behaviour |
| `puzzle-with-sliding-insertion-after-before` | Sliding card insertion | object interaction |
| `safari-fix-css-scroll-driven-scroll-snapping-animations` | Robust scroll-snap polyfill | chamber transition |
| `time-traveling-art-gallery` | Time-axis gallery walk | gallery behaviour |
| `frosted-saturated-borders` | Frosted-glass edges | image treatment |
| `dither-ascii-effect-pro-...` | Dither/ASCII image effect | image treatment |
| `editorial-fashion-slider` | Editorial slideshow | gallery behaviour |
| `obsidian-gold-landing-template-tailwind-gsap` | Landing template (mood reference only) | atmosphere |
| `living-palette-system` | Live palette breathing | typography behaviour |
| `vortex-01` | Vortex transition | chamber transition |
| `physics-of-wiresjavascript` | Physics-wire decoration | background atmosphere |
| `app-menu-with-lock-screen` | Lock-screen-style entrance | entrance experience / CTA portal |
| `configurable-sidebar-w-grid-transitions` | Grid transition sidebar | spatial navigation |
| `pure-css-glassmorphism-liquid-glass-ui-kit` | Glassmorphism UI primitives | image treatment / overlays |
| `zoom-to-center-on-scroll-using-animation-timeline-scroll` | Scroll-driven zoom | chamber transition |

## Concept-only extractions

| Source | What we kept |
|---|---|
| `art-website` (already studied in Pass 1) | Brand-mark wandering pattern → influenced `InvitationPortal` placement |
| `romantic cursor-reveal` (mask layer) | Idea queued for an `ImageMaskReveal` adapter |

## Rejected for now

| Source | Why |
|---|---|
| `3d-quantum-neural-network` | Three.js heavy, no clear identity-bearing function. |
| `planet-interior-energy-flow-three-js` | Three.js heavy, niche metaphor. |
| `dragon-rage-metercodepen-challenge` | Domain-specific effect with no obvious DNA mapping. |
| `2025-f1-drivers-championship-race` | Domain-specific. |
| `slack-discord-cyberpunk-2077-redesign-w-preact` | Reference only, redesign of unrelated product. |
| `webgl-scroll-sync-dummy-template-v1` | WebGL placeholder template; would require shader work without identity gain. |

## Provenance + safety

Every adapted module:
- lives under `components/presence/world/` (Pass 3 surface) or
  `components/presence/signatures/` (Pass 2 surface)
- has a header comment crediting the source CodePen folder
- is reduced-motion-safe (verified via global CSS rule + per-component
  matchMedia check)
- works without the effect (graceful fallback to static layout)

No file in `presence-app/` imports from `C:/Dev/tools/` directly. The
source library is for reference and inspection only; production code
is independently typed and tested.
