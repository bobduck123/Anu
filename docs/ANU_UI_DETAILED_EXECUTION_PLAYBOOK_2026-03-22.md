# ANU UI Detailed Execution Playbook

Date: 2026-03-22
Status: Working playbook
Primary repo target: `frontend-next`
Companion docs:
- `docs/ANU_UI_IMPLEMENTATION_DOCTRINE_2026-03-22.md`
- `docs/ANU_UI_SOURCE_MAP_AND_COMPONENT_MIGRATION_2026-03-22.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`

## 1. Purpose

This playbook converts the ANU UI execution plan into concrete implementation work.

It exists to answer:
- what gets built first
- which files change
- what each phase is allowed to do
- how reference material becomes production work
- what must be proven in browser before a phase can be considered complete

This document should be used when opening implementation tickets, slicing PRs, or sequencing frontend work.

## 2. Strategic Constraints

All execution work in this program must honor these constraints:
- Shell first.
- Pattern bank first, before broad rollout.
- `/universe` remains a separate track.
- Public routes may be bold, but must stay legible.
- Operational routes must remain semantically stronger than they are expressive.
- No phase can silently degrade or pretend a fallback is live.
- No reference can be promoted into production without ANU-specific restructuring.

## 3. Current Frontend Anchors

These are the current anchor files for the work program.

### Shell and routing anchors
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/MobileDock.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/manara/page.tsx`
- `src/app/globals.css`

### Community anchors
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/community/CommunityComposerModal.tsx`
- `src/ui/patterns/draggable-gallery/DraggableGallery.tsx`
- `src/ui/patterns/draggable-gallery/PostDetailModal.tsx`
- `src/data/adapters/communityAdapter.ts`
- `src/lib/community/loadCommunityUniverse.ts`
- `src/components/maps/communityUniverseAdapter.ts`

### Subsystem chamber anchors
- `src/app/(app)/profile/page.tsx`
- `src/app/(app)/community/microcosms/*`
- `src/components/teams/TeamsView.tsx`
- API integration points in `src/lib/api.ts` for `messages`, `todos`, `notifications`, and `microcosms`

### Public trust and documentation anchors
- `src/app/(public)/transparency/page.tsx`
- `src/app/(public)/docs/page.tsx`
- `src/app/(public)/contact/page.tsx`
- `src/app/(app)/memberships/page.tsx`
- `src/app/(app)/flora-fauna/page.tsx`

### Operational observatory anchors
- `src/app/(app)/admin/*`
- `src/app/(app)/governance/*`
- `src/app/(app)/organizer/*`

### Universe anchors, explicitly held separate
- `src/app/(app)/universe/page.tsx`
- `src/components/maps/FalakMapViewer.tsx`
- `src/components/maps/universe/*`

## 4. Delivery Doctrine in Practice

Each phase should produce both:
- a visible surface gain
- reusable implementation artifacts

That means no phase should end as a one-off restyle. Every major surface change must leave behind a reusable ANU pattern or primitive.

## 5. Phase 0: Lab and Pattern-Bank Foundation

## Goal

Create the structure that lets ANU absorb reference material without turning production into a collage.

## Required outputs
- one ANU lab surface for adapted experiments
- one pattern-bank capture artifact
- one token staging location
- one source manifest tying experiments to references

## Preferred code targets
- `src/app/(app)/sandbox/*` or a dedicated `src/app/(app)/lab/*`
- `src/components/landing/*` for shell experiment staging if needed
- `src/ui-system/primitives/*` or a new `src/ui-system/anu/*` grouping
- `src/app/globals.css` for staged token definitions

## Detailed work packages

### 0A. Create the lab route

Intent:
- hold adapted ANU experiments
- separate high-risk concept work from production routes

Requirements:
- must be reachable through a non-public or clearly marked route
- must distinguish `adapted production candidate` from `high-risk concept`
- must never present raw examples as if they are ANU production components

Suggested structure:
- shell experiments
- component experiments
- chamber experiments
- community experiments

### 0B. Create the pattern-bank manifest

Intent:
- ensure every promoted pattern has provenance and a target surface

Minimum fields per entry:
- source reference
- target ANU surface
- extracted qualities
- discarded qualities
- current status: `lab`, `candidate`, `approved`, `shipped`

Acceptable location:
- markdown in `docs`
- colocation with lab route if the UI exposes it internally

### 0C. Stage ANU shell tokens

Intent:
- centralize typography, palette, material, spacing, and motion settings before broad implementation

Primary targets:
- `src/app/globals.css`
- any existing shared theme utility layer

Required categories:
- type
- color
- borders
- radii
- shadows
- materials
- motion durations and easings

### 0D. Define promotion rules

Before a lab pattern graduates:
- it must have a target surface
- it must survive mobile and keyboard review
- it must preserve clarity under degraded data
- it must be ANU-specific rather than reference-generic

## Phase 0 acceptance criteria
- at least 3 adapted experiments exist
- each experiment identifies its sources
- token staging exists
- no raw clone is treated as ship-ready

## 6. Phase 1: Shell Signature System

## Goal

Make the shell the unmistakable ANU signature.

## Required surfaces
- header
- sidebar
- mobile dock
- pathway guide
- home hero
- Manara entry surface

## 1A. Header redesign

Primary file:
- `src/ui-system/layout/Header.tsx`

Problems to solve:
- utility cluster still reads like a familiar app bar
- the pathway unit is useful but not yet fully ceremonial
- notification and profile utilities do not yet form a clear subsystem doorway

Implementation tasks:
- compress and hierarchize utility actions so the pathway signal dominates
- make tenant identity feel less like logo-plus-text and more like institution-plus-beacon
- redesign the utility cluster to create stronger distinction between:
  - route identity
  - system utilities
  - private user doorway
- reduce generic chip repetition
- ensure desktop and mobile states maintain the same tone

Reference application:
- keep ANU shell continuity
- take spatial and authored posture from `home-page-design`
- take control-box refinement from `ui-kit-always-changing`

Acceptance criteria:
- immediately recognizable as ANU
- easier route orientation than current build
- profile and notifications read as entry into a private subsystem, not random utilities

### Browser proof
- desktop, signed out
- desktop, signed in
- mobile menu open and closed
- keyboard focus visible on all controls

## 1B. Sidebar redesign

Primary file:
- `src/ui-system/layout/Sidebar.tsx`

Problems to solve:
- information architecture is good, but visual treatment still risks dashboard familiarity
- active states rely too heavily on common panel fill patterns
- universe grid, rail links, and section logic need stronger authored hierarchy

Implementation tasks:
- redesign section headers to feel like ANU domains rather than admin categories
- refine active-state treatment with edge glow, inset layering, and hierarchy rather than simple fill
- make the collapsed rail mode feel intentional and ceremonial
- improve the transition between:
  - full panel
  - collapsed rail
  - immersive route behavior
- clarify the relationship between rail items and full panel items

Reference application:
- `app-menu-with-lock-screen` for navigation posture
- `configurable-sidebar-w-grid-transitions` for section transitions
- current ANU shell for continuity

Acceptance criteria:
- shell navigation reads as authored and institution-like
- active location is easier to feel
- mobile drawer and desktop rail feel like one system

## 1C. Layout shell and mobile dock

Primary files:
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/MobileDock.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`

Implementation tasks:
- formalize which routes suppress or reshape shell chrome
- align mobile dock tone with header and sidebar
- make pathway guidance more like route framing and less like status ornament
- ensure route-level shell behavior remains explicit

Acceptance criteria:
- shell behavior is predictable across Home, Manara, Community, Education, and Universe
- mobile shell does not feel like a reduced-quality fallback

## 1D. Home hero

Primary file:
- `src/app/(app)/home/page.tsx`

Problems to solve:
- current hero is good, but it still needs to become the canonical shell expression
- the page must preserve current landing feel while becoming more programmatic

Implementation tasks:
- deepen atmospheric layering without relying on heavy FX
- increase ceremonial hierarchy in the hero
- ensure support cards and CTAs inherit the shell material system
- keep "Start here" orientation integrated rather than bolted on

Reference application:
- `home-page-design`
- `home-page-playground`

Acceptance criteria:
- users immediately understand this is ANU and not a generic portal
- the page still orients rather than merely impresses

## 1E. Manara page

Primary file:
- `src/app/(app)/manara/page.tsx`

Implementation tasks:
- align Manara with the upgraded shell system
- ensure feed, fallback, onboarding, and memetics modules share the same route logic
- make the hero and feed containers feel beacon-like and institutionally coherent
- prevent section cards from drifting into unrelated subsystem styles

Acceptance criteria:
- Manara feels like the main signal field, not just a stylized feed page
- fallback and onboarding messaging remain explicit and visually coherent

## Phase 1 acceptance criteria
- shell identity is visibly stronger on Home and Manara
- header, sidebar, and mobile dock feel like one authored system
- route orientation is clearer than before

## 7. Phase 2: Pattern Primitive Consolidation

## Goal

Turn shell decisions into reusable production primitives.

## Required output classes
- hero frame
- section header
- ANU primary CTA
- ANU secondary CTA
- panel variants
- chip variants
- filter bars
- instrumentation cards
- chamber cards

## Detailed work packages

### 2A. Token codification

Primary target:
- `src/app/globals.css`

Tasks:
- codify type scale
- codify palette groups
- codify panel and glass materials
- codify border and glow behavior
- codify motion durations and easings

### 2B. Shared button and panel primitives

Likely targets:
- `src/ui-system/primitives/*`
- any shared shell class definitions currently embedded in pages

Tasks:
- define canonical ANU button families
- define public shell panel family
- define chamber panel family
- define operational instrumentation panel family

### 2C. Route hero primitives

Targets:
- public route top sections

Tasks:
- standardize hero anatomy
- preserve route-specific voice
- avoid flattening everything into one identical banner

### 2D. Filter and control bars

Targets:
- community
- education
- impact and trust surfaces

Tasks:
- define filter bars that feel tool-like
- define compact control groups
- ensure filter state is legible without reading dense labels

## Phase 2 acceptance criteria
- at least 3 routes share the upgraded primitives
- page-level restyles are now visibly systemized
- shell decisions are reusable, not one-off

## 8. Phase 3: Subsystem Chambers

## Goal

Create a distinct internal-language treatment for private spaces.

## 3A. Profile cockpit

Primary file:
- `src/app/(app)/profile/page.tsx`

Problems to solve:
- profile contains strong function but mixed UI language
- notifications and todos still read as standard cards
- organizer state, progress, and personal task zones lack a distinct chamber identity

Implementation tasks:
- redesign tab structure and internal navigation
- treat todos and notifications as chamber modules
- refine organizer application area into a more formal progression chamber
- make classic and desktop modes follow the same ANU chamber doctrine
- reduce layout fragmentation between profile overview and task surfaces

Acceptance criteria:
- profile feels like a private cockpit, not a generic account page
- notifications and todos feel local, accountable, and clear

## 3B. Microcosm and team entry

Primary targets:
- `src/app/(app)/community/microcosms/*`
- `src/components/teams/TeamsView.tsx`

Tasks:
- define microcosm entry frame
- turn team and microcosm panels into semi-autonomous subworld entry cards
- clarify the relation between team action, local place, and the wider ANU shell

Acceptance criteria:
- microcosms feel like meaningful local chambers
- no visual contradiction with the shell

## 3C. Future message and notification surface protocol

Targets:
- current API integration points in `src/lib/api.ts`
- future UI modules for messages and notifications

Tasks:
- define how message lists, thread previews, and notification stacks should look
- establish what may borrow from internal messaging references and what is forbidden
- ensure these surfaces privilege clarity over novelty

## Phase 3 acceptance criteria
- subsystem chamber language is clearly distinct from shell and admin
- tasks remain easy to parse
- no direct cyberpunk import slips into production

## 9. Phase 4: Community Commons

## Goal

Transform community into a signal-rich, filtered commons.

## 4A. Community browse frame

Primary file:
- `src/app/(app)/community/page.tsx`

Implementation tasks:
- redesign the top information/control frame above the gallery
- make filters and states clearer and more grounded
- keep motion energetic, but subordinate to browsing logic
- improve the relationship between gallery, warnings, live status, and composer entry

### Specific requirements
- warning and fallback messages must feel integrated, not bolted on
- the community universe side panel must remain clearly secondary
- the user must never confuse demo, cached, and live content

## 4B. Draggable gallery hardening

Primary targets:
- `src/ui/patterns/draggable-gallery/DraggableGallery.tsx`
- `src/ui/patterns/draggable-gallery/PostDetailModal.tsx`

Implementation tasks:
- improve tile hierarchy
- improve metadata legibility
- strengthen the relation between image-led discovery and textual signal
- keep movement expressive without turning the gallery into a toy

Reference application:
- `interactive-image-mosaic`
- `editorial-fashion-slider`
- selected lessons from `gsap-draggable-image-gallery`

## 4C. Composer chamber

Primary target:
- `src/app/(app)/community/CommunityComposerModal.tsx`

Tasks:
- make posting feel accountable and local
- align composer with chamber doctrine
- preserve auth and publish flow clarity

## Phase 4 acceptance criteria
- community feels like a commons, not a generic feed
- filters and status states are more legible
- gallery remains immersive without sacrificing meaning

## 10. Phase 5: Trust and Observatory Surfaces

## Goal

Bring public trust routes and operational surfaces into the ANU system without spectacle creep.

## 5A. Public trust routes

Primary targets:
- `src/app/(public)/transparency/page.tsx`
- `src/app/(public)/docs/page.tsx`
- `src/app/(public)/contact/page.tsx`
- `src/app/(app)/memberships/page.tsx`
- `src/app/(app)/flora-fauna/page.tsx`

Implementation tasks:
- align these routes with shell doctrine
- reduce any generic marketing-page feel
- improve trust hierarchy and route relationships
- make public trust content feel editorial and inspectable

Route-specific notes:
- `transparency/page.tsx` should become the model for public truth surfaces
- `docs/page.tsx` should feel like an operations library, not a link grid
- `contact/page.tsx` should feel like a routing surface, not a fallback help page
- `memberships/page.tsx` should become a serious trust-and-sustainability surface, not a checkout card wall
- `flora-fauna/page.tsx` should keep its subsystem distinctness while inheriting better ANU structure

## 5B. Operational observatories

Primary targets:
- `src/app/(app)/admin/*`
- `src/app/(app)/governance/*`
- `src/app/(app)/organizer/*`

Implementation tasks:
- define observatory headers
- introduce instrumentation card family
- standardize comparison, registry, and review surfaces
- reduce visual randomness across governance pages

Specific guidance:
- charts, metrics, and list rows should become the primary visual grammar
- motion is allowed only when it improves comprehension
- public shell material should be reduced in favor of operational scanability

## Phase 5 acceptance criteria
- public trust routes feel more intentional and more trustworthy
- governance and admin surfaces are clearer, calmer, and more specific to ANU

## 11. Explicitly Deferred: Universe Track

Do not treat these phases as permission to restyle `/universe` casually.

Universe is deferred for a dedicated doctrine because it already has:
- packet architecture
- scene and viewer investment
- a distinct interaction logic

Only maintenance and safety work should occur on Universe until its separate doctrine exists.

## 12. PR Slicing Doctrine

The work should be pushed in narrow, reviewable batches.

## Recommended PR order

### PR 1. Lab and token staging
- add lab route or improve sandbox structure
- add source manifest and pattern-bank capture
- stage shell tokens

### PR 2. Header and sidebar
- `Header.tsx`
- `Sidebar.tsx`
- `LayoutShell.tsx`
- `PathwayGuideBar.tsx`
- `MobileDock.tsx`

### PR 3. Home and Manara shell integration
- `home/page.tsx`
- `manara/page.tsx`
- shared hero or shell classes

### PR 4. Primitive consolidation
- shared buttons, panels, filter bars, hero variants

### PR 5. Profile and subsystem chambers
- `profile/page.tsx`
- microcosm or team entry surfaces

### PR 6. Community commons
- `community/page.tsx`
- gallery pattern files
- composer modal

### PR 7. Public trust surfaces
- `transparency/page.tsx`
- `docs/page.tsx`
- `contact/page.tsx`
- `memberships/page.tsx`

### PR 8. Governance and admin observatories
- admin and governance route cluster

## PR rules
- do not mix Universe redesign into shell or community PRs
- do not mix high-risk lab experiments into production PRs without explicit promotion
- every PR must state reference sources and transformation logic

## 13. Browser and QA Proof

Every shipped phase must be proven in browser, not just by code review.

## Required manual checks

### Shell checks
- signed out desktop Home
- signed in desktop Home
- signed out Manara
- mobile shell open and closed
- route transitions across Home, Manara, Community, Education

### Community checks
- live content path
- fallback content path
- composer open, auth redirect, and post-publish return
- gallery motion under desktop and mobile widths

### Chamber checks
- profile classic mode
- profile desktop mode if enabled
- notifications list
- todos list
- organizer state and progression widgets

### Trust and operational checks
- public transparency
- docs and contact
- memberships checkout states
- at least one governance page and one admin page

## Required technical verification
- targeted tests for touched surfaces
- `npm run typecheck`
- `npm run build`
- targeted lint or full lint where feasible

## 14. Risk Register

### Risk 1: Shell becomes beautiful but harder to navigate

Countermeasure:
- shell PRs must include route-orientation review
- no visual move is accepted if it slows wayfinding

### Risk 2: Community turns into spectacle

Countermeasure:
- filters, status, and metadata must remain first-class
- gallery motion cannot hide browsing logic

### Risk 3: Chamber subsystem drifts into stylistic noise

Countermeasure:
- private subsystem surfaces keep clear task hierarchy
- internal references are structural, not literal

### Risk 4: Operational observatories inherit too much public atmosphere

Countermeasure:
- instrumentation over atmosphere
- matte over glow
- scanability over cinematic effect

### Risk 5: Reference usage becomes undisciplined

Countermeasure:
- require source declaration
- require transformation description
- require lab promotion path

## 15. Completion Condition

This program is complete only when:
- ANU has a signature shell
- the pattern bank exists and is actually reusable
- private subsystem chambers feel intentional
- community feels like a real commons
- public trust routes are coherent and strong
- operational observatories are clear and disciplined
- the product can continue evolving without falling back into generic SaaS defaults
