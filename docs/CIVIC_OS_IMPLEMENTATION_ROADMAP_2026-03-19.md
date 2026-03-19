# Civic OS Implementation Roadmap

Date: 2026-03-19

Related documents:

- [SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md)
- [CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md)

## Purpose

This roadmap translates the current systems audit and the target-state civic OS vision into a phased implementation program.

It is not a sprint plan. It is a program map for turning the current repo from a partially connected multi-surface system into:

- one world model
- one universe grammar
- one operational coordination engine
- one governance and bureaucracy machine
- one value-routing layer
- one metabolism and outcomes layer
- one threshold, repair, and role-becoming architecture
- one place, time, and legibility architecture
- one sovereign multi-tenant platform

## Program Rules

1. Runtime coherence comes before mythology.
2. One ontology beats many themed surfaces.
3. Heaven must connect to Earth before Heaven is polished further.
4. Hell must become navigable, not hidden.
5. Sovereignty is a product requirement, not an infra afterthought.
6. No phase is complete if it only improves visuals without reducing fragmentation.

## Program Owners

Use role owners, not single-person owners.

- Platform / SRE
- Frontend Spatial Systems
- Core Backend
- Impact / Falak Backend
- Data / Ontology
- Governance / Policy Design
- Product / Narrative
- Security / Audit

## Current Entry Condition

Before roadmap execution meaningfully advances, the current hard blockers from the audit must be treated as phase-zero work:

- `anu-back-end` live startup/runtime instability
- `_core` proxy failure
- domain-resolution route/import defects
- frontend core-origin env drift
- hosted Falak tenant header gap
- silent Supabase degradation patterns

These are not optional cleanup items. They block the system from behaving like one world.

## Workstreams

### A. Runtime and Hosting Coherence

Goal:

- make `frontend-next`, `flora-fauna/backend`, and `services/impact-service` behave as one deployable system

Primary repo touchpoints:

- `frontend-next/next.config.ts`
- `frontend-next/src/lib/runtime.ts`
- `frontend-next/src/middleware.ts`
- `frontend-next/src/lib/supabase/client.ts`
- `frontend-next/src/lib/supabase/server.ts`
- `frontend-next/src/lib/supabase/middleware.ts`
- `flora-fauna/backend/app/__init__.py`
- `flora-fauna/backend/app/config.py`
- `flora-fauna/backend/app/health.py`
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/vercel.env.example`
- `services/impact-service/src/falak/health/falakHealthService.ts`
- `services/impact-service/src/falak/plugins/requestContext.ts`
- `services/impact-service/src/falak/config/falakRuntimeConfig.ts`

### B. World Model and Ontology

Goal:

- define one canonical substrate for ideas, places, actors, actions, governance objects, value flows, and historical memory

Primary repo touchpoints:

- `services/impact-service/src/falak/domain/types.ts`
- `services/impact-service/src/maps/domain/types.ts`
- `services/impact-service/src/falak/domain/schemas.ts`
- `services/impact-service/src/maps/domain/schemas.ts`
- `services/impact-service/src/maps/compiler/*`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/universe_projector_service.py`

### C. Universe and Spatial UX

Goal:

- make universe the master interaction grammar instead of a themed route

Primary repo touchpoints:

- `frontend-next/src/app/(app)/universe/page.tsx`
- `frontend-next/src/components/maps/FalakMapViewer.tsx`
- `frontend-next/src/components/maps/EducationMapUniverseScene.tsx`
- `frontend-next/src/components/maps/EducationMapUniverseExplainer.tsx`
- `frontend-next/src/components/maps/educationMapUniverseAdapter.ts`
- `frontend-next/src/ui/patterns/starfield/QuantumEngine.ts`

### D. Heaven-to-Earth Action Loop

Goal:

- connect knowledge objects to real places, events, campaigns, people, tasks, and communities

Primary repo touchpoints:

- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/app/(app)/calendar/page.tsx`
- `frontend-next/src/app/(app)/assets/page.tsx`
- `frontend-next/src/app/(app)/impact/page.tsx`
- `frontend-next/src/app/(app)/pools/page.tsx`
- `frontend-next/src/app/(app)/relief/page.tsx`
- `flora-fauna/backend/app/api/calendar.py`
- `flora-fauna/backend/app/api/assets.py`
- `flora-fauna/backend/app/api/pools.py`
- `flora-fauna/backend/app/api/relief.py`
- `flora-fauna/backend/app/api/impact.py`
- `flora-fauna/backend/app/api/insights.py`
- `flora-fauna/backend/app/api/merchants.py`

### E. Governance and Hell Automation

Goal:

- turn approvals, rules, simulations, and blockers into a navigable system

Primary repo touchpoints:

- `frontend-next/src/app/(app)/governance/*`
- `flora-fauna/backend/app/api/governance.py`
- `flora-fauna/backend/app/api/governance_simulations.py`
- `flora-fauna/backend/app/services/governance_service.py`
- `flora-fauna/backend/app/services/governance_review_service.py`
- `flora-fauna/backend/app/services/governance_simulation_service.py`
- `services/impact-service/src/falak/services/policyEngine.ts`
- `services/impact-service/src/falak/services/workflowSupport.ts`
- `services/impact-service/src/falak/services/eventWorkflowService.ts`
- `services/impact-service/src/falak/services/allocationWorkflowService.ts`
- `services/impact-service/src/falak/services/contributionWorkflowService.ts`
- `services/impact-service/src/falak/security/routeGuard.ts`

### F. Economic and Mutual-Aid Layer

Goal:

- install non-extractive value routing, public trust views, and contributor economies

Primary repo touchpoints:

- `services/impact-service/src/routes/pools.ts`
- `services/impact-service/src/routes/memberships.ts`
- `services/impact-service/src/controllers/pools.controller.ts`
- `services/impact-service/src/controllers/memberships.controller.ts`
- `services/impact-service/src/services/ledger.service.ts`
- `services/impact-service/src/services/credits.service.ts`
- `services/impact-service/src/services/flora-fauna/AllocationService.ts`
- `services/impact-service/src/services/flora-fauna/PoolLedgerService.ts`
- `services/impact-service/src/services/flora-fauna/NutrientEngine.ts`
- `flora-fauna/backend/app/api/treasury.py`
- `flora-fauna/backend/app/api/transparency.py`
- `frontend-next/src/components/impact/*`
- `frontend-next/src/app/(public)/transparency/page.tsx`

### G. Identity, Tenancy, and Sovereignty

Goal:

- make public/private plane separation, actor verification, and tenant-native behavior reliable and auditable

Primary repo touchpoints:

- `frontend-next/src/contexts/AuthContext.tsx`
- `frontend-next/src/lib/supabase/config.ts`
- `frontend-next/src/lib/api/client.ts`
- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/lib/maps/sandbox.ts`
- `services/impact-service/src/auth/jwt.ts`
- `services/impact-service/src/falak/auth/actorIdentity.ts`
- `services/impact-service/src/falak/plugins/requestContext.ts`
- `services/impact-service/src/falak/security/routeGuard.ts`
- `flora-fauna/backend/app/auth.py`
- `flora-fauna/backend/app/security/middleware.py`

### H. Publishing, Memory, and Narrative

Goal:

- let the system publish outward-facing stories, world snapshots, and trust views from the operational substrate

Primary repo touchpoints:

- `frontend-next/src/app/(public)/transparency/page.tsx`
- `flora-fauna/backend/app/api/public.py`
- `flora-fauna/backend/app/services/universe_projector_service.py`
- `services/impact-service/src/manaraFeed.ts`
- `services/impact-service/src/routes/manara.ts`

### I. Metabolism, Outcomes, and Legibility

Goal:

- turn activity into inspectable social metabolism, visible outcomes, and institutional explanation

Primary repo touchpoints:

- `services/impact-service/src/services/flora-fauna/NutrientEngine.ts`
- `services/impact-service/src/services/flora-fauna/PoolLedgerService.ts`
- `services/impact-service/src/services/ledger.service.ts`
- `services/impact-service/src/controllers/pools.controller.ts`
- `services/impact-service/src/routes/pools.ts`
- `services/impact-service/src/routes/memberships.ts`
- `flora-fauna/backend/app/api/transparency.py`
- `flora-fauna/backend/app/api/impact.py`
- `frontend-next/src/components/impact/*`
- `frontend-next/src/app/(app)/pools/*`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- future `services/impact-service/src/nahr/*`
- future `services/impact-service/src/athar/*`
- future `services/impact-service/src/dalil/*`

### J. Thresholds, Repair, Territory, and Time

Goal:

- make entry, progression, restorative pathways, locality, and civic timing first-class operating layers

Primary repo touchpoints:

- `frontend-next/src/contexts/AuthContext.tsx`
- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/app/(app)/calendar/page.tsx`
- `frontend-next/src/app/(app)/governance/*`
- `frontend-next/src/lib/maps/sandbox.ts`
- `flora-fauna/backend/app/auth.py`
- `flora-fauna/backend/app/security/middleware.py`
- `flora-fauna/backend/app/api/calendar.py`
- `flora-fauna/backend/app/api/governance.py`
- `flora-fauna/backend/app/api/public.py`
- `services/impact-service/src/falak/auth/actorIdentity.ts`
- `services/impact-service/src/falak/security/routeGuard.ts`
- `services/impact-service/src/falak/services/workflowSupport.ts`
- future `services/impact-service/src/bab/*`
- future `services/impact-service/src/gumaraa/*`
- future `services/impact-service/src/wadi/*`
- future `services/impact-service/src/cycles/*`
- future `frontend-next/src/app/(app)/local/*`
- future `frontend-next/src/app/(app)/outcomes/*`

## Phase 0: Recover System Coherence

Goal:

- stop the current runtime fragmentation

Owner roles:

- Platform / SRE
- Core Backend
- Frontend Spatial Systems
- Impact / Falak Backend

Required deliverables:

- core backend boots reliably in local and Vercel environments
- `_core` rewrites work again
- domain-resolution path contract is corrected
- frontend middleware uses the same origin contract as the rest of the app
- hosted Falak frontend sends tenant header correctly
- production auth fallback behavior is explicit, not silently degraded
- live service health is legible in the shell without hiding degradation

Repo touchpoints:

- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/__init__.py`
- `flora-fauna/backend/app/config.py`
- `frontend-next/src/middleware.ts`
- `frontend-next/src/lib/runtime.ts`
- `frontend-next/next.config.ts`
- `frontend-next/src/lib/supabase/*`
- `frontend-next/src/lib/maps/sandbox.ts`
- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/components/systemic/SystemHealthBanner.tsx`
- `frontend-next/src/lib/ui/actionableErrors.ts`

Exit criteria:

- live `_core/healthz` returns `200`
- live `_core/public/transparency/node-summary` returns JSON
- live hosted admin-only Falak requests no longer fail with `TENANT_HEADER_REQUIRED`
- local backend bootstrap smoke test passes
- the hosted shell can distinguish core, impact, auth, and tenant degradation honestly

## Phase 1: Define the Shared World Substrate

Goal:

- establish one ontology across heaven, earth, hell, and the constitutional layer

Owner roles:

- Data / Ontology
- Impact / Falak Backend
- Core Backend
- Product / Narrative

Required deliverables:

- canonical entity model
- canonical relation model
- tenant scoping rules
- provenance schema
- policy metadata model
- trust metadata model
- temporal validity model
- public/private visibility model
- module boundaries for:
  - Nahr
  - Athar
  - Bab
  - Gumaraa
  - Wadi
  - Cycles
  - Dalil
  - Armillary

Repo touchpoints:

- `services/impact-service/src/falak/domain/types.ts`
- `services/impact-service/src/maps/domain/types.ts`
- `services/impact-service/src/falak/domain/schemas.ts`
- `services/impact-service/src/maps/domain/schemas.ts`
- `flora-fauna/backend/app/models.py`

Exit criteria:

- one documented substrate exists for:
  - knowledge objects
  - operational objects
  - governance objects
  - value-flow objects
- metabolism, outcomes, thresholds, repair, locality, time, and legibility all have canonical hooks in the shared model
- new product features stop creating isolated local models when a shared model should exist

## Phase 2: Make Universe the Master Interface

Goal:

- stop treating universe as a special route and start treating it as the main system grammar

Owner roles:

- Frontend Spatial Systems
- Product / Narrative
- Data / Ontology

Required deliverables:

- one shared universe renderer contract
- stars, constellations, paths, portals, monoliths, nutrients, gravity, and signal have operational meaning
- education maps become one expression of the master universe rather than a separate conceptual system
- universe pane architecture supports:
  - spatial view
  - search/index
  - inspector
  - action
  - governance/timeline where relevant

Repo touchpoints:

- `frontend-next/src/app/(app)/universe/page.tsx`
- `frontend-next/src/components/maps/FalakMapViewer.tsx`
- `frontend-next/src/components/maps/EducationMapUniverseScene.tsx`
- `frontend-next/src/components/maps/EducationMapUniverseExplainer.tsx`
- `frontend-next/src/components/maps/educationMapUniverseAdapter.ts`
- `frontend-next/src/ui/patterns/starfield/QuantumEngine.ts`

Exit criteria:

- `/universe` can render mixed-domain content coherently
- education stars are not a separate visual language
- side-pane inspection and action hooks are supported as first-class semantics

## Phase 3: Connect Heaven to Earth

Goal:

- knowledge becomes materially actionable

Owner roles:

- Frontend Spatial Systems
- Core Backend
- Data / Ontology
- Product / Narrative

Required deliverables:

- knowledge objects linked to:
  - places
  - venues
  - events
  - campaigns
  - communities
  - tasks
  - institutions
- microcosms become semi-autonomous sub-worlds
- believable local fallback ecology so the system never feels dead during partial outages
- locality and corridor logic via Wadi
- public outcome traces via Athar
- community pulse and nutrient climate from Nahr
- timing and urgency context from Cycles

Repo touchpoints:

- `frontend-next/src/app/(app)/community/*`
- `frontend-next/src/app/(app)/calendar/*`
- `frontend-next/src/app/(app)/assets/*`
- `frontend-next/src/app/(app)/impact/*`
- `frontend-next/src/app/(app)/pools/*`
- `flora-fauna/backend/app/api/calendar.py`
- `flora-fauna/backend/app/api/assets.py`
- `flora-fauna/backend/app/api/pools.py`
- `flora-fauna/backend/app/api/impact.py`
- `flora-fauna/backend/app/api/constellations.py`
- future locality and outcomes surfaces across frontend and impact service

Exit criteria:

- a user can move from a knowledge object to a live action surface without changing conceptual system
- community and action surfaces remain credible when one upstream service is impaired
- place, outcome, and timing context are visible in that journey

## Phase 4: Automate Hell

Goal:

- make bureaucracy visible, navigable, and constitutional

Owner roles:

- Governance / Policy Design
- Impact / Falak Backend
- Core Backend
- Security / Audit

Required deliverables:

- machine-readable governance constitution
- proposal and policy flow
- auditable approvals
- dependency modeling
- compliance and blocker chains
- simulation before rule activation
- separation of recommendation, execution, and approval
- threshold and role-progression logic through Bab
- repair and restorative workflows through Gumaraa
- privileged coordination surfaces through Armillary
- institutional explanation surfaces through Dalil

Repo touchpoints:

- `frontend-next/src/app/(app)/governance/*`
- `flora-fauna/backend/app/services/governance_service.py`
- `flora-fauna/backend/app/services/governance_review_service.py`
- `flora-fauna/backend/app/services/governance_simulation_service.py`
- `flora-fauna/backend/app/api/governance.py`
- `flora-fauna/backend/app/api/governance_simulations.py`
- `services/impact-service/src/falak/services/policyEngine.ts`
- `services/impact-service/src/falak/services/workflowSupport.ts`
- `services/impact-service/src/falak/services/eventWorkflowService.ts`
- `services/impact-service/src/falak/security/routeGuard.ts`
- future `services/impact-service/src/bab/*`
- future `services/impact-service/src/gumaraa/*`
- future `services/impact-service/src/dalil/*`
- future `frontend-next/src/app/(app)/armillary/*`

Exit criteria:

- critical workflows expose blockers and approval requirements clearly
- high-impact actions are auditable, explainable, and bounded by machine-readable policy
- pathways for becoming, repair, and privileged correction are explicit rather than hidden

## Phase 5: Install Value Flows

Goal:

- integrate mutual aid, donor routing, ledgers, and contributor economies into the same world

Owner roles:

- Impact / Falak Backend
- Core Backend
- Product / Narrative
- Security / Audit

Required deliverables:

- mutual-aid routing
- donor support pathways
- transparent disbursement trails
- contributor trust and reputation model
- public and internal reporting surfaces
- governance-aware incentives
- Nahr metabolic conversion rules and observability
- Athar outcome traces and gratitude pathways
- public impact reporting without investment framing

Repo touchpoints:

- `services/impact-service/src/routes/pools.ts`
- `services/impact-service/src/routes/memberships.ts`
- `services/impact-service/src/services/ledger.service.ts`
- `services/impact-service/src/services/credits.service.ts`
- `services/impact-service/src/services/flora-fauna/AllocationService.ts`
- `services/impact-service/src/services/flora-fauna/PoolLedgerService.ts`
- `flora-fauna/backend/app/api/treasury.py`
- `flora-fauna/backend/app/api/transparency.py`
- `frontend-next/src/app/(app)/pools/*`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- future `services/impact-service/src/nahr/*`
- future `services/impact-service/src/athar/*`

Exit criteria:

- value can be routed through the system with provenance
- public trust pages and internal operational finance views are both coherent
- participation can be converted into inspectable ecosystem health and outcome traces

## Phase 6: Tenant-Native Cosmologies

Goal:

- let ANU, Flora Fauna, Mudyin, FBI, and future tenants feel radically different on top of the same engine

Owner roles:

- Product / Narrative
- Frontend Spatial Systems
- Data / Ontology

Required deliverables:

- world-skin system
- tenant-specific copy and mythology
- tenant-specific metrics
- tenant-specific onboarding
- tenant-specific semantics without engine fork
- tenant-specific threshold, locality, and outcome framing without substrate fork

Repo touchpoints:

- `frontend-next/src/lib/brand.ts`
- `frontend-next/src/ui-system/*`
- `frontend-next/src/app/layout.tsx`
- tenant resolution paths in `frontend-next/src/middleware.ts`
- tenant/domain support in `flora-fauna/backend/app/api/domain_resolution.py`

Exit criteria:

- at least two tenants can share engine behavior while presenting clearly different cosmologies

## Phase 7: Sovereign Agentic Layer

Goal:

- add bounded agents without surrendering control, provenance, or constitutional safety

Owner roles:

- Security / Audit
- Governance / Policy Design
- Platform / SRE
- Product / Narrative

Required deliverables:

- role-separated agents:
  - cartographer
  - curator
  - governor
  - logistics
  - donor/support
  - narrative
  - safety/audit
- explicit tool boundaries
- revocable capabilities
- auditable decisions
- rollback paths
- simulation before execution where impact is material

Repo touchpoints:

- `services/impact-service/src/falak/services/*`
- `services/impact-service/src/services/*`
- governance and audit surfaces across backend and impact service
- future local tool-execution and orchestration surfaces

Exit criteria:

- no high-impact automation occurs without provenance, bounds, and human-governed checkpoints where required

## Phase 8: Publishing, Memory, and Foresight

Goal:

- let the operating system both remember and project

Owner roles:

- Product / Narrative
- Data / Ontology
- Core Backend
- Impact / Falak Backend

Required deliverables:

- world snapshots
- shareable educational journeys
- campaign narratives
- outward-facing trust reports
- historical and civilizational knowledge layers
- scenario simulation and foresight tooling
- Nabu chronicle, lineage, archive, and recall patterns
- Cycles-driven resurfacing, decay, and review windows
- Wadi-aware place memory and corridor history

Repo touchpoints:

- `flora-fauna/backend/app/api/public.py`
- `flora-fauna/backend/app/services/universe_projector_service.py`
- `flora-fauna/backend/app/services/governance_simulation_service.py`
- `services/impact-service/src/manaraFeed.ts`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- future `services/impact-service/src/cycles/*`
- future `services/impact-service/src/wadi/*`
- future `services/impact-service/src/nabu/*`

Exit criteria:

- the system can publish intelligible outward narratives without severing them from provenance or operations
- the system can remember, resurface, and contextualize what mattered across time and place

## Delivery Constraints

- No phase should create a new isolated model if a shared world-substrate concept should be used.
- No tenant-specific experience should fork core engine logic unless absolutely necessary.
- No auth fallback should silently create false confidence in hosted environments.
- No governance automation should be added without audit and reversibility considerations.
- No new polished surface should outrun runtime reliability on the underlying services.

## Near-Term Recommended Sequence

1. Execute Phase 0 immediately.
2. Start ontology work for Phase 1 in parallel once Phase 0 defects are understood.
3. Continue universe renderer work only insofar as it serves Phase 2 rather than creating a separate visual product.
4. Connect education objects to community/action/logistics in Phase 3 before deeper cosmetic expansion.
5. Treat governance, value flows, and sovereignty as core architecture, not a late add-on.

## Definition Of Strategic Progress

This program is progressing correctly when:

- fewer features depend on isolated app-specific models
- more user journeys move from meaning to action in one chain
- more activity can be explained as metabolism, outcome, place, timing, or repair state rather than opaque state change
- governance becomes more visible and less soul-killing
- value flows become more transparent and less extractive
- tenant variation becomes easier without engine fragmentation
- the system becomes more operationally sovereign, not less

## Short Diagnosis

The current repo is not far from the vision in ambition, but it is still far from it in integration discipline.

The main task now is not adding more themed capability.

It is converting:

- themed surfaces into one world
- partial workflows into one operating model
- visual promise into a civilization-grade instrument
