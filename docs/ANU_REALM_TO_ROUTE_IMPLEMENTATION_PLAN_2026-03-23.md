# ANU Realm-To-Route Implementation Plan

Date: 2026-03-23
Status: Active planning document
Primary target: `frontend-next`
Companion docs:
- `docs/ANU_UI_IMPLEMENTATION_DOCTRINE_2026-03-22.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`
- `docs/PARTIAL_CAPABILITY_UPLIFT_SPRINTS_2026-03-23.md`

## 1. Purpose

This document converts the realm interview into a concrete implementation program for the ANU frontend.

It defines:
- which routes belong to `Earth`, `Labyrinth`, and `Celestial`
- how those realms should change the existing shell and route behavior
- which files should be updated first
- which new shared primitives and adapters must exist
- how realm transitions should degrade safely
- how to prove the work in browser and in tests before rollout

This plan is not a replacement for the broader ANU UI doctrine. It is a realm-specific execution layer that plugs into the existing shell and universe work.

## 2. Realm Outcome

ANU should evolve into a three-realm product without exposing that structure as blunt mode labels.

Users should feel:
- `Earth` as grounded action and event terrain
- `Labyrinth` as descent through dark archive into manuscript revelation
- `Celestial` as starfield exploration for non-education universe content

These realms are not three separate apps. They are three environmental grammars built on one ANU shell family.

## 3. Realm Ownership

## Earth

Purpose:
- display action, attendance, need, and consequence as grounded civic matter

Owned routes:
- `src/app/(app)/actions/page.tsx`
- `src/app/(app)/events/page.tsx`
- `src/app/(app)/relief/page.tsx`
- `src/app/(app)/impact/page.tsx` as the upward bridge

Spatial rules:
- one shared topographic field system
- primary nav is a pill anchored at the bottom center of the field
- details rise from the ground as embedded panels
- `actions` emphasizes camps and parcels
- `events` emphasizes gatherings and markets
- `impact` remains mostly grounded, with outcomes lifting upward into the sky

## Labyrinth

Purpose:
- express governance, transparency, and model reading as archival descent rather than dashboard browsing

Owned routes:
- `src/app/(app)/governance/page.tsx`
- `src/app/(app)/governance/model-registry/page.tsx`
- `src/app/(public)/transparency/page.tsx`
- selected parts of `src/app/(public)/docs/page.tsx`

Primary proof route:
- `src/app/(app)/governance/model-registry/page.tsx`

Spatial rules:
- arrive in dark archive space first
- move through aisles, niches, and suspended catalog markers
- open manuscript chambers as overlays inside the archive
- manuscript chambers use layered folios, lifted seals, and embedded instruments

## Celestial

Purpose:
- package non-education nodes into starfield-first exploration surfaces

Owned routes:
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/constellations/page.tsx`
- `src/app/(app)/impact/page.tsx` on the upward consequence side

Primary proof route:
- `src/app/(app)/community/page.tsx`

Spatial rules:
- starfield is the primary environment
- selected content opens as inline bubbles or deeper Earth-Celestial chambers
- 2D list or page layouts remain as automatic and user-controlled fallback

## 4. Non-Negotiable Design Rules

- Realms should be felt through environment, material, and motion, not foregrounded as large mode labels.
- Earth strongly shapes only Earth-owned routes.
- Non-Earth routes inherit shell continuity subtly, but do not reuse the topographic Earth field directly.
- Navigation may change by realm, but must remain part of one ANU shell family.
- Typography remains shared across the product, with realm-specific emphasis and stylistic variation.
- Celestial may be ambitious visually, but must always have a safe fallback path.
- Labyrinth must remain legible and searchable; it cannot become a theatrical maze with poor retrieval.
- Earth cannot be decorative terrain only; it must preserve operational task clarity.

## 5. Required Architecture Additions

The current frontend has a strong shell layer and a strong shared universe layer, but it does not yet have a first-class realm layer. That must be added before route conversion.

## 5.1 New shared realm registry

Create:
- `src/ui-system/realms/realmRegistry.ts`
- `src/ui-system/realms/types.ts`
- `src/ui-system/realms/useRealmSurface.ts`

Responsibilities:
- map pathname patterns to realm ownership
- expose realm metadata to shell components
- define environment posture for each route
- expose whether a route should use realm shell, subtle shell inheritance, or no realm treatment

Suggested model:
- `earth`
- `labyrinth`
- `celestial`
- `neutral`

Suggested fields:
- `realm`
- `strength: 'strong' | 'subtle' | 'none'`
- `surfaceKind`
- `supportsRealmTransition`
- `fallbackMode`
- `environmentTitle`
- `entryPattern`

## 5.2 New realm primitive groups

Create:
- `src/ui-system/realms/earth/*`
- `src/ui-system/realms/labyrinth/*`
- `src/ui-system/realms/celestial/*`

Minimum first-pass components:

Earth:
- `EarthFieldShell.tsx`
- `EarthNavPill.tsx`
- `EarthObjectMarker.tsx`
- `EarthRisingPanel.tsx`
- `ImpactAscentThread.tsx`

Labyrinth:
- `LabyrinthArchiveShell.tsx`
- `ArchiveMarker.tsx`
- `ManuscriptOverlay.tsx`
- `StateSeal.tsx`
- `EmbeddedInstrumentPanel.tsx`

Celestial:
- `CelestialEntryTunnel.tsx`
- `CelestialStarfieldShell.tsx`
- `CelestialNodeBubble.tsx`
- `CelestialDetailChamber.tsx`
- `CelestialFallbackToggle.tsx`

## 5.3 Shell integration seams

Update:
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/MobileDock.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`

Responsibilities:
- read the realm registry
- switch shell posture by realm
- mount the bottom-center Earth nav pill only on strong Earth routes
- suppress Earth treatment on Labyrinth and Celestial routes
- preserve continuity in spacing, controls, and shell logic even when visual form changes

## 6. Universe Pipeline Changes Required For Celestial

Celestial should not be implemented as a separate one-off scene if the existing ANU universe packet system can carry the work.

Current anchors:
- `src/components/maps/universe/types.ts`
- `src/components/maps/universe/packetBuilders.ts`
- `src/components/maps/FalakMapViewer.tsx`
- `src/components/maps/FalakMapScene.tsx`
- `src/components/maps/communityUniverseAdapter.ts`

## 6.1 Extend the packet contract

The current `UniverseStarType` is not expressive enough for the planned Celestial families.

Update `src/components/maps/universe/types.ts`:
- keep current education and shared types
- add explicit support for:
  - community signal
  - constellation
  - impact outcome
  - memetic artifact

Recommended approach:
- either extend `UniverseStarType` directly
- or add `metadata.nodeFamily` as a first-class normalized field while keeping the broad star type stable

Recommendation:
- keep `UniverseStarType` broad for rendering categories
- add a required `metadata.nodeFamily` for realm-specific visual archetypes

Initial `nodeFamily` values:
- `community_signal`
- `constellation_cluster`
- `impact_outcome`
- `memetic_artifact`

## 6.2 Add celestial packaging adapters

Create:
- `src/components/maps/celestial/celestialPacketAdapter.ts`
- `src/components/maps/celestial/celestialArchetypes.ts`

Responsibilities:
- normalize community, constellation, impact, and memetic content into one packet-friendly structure
- assign archetype metadata
- assign inline-bubble vs detail-chamber behavior
- preserve source and provenance

## 6.3 Add impact outcome uplink support

Create:
- `src/components/maps/celestial/impactOutcomeAdapter.ts`

Update:
- `src/app/(app)/impact/page.tsx`
- relevant impact data adapters under `src/lib/api`

Responsibilities:
- convert grounded outcomes into Celestial packet-ready entities
- derive upward narrative without always-visible tether lines
- preserve Earth-origin influence in the Celestial representation

## 7. Implementation Sequence

The realm program should be executed in this order:

1. Labyrinth proof
2. Earth proof
3. Celestial proof
4. Cross-realm propagation

This follows the user decision:
- `Labyrinth`
- `Earth`
- `Celestial`

## Phase L0: Realm foundation

Goal:
- establish shared realm infrastructure before route conversion

Primary files:
- `src/ui-system/realms/types.ts`
- `src/ui-system/realms/realmRegistry.ts`
- `src/ui-system/realms/useRealmSurface.ts`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`

Required outputs:
- path-to-realm mapping
- realm strength handling
- shell awareness of realm ownership
- stable API for routes to ask for their realm posture

Definition of done:
- shell can answer which realm any canonical target route belongs to
- no route-specific hardcoding inside `Header.tsx` beyond registry consumption
- realm logic is test-covered

## Phase L1: Labyrinth proof on model registry

Goal:
- convert `/governance/model-registry` into the first canonical archive experience

Primary files:
- `src/app/(app)/governance/model-registry/page.tsx`
- `src/ui-system/realms/labyrinth/LabyrinthArchiveShell.tsx`
- `src/ui-system/realms/labyrinth/ArchiveMarker.tsx`
- `src/ui-system/realms/labyrinth/ManuscriptOverlay.tsx`
- `src/ui-system/realms/labyrinth/StateSeal.tsx`
- `src/ui-system/realms/labyrinth/EmbeddedInstrumentPanel.tsx`

Behavior:
- page opens in dark archive
- models appear as state-bearing archival objects
- selecting a model opens a manuscript overlay within the same space
- first glance shows:
  - purpose
  - status
  - version
  - shape / simulation form
- second layer shows:
  - steward
  - dependencies
  - history

Archive state vocabulary:
- dormant
- active
- contested
- deprecated
- experimental

Suggested data additions:
- derive state labels from API data if available
- otherwise add a local mapper near the route

Definition of done:
- route no longer reads as a plain card list
- archive state is legible before entry
- manuscript overlay preserves reading clarity and keyboard access
- no full page reload is needed to inspect multiple items

## Phase L2: Labyrinth propagation

Goal:
- extend the model-registry pattern into governance and trust surfaces without flattening them

Primary files:
- `src/app/(app)/governance/page.tsx`
- `src/app/(public)/transparency/page.tsx`
- `src/app/(public)/docs/page.tsx`
- optionally selected governance child routes after proof

Behavior:
- governance index becomes the archive threshold rather than a normal observatory grid
- transparency becomes a truth passage ending in manuscript-like records
- docs uses manuscript arrival selectively for doctrine-heavy sections, not for every article

Definition of done:
- Labyrinth feels like one institutional reading family
- docs remains readable and searchable
- transparency remains honest and public, not obscured by aesthetics

## Phase E0: Earth shell foundation

Goal:
- create the grounded field system and bottom-center nav pill

Primary files:
- `src/ui-system/realms/earth/EarthFieldShell.tsx`
- `src/ui-system/realms/earth/EarthNavPill.tsx`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/MobileDock.tsx`

Behavior:
- Earth-owned routes mount the field shell
- primary nav anchors at bottom center
- secondary actions remain soft and borderless

Definition of done:
- Earth shell is clearly distinct from current generic route framing
- nav remains usable on desktop and mobile
- non-Earth routes only inherit subtle continuity, not the full field treatment

## Phase E1: Actions and events proof

Goal:
- deliver one shared Earth field with route-specific overlays

Primary files:
- `src/app/(app)/actions/page.tsx`
- `src/app/(app)/events/page.tsx`
- `src/ui-system/realms/earth/EarthObjectMarker.tsx`
- `src/ui-system/realms/earth/EarthRisingPanel.tsx`

Object grammar:
- actions:
  - camps
  - parcels
- events:
  - gatherings
  - markets

Behavior:
- route overlays differ, field system remains shared
- detail opens as a grounded rising panel
- map/calendar/list views remain available as operational backup

Definition of done:
- actions and events feel like siblings in one Earth environment
- detail panels remain clearer than current generic cards or sheets
- list and utility views still satisfy task completion

## Phase E2: Relief and impact bridge

Goal:
- extend Earth into need and consequence, then connect it upward

Primary files:
- `src/app/(app)/relief/page.tsx`
- `src/components/relief/ReliefIntakeForm.tsx`
- `src/app/(app)/impact/page.tsx`
- `src/ui-system/realms/earth/ImpactAscentThread.tsx`

Behavior:
- relief remains grounded and urgent
- impact remains mostly grounded
- outcomes visibly ascend upward with relatively literal trajectories
- provenance remains inspectable without permanent tether lines

Definition of done:
- impact reads as the bridge between Earth and Celestial
- relief remains operationally strong
- users can understand how grounded effort becomes elevated public consequence

## Phase C0: Celestial infrastructure

Goal:
- prepare non-education node packaging before replacing route surfaces

Primary files:
- `src/components/maps/universe/types.ts`
- `src/components/maps/celestial/celestialPacketAdapter.ts`
- `src/components/maps/celestial/celestialArchetypes.ts`
- `src/components/maps/communityUniverseAdapter.ts`
- `src/components/maps/universe/packetBuilders.ts`

Behavior:
- package the first node families:
  - community signals
  - constellations
  - impact outcomes
  - memetic artifacts
- attach visual archetype metadata
- attach interaction mode metadata:
  - inline bubble
  - detail chamber
  - route handoff

Definition of done:
- community and future celestial routes can render with one packet path
- node family and presentation mode are explicit, not implicit

## Phase C1: Community starfield proof

Goal:
- make `/community` the first starfield-first route

Primary files:
- `src/app/(app)/community/page.tsx`
- `src/components/maps/FalakMapViewer.tsx`
- `src/ui-system/realms/celestial/CelestialEntryTunnel.tsx`
- `src/ui-system/realms/celestial/CelestialStarfieldShell.tsx`
- `src/ui-system/realms/celestial/CelestialNodeBubble.tsx`
- `src/ui-system/realms/celestial/CelestialDetailChamber.tsx`
- `src/ui/patterns/draggable-gallery/DraggableGallery.tsx`

Behavior:
- route begins with a tunnel selection
- user chooses playful intents such as:
  - stories
  - news
  - topics
  - moods
  - local/global
  - people
- transition feels like celestial maps being carved and then turning to life
- tunnel steers user into a starfield region
- selecting a node opens the draggable gallery
- gallery generates related community nodes around the active selection

Interaction rules:
- non-page content opens inline
- richer signals such as news or portfolio open an Earth-Celestial detail chamber

Definition of done:
- community is no longer a page with a decorative universe panel
- starfield is the primary environment
- user can still switch to 2D safely

## Phase C2: Constellations proof

Goal:
- convert `/constellations` from a list page into a Celestial sibling route

Primary files:
- `src/app/(app)/constellations/page.tsx`
- `src/app/(app)/constellations/[id]/page.tsx`
- shared Celestial shell components from Phase C1

Behavior:
- route becomes starfield-first
- constellations are spatial clusters, not only cards
- 2D backup remains available

Definition of done:
- constellation browsing and detail feel native to the Celestial family
- list fallback remains safe for low-performance environments

## Phase C3: Memetic and impact celestial propagation

Goal:
- complete the first non-education celestial mesh

Primary files:
- `src/app/(app)/impact/page.tsx`
- `src/app/(app)/flora-fauna/page.tsx`
- `src/app/(app)/flora-fauna/memes/[memeId]/page.tsx`
- `src/app/(app)/flora-fauna/channels/[channelId]/page.tsx`
- relevant adapters under `src/components/maps/celestial/*`

Behavior:
- impact outcomes join the Celestial universe as elevated result forms
- memetic artifacts render as crafted relics
- each family is recognizable by shape and material first, motion second

Definition of done:
- impact, community, constellations, and memetic artifacts can all enter the shared celestial packet path

## 8. Realm-Specific Navigation Plan

## Earth navigation

Primary expression:
- bottom-center nav pill embedded in the field

Rules:
- strong only on Earth-owned routes
- actions and route tools can branch from it softly
- secondary menus must avoid hard edges and visible dashboard chrome

## Labyrinth navigation

Primary expression:
- orientation through archive markers, passage cues, and manuscript overlays

Rules:
- keep global ANU shell continuity
- avoid Earth terrain motifs
- make retrieval faster, not slower

## Celestial navigation

Primary expression:
- node discovery, tunnel steering, and contextual bubble or chamber transitions

Rules:
- no requirement for flat left-rail browsing as the primary experience
- preserve alternate 2D navigation for fallback

## 9. Fallback, Performance, and Accessibility Rules

Celestial requires the strictest fallback policy.

Required behavior:
- automatic fallback to 2D on insufficient device or rendering conditions
- explicit user toggle to 2D
- route must remember last safe mode for the session if desired

Labyrinth required behavior:
- manuscript overlays remain keyboard reachable
- archive markers remain searchable and not pointer-only
- reduced motion must preserve the archive structure

Earth required behavior:
- list, calendar, or map modes remain available as operational backups
- terrain treatment cannot block straightforward task completion

## 10. Browser-Proof Verification Gates

No realm phase should be considered complete until it is proven both structurally and in browser.

## Gate A: Local tests

Add route and component tests for:
- realm registry correctness
- shell posture by route
- Earth rising panel behavior
- Labyrinth archive and manuscript overlay behavior
- Celestial tunnel entry and 2D fallback behavior

## Gate B: Browser route proof

Each phase must be checked in browser on the actual route:

Labyrinth:
- `/governance/model-registry`

Earth:
- `/actions`
- `/events`
- `/impact`

Celestial:
- `/community`
- `/constellations`

Required proof points:
- correct environment loads
- realm-specific navigation appears
- fallback and error states are honest
- keyboard escape and focus behavior work
- mobile view remains navigable

## Gate C: Performance and degradation proof

For Celestial:
- confirm 2D fallback engages
- confirm manual toggle works
- confirm primary content remains inspectable without starfield

For Earth:
- confirm operational task flows still work in list or utility views

For Labyrinth:
- confirm archive remains readable under reduced motion and lower contrast risk

## 11. Suggested PR Slices

PR 1:
- realm registry
- shell awareness
- basic tests

PR 2:
- Labyrinth primitives
- model registry conversion

PR 3:
- Labyrinth propagation into governance index and transparency

PR 4:
- Earth shell foundation
- nav pill

PR 5:
- actions and events Earth conversion

PR 6:
- relief and impact bridge

PR 7:
- celestial packet extensions
- archetype metadata

PR 8:
- community tunnel and starfield conversion

PR 9:
- constellations conversion

PR 10:
- impact outcomes and memetic artifact propagation

## 12. Risks and Controls

Risk:
- realm work becomes spectacle layered on top of unchanged route logic

Control:
- every realm phase must leave reusable primitives and route-contract changes behind

Risk:
- Celestial becomes too expensive or inaccessible

Control:
- build fallback architecture before route replacement

Risk:
- Labyrinth sacrifices retrieval and legibility

Control:
- manuscript overlay and archive items must stay searchable and keyboard reachable

Risk:
- Earth field weakens straightforward action completion

Control:
- preserve utility modes and verify task flows before sign-off

## 13. Definition Of Success

This program succeeds when:
- `/governance/model-registry` clearly feels like archive-to-manuscript descent
- `/actions` and `/events` clearly feel like one grounded Earth field with different overlays
- `/community` becomes starfield-first with tunnel entry and honest 2D fallback
- `impact` convincingly acts as the Earth-to-Celestial bridge
- realm changes feel like one ANU system, not three unrelated design experiments

## 14. Immediate Next Move

Begin with `PR 1` and `PR 2`:
- establish the realm registry and shell seam
- then convert `src/app/(app)/governance/model-registry/page.tsx` into the first Labyrinth proof

That is the lowest-risk and highest-value path because the current model registry route is still structurally simple and can carry the first full realm conversion without destabilizing the broader community or universe stack.
