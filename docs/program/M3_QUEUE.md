# M3 Queue — Connector Substrate Rollout

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` intentionally postponed outside M3 scope

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| C3-001 | Define canonical flagship connector journey contract (knowledge → action/event → community → governance/transparency → archive) | ARCH | DONE | `docs/CONNECTOR_ARCHITECTURE_SPEC_2026-04-07.md`, `frontend-next/src/ui-system/anu/journeyConnectorRegistry.ts` |
| C3-002 | Implement backend connector persistence models (`JourneyConnector`, `JourneyTransitionProof`) | BE | DONE | `flora-fauna/backend/app/models.py` |
| C3-003 | Implement backend public connector APIs (`/public/connectors`, `/public/journeys/:slug`, `/public/archive-handoffs/:slug`, `/public/trust/reports/:id`) | BE/API | DONE | `flora-fauna/backend/app/api/public.py`, `flora-fauna/backend/tests/test_public_connectors.py` |
| C3-004 | Add trust/archive public models for connector handoff (`PublicArchiveRecord`, `PublicTrustReport`) | BE | DONE | `flora-fauna/backend/app/models.py`, `flora-fauna/backend/app/api/public.py` |
| C3-005 | Add impact-service connector projection endpoint and service shaping | IMPACT | DONE | `services/impact-service/src/falak/services/impactQueryService.ts`, `services/impact-service/src/falak/routes/registerFalakRoutes.ts` |
| C3-006 | Add frontend connector registry + SDK API route + shell metadata connector manifest | FE | DONE | `frontend-next/src/ui-system/anu/journeyConnectorRegistry.ts`, `frontend-next/src/app/api/sdk/journey-connectors/route.ts`, `frontend-next/src/ui-system/shell/shellMetadata.ts` |
| C3-007 | Render connector rail from API payload in shared shell surface | FE | DONE | `frontend-next/src/ui-system/layout/JourneyConnectorRail.tsx`, `frontend-next/src/ui-system/layout/Sidebar.tsx` |
| C3-008 | Ensure archive endpoint route exists and is deep-linkable (`/archive`, `/archive/[record]`) | FE | DONE | `frontend-next/src/app/(public)/archive/page.tsx`, `frontend-next/src/app/(public)/archive/[record]/page.tsx` |
| C3-009 | Add chain and dead-end prevention tests across backend/frontend/impact-service | SECQA | DONE | `flora-fauna/backend/tests/test_public_connectors.py`, `frontend-next/src/test/journeyConnectorRegistry.test.ts`, `services/impact-service/tests/falak/falakService.test.ts` |
| C3-010 | Extend connector payloads to tenant-authored dynamic journey editing | ARCH | DEFERRED | Out of M3 scope; requires governance workflow and control-plane editor |

## Completion criteria

- flagship journey has an executable connector contract in backend + frontend + impact-service
- connector payloads include threshold and provenance posture
- consequential governance/transparency transitions include archive handoff references
- touched journey routes are not dead ends before archive terminal
- tests verify journey reachability and typed payload shape
