# Ontological Multi-Pass Sprint Plan

Date: 2026-03-19

Related documents:

- [SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/SYSTEMS_AUDIT_REQUIREMENTS_2026-03-19.md)
- [CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md](/C:/Dev/Flora_fauna/docs/CIVIC_OS_TARGET_STATE_GAP_ANALYSIS_2026-03-19.md)
- [CIVIC_OS_IMPLEMENTATION_ROADMAP_2026-03-19.md](/C:/Dev/Flora_fauna/docs/CIVIC_OS_IMPLEMENTATION_ROADMAP_2026-03-19.md)

## Purpose

This document converts the ontological multi-pass brief into sprint-sized execution blocks with explicit completion clauses.

It is narrower than the full Civic OS roadmap.

It focuses on the immediate ANU universe consolidation work across:

- `/education/maps`
- `/education/maps/[slug]`
- `/universe`
- `/community`
- shared renderer, explainer, terminology, and packet contracts
- hosted auth and tenant propagation constraints that cannot be broken while doing the above

## Non-Negotiable Constraints

These constraints apply to every sprint in this plan:

1. Keep hosted Supabase session auth for maps requests.
2. Keep hosted tenant propagation via `NEXT_PUBLIC_FALAK_TENANT_ID` and `X-Tenant-Id`.
3. Do not weaken backend `admin_only` production posture.
4. Keep the multi-pane education/maps layout.
5. Keep side-pane detail interaction rather than popup-first interaction.
6. Preserve enriched ledger metadata and guard hardening already added.
7. Do not reintroduce hard crashes in local/dev when Supabase env vars are absent.
8. Do not make star placement purely decorative.

## Sprint Cadence Assumption

Assume one sprint equals one focused engineering iteration of about one to two weeks.

The sequence matters more than the exact calendar length.

## Sprint 0: Protect The Live Contract

Goal:

- establish safe operating boundaries before more ontology work lands

Required work:

- verify `NEXT_PUBLIC_FALAK_TENANT_ID` on the hosted frontend
- verify hosted Supabase session token path remains primary for maps
- verify `X-Tenant-Id` is attached in hosted requests
- verify no code path regresses to `localStorage.auth_token` as primary auth
- verify fallback states remain honest when live services fail

Repo touchpoints:

- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/lib/maps/sandbox.ts`
- `frontend-next/src/lib/supabase/config.ts`
- `frontend-next/src/lib/supabase/client.ts`
- `frontend-next/src/lib/supabase/server.ts`
- `frontend-next/src/lib/supabase/middleware.ts`
- `frontend-next/src/middleware.ts`

Completion clauses:

- hosted frontend can reach live `/v1/education/maps` without `TENANT_HEADER_REQUIRED`
- local/dev still degrades safely when Supabase env is absent
- no regression to legacy localStorage-only auth
- backend `admin_only` posture remains unchanged

Status note:

- partially addressed locally, but still depends on live Vercel env correctness

## Sprint 1: Shared Ontology Contract

Goal:

- define one shared ANU universe contract for stars, constellations, explainers, domains, placement, and fallback state

Required work:

- create canonical shared types for:
  - `UniversePacket`
  - `UniverseStar`
  - `UniverseConstellation`
  - `UniverseExplainerModel`
  - `UniversePlacementScores`
  - `UniverseDomainContext`
  - `UniverseFallbackState`
- centralize user-facing ANU terminology
- define the shared placement metadata model
- separate source adaptation from rendering

Repo touchpoints:

- `frontend-next/src/components/maps/universe/types.ts`
- `frontend-next/src/components/maps/universe/presentationTerms.ts`
- `frontend-next/src/components/maps/universe/placement.ts`

Completion clauses:

- no surface-specific duplication remains for core star/constellation/explainer concepts
- education and universe surfaces can import the same packet and star types
- user-facing labels are not redefined ad hoc in every surface
- placement metadata carries semantic axes, evidence, freshness, source density, and anchor mode

Status note:

- substantially completed locally

## Sprint 2: Education Refactor Onto The Shared Contract

Goal:

- make education maps a domain slice of the shared universe instead of a special-case renderer

Required work:

- refactor the education adapter to emit `UniversePacket`
- refactor the education scene to consume normalized packet data
- converge the education explainer onto the shared explainer shell
- keep source-linked explainer behavior intact
- keep the multi-pane viewer intact

Repo touchpoints:

- `frontend-next/src/components/maps/educationMapUniverseAdapter.ts`
- `frontend-next/src/components/maps/EducationMapUniverseScene.tsx`
- `frontend-next/src/components/maps/EducationMapUniverseExplainer.tsx`
- `frontend-next/src/components/maps/FalakMapViewer.tsx`

Completion clauses:

- education adapter output conforms to shared universe contract
- explainer uses shared fields instead of bespoke scattered mapping
- side-pane detail remains primary
- no loss of source links, evidence, freshness, or axis reasoning
- `/education/maps/[slug]` still works with search, selection, compare, and inspector sync

Status note:

- substantially completed locally

## Sprint 3: Shared Renderer Platform

Goal:

- make the starfield engine a shared universe platform component rather than an education-only visual layer

Required work:

- introduce `UniverseScene` as the thin orchestration wrapper over the starfield engine
- make renderer input contract packet-based
- make authored coordinate precedence explicit
- stabilize hybrid placement behavior
- clean up scene lifecycle and deterministic link behavior

Repo touchpoints:

- `frontend-next/src/components/maps/universe/UniverseScene.tsx`
- `frontend-next/src/ui/patterns/starfield/QuantumEngine.ts`
- `frontend-next/src/ui/patterns/starfield/QuantumCanvas.tsx`

Completion clauses:

- both education and universe routes can render through the same scene contract
- authored coordinates are honored when present
- hybrid placement does not destroy inspectability
- no new hydration, disposal, resize, or selection-sync regressions appear in browser verification
- random topology drift is removed from renderer behavior

Status note:

- partially completed locally

## Sprint 4: `/universe` Unification

Goal:

- remove `/universe` as a separate metaphysical demo track

Required work:

- keep `/universe` on the shared packet/explainer/scene contract
- replace any remaining bespoke ontology assumptions
- make its fallback path use the same normalized universe route
- preserve cross-domain strength while aligning terminology with education

Repo touchpoints:

- `frontend-next/src/app/(app)/universe/page.tsx`
- `frontend-next/src/components/maps/FalakMapViewer.tsx`
- `frontend-next/src/components/maps/educationMapUniverseAdapter.ts`

Completion clauses:

- `/universe` is no longer a separate ontology or renderer track
- live and fallback `/universe` states run through the same shared scene path
- visual strength is preserved while language and inspection become ANU-consistent

Status note:

- partially completed locally, but upstream still composes from education `MapResource` aggregates rather than a true cross-domain backend packet

## Sprint 5: `/community` Alive Fallback And Semantics

Goal:

- stop `/community` from feeling dead when remote sources are absent

Required work:

- create deterministic community demo packets
- render those packets through the shared scene and explainer path
- keep fallback honest and visibly marked as local/dev or degraded mode
- ensure community terminology aligns with the shared ANU universe model even before full live community-universe integration

Repo touchpoints:

- `frontend-next/src/components/maps/universe/fallbackPackets.ts`
- `frontend-next/src/app/(app)/community/page.tsx`

Completion clauses:

- `/community` no longer feels blank in local/dev when remote feeds fail
- fallback content is visibly labeled as local/demo/degraded
- community fallback uses the same star and explainer semantics as education/universe
- the live gallery path is not broken while fallback is introduced

Status note:

- partially completed locally; live community is still not fully packet-native outside fallback mode

## Sprint 6: Terminology Discipline

Goal:

- eliminate user-facing metaphysical drift and Falak leakage

Required work:

- standardize ANU-first terminology across library, detail, admin-adjacent, fallback, and explainer surfaces
- keep Falak terminology only where operationally necessary for internal/admin precision
- remove mixed metaphors such as nodes in one user-facing pane and stars in another for the same surface

Repo touchpoints:

- `frontend-next/src/components/maps/FalakMapLibraryPage.tsx`
- `frontend-next/src/components/maps/FalakMapDetailPage.tsx`
- `frontend-next/src/components/maps/FalakMapDraftPage.tsx`
- `frontend-next/src/components/maps/FalakMapAdminPage.tsx`
- `frontend-next/src/components/maps/FalakMapSandboxHome.tsx`
- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/components/maps/universe/presentationTerms.ts`

Completion clauses:

- user-facing education and universe surfaces are ANU-consistent
- fallback and error states use the same ontology language as the renderer
- admin/developer surfaces may still reference Falak where that meaning is operationally necessary
- no obvious mixed metaphors remain in the primary end-user flow

Status note:

- partially completed locally

## Sprint 7: Browser Integrity Pass

Goal:

- verify the shared universe behaves correctly in real interaction, not just in typecheck and build

Required work:

- verify:
  - `/education/maps`
  - `/education/maps/[slug]`
  - `/community`
  - `/universe`
- check scene selection sync against side pane and index selection
- check pane resizing and renderer lifecycle
- check SSR/client safety
- check anonymous, local/dev, and hosted-auth boot paths
- check fallback labeling and live/degraded messaging

Repo touchpoints:

- all route/page files listed above
- shared universe module
- starfield engine
- auth and tenant propagation files

Completion clauses:

- no fresh hydration errors
- no invalid interactive nesting
- no unhandled auth bootstrap crash in local/dev
- scene selection, index selection, and explainer state remain synchronized
- fallback packets and live packets both exercise the same renderer path
- hosted tenant propagation works with the live backend

Status note:

- build-level verification is complete locally
- a full browser interaction pass is still outstanding

## Sprint 8: Completion Sprint For The Ontological Multi-Pass

Goal:

- close the gap between a strong foundational refactor and the brief’s actual definition of done

Required work:

- finish the remaining terminology sweep
- finish live `/community` integration so it is not only packet-native in fallback mode
- introduce or consume a true cross-domain universe packet upstream of `/universe`
- verify hosted tenant propagation end to end against live backend
- verify all non-negotiable constraints remained intact through deployment

Repo touchpoints:

- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/app/(app)/universe/page.tsx`
- `frontend-next/src/components/maps/*`
- backend packet sources still required for true cross-domain universe inputs

Completion clauses:

- ANU education and universe surfaces are clearly slices of one shared ontology
- shared universe types, placement logic, and explainer structure exist and are the default path
- `/universe` is no longer a separate metaphysical demo track
- `/community` has honest but alive fallback behavior in local/dev and a coherent live-world model direction
- hosted tenant propagation works with the live backend
- user-facing terminology is ANU-consistent
- star placement is inspectable and not purely aesthetic
- no regressions are introduced in auth, `admin_only` posture, multi-pane layout, or browser correctness

## Suggested Delivery Order

1. Sprint 0
2. Sprint 1
3. Sprint 2
4. Sprint 3
5. Sprint 4
6. Sprint 5
7. Sprint 6
8. Sprint 7
9. Sprint 8

## Fast Read

The shortest honest translation is:

- Sprint 0 protects the hosted contract.
- Sprints 1 to 3 create the shared ontology, packet, explainer, and renderer substrate.
- Sprints 4 and 5 make `/universe` and `/community` stop drifting away from that substrate.
- Sprint 6 removes naming drift.
- Sprint 7 proves the shared world behaves correctly in browser reality.
- Sprint 8 closes the remaining gap to the original completion clauses.
