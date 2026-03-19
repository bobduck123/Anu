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
- a cultural memory and lineage system
- a metabolic conversion layer for participation, trust, liquidity, and collaboration
- an outcomes and gratitude layer that makes consequence visible
- a threshold and role-becoming layer
- a repair and restorative layer
- a place-and-territory coordination layer
- a temporal and civic-rhythm layer
- an institutional legibility and proof layer
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

## Expanded Cosmos And Module Map

The module ring needs to be understood as a layered civic-cultural cosmos rather than a loose naming scheme.

Core stack:

- ANU:
  - public cultural coordination system
- Falak Engine:
  - hidden planetary engine beneath all surfaces

Existing ring, clarified:

- Seshat:
  - data architecture and schemas
- Nabu:
  - knowledge ledger and memory spine
- Manara:
  - signals, alerts, and activity beacons
- Najm:
  - pattern analysis and clustering
- Shamash:
  - insight and interpretive illumination
- Diwan:
  - governance, review, policy, and stewardship
- Lamassu:
  - security, permissions, and protection
- Riwaq:
  - public gateway and access surface
- Qart:
  - federation and inter-tenant coordination
- Yarning:
  - dialogue, deliberation, and exchange
- Abzu:
  - resource ledger and reserves
- Bunya:
  - mutual aid and relief operations
- Majma:
  - community fabric and belonging
- Songline:
  - place, routes, and land-aware mapping

New or expanded modules:

- Armillary:
  - privileged cosmological coordination, curation, and world-model calibration
- Nahr:
  - system metabolism and flow conversion
- Athar:
  - outcomes, traces, gratitude, and the afterlife of aid
- Bab:
  - thresholds, initiation, role progression, and access becoming
- Gumaraa:
  - repair, cleansing, restorative pathways, and legitimacy rebuilding
- Wadi:
  - locality, regional corridors, and place logic
- Cycles:
  - time intelligence, rhythms, urgency, ripening, and decay
- Dalil:
  - legibility, explainability, proof, and rationale

These modules are not optional ornamentation. They close the missing problem-space between activity, care, governance, memory, place, time, and explanation.

## Layered Architecture Of The Cosmos

### Layer A: Public Visible Universe

Ordinary users should primarily experience:

- learning stars
- creators
- campaigns
- community initiatives
- events
- local place nodes
- news and signals
- visible outcomes
- gratitude traces
- participation flows

Most visible modules:

- Manara
- Nabu
- Majma
- Songline
- Bunya
- Athar
- Wadi
- Yarning

### Layer B: Guided Civic Layer

Still visible, but more structured:

- campaign health
- trust signals
- entry pathways
- stewards
- public evidence summaries
- compact score breakdowns

Modules:

- Bab
- Dalil
- Shamash
- Najm
- Riwaq
- selected Diwan outputs

### Layer C: Privileged Coordination Layer

Privileged but not purely infrastructural:

- policy logic
- moderation trails
- reserve state
- allocations
- actor privileges
- full explainability
- world-model correction
- audit review

Modules:

- Armillary
- Diwan
- Lamassu
- Abzu
- full Nahr
- full Dalil
- Gumaraa
- Seshat

### Layer D: Hidden Engine Layer

Pure infrastructure beneath the visible world:

- event buses
- ledgers
- topology
- search and indexing
- placement engine
- score normalization
- audit streams
- tenant isolation
- auth, session, and headers
- simulation and fallback packets

Modules:

- Falak
- Seshat
- system internals beneath all above layers

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

### 16. Metabolism Layer Gap

Desired state:

- public cultural activity becomes legible as ecosystem metabolism
- signals, participation, trust, liquidity, and collaboration convert into visible health
- social energy can be traced into care capacity, legitimacy, and resilience

Core metabolic primitives:

- nitrogen:
  - activity spark
  - creation
  - spread
- potassium:
  - reliability
  - follow-through
  - verified delivery
- phosphorus:
  - sustained participation
  - recurring civic life
  - long-lived loops
- humus:
  - accumulated trust substrate
  - historical credibility
  - long-tail community memory
- moisture:
  - money movement
  - liquidity
  - reserves
  - disbursement activity
- mycelium:
  - cross-community connective tissue
  - collaboration across domains, places, and tenants

Current gap:

- the repo has ledgers, nutrient-adjacent thinking, and impact flows
- but it does not yet operationalize a true metabolism layer that explains how activity becomes consequence

Requirement:

- introduce Nahr as the metabolic conversion layer
- define:
  - flow events
  - nutrient deltas
  - conversion rules
  - participation pulses
  - trust currents
  - liquidity currents
  - metabolic snapshots
- make metabolism observable in public and privileged forms

### 17. Outcomes Layer Gap

Desired state:

- users can see what changed in the world
- public impact reporting feels like consequence, not donation dashboard language
- campaigns have afterlives
- trust grows through delivery, not promises

Current gap:

- the system can discuss transparency, pools, and reporting
- but it does not yet have a distinct outcomes field that renders visible traces of care, delivery, and benefit

Requirement:

- introduce Athar as the outcomes and trace layer
- support:
  - outcome traces
  - community benefit summaries
  - campaign afterlives
  - gratitude artifacts
  - privacy-aware recipient voice
  - public and privileged impact views

### 18. Threshold Layer Gap

Desired state:

- entry, initiation, progression, and permissioning are legible
- users understand how they move from viewer to participant to steward
- privileged access is earned, inspectable, and revocable

Current gap:

- auth exists
- some admin-only routing exists
- but the system does not yet explain institutional becoming

Requirement:

- introduce Bab as the threshold and role-progression layer
- model:
  - witness
  - participant
  - contributor
  - steward
  - reviewer
  - custodian
- make thresholds depend on:
  - activity history
  - trust
  - training
  - endorsement
  - place legitimacy
  - repair state

### 19. Repair Layer Gap

Desired state:

- the platform can do more than moderation
- it can support restorative pathways, harm correction, legitimacy rebuilding, and community protection

Current gap:

- the repo has moderation, governance, and audit-adjacent surfaces
- but it does not yet have a first-class restorative layer

Requirement:

- introduce Gumaraa as the repair layer
- support:
  - harm intake
  - context bundles
  - safety-first intervention
  - restorative flows
  - staged reintegration
  - memorialization when repair is not possible

### 20. Memory and Lineage Gap

Desired state:

- the system preserves why something mattered, how it evolved, who carried it, and what was learned
- institutional, cultural, campaign, and place memory survive beyond operational state

Current gap:

- Nabu exists conceptually
- but cultural memory, lineage, narrative evolution, and recall are not yet fully modeled as first-class system layers

Requirement:

- expand Nabu into:
  - chronicle
  - lineage
  - archive
  - recall
- preserve:
  - campaign memory
  - event memory
  - conflict memory
  - local memory
  - institutional memory
  - mythic and educational memory

### 21. Place and Territory Gap

Desired state:

- place is more than coordinates
- the system understands neighborhoods, corridors, stewardship zones, catchments, and regionally bounded campaigns
- local trust and local legitimacy can differ from global status

Current gap:

- Songline covers mapping direction
- but civic-territorial meaning, corridor logic, and locality-specific trust are not yet explicit layers

Requirement:

- introduce Wadi beneath or alongside Songline
- model:
  - place nodes
  - corridors
  - regions
  - catchments
  - local cells
  - steward zones
  - place memory
  - need patterns
  - local resources

### 22. Temporal Intelligence Gap

Desired state:

- the system knows what is emerging, ripening, decaying, urgent, dormant, or ready to resurface
- campaigns, communities, risks, and opportunities operate within a legible civilizational calendar

Current gap:

- freshness exists in pockets
- signals exist in pockets
- but there is no strong time architecture across the system

Requirement:

- introduce Cycles as the temporal layer
- model:
  - temporal signals
  - rhythms
  - urgency bands
  - seasons
  - lifecycle stages
  - review intervals
  - decay rules
  - resurface rules

### 23. Trust-Legibility Gap

Desired state:

- the system can explain why it is doing what it is doing
- not only with scores, but with institutional reasoning

Current gap:

- there is a desire for compact public scores and deeper admin breakdowns
- but explainability is not yet its own first-class architectural layer

Requirement:

- introduce Dalil as the legibility and proof layer
- expose:
  - why a star is prominent
  - why a campaign is surfaced
  - why an actor has stewardship privileges
  - why a pool is constrained
  - why moderation happened
  - why a place is underserved
  - why an outcome appears in public view

### 24. Cosmological Coordination Gap

Desired state:

- the world model can be calibrated without collapsing into spreadsheet administration
- privileged actors can inspect, merge, correct, and rebalance the cosmos itself

Current gap:

- there are admin and atlas-like surfaces
- but there is not yet a coherent cosmological coordination chamber for packet inspection, placement override, or cross-domain correction

Requirement:

- introduce Armillary as the privileged coordination apparatus
- support:
  - universe packet inspection
  - placement studio
  - domain visibility control
  - cross-domain topology editing
  - regional corridor planning
  - signal-flow monitoring

## What “Done” Actually Looks Like

A user should be able to:

1. Enter through a universe interface that feels alive and truthful.
2. Cross a threshold that makes orientation, participation, and role progression legible rather than hidden.
3. Follow a learning thread as stars.
4. Inspect a star and see:
   - sources
   - freshness
   - evidence
   - disagreements
   - placement rationale
   - why it is being surfaced now
5. Follow that star into:
   - a place
   - a campaign
   - a community
   - an event
   - an institution
   - a task
6. See the bureaucratic blockers clearly.
7. Understand why some actions require approval.
8. Route help, money, labour, trust, or participation into the system.
9. See visible outcome traces, community benefit, and privacy-safe gratitude without finance-product framing.
10. Accumulate contribution history, trust substrate, and capability over time.
11. Understand why the system is surfacing a campaign, actor, place, or warning.
12. Encounter repair and reconciliation pathways when harm or failure occurs.
13. See local place, regional corridor, and timing context rather than abstract network only.
14. Be assisted by agents that remain constitutionally bounded.

If that chain is not possible, the system is not yet in the intended state.

## Tiered Priority Order

### Tier 1: Unify the World Model

- one ontology
- one universe grammar
- shared provenance model
- remove remaining mock or isolated surfaces as primary architecture

### Tier 2: Make Heaven Connect To Earth

- connect ideas to places, events, people, institutions, and actions
- connect ideas into outcomes, local territory, and time
- build resilient fallbacks so the world never feels dead
- integrate microcosms

### Tier 3: Automate Hell Properly

- governance engine
- bureaucracy routing
- threshold logic
- repair pathways
- constitutional governor
- auditable approvals and policy flows

### Tier 4: Install Value Flows

- mutual aid
- donor routing
- contribution economies
- metabolism and nutrient conversion
- public outcomes and gratitude traces
- transparent trust-aware ledgers

### Tier 5: Finish Sovereignty

- hard public/private separation
- control plane isolation
- auditable agents
- institutional legibility
- place and tenant trust boundaries
- operational resilience

### Tier 6: Mature the Mythic UX

- initiation-first onboarding
- world skins
- role becoming
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
5. Expand the target ontology to explicitly include metabolism, outcomes, thresholds, repair, memory, locality, time, and legibility.
6. Keep building the universe renderer, but only as part of the whole operating system model rather than as a standalone visual layer.

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
