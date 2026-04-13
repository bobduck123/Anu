# Connector Architecture Spec (2026-04-07)

## Purpose
Make ANU’s core product metabolism explicit:

**knowledge → action → community → governance → archive**

A connector is not just a link. It is a typed transition with provenance, threshold posture, and memory consequences.

## Objectives
1. Turn route adjacency into an explicit contract.
2. Let knowledge surfaces emit structured downstream actions.
3. Preserve provenance across transitions.
4. Create a canonical archive handoff at the end of consequential journeys.
5. Prevent flagship routes from becoming dead ends.

## Core Concepts
### JourneyConnector
A reusable transition object that says:
- what source object or route it originates from,
- where it leads,
- what threshold is required,
- why the transition is valid,
- what provenance or trust context must travel with it.

### JourneyTransitionProof
A durable record that a transition happened and under what conditions.
Used for:
- archive memory,
- trust explanation,
- milestone evidence,
- future analytics without losing semantics.

### ConnectorRailPayload
The frontend payload rendered by connector UI.
It includes:
- source context,
- destination route(s),
- threshold prompt,
- provenance summary,
- archive handoff reference if relevant.

## Minimal Data Model
### `JourneyConnector`
Required fields:
- `id`
- `slug`
- `source_type`
- `source_id`
- `source_route`
- `target_type`
- `target_route`
- `target_slug` or `target_id`
- `threshold_required`
- `node_slug`
- `label`
- `summary`
- `provenance_mode`
- `archive_handoff_mode`
- `is_active`
- `display_order`

### `JourneyTransitionProof`
Required fields:
- `id`
- `connector_id`
- `actor_id` (nullable for public read transition if appropriate)
- `node_slug`
- `source_route`
- `target_route`
- `transition_kind`
- `provenance_snapshot`
- `occurred_at`
- `result_state`
- `archive_record_id` (nullable)

### `ConnectorRailPayload`
Required fields:
- `source`
- `connectors[]`
- `threshold_context`
- `provenance_summary`
- `archive_handoff`
- `degraded_honesty`
- `node_scope`

## Service Ownership
### Backend (`flora-fauna/backend`)
Owns:
- `JourneyConnector`
- `JourneyTransitionProof`
- connector service
- public connector API
- archive handoff mapping
- provenance summary shaping

### Impact-service
Owns:
- projection data for map/event/pool context where required,
- event/pool state that enriches connector payloads,
- no canonical public connector truth on its own.

### Frontend
Owns:
- connector rail UI,
- provenance panel UI,
- threshold prompts,
- archive handoff card,
- route integration.

## Public APIs
### Required endpoints
- `GET /public/connectors` (legacy compatibility alias target: `/api/public/connectors`)
- `GET /public/journeys/:slug`
- `GET /public/archive-handoffs/:slug`
- `GET /public/trust/reports/:id` (for archive/trust linked connector surfaces)

### Required behaviour
1. Return stable typed payloads.
2. Include provenance summary.
3. Include threshold metadata.
4. Include node scope.
5. Return explicit degraded honesty when live context is partial.

## Frontend Components
Minimum reusable components:
- `ConnectorRail`
- `ConnectorCard`
- `ThresholdPrompt`
- `ProvenancePanel`
- `ArchiveHandoffCard`

The connector rail must render from API payload, not hand-authored route link arrays.

## Flagship Journey
### Initial flagship
`/education/maps/[mapId]`
→ `/actions` or `/events`
→ `/community`
→ `/governance/model-registry` or governance-adjacent review surface
→ `/archive/[record]`

This does not imply all users can mutate governance directly.
It means the connector substrate preserves the path from knowledge to accountable memory.

## Provenance Model
Each connector must declare one of:
- `source-backed`
- `verified-summary`
- `degraded-honesty`

A connector may not imply evidentiary certainty it does not have.

## Archive Handoff Rules
A connector triggers archive handoff when:
- the transition is consequential,
- a public trust report or record is produced,
- a governance or milestone artifact is created,
- a sponsor or finance disclosure becomes materially relevant.

Archive handoff must never be bolted on after the fact for flagship journeys.

## Tests Required
### Backend
- connector persistence tests,
- connector public API tests,
- transition proof tests,
- provenance summary tests.

### Frontend
- connector rail rendering tests,
- provenance panel tests,
- threshold prompt tests,
- archive handoff rendering tests.

### Cross-service
- flagship journey proof,
- node-scope consistency test,
- degraded honesty handling test.

## Invalid States
The following are connector failures:
- a flagship route with no connector path,
- a connector with no threshold posture,
- a connector with no provenance posture,
- archive handoff omitted from consequential journeys,
- hand-authored adjacency that drifts from connector payload truth.

## Implementation Reference (2026-04-13)
Canonical implementation now exists across all three layers:

- Backend persistence + APIs:
  - `flora-fauna/backend/app/models.py`
  - `flora-fauna/backend/app/services/connector_service.py`
  - `flora-fauna/backend/app/api/public_connectors.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_public_connectors.py`
- Impact-service projection:
  - `services/impact-service/src/falak/services/impactQueryService.ts`
  - `services/impact-service/src/falak/routes/registerFalakRoutes.ts`
  - `services/impact-service/tests/falak/falakService.test.ts`
- Frontend rail contract + shell integration:
  - `frontend-next/src/ui-system/anu/journeyConnectorRegistry.ts`
  - `frontend-next/src/app/api/sdk/journey-connectors/route.ts`
  - `frontend-next/src/ui-system/layout/JourneyConnectorRail.tsx`
  - `frontend-next/src/ui-system/shell/shellMetadata.ts`
  - backend-first SDK fetch with canonical registry fallback and explicit degraded honesty

Flagship journey slug:
- `knowledge-action-community-governance-archive`
