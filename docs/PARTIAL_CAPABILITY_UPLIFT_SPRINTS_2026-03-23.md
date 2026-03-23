# Partial Capability Uplift Sprints

Date: 2026-03-23

Related:

- [CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md)
- [CIVIC_OS_IMPLEMENTATION_ROADMAP_2026-03-19.md](/C:/Dev/Flora_fauna/docs/CIVIC_OS_IMPLEMENTATION_ROADMAP_2026-03-19.md)
- [ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md](/C:/Dev/Flora_fauna/docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md)

## Purpose

This plan upgrades the current `partial` ANU capability areas into `strong partial` capability areas before the platform attempts the deeper `early` layers.

The rule for these sprints is simple:

- do not chase mythology without operational lift
- prefer one sprint that upgrades multiple adjacent capability gaps together
- every sprint must reduce fragmentation, not just improve presentation

## Current Partial Targets

The current partial capability areas are:

- relief / mutual aid
- multi-tenant engine
- provenance / legibility
- knowledge layer
- heaven-to-earth action loop
- places / events / logistics / earth-plane coordination
- publishing / narrative output layer

## Sprint Sequence

### Sprint 1: Earth Coordination Bridge

Primary uplift targets:

- heaven-to-earth action loop
- places / events / logistics / earth-plane coordination
- relief / mutual aid
- provenance / legibility

Primary surfaces:

- `frontend-next/src/app/(app)/impact/page.tsx`
- `frontend-next/src/app/(app)/relief/page.tsx`
- `frontend-next/src/components/relief/ReliefIntakeForm.tsx`
- `frontend-next/src/app/(app)/events/page.tsx`
- `frontend-next/src/app/(app)/calendar/page.tsx`

Implementation focus:

- add shared route-bridge panels between impact, relief, events, calendar, community, pools, memberships, and organizer surfaces
- make earth-plane routes explain what they govern and what related surfaces already contain relevant context
- give relief a clearer trust and processing model rather than a bare intake form
- reduce the split between action, scheduling, care, and value routing

Exit criteria:

- impact, relief, events, and calendar all expose connected route pathways
- relief is more legible as a care-and-review system
- events and calendar feel less isolated from the rest of ANU
- at least one shared bridge primitive exists so this logic is reusable

### Sprint 2: Public Narrative And Legibility Spine

Primary uplift targets:

- publishing / narrative output layer
- provenance / legibility
- knowledge layer

Primary surfaces:

- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(app)/impact/page.tsx`
- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/app/(public)/docs/page.tsx`
- `frontend-next/src/components/maps/FalakMapViewer.tsx`

Implementation focus:

- create a reusable public-brief / route-summary grammar
- expose source state, fallback truthfulness, and "why this matters" summaries more consistently
- make outward-facing pages feel like structured outputs of the operational substrate

Exit criteria:

- at least three outward-facing routes share a narrative-output grammar
- provenance, fallback state, and route purpose become easier to inspect
- public surfaces tell a coherent story instead of acting as disconnected endpoints

### Sprint 3: Tenant Semantics And Threshold Clarity

Primary uplift targets:

- multi-tenant engine
- provenance / legibility

Primary surfaces:

- `frontend-next/src/lib/brand.ts`
- `frontend-next/src/ui-system/layout/*`
- selected public/app shell routes
- `frontend-next/src/app/auth/page.tsx`
- `frontend-next/src/app/(app)/profile/page.tsx`

Implementation focus:

- move from brand-only variation toward route-aware tenant semantics
- expose clearer threshold language around witness / participant / contributor / steward
- make tenant-level naming and route framing more configurable without engine forks

Exit criteria:

- at least one tenant-semantic manifest exists beyond brand colors/copy alone
- threshold language becomes explicit on key entry/profile surfaces

### Sprint 4: Knowledge-To-Action Connectors

Primary uplift targets:

- knowledge layer
- heaven-to-earth action loop
- publishing / narrative output layer

Primary surfaces:

- `frontend-next/src/components/maps/FalakMapDetailPage.tsx`
- `frontend-next/src/components/maps/FalakMapLibraryPage.tsx`
- `frontend-next/src/app/(app)/education/*`
- related community / events / impact linking surfaces

Implementation focus:

- add stronger related-route bridges from education and map detail into events, community, impact, governance, and action routes
- make knowledge objects point toward real-world pathways without breaking the shared packet contract

Exit criteria:

- education/map detail no longer ends at inspection alone
- at least one clear route exists from a knowledge object into an action or community surface

## Delivery Doctrine

1. Upgrade partials in adjacent clusters, not isolated labels.
2. Favor shared primitives over one-off page inventions.
3. Use tests to lock route intent, not only component rendering.
4. Do not use these sprints as permission to casually restyle `/universe`.

## Immediate Execution Choice

Start with Sprint 1.

Reason:

- it upgrades four partial capability areas at once
- it strengthens real user journeys, not only architecture language
- it reduces fragmentation between care, scheduling, contribution, and participation
