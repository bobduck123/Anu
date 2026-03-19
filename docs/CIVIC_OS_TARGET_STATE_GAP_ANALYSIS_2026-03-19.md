# Civic OS Target-State Gap Analysis

Date: 2026-03-19

Related audit:

- [SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md)

## Purpose

This document reframes the current repo and deployment state against the actual intended destination:

not a site,
not a map feature,
not an education product,
but a civic-cultural operating system.

This is the strategic companion to the systems audit. The audit identifies breakages and hosting/runtime failures. This document identifies what the whole system is supposed to become, what classes of capability are still missing, and what must be true in the architecture for that end-state to exist coherently.

## The True End-State

The system is a four-layer operating model:

- Heaven:
  - learning
  - shared knowledge
  - meaning
  - global online community
  - stars
  - orientation
- Earth:
  - places
  - events
  - organisations
  - people
  - tasks
  - logistics
  - funding
  - material change
- Hell:
  - approvals
  - regulation
  - bureaucracy
  - dependencies
  - institutional drag
  - automation of friction into something navigable
- God layer:
  - constitutional rules
  - power constraints
  - visibility rules
  - money-routing constraints
  - access mediation
  - automation constraints
  - anti-corruption safeguards on the world model

In full form, this becomes:

- a knowledge universe
- a real-world coordination engine
- a governance machine
- a mutual-aid and value-routing layer
- a cultural memory system
- a multi-tenant world-builder

## The Architectural Meaning Of That Vision

The system cannot remain a loose collection of routes and themed pages. To reach the intended state, it must behave as one engine with multiple planes.

That implies:

- one unified ontology
- one shared spatial grammar
- one public plane
- one privileged control plane
- one governance constitution
- one provenance model
- one multi-tenant engine with tenant-native skins

The current codebase still shows fragmentation:

- separate education and universe language
- partial fallback systems
- hard splits between symbolic surfaces and operational surfaces
- auth/admin meaning drifting between frontend and backend
- backend service boundaries not yet coherent under failure

## Strategic Gap Map

### 1. Unified Cosmology Gap

Desired state:

- `/universe` is the master spatial language for the entire product
- education, governance, community, logistics, events, venues, practitioners, mutual aid, and institutional processes all render through the same universe grammar

Required primitives:

- stars
- constellations
- worlds
- pathways
- portals
- monoliths
- nutrients
- gravity
- signal strength

Interpretation by layer:

- education stars:
  - concepts
  - sources
  - schools of thought
  - claims and counterclaims
- earth stars:
  - places
  - venues
  - projects
  - events
  - practitioners
  - volunteers
  - campaigns
- hell stars:
  - approvals
  - blockers
  - forms
  - compliance steps
  - dependencies
  - review states
- god layer:
  - constitutional rules
  - trust boundaries
  - visibility rules
  - decision constraints

Current gap:

- the repo has a stronger universe renderer direction, but not one shared world grammar across all product domains
- education maps are moving toward the universe
- pools, governance, community, and logistics are still mostly separate app surfaces

Requirement:

- define a canonical world object model that every major domain can render into
- stop treating universe as a themed page and instead treat it as the primary interaction grammar

### 2. Tenant-Native World Skin Gap

Desired state:

- same engine
- radically different cosmologies by tenant

Examples:

- ANU:
  - learning universe
  - atlas
  - academy
  - civic imagination
- Flora Fauna:
  - ecological mutualism
  - restoration
  - nature
  - action
- Mudyin:
  - healing
  - practitioner pathways
  - community care
  - embodied knowledge
- FBI Cultural OS:
  - venues
  - artists
  - programming
  - labour
  - volunteers
  - fundraising

Current gap:

- brand variation exists in pieces
- true tenant-native mythology, semantics, and world-skin architecture are not yet first-class engine capabilities

Requirement:

- separate engine primitives from tenant mythology
- add tenant-level control over:
  - copy
  - semantics
  - metrics
  - color systems
  - onboarding
  - object naming
  - action language
  - governance framing

### 3. Initiation and First-Run Gap

Desired state:

- onboarding as initiation, not signup
- first contact with heaven/earth/hell through interaction
- reactive world state shaped by what the user chooses to care about

Current gap:

- current system has login/auth patterns and route entry points, but not a fully mythic, reactive initiation architecture

Requirement:

- design onboarding as world-entry
- make first-run interactions reveal metaphysics through use
- support lens selection, not just account creation

### 4. Knowledge Layer Gap

Desired state:

- real ingestion
- evidence weighting
- freshness logic
- provenance on every knowledge object
- claims and counterclaims
- stable anchor concepts
- curator overlays
- inspectable machine-generated pathways

Current gap:

- there is progress on source-linked map objects and fallback map data
- but the repo is still not a fully realized knowledge packet system with durable provenance, conflict modeling, and versioned epistemic objects

Requirement:

- define knowledge packet structure
- include:
  - source lineage
  - evidence score
  - freshness score
  - conflict state
  - historical versioning
  - curator amendments

### 5. Heaven-to-Earth Action Loop Gap

Desired state:

- learning objects lead into material action
- concepts connect to:
  - events
  - communities
  - institutions
  - jobs
  - campaigns
  - tasks
  - funding

Current gap:

- knowledge and material coordination are still largely separate surfaces

Requirement:

- every meaningful knowledge object should be able to expose:
  - related places
  - related communities
  - related actions
  - related events
  - related campaigns
  - related funding or volunteer routes

### 6. Community and Microcosm Gap

Desired state:

- nested worlds, not flat communities
- microcosms as semi-autonomous sub-worlds
- topic, geographic, venue, campaign, and identity-aligned community clusters

Current gap:

- some community and microcosm concepts exist, but they are not yet fully integrated into the same universe grammar, governance model, and fallback ecology

Requirement:

- make microcosms first-class world objects
- give them:
  - local moderation
  - local sovereignty
  - local culture
  - shared protocol constraints

### 7. Governance and Hell Automation Gap

Desired state:

- bureaucracy modeled, visible, navigable, auditable
- approvals and blockers rendered spatially
- automation for safe steps
- humans reserved for judgment-heavy steps

Required capabilities:

- proposal systems
- voting
- delegated trust
- auditable rule changes
- simulation before activation
- approval chains
- dependency chains
- review stages
- emergency brakes

Current gap:

- there are admin and workflow fragments
- there is no finished constitutional governance machine integrated into the whole world model

Requirement:

- define the governor constitution in machine-readable form
- separate:
  - recommendation
  - execution
  - approval
- make all high-impact actions auditable and reversible where possible

### 8. Economic Layer Gap

Desired state:

- non-extractive value flows
- mutual aid
- donor routing
- contribution economies
- transparent ledgers
- campaign eligibility
- trust-aware disbursement

Current gap:

- the repo has pools, impact, transparency, and ledger concepts
- but these are not yet coherently integrated into the same spatial grammar, governance logic, and contributor economy

Requirement:

- represent capital, labour, knowledge, and trust as system nutrients
- allow routing across:
  - donor support
  - volunteer labour
  - curation work
  - education
  - mutual aid
  - institution-facing finance

### 9. Logistics and Material Reality Gap

Desired state:

- venues
- places
- practitioners
- campaigns
- events
- volunteers
- scheduling
- assets
- outcomes
- follow-through

Current gap:

- material logistics exist only in partial feature islands

Requirement:

- earth-plane objects must become first-class entities in the world model
- action and scheduling must sit inside the same world, not outside it

### 10. Security and Sovereignty Gap

Desired state:

- strict public/private plane separation
- tenant isolation
- audited privileged operations
- signed events
- actor provenance
- content provenance
- payment provenance
- governance provenance
- local and revocable agent tooling over time

Current gap:

- the architecture is trying to move this direction
- the current audit still found:
  - backend startup fragility
  - env drift
  - auth meaning drift
  - partial silent degradation behavior

Requirement:

- treat sovereignty as a product requirement, not an infra afterthought
- ensure every control-plane capability is narrow, auditable, and revocable

### 11. Agentic Layer Gap

Desired state:

- bounded family of agents:
  - cartographer
  - curator
  - governor
  - logistics agent
  - donor/support agent
  - narrative agent
  - safety/audit agent

Current gap:

- the repo is not yet a stable multi-agent platform with clear handoffs, provenance, rollback, and tool isolation

Requirement:

- define agent roles as constitutional actors, not just helper utilities
- require:
  - tool isolation
  - permission scoping
  - human checkpoints
  - rollbackability
  - explicit execution provenance

### 12. UX and Spatial Interaction Gap

Desired state:

- wonder
- comprehension
- action
- all in one chain

Multi-pane target:

- immersive spatial pane
- search/index pane
- inspector/explainer pane
- action pane
- governance pane where relevant
- history/timeline pane where relevant

Current gap:

- the universe-style map direction is strong
- but interaction semantics for portals, monoliths, nutrients, gravity, and atmosphere are not yet a mature system language across all domains

Requirement:

- finish the interaction semantics, not just visuals
- make the spatial language operational

### 13. Data Architecture Gap

Desired state:

- unified entity model
- typed relations
- temporal validity
- provenance
- public/private visibility
- policy metadata
- trust metadata
- contribution metadata
- geospatial metadata
- simulation metadata

Current gap:

- multiple systems are still organized by app surface or service boundary rather than one universal ontology

Requirement:

- define the substrate beneath the universe explicitly
- the ontology must survive:
  - tenant variation
  - governance
  - action routing
  - simulation
  - publishing

### 14. Simulation and Foresight Gap

Desired state:

- scenario simulation
- impact preview
- bottleneck forecasting
- governance rule testing
- staffing/resource planning
- mutual aid stress testing

Current gap:

- there are simulation-adjacent ideas in the repo, but not a finished foresight layer integrated into the world model

Requirement:

- simulation must become a first-class layer over the same ontology, not an isolated feature set

### 15. Publishing and Narrative Gap

Desired state:

- internal operational truth
- public narrative outputs
- world snapshots
- map exports
- donor/public trust views
- campaign stories
- shareable educational journeys

Current gap:

- outward narrative and public publishing are not yet fully treated as structured outputs of the system

Requirement:

- create a publishable layer that can translate the operational world into intelligible external artifacts without losing provenance

## What “Done” Actually Looks Like

A user should be able to:

1. Enter through a universe interface that feels alive and truthful.
2. Follow a learning thread as stars.
3. Inspect a star and see:
   - sources
   - freshness
   - evidence
   - disagreements
4. Follow that star into:
   - a place
   - a campaign
   - a community
   - an event
   - an institution
   - a task
5. See the bureaucratic blockers clearly.
6. Understand why some actions require approval.
7. Route help, money, labour, trust, or participation into the system.
8. Accumulate contribution history and capability over time.
9. Be assisted by agents that remain constitutionally bounded.

If that chain is not possible, the system is not yet in the intended state.

## Tiered Priority Order

### Tier 1: Unify the World Model

- one ontology
- one universe grammar
- shared provenance model
- remove remaining mock or isolated surfaces as primary architecture

### Tier 2: Make Heaven Connect To Earth

- connect ideas to places, events, people, institutions, and actions
- build resilient fallbacks so the world never feels dead
- integrate microcosms

### Tier 3: Automate Hell Properly

- governance engine
- bureaucracy routing
- constitutional governor
- auditable approvals and policy flows

### Tier 4: Install Value Flows

- mutual aid
- donor routing
- contribution economies
- transparent trust-aware ledgers

### Tier 5: Finish Sovereignty

- hard public/private separation
- control plane isolation
- auditable agents
- operational resilience

### Tier 6: Mature the Mythic UX

- initiation-first onboarding
- world skins
- portals, monoliths, nutrients, gravity semantics
- full spatial interaction language

## Immediate Implications For The Current Repo

The current repo should be judged against this destination, not against ordinary web-app standards.

That means the current blocking issues are not just bugs:

- a dead `_core` backend means earth-plane coordination and public truth surfaces collapse
- a missing tenant header means the shared world cannot identify its active cosmology
- silent auth fallback means sovereignty is being softened by convenience
- admin/auth drift means governance language and actual power are misaligned
- fragmented routing/origin logic means the world is still assembled from partial tools instead of one instrument

## Concrete Strategic Requirements For Near-Term Work

Near-term work should satisfy both the systems audit and this target-state document:

1. Restore the core backend so earth-plane operational truth exists again.
2. Unify origin/env/proxy contracts so frontend and backend are talking about the same world.
3. Finish hosted Falak tenant and auth wiring so heaven-plane maps are not fallback illusions.
4. Consolidate the ontology so education, action, governance, and logistics can render through one grammar.
5. Keep building the universe renderer, but only as part of the whole operating system model rather than as a standalone visual layer.

## Short Honest Diagnosis

The remaining work is not polish.

It is the transformation of:

- knowledge into action
- action into governable reality
- governance into humane bureaucracy
- value flows into non-extractive civic support
- software into a sovereign civilization-grade instrument

Right now the repo contains parts of the telescope, atlas, and observatory.

The finished system is when those parts become one world-operating instrument.
