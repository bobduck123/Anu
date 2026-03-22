# ANU UI Execution Plan

Date: 2026-03-22
Status: Active implementation plan
Primary target: `frontend-next`
Companion docs:
- `docs/ANU_UI_IMPLEMENTATION_DOCTRINE_2026-03-22.md`
- `docs/ANU_UI_SOURCE_MAP_AND_COMPONENT_MIGRATION_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`
- `docs/PLATFORM_USER_SATISFACTION_AUDIT_2026-03-20.md`
- `docs/PLATFORM_REMEDIATION_SPRINT_PLAN_2026-03-20.md`

## 1. Purpose

This document turns the doctrine and source map into an implementation sequence with:
- phases
- workstreams
- file targets
- deliverables
- acceptance criteria
- browser-proof verification requirements

This plan assumes the product must reach institutional production standard:
- live contract visibly honest
- no silent degradation
- browser-proven on real routes
- reusable enough to guide future UI work

## 2. Strategic Goal

Deliver an ANU frontend that:
- has a signature shell
- remains operationally strong
- uses transformed reference logic instead of generic SaaS defaults
- has a formal lab-to-production pipeline
- preserves the separate `/universe` track instead of flattening it

## 3. Delivery Order

Implementation order is:

1. Lab route and pattern-bank extraction
2. Shell redesign system foundations
3. Shell implementation
4. Subsystem chamber implementation
5. Community implementation
6. Operational observatory implementation
7. Universe doctrine and separate rollout

This order follows the user direction:
- build the pattern bank first
- then make the shell the signature
- then propagate the doctrine into the rest of the product

## 4. Workstreams

## Workstream A: Lab and pattern bank

Purpose:
- make reference integration explicit and reviewable
- avoid raw reference copying straight into production

Deliverables:
- dedicated lab route or route cluster under the frontend
- adapted ANU experiments, not raw reference dumps
- shared pattern-bank reference doc inside the repo
- component capture rules for promoted patterns

Candidate targets:
- `src/app/(app)/sandbox/*`
- new ANU lab route if current sandbox is insufficiently structured
- shared primitives under `src/ui-system` or `src/components/shared`

Definition of done:
- at least three adapted ANU experiments exist
- each experiment records source, transformation, and intended production target
- no raw clone is labeled production-ready

## Workstream B: Shell foundation

Purpose:
- establish the ANU signature before redesigning downstream pages

Primary file targets:
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`
- `src/ui-system/layout/MobileDock.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/manara/page.tsx`

Deliverables:
- revised shell token layer
- upgraded header and sidebar anatomy
- pathway and route-framing treatment
- mobile shell parity
- signature public hero direction for Home and Manara

Definition of done:
- ANU shell is visually unmistakable
- header and sidebar no longer read as standard dashboard chrome
- navigation remains easier, not harder, to understand
- mobile layout remains first-class

## Workstream C: Shared component primitives

Purpose:
- prevent page-by-page divergence after shell redesign

Deliverables:
- panel variants
- CTA variants
- section-hero variants
- filter bar primitives
- subsystem chamber primitives
- instrumentation card variants

Target directories:
- `src/ui-system/primitives`
- `src/ui-system/layout`
- `src/components/shared`
- selected pattern folders under `src/ui/patterns`

Definition of done:
- shell, community, and operational surfaces share recognizable primitives
- new pages can be assembled from ANU parts without re-inventing style every time

## Workstream D: Subsystem chambers

Purpose:
- create a distinct internal ANU style for messages, notifications, todos, and microcosms

Primary targets:
- `src/app/(app)/profile/page.tsx`
- future message and notification surfaces using `api.messages`, `api.todos`, `api.notifications`
- `src/app/(app)/community/microcosms/*`
- `src/components/teams/TeamsView.tsx`

Deliverables:
- chamber-style list and detail panels
- stronger task state treatment
- clearer private-space hierarchy
- stronger visual relation between personal tasks and community worlds

Definition of done:
- subsystem surfaces feel intentionally distinct from shell and admin
- state clarity remains high
- no cyberpunk noise or visual clutter is imported directly

## Workstream E: Community implementation

Purpose:
- turn Community into a signal-rich commons with strong browse and filtering logic

Primary targets:
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/community/CommunityComposerModal.tsx`
- `src/ui/patterns/draggable-gallery/*`
- `src/lib/community/loadCommunityUniverse.ts`
- `src/components/maps/communityUniverseAdapter.ts`

Deliverables:
- upgraded browse/filter shell
- stronger editorial and mosaic logic
- improved signal hierarchy
- clearer distinction between live, fallback, and seeded modes
- composer that feels local and accountable

Definition of done:
- community is not a bland feed
- community is not a pure gallery toy
- filters are understandable and useful
- live versus fallback is explicit

## Workstream F: Operational observatories

Purpose:
- bring admin, governance, trust, and organizer surfaces up to the same ANU standard without sacrificing clarity

Primary targets:
- `src/app/(app)/admin/*`
- `src/app/(app)/governance/*`
- `src/app/(app)/organizer/*`
- `src/app/(app)/memberships/page.tsx`
- `src/app/(app)/transparency/page.tsx`

Deliverables:
- instrumentation-oriented layout language
- restrained ANU observatory material system
- better dashboard comparison modules
- stronger row, panel, and status hierarchy

Definition of done:
- operational surfaces feel specific to ANU
- scanning and decision-making are easier than before
- motion remains minimal and meaningful

## Workstream G: Universe separate track

Purpose:
- protect current universe investment from accidental flattening

Targets:
- `src/app/(app)/universe/page.tsx`
- `src/components/maps/FalakMapViewer.tsx`
- `src/components/maps/universe/*`

Rule:
- do not execute this workstream as part of shell/community integration by default
- write a separate universe doctrine before major visual overhaul

## 5. Phase Plan

## Phase 0: Preparation

Tasks:
- create the ANU lab route or lab section
- establish pattern-bank capture template
- define token draft in code or docs
- inventory shell and shared primitive touchpoints

Required outputs:
- lab location exists
- component and pattern inventory exists
- this doctrine is attached to implementation work

## Phase 1: Shell system

Tasks:
- refine shell tokens
- redesign header and sidebar
- update pathway guide
- align mobile dock
- upgrade Home and Manara hero treatments

Proof required:
- visual parity on desktop and mobile
- no navigation regressions
- shell feels cohesive across key routes

## Phase 2: Primitive consolidation

Tasks:
- move one-off shell elements into reusable primitives
- create ANU panel, button, and hero variants
- centralize motion tiers

Proof required:
- at least three routes using the same upgraded primitives
- reduction in duplicated visual logic

## Phase 3: Subsystem chamber rollout

Tasks:
- redesign profile tabs for todos and notifications
- establish future chamber pattern for internal messaging
- improve microcosm entry and local-space framing

Proof required:
- subsystem style is visibly distinct but coherent with ANU
- task clarity remains strong

## Phase 4: Community rollout

Tasks:
- redesign community browse frame
- align composer
- tune filter and status language
- integrate upgraded signal hierarchy

Proof required:
- community still works with live and fallback data
- motion supports browse rather than distracting from it

## Phase 5: Observatory rollout

Tasks:
- update admin and governance layout language
- convert operational surfaces toward instrumentation patterns
- normalize trust surfaces

Proof required:
- observatory surfaces feel ANU-specific
- scanability improves under real usage

## 6. Engineering Standards

## 6.1 Reference integration standards

Before a reference-derived implementation is merged:
- source references must be named
- the intended ANU target surface must be named
- the transformation rule must be clear
- copied structure must be rewritten for ANU information architecture

## 6.2 Motion standards

Requirements:
- reduced-motion mode must remain respected
- hero motion must not be required to understand layout
- motion on operational surfaces must remain minimal
- infinite decorative motion is not allowed without explicit review

## 6.3 Performance standards

Requirements:
- avoid heavy GPU layers on every page by default
- no large ambient FX background may block text legibility
- community and shell motion must remain smooth on modern laptop and mobile hardware
- degrade expensive visuals before degrading task clarity

## 6.4 Accessibility standards

Requirements:
- keyboard navigation preserved
- focus visibility preserved or improved
- semantic labels maintained
- content remains readable without hover
- touch targets remain viable on mobile

## 6.5 Truthfulness standards

Requirements:
- live, cached, fallback, demo, and read-only states must be explicitly labeled
- degraded modes must not masquerade as live
- any lab-derived production surface must expose capability limits honestly

## 7. Browser-Proof Verification Matrix

Every major phase must be checked in a real browser on:
- desktop Chrome
- desktop Safari if available
- mobile viewport simulation and at least one real mobile-class behavior pass

Required verification cases:
- unauthenticated shell and public browsing
- authenticated shell and route transitions
- community live path
- community fallback path
- profile, todos, and notifications chamber path
- admin and governance operational scan path
- reduced-motion behavior on animated surfaces
- degraded backend and API state messaging where applicable

No surface reaches "done" from screenshots alone.

## 8. Acceptance Criteria by Surface

## Shell

A shell phase is accepted only if:
- it looks and feels distinct from generic SaaS
- route orientation is clearer than before
- the header and sidebar feel authored
- mobile behavior still holds

## Community

A community phase is accepted only if:
- browsing feels like a commons, not a gallery gimmick
- filters support meaning
- live and fallback states are explicit
- the page is still usable when images or data are incomplete

## Operational surfaces

An observatory phase is accepted only if:
- information is easier to parse than before
- styling does not slow decision-making
- motion remains controlled

## Subsystem chambers

A chamber phase is accepted only if:
- notifications, todos, and messages feel more intentional
- subsystem identity improves without harming clarity

## 9. Pull Request Checklist

Every significant UI PR in this program should answer:
- Which ANU surface class does this change belong to?
- Which source references informed it?
- What was kept?
- What was intentionally discarded?
- How does it avoid generic SaaS flattening?
- How does it preserve operational clarity?
- What browser-level verification was performed?
- What degraded or fallback states were checked?

## 10. Final Delivery Condition

This initiative is only truly complete when:
- the shell is the unmistakable ANU signature
- the product has a reusable ANU pattern bank
- community and operational surfaces both inherit the doctrine appropriately
- private subsystem surfaces have their own clear internal-language treatment
- reference usage is disciplined and reviewable
- no production surface silently degrades or hides its real state
- `/universe` receives its own proper doctrine instead of accidental spillover
