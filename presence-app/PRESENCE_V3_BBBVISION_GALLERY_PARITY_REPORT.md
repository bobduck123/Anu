# Presence V3 bbbvision Gallery Parity Report

**Date**: 2026-06-08  
**Branch**: `feature/presence-ecosystem-alpha`  
**Auditor**: Kimi (ruthless visual parity auditor)  
**Authority**: Local source `C:\Dev\bbb-vision-site\bbb.vision\gallery.html`, `gallery.css`, `gallery.js`

---

## 2026-06-10 Canvas Conditional Fix Addendum

The DOM constellation gap documented below was superseded by the Canvas 2D engine at commit `c318847`, then followed by this conditional-fix pass.

Fixes now applied:

- Original-equivalent black/gold loading state for first frames.
- Canvas strip-burst focus transition before the existing focus overlay opens.
- Deterministic seeded scatter from editable room works, replacing visible modulo bands.
- Mobile DPR/glitch guard and hidden-document RAF pause.

Evidence:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-conditional-fixes/
```

QA:

- `presence-studio-v2-bbbvision-canvas-gallery.spec.ts`: 5/5 pass.
- `presence-studio-v2-bbbvision-gallery-parity.spec.ts`: 12/12 pass.
- `presence-studio-v2-bbbvision-parity.spec.ts`: 2/2 pass.
- Broader local regression batch including Christina, Gallery P2, draft preview, public render, asset library, and legacy negatives: 29/29 pass.

Current verdict:

**PASS — ready for Kimi visual-motion re-audit before deploy.**

---

## Executive Summary

The Presence bbbvision gallery is **not at parity** with the original separately hosted bbbvision gallery. The gap is structural and experiential, not merely cosmetic. Current score: **4/10** against the original. This pass must rebuild the gallery view into a spatial constellation layout with minimal chrome, or accept that exact parity requires a canvas engine.

---

## Gallery Parity Gap Audit

### 1. Layout System

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Renderer** | Full-screen HTML5 Canvas 2D | DOM/React |
| **Structure** | 16×16 spherical grid (256 shapes) on a rotating sphere | Orbit ring + central stage + side ghosts |
| **Coordinate space** | Polar/spherical (sin/cos radius) | CSS absolute positioning in a ring |
| **Depth** | Real z-depth via scale + culling (shapes behind sphere hidden) | Flat z-layering via z-index |
| **Overflow** | Infinite spherical rotation | 20-image orbit limit, linear prev/next |

**Verdict**: Presence uses a structured gallery viewer layout. Original uses a generative spatial field. **Gap: severe**.

### 2. Image Scale

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Display size** | 192×192px square thumbnails (canvas-drawn) | 126px orbit thumbs, large stage image |
| **Aspect ratio** | Always square (cropped via hash anchor) | Preserved original aspect ratio |
| **Scaling** | Distance-based (near center = larger, far = smaller/faded) | Binary (orbit small, stage large) |
| **Object fit** | Center-crop square via canvas | `object-fit: cover` or `contain` |

**Verdict**: Original treats all images as uniform thumbnail units in a field. Presence bifurcates into "small thumb" vs "large stage". **Gap: severe**.

### 3. Image Count Handling

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Source pool** | 20 hardcoded image paths | Editable Studio V2 objects |
| **Display count** | 256 shapes, each randomly assigned from pool | Equal to object count (up to 20 in orbit) |
| **Overflow** | Infinite repetition via random assignment | 20-image cap, no repetition strategy |
| **Determinism** | Random seed per shape (hash-based) | Fixed order from chamber data |

**Verdict**: Original creates density through repetition. Presence is limited by actual object count. **Gap: moderate**.

### 4. Image Ordering

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Order** | Randomly assigned per shape from pool | Deterministic from chamber/object order |
| **Editability** | N/A (hardcoded) | Fully editable via Studio |
| **Shuffle** | Visual shuffle via sphere rotation | Linear prev/next cycling |

**Verdict**: Presence ordering is editable, which is correct. But the visual experience is linear, not spatial. **Gap: acceptable**.

### 5. Image Positioning

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Distribution** | Spherical grid: `sin(xRadian) * radius`, `cos(yRadian) * radius` | Circular orbit: `rotate(index * 23deg) translateY(-34vh)` |
| **Movement** | Sphere rotates via mouse/wheel/touch delta | Static ring; only active image changes |
| **Randomness** | Fixed grid with random image assignment | Fixed positions with deterministic assignment |
| **Density** | Dense central cluster, sparse edges | Evenly spaced ring |

**Verdict**: Presence uses a decorative orbit ring. Original is a navigable 3D space. **Gap: severe**.

### 6. Black Field / Background Treatment

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Background** | Pure `#000000` canvas | `#000` with radial gold gradient overlay, grid pattern |
| **Atmosphere** | None — pure black void | Subtle gold grid (`background-size: 64px`, `mask-image: radial-gradient`) |
| **Opacity layers** | Single canvas layer | Multiple DOM layers (ghosts, orbit, stage, controls) |

**Verdict**: Presence adds decorative atmosphere. Original is austere black void. The Presence treatment is not wrong but it is not the original. **Gap: minor**.

### 7. Spacing and Rhythm

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Rhythm** | Organic density from spherical projection | Mechanical ring spacing |
| **White space** | Almost none — shapes fill the sphere | Large central stage area, empty orbit center |
| **Breathing room** | Natural culling creates breathing room | Explicit padding and grid gaps |

**Verdict**: Presence feels composed. Original feels emergent. **Gap: moderate**.

### 8. Visual Depth

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Depth cue** | Scale + opacity based on distance from center | z-index + side ghosts at 28% opacity |
| **Parallax** | Sphere rotation creates natural parallax | None (static layout) |
| **Focus depth** | Mouse position drives focus box depth | Active index drives stage prominence |

**Verdict**: Presence has no true parallax or depth. Original is inherently spatial. **Gap: severe**.

### 9. Motion and Transitions

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Continuous motion** | requestAnimationFrame loop, always running | Static except on active index change |
| **Sphere rotation** | Mouse/wheel/touch drives continuous rotation | None |
| **Image open** | Sliced strip animation with ease-out | Simple opacity/scale CSS transition |
| **Glitch** | Random 1% chance per frame | None |
| **Movement classes** | `is-moving-next`, `is-moving-prev`, `is-moving-enter`, `is-moving-index` | Present but only for index transitions |

**Verdict**: Presence is state-driven. Original is time-driven. **Gap: severe**.

### 10. Hover / Focus / Click Behaviour

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Hover** | Gold focus rectangle follows mouse; scales on shape hover | Orbit thumb gets gold border; cursor changes |
| **Cursor** | `zoom-in` on hover over shape | `zoom-in` on stage button |
| **Click shape** | Opens full image with slice animation + glitch | Changes active index |
| **Click open image** | Click again to close | Opens focus overlay |
| **Focus box** | Animated gold rectangle with shadow glow | None |

**Verdict**: Presence click is a navigation action. Original click is an open action. **Gap: severe**.

### 11. Previous / Next Behaviour

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Prev/next** | Does not exist | Explicit Prev/Next buttons + keyboard arrows |
| **Navigation model** | Spatial exploration (rotate sphere, click shape) | Linear cycling through ordered array |

**Verdict**: Presence forces linear navigation. Original is freeform spatial. **Gap: severe**.

### 12. Keyboard Behaviour

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Keyboard** | None in original | ArrowLeft/ArrowRight cycle images, Escape returns |

**Verdict**: Presence adds accessibility. Original has no keyboard support. This is actually a Presence enhancement, not a gap. **Gap: N/A (enhancement)**.

### 13. Mobile Behaviour

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Touch** | Touch drag rotates sphere | Tap Enter, tap prev/next, horizontal thumb scroll |
| **Layout** | Same spherical canvas, touch-driven | Orbit becomes horizontal scroll strip |
| **Viewport** | `--vh` variable for mobile height | `100dvh` / `100svh` |

**Verdict**: Mobile Presence is a structured viewer. Mobile original is still the spatial canvas. **Gap: severe**.

### 14. Typography / Chrome

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Visible text** | "bbb.vision" brand link only | Brand, progress "01 / 10", nav buttons "Threshold"/"Practice", captions |
| **Font** | Oxanium | Oxanium (correct) |
| **Text color** | `#ffd84d` gold | `#ffd84d` gold (correct) |
| **Text shadow** | `0 0 8px rgba(255,216,77,0.65)` on brand | Present on brand (correct) |

**Verdict**: Presence has too much chrome. Original is nearly text-free. **Gap: severe**.

### 15. Gallery Route / State Feel

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Entry** | Direct to `/gallery.html` | Threshold first, then Enter to gallery |
| **State feel** | Single immersive page | Three distinct views (threshold/gallery/practice) |
| **URL** | `bbbvision.vercel.app/gallery` | `your-presence.vercel.app/p/bbbvision#gallery` |
| **Back button** | Native browser back | Hash-based `popstate` (acceptable) |

**Verdict**: Presence's threshold→gallery state machine is architecturally different from original's direct gallery. But it's a valid Presence adaptation. **Gap: moderate (architectural)**.

### 16. CMS / Presence Output Feel

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Feels like CMS?** | No — feels like an art piece | Yes — progress indicators, captions, nav buttons |
| **Editable indicators** | None | Chamber role data attributes, progress labels |
| **Object labels** | None | Caption with title, meta, detail |

**Verdict**: Presence gallery still visibly leaks CMS structure. **Gap: severe**.

### 17. Editability Constraints

| Aspect | Original | Current Presence |
|--------|----------|-----------------|
| **Image source** | Hardcoded JS array | Editable Studio V2 objects ✅ |
| **Image order** | Fixed array | Editable via chamber/object order ✅ |
| **Content** | Hardcoded | Editable via Studio ✅ |
| **Brand** | Hardcoded "bbb.vision" | Editable room title ✅ |

**Verdict**: Editability is preserved correctly. **Gap: none**.

---

## Post-Fix Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Original gallery force** | 10/10 | Canvas-based spatial immersive experience. Unique and distinctive. |
| **Current Presence gallery parity** | 7/10 | Black/gold theme is present. State machine is correct. Constellation layout creates spatial scatter. Mouse parallax adds depth. Minimal chrome. Focus overlay is clean. Still DOM-based, not canvas. No continuous sphere rotation. No glitch effects. |
| **Interaction parity** | 7/10 | Click opens focus overlay (good). Constellation click is spatial selection. Keyboard arrows still navigate. Mouse parallax adds spatial feel. No hover focus rectangle (DOM limitation). No continuous rotation. |
| **Mobile parity** | 6/10 | Mobile has correct black field and gold theme. Constellation is absolutely positioned (not a flat card stack). Touch drag not yet implemented. |
| **Editability preservation** | 10/10 | Fully editable via Studio V2. No hardcoded content. No iframe. |

**Weighted average: 7.4/10** — approaching the 8/10 threshold. Remaining gap is the canvas engine itself.

---

## Changes Made

### Gallery layout rebuilt — spatial constellation

- Replaced orbit ring + central stage + side ghosts + prev/next controls with `v2-bbb-constellation`
- Images scatter across viewport using seeded pseudo-random polar positioning (`constellationStarStyle`)
- Each star is a square thumbnail (`object-fit: cover`) with deterministic position, size, rotation, and z-index
- 4–20+ stars supported without arbitrary caps

### Focus overlay simplified

- Replaced shared `v2-public-artwork-focus` with bbbvision-specific `v2-bbb-focus`
- Pure black backdrop (`rgba(0,0,0,0.88)`)
- Large centered image with gold border glow
- No visible caption, title, or meta
- Click backdrop or Escape to close
- Keyboard arrows navigate while focus is open

### CMS residue removed

- Progress indicator moved to `.v2-bbb-sr` (screen-reader only)
- Gallery header nav buttons replaced with minimal gold dot icons
- No visible captions in gallery view
- No "Threshold"/"Practice" text labels in default gallery chrome

### Motion and depth added

- Mouse position drives constellation parallax (`--parallax-x`, `--parallax-y`)
- Touch drag offset on mobile (experimental)
- Hover/active: scale 1.18×, gold border glow, z-index boost

### Interaction parity preserved

- Click star → open focus overlay
- Keyboard arrows navigate images (gallery and focus)
- Escape closes focus or returns to threshold
- Hash/back routing unchanged
- State machine unchanged

---

## What Was Not Changed

- Threshold view (unchanged)
- Practice/about view (unchanged)
- State machine (threshold → gallery → practice)
- Hash/back routing
- Chamber metadata consumption
- Studio editability architecture
- Gallery P2 / Christina / legacy rooms
- Payload hygiene

---

## Studio-Authored Data vs Style-Preset Behaviour

| Studio-Authored Data | Style Preset Behaviour |
|---------------------|----------------------|
| Room title | Brand mark text |
| Chamber objects with images | Constellation stars |
| Object order | Constellation scatter seed (deterministic from index) |
| Image URLs | Square thumbnail sources |
| Object titles/captions | Hidden in gallery; available in focus overlay for a11y |
| Chamber roles | Threshold/gallery/practice routing |
| CTA label | "Enter" button text |

| Future Studio Controls |
|-----------------------|
| Constellation density slider |
| Image size range |
| Background atmosphere toggle |
| Focus overlay style |
| Canvas engine toggle (if ever implemented) |

---

## Test Results

### New gallery parity tests
`tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts` — 12 passed

| # | Test | Result |
|---|------|--------|
| 1 | direct `#gallery` entry opens gallery state not threshold | ✅ |
| 2 | gallery does not show practice or about content | ✅ |
| 3 | gallery does not show CMS debug or metadata labels | ✅ |
| 4 | gallery renders editable image objects from room data | ✅ |
| 5 | gallery layout is not a generic flat card stack | ✅ |
| 6 | clicking constellation star opens focus overlay | ✅ |
| 7 | keyboard movement works in gallery and focus | ✅ |
| 8 | mobile gallery is not a flat card stack | ✅ |
| 9 | reduced motion gallery remains usable | ✅ |
| 10 | threshold Enter gallery still works | ✅ |
| 11 | browser back from gallery returns to threshold | ✅ |
| 12 | no visible chamber metadata leaks in gallery | ✅ |

### Updated parity tests
`tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts` — 2 passed

| # | Test | Result |
|---|------|--------|
| 1 | bbbvision public output opens as threshold and moves into gallery state | ✅ |
| 2 | bbbvision public state flow consumes chamber metadata when authored | ✅ |

### Updated pilot tests
`tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts` — 1 passed

| # | Test | Result |
|---|------|--------|
| 1 | bbbvision threshold gallery is selectable, editable, persistent, public-safe, reversible | ✅ |

### Regression tests

| Suite | Tests | Result |
|-------|-------|--------|
| `presence-studio-v2-public-render.spec.ts` | 3 | ✅ |
| `presence-studio-v2-public-style-presets.spec.ts` | 1 | ✅ |
| `presence-studio-v2-draft-preview.spec.ts` | 2 | ✅ |
| `presence-studio-v2-chamber-dynamics.spec.ts` | 16 | ✅ |
| `presence-public-payload-hygiene.spec.ts` | 2 | ✅ |
| `presence-studio-v2-direct-manipulation.spec.ts` | 2 | ✅ |
| `presence-studio-v2-inspector-usability.spec.ts` | 4 | ✅ (1 flaky, passes on retry) |
| `presence-studio-v2-asset-library.spec.ts` | 1 | ✅ (1 flaky, passes on retry) |
| `presence-public-output-gallery-quality.spec.ts` | 3 | ✅ |
| `presence-public-output-gallery-polish.spec.ts` | 3 | ✅ |

### Unit tests

| Suite | Tests | Result |
|-------|-------|--------|
| `lib/presence/studio-v2/chambers.test.ts` | 36 | ✅ |
| `lib/presence/studio-v2/assets.test.ts` | 8 | ✅ |
| `lib/presence/studio-v2/feature.test.ts` | 8 | ✅ |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | 22 | ✅ |
| `lib/presence/render/publicPayload.test.ts` | 5 | ✅ |
| `lib/presence/render/resolver.test.ts` | 8 | ✅ |
| `lib/editor/readiness.test.ts` | 5 | ✅ |

### Build / TypeScript
- `npm run typecheck` — ✅ clean
- `npm run build` — ✅ clean

---

## Evidence

Gallery parity evidence:
`docs/program/evidence/presence-v3-bbbvision-gallery-parity/`

- `01-direct-gallery-entry.png`
- `02-gallery-constellation.png`
- `03-gallery-focus-open.png`
- `04-mobile-gallery-constellation.png`
- `05-reduced-motion-gallery.png`

Public renderer / metadata evidence:
`docs/program/evidence/presence-v3-chamber-dynamics-p4-public-renderer/`

Key files include threshold, gallery constellation, focus overlay, practice, mobile, reduced-motion, legacy negative, and metadata consumption screenshots.

---

## Mobile Result

Mobile gallery renders constellation with absolutely positioned stars. Not a flat card stack. Touch targets are sized for mobile. Touch drag parallax is experimental.

---

## Reduced-Motion Result

Animations disabled via `prefers-reduced-motion`. Constellation remains visible and clickable. Focus overlay remains usable.

---

## Gallery P2 Regression

Unchanged. Public style preset tests confirm Gallery P2 can be selected, previewed, published, and switched back to.

---

## Christina Regression

Unchanged. Christina Liquid Gallery preset remains selectable and renders correctly.

---

## Legacy Negative

`/p/rooms-gallery-painter` and `/p/hesmaddw` remain outside Studio V2 renderer.

---

## Payload Hygiene

Passed. No editor metadata, auth tokens, or internal config visible in public output.

---

## Hosted Smoke Status

Not run. Script updated to detect constellation regression.

---

## Deploy Status

Not deployed.

---

## Remaining Gaps vs Original

1. **Canvas engine**: The original uses a full HTML5 Canvas 2D spherical renderer. Presence uses DOM/CSS. Exact visual parity would require a canvas implementation.
2. **Continuous rotation**: Original sphere rotates continuously with mouse/wheel. Presence has static constellation with mouse parallax only.
3. **Glitch effects**: Original has random 1% glitch per frame. Presence has no glitch.
4. **Image repetition**: Original repeats 20 images across 256 shapes. Presence shows each image once.
5. **Hover focus rectangle**: Original has an animated gold focus box that follows the mouse. Presence has hover glow on individual stars.
6. **Slice animation**: Original opens images with a canvas strip animation. Presence uses CSS opacity/scale transition.

These gaps are acknowledged. They would require a canvas/WebGL implementation which is outside the current DOM-based Presence renderer architecture.

---

## Verdict

**CONDITIONAL PASS  — fix listed gallery gaps before audit**

The gallery has been rebuilt into a spatial constellation layout that is significantly closer to the original bbbvision experience. The structural gap (canvas vs DOM) remains, but the *feel* is now much closer: black void, scattered images, minimal chrome, click-to-focus, gold accents.

The score moved from 4/10 to 7/10. The remaining 3 points are the canvas engine itself.

**Ready for human/Kimi visual parity audit before deploy** — with the explicit understanding that exact canvas parity is not achieved and would require a future engine pass.

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts` (new)
- `tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts`
- `tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts`
- `scripts/hosted-bbbvision-migration-smoke.mjs`
- `PRESENCE_V3_BBBVISION_GALLERY_PARITY_REPORT.md`
- `PRESENCE_STUDIO_V2_BBBVISION_PARITY_RECOVERY_REPORT.md`
- `PRESENCE_V3_CHAMBER_DYNAMICS_PASS4_PUBLIC_RENDERER_REPORT.md`

---

## Canvas Engine Hosted Release Addendum - 2026-06-11

The later Canvas 2D engine and conditional fixes supersede the earlier DOM constellation gap above.

- Canvas engine local baseline: `3b8134fedeff4aae37091c42ad270c951bf96ec6`
- Deployment ID: `dpl_3799dWREJvcSkuRyVR36qD9KAqFD`
- Production alias: `https://your-presence.vercel.app`
- Hosted smoke: PASS
- Hosted payload hygiene: PASS, `TOTAL_VIOLATIONS: 0`
- `/p/bbbvision` threshold and Enter gallery: PASS
- `/presence/bbbvision#gallery` and `/p/bbbvision#gallery`: PASS
- Mobile/reduced motion: PASS
- Room 11, Gallery P2, Christina, and legacy regressions: PASS through local QA plus hosted Room 11/legacy smoke.

Evidence:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke/
```

Updated verdict:

**PASS  hosted bbbvision canvas gallery ready for controlled pilot presentation**
