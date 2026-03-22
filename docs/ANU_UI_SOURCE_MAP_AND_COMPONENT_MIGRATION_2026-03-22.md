# ANU UI Source Map and Component Migration

Date: 2026-03-22
Status: Active source-to-surface mapping
Primary codebase target: `frontend-next`
Companion docs:
- `docs/ANU_UI_IMPLEMENTATION_DOCTRINE_2026-03-22.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`

## 1. Purpose

This document maps external sources and reference families to:
- ANU surfaces
- concrete component classes
- target files
- extraction rules
- explicit "do not copy" constraints

It is the operational bridge between the design doctrine and actual frontend implementation.

## 2. Source Precedence

When there is tension between sources, precedence is:

1. Current ANU landing direction and shell feel
   - `C:\Dev\home-page-design`
   - `C:\Dev\home-page-playground`
2. Existing ANU shell/frontend work already in `frontend-next`
3. Transformed extraction from `C:\Dev\tools`
4. Lab-only experiments

This is not a rule to keep the shell frozen. It is a rule to preserve continuity while strengthening it.

## 3. Source Roles

### A. Primary shell roots

#### `C:\Dev\home-page-design`

Use for:
- atmospheric landing structure
- dark mineral shell staging
- authored side rail feeling
- hero compositional hierarchy

Extract:
- edge treatment
- atmospheric background logic
- framed navigation mood
- hero spacing and ceremonial entry posture

Do not copy:
- social-icon boilerplate
- raw menu button treatment
- stock photo and fog behavior
- generic portfolio assumptions

#### `C:\Dev\home-page-playground`

Use for:
- celestial horizon energy
- layered fog, cloud, and field atmosphere
- ceremonial top-level landing presence

Extract:
- sky-depth layering
- horizon emanation
- ceremonial title staging
- atmospheric motion ideas in reduced form

Do not copy:
- generic template nav
- bootstrap-era layout structure
- hero-only logic repeated across the whole product

### B. `C:\Dev\tools` source families

#### UI Shell / Navigation

Primary references:
- `app-menu-with-lock-screen`
- `configurable-sidebar-w-grid-transitions`
- `ui-kit-always-changing`
- `slack-discord-cyberpunk-2077-redesign-w-preact`

Use for:
- shell rhythm
- drawer choreography
- navigation panelization
- subsystem chambers
- internal messaging and microcosms

#### Theme / Color System

Primary references:
- `living-palette-system`
- `frosted-saturated-borders`
- `obsidian-gold-landing-template-tailwind-gsap`
- `torus-glass`

Use for:
- material and token logic
- layered color behavior
- panel edge glow
- celestial-earth palette tuning

#### Media Showcase / Community browse

Primary references:
- `interactive-image-mosaic`
- `editorial-fashion-slider`
- `gsap-draggable-image-gallery`
- `time-traveling-art-gallery`

Use for:
- community browsing posture
- image-led discovery
- editorial rhythm
- tile-level reveal behavior

#### Data / Instrumentation

Primary references:
- `multi-stage-comparator`
- `augmented-matrix`
- `cosmic-clock`
- `planet-interior-energy-flow-three-js`
- `2025-f1-drivers-championship-race`

Use for:
- observatory panels
- trust and admin dashboards
- state visualizations
- operational comparison surfaces

#### Lab-only or heavily constrained references

Primary references:
- `physics-of-wiresjavascript`
- `chaos-true-false`
- `ordered-ditheringa-close-up-look`
- `dither-ascii-effect-pro-you-can-save-image-free-video-version-https-codepen-io-sabosugi-full-pwzwllw`
- `soft-ball-physics`

Use for:
- concept testing
- pressure testing motion identity
- isolated ANU lab experiments

Do not use directly in first production pass.

## 4. Surface-to-Source Map

| ANU Surface | Primary Sources | Secondary Sources | Use | Avoid |
|---|---|---|---|---|
| Global shell | `home-page-design`, `home-page-playground`, `app-menu-with-lock-screen` | `configurable-sidebar-w-grid-transitions`, `living-palette-system`, `frosted-saturated-borders` | shell hierarchy, atmospheric material, navigation presence | copied portfolio shell patterns |
| Header | current `Header.tsx`, `home-page-design`, `ui-kit-always-changing` | `obsidian-gold-landing-template-tailwind-gsap` | ceremonial route identity, utility compression | utility clutter, generic chip rows |
| Sidebar | current `Sidebar.tsx`, `app-menu-with-lock-screen`, `configurable-sidebar-w-grid-transitions` | `ui-kit-always-changing` | chambered pathway navigation | generic dashboard rail styling |
| Pathway guide | current `PathwayGuideBar.tsx`, shell roots | `living-palette-system` | route framing and domain cueing | floating unrelated status pills |
| Home and Manara heroes | shell roots | `obsidian-gold-landing-template-tailwind-gsap` | signature atmosphere | template landing-page copy and CTA logic |
| Community | `interactive-image-mosaic`, current `DraggableGallery`, `editorial-fashion-slider` | `gsap-draggable-image-gallery` | signal-rich browsing commons | bland feed or unfiltered spectacle |
| Education, Impact, Transparency | shell roots plus current ANU surfaces | instrumentation family | public information clarity with shell continuity | over-stylized content density |
| Admin and governance | instrumentation family | restrained theme family | observatory clarity, comparisons, diagnostics | public-shell spectacle |
| Messages / notifications / to-do / microcosms | `slack-discord-cyberpunk-2077-redesign-w-preact`, `ui-kit-always-changing` | shell tokens | subsystem chamber style | literal cyberpunk styling |
| Universe | current universe implementation | selected visual FX only after separate doctrine | preserve current gains | forcing shell language into viewer |

## 5. Component Migration Map

## 5.1 Shell layer

| Component Class | Current Targets | Primary Sources | Extraction Rule |
|---|---|---|---|
| Top header | `src/ui-system/layout/Header.tsx` | shell roots, `ui-kit-always-changing` | keep ANU route and pathway structure; upgrade material, spacing, and hierarchy |
| Main sidebar | `src/ui-system/layout/Sidebar.tsx` | `app-menu-with-lock-screen`, `configurable-sidebar-w-grid-transitions` | keep navigation sections; recompose into chambered authored rail |
| Mobile dock | `src/ui-system/layout/MobileDock.tsx` | shell roots, `ui-kit-always-changing` | simplify mobile actions; preserve clarity over ornament |
| Pathway guide | `src/ui-system/layout/PathwayGuideBar.tsx` | shell roots | make route framing feel ceremonial, not informational sludge |
| Footer | `src/ui-system/layout/Footer.tsx` | shell roots | subordinate footer to shell identity; keep quiet |

## 5.2 Landing and public hero layer

| Component Class | Current Targets | Primary Sources | Extraction Rule |
|---|---|---|---|
| Public hero | `src/app/(app)/home/page.tsx`, `src/components/landing/ScrollSnapLanding.tsx` | shell roots | keep current ANU atmosphere; deepen ceremonial hierarchy |
| Manara intro | `src/app/(app)/manara/page.tsx` | shell roots, `obsidian-gold-landing-template-tailwind-gsap` | make Manara feel like the beacon entry, not a plain feature page |
| Route hero cards | public route pages | `living-palette-system`, shell roots | standardize hero anatomy without flattening identity |

## 5.3 Community layer

| Component Class | Current Targets | Primary Sources | Extraction Rule |
|---|---|---|---|
| Community browsing field | `src/app/(app)/community/page.tsx`, `src/ui/patterns/draggable-gallery/*` | `interactive-image-mosaic`, `editorial-fashion-slider`, current draggable gallery | keep strong browsing motion; improve filtering and editorial logic |
| Community composer | `src/app/(app)/community/CommunityComposerModal.tsx` | shell tokens, subsystem chamber language | make composing feel intimate and intentional, not modal boilerplate |
| Community universe side path | `src/components/maps/communityUniverseAdapter.ts`, `src/components/maps/FalakMapViewer.tsx` | current universe work | keep live and fallback truthfulness; no extra spectacle |

## 5.4 Operational layer

| Component Class | Current Targets | Primary Sources | Extraction Rule |
|---|---|---|---|
| Admin dashboards | `src/app/(app)/admin/*` | `multi-stage-comparator`, `augmented-matrix`, `cosmic-clock` | prioritize comparison, signal hierarchy, and scanability |
| Governance surfaces | `src/app/(app)/governance/*` | instrumentation family | build observatory language, not public hero language |
| Organizer tooling | `src/app/(app)/organizer/*` | instrumentation family plus restrained shell tokens | clear task hierarchy, moderate ceremony only |

## 5.5 Subsystem chamber layer

| Component Class | Current Targets | Primary Sources | Extraction Rule |
|---|---|---|---|
| Profile notifications | `src/app/(app)/profile/page.tsx` | `slack-discord-cyberpunk-2077-redesign-w-preact`, `ui-kit-always-changing` | chamber-like list and status modules, but operational clarity wins |
| To-do panels | `src/app/(app)/profile/page.tsx` | same as above | make actions feel local and accountable |
| Message surfaces | future module using `api.messages` | same as above | stronger internal-world feel, no visual noise |
| Microcosm entry and inner views | `src/app/(app)/community/microcosms/*`, `src/components/teams/TeamsView.tsx` | same as above | semi-autonomous subworlds with clear relation to shell |

## 6. Explicit "Do Not Copy" Rules

These references are allowed only as transformed extraction.

### `slack-discord-cyberpunk-2077-redesign-w-preact`

Do not copy:
- neon overload
- cluttered channel density
- cyberpunk iconography

Keep:
- internal chamber logic
- subsystem differentiation
- nested information habitat feeling

### `interactive-image-mosaic`

Do not copy:
- image-first dominance with weak metadata

Keep:
- exploratory browse feel
- mosaic discovery logic
- movement through content space

### `configurable-sidebar-w-grid-transitions`

Do not copy:
- demo-heavy transition noise

Keep:
- authored navigation state changes
- panel rhythm
- spatial section switching

### `physics-of-wiresjavascript`, `chaos-true-false`, `ordered-ditheringa-close-up-look`

Do not copy:
- any production-facing interaction or background behavior by default

Keep:
- energy, pressure, texture, or concept cues for lab exploration only

## 7. Migration Batches

## Batch 1: Shell signature

Files:
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`
- `src/ui-system/layout/MobileDock.tsx`
- `src/app/(app)/home/page.tsx`

Goal:
- establish unmistakable ANU shell identity

## Batch 2: Pattern primitives

Targets:
- shared shell cards
- CTA buttons
- chips
- section headers
- route hero variants

Goal:
- avoid one-off restyles and build reusable ANU primitives

## Batch 3: Subsystem chambers

Targets:
- profile tabs for todos and notifications
- future messaging and microcosm surfaces

Goal:
- create the distinct internal ANU chamber language

## Batch 4: Community

Targets:
- `src/app/(app)/community/page.tsx`
- `src/ui/patterns/draggable-gallery/*`
- `src/app/(app)/community/CommunityComposerModal.tsx`

Goal:
- turn community into a signal-rich commons with stronger filtering and browsing logic

## Batch 5: Observatories

Targets:
- `src/app/(app)/admin/*`
- `src/app/(app)/governance/*`
- `src/app/(app)/organizer/*`

Goal:
- create restrained, high-legibility ANU operational interiors

## 8. Lab Policy

The lab should hold:
- adapted ANU experiments before production
- high-risk concepts that may never ship

It should not become:
- a dump of raw reference clones
- a substitute for disciplined production integration

Every lab experiment should declare:
- source references
- intended ANU surface
- what was transformed
- what remains unsuitable for production
