# Presence Atmosphere Engine

## The Signature World Layer

The Atmosphere Engine is the optional system that turns a strong Presence into a memorable digital world.

It is not decoration.

It should only exist when it makes the content more understandable, more memorable, or more culturally powerful.

Strategic distinction:

Bad use of Three.js:

> This page has floating stuff.

Good use of Three.js:

> The artist's works exist as objects in a spatial field, and that field helps the visitor understand the practice.

Bad use of animation:

> Things move.

Good use of animation:

> The movement expresses the world: signal, care, archive, gathering, drift, trace.

## Product Tiers

1. Core Presence
   - CSS/SVG/light motion
   - beautiful, fast, scalable

2. Signature Presence
   - CSS/canvas/procedural fields
   - premium, memorable, still efficient

3. Immersive Presence
   - Three.js/R3F
   - flagship cultural worlds

## Atmosphere Modes

### CSS Signal Field

For Minimal Artist Portal and Editorial Portfolio.

Creates:

- grain
- signal dots
- threshold glow
- subtle movement
- cinematic tension

### CSS Studio Wall

For Studio Practice.

Creates:

- pinned notes
- paper shadows
- workbench labels
- fragment layering
- material tactility

### Canvas Gallery Field

For Gallery Wall.

Creates:

- floating image rhythm
- slow spatial drift
- cursor proximity
- works as image objects

### Canvas Care Pathway

For Practitioner Presence.

Creates:

- soft pathway line
- service nodes
- trust anchors
- enquiry endpoint

### Canvas Noticeboard

For Venue / Collective.

Creates:

- program wall
- public notices
- room clusters
- archive/program signals

### Three Gallery Void

For flagship artists and galleries.

Creates:

- floating artwork planes
- depth
- camera drift
- click-to-work detail
- gallery void

### Three Constellation Map

For collectives, archives, education, cultural networks.

Creates:

- works as stars
- collections as constellations
- programs as clusters
- relationships as routes

### Three Archive River

For venues and memory projects.

Creates:

- time river
- events as stones
- collections as bends
- years as depth
- programs as tributaries

### Three Venue Room

For flagship venues.

Creates:

- simplified room
- program zones
- archive wall
- visit/propose/support routes

## First Spike: Gallery Void Lite

Build the smallest possible version first.

Rules:

- CSS/canvas first
- 6 to 12 work images
- dark spatial field
- slow motion
- hover/focus title reveal
- click to work detail
- reduced-motion fallback
- mobile static fallback
- disabled by default
- no backend schema change
- no Three.js unless already present and clearly safe

Acceptance:

- does not block first paint
- does not affect templates without it
- can be turned off
- works without perfect images
- public content remains readable
- screenshots prove it is better than static layout

Only after that should Three.js be considered.

## Implementation Guardrails

- The Atmosphere Engine must accept public-safe fields only:
  - display_name
  - headline
  - cover_image_url
  - profile_image_url
  - works
  - collections
- It must not expose owner, tenant, admin, relationship ledger, quote, procurement, or private connection data.
- It must not add backend schema or API requirements.
- It must be optional and disabled by default.
- It must respect reduced-motion preferences.
- It must have a mobile/static fallback.
- It must not become the default expression of Presence.

## Commercial Packaging

| Offer | Atmosphere |
| --- | --- |
| Basic Node | none |
| Premium Node | light CSS signal optional |
| Artist Presence | CSS/canvas option |
| Signature Presence | canvas atmosphere included |
| Flagship Presence | Three.js option |
| Venue / Institution | archive/map/room modules |
| White-label Network | custom spatial layer |

Sales language:

> Your public presence can remain fast and elegant, or it can become a living digital world.

## Current Alpha Decision

This specification is intentionally not wired into runtime by default.

`frontend-next` already carries the six pilot templates and remains the canonical public pilot host. `presence-app` remains the standalone alpha and future public host. A technical atmosphere spike should be created only when it has screenshot evidence that it improves a specific portfolio world without destabilising the alpha.

For the current alpha, Gallery Void Lite is a future optional spike, not a launch blocker.
