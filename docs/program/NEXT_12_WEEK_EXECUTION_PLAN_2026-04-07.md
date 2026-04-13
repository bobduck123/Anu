# Next 12-Week Execution Plan (2026-04-07)

## Operating Rule
This plan is execution-first, week-by-week, and tied to the first 25 backlog tickets in:
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`

Baseline evidence remains:
- `docs/program/PROD_GO_LIVE_EVIDENCE_2026-04-07.md`
- `docs/program/GO_LIVE_CHECKLIST.md`
- `docs/program/COMPREHENSIVE_RELEASE_REALM_TODO_2026-04-07.md`

## Week 1 — 2026-04-08 to 2026-04-14
### Goal
Repair the tenant contract and lock the first operative docs.

### Tasks
- fix `NodeConfig.config_json` persistence defect,
- expand domain resolution response,
- add public node config endpoint,
- refactor `TenantBrandWrapper` and middleware contract,
- merge initial operative doc set.

### Exact repo/services touched
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/schemas.py`
- `frontend-next/src/proxy.ts`
- `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
- `frontend-next/src/test/tenantBrandContract.test.tsx`

### Exact docs touched
- programme charter
- control-plane separation spec
- doctrine spec
- route-purpose registry
- decision register
- 12-week plan
- backlog

### Blockers
- none for implementation,
- D001, D003, D006, D007 remain defaults in force.

### Completion proof
- backend node-config tests pass,
- frontend tenant brand contract test passes,
- public node config endpoint returns expected payload,
- custom-domain branding proof captured.

### Tickets advanced
- `ANU-001`
- `ANU-002`
- `ANU-003`
- `ANU-004`

## Week 2 — 2026-04-15 to 2026-04-21
### Goal
Stand up control-plane route foundation.

### Tasks
- add `(control)` route group and control layout,
- add control session utility,
- move first operator surfaces (`tenants`, `runtime-health`) into `/control/*`,
- update operator links from home/dashboard entrypoints.

### Exact repo/services touched
- `frontend-next/src/app/(control)/control/layout.tsx`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/app/(control)/control/runtime-health/page.tsx`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/app/(app)/home/**`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`

### Exact docs touched
- control-plane separation spec
- route-purpose registry
- decision register

### Blockers
- D001 affects final DNS naming only, not local implementation.

### Completion proof
- public host denies `/control/*`,
- control host renders `/control/tenants` and `/control/runtime-health`.

### Tickets advanced
- `ANU-005`

## Week 3 — 2026-04-22 to 2026-04-28
### Goal
Ship the server-side control proxy and first admin migration slice.

### Tasks
- add `api/control/[...path]` route,
- add `controlClient.ts`,
- migrate tenants and runtime-health data paths to control proxy,
- add control-host-only compatibility behaviour for legacy `/admin/*` where needed.

### Exact repo/services touched
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/app/(control)/control/runtime-health/page.tsx`
- `frontend-next/src/app/(app)/admin/**`
- `frontend-next/src/test/controlProxyRoute.test.ts`

### Exact docs touched
- control-plane separation spec
- route-purpose registry

### Blockers
- none if Week 2 is merged.

### Completion proof
- control pages call server-side proxy only,
- proxy blocks public-host control calls.

### Tickets advanced
- `ANU-006`
- `ANU-007`
- `ANU-008`

## Week 4 — 2026-04-29 to 2026-05-05
### Goal
Unify frontend auth posture for public vs control calls.

### Tasks
- refactor mixed API clients to one auth injection posture,
- ensure control session flow is isolated from public session,
- update control separation tests.

### Exact repo/services touched
- `frontend-next/src/lib/api/client.ts`
- `frontend-next/src/lib/api/impactApi.ts`
- `frontend-next/src/lib/api/floraFaunaApi.ts`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`

### Exact docs touched
- control-plane separation spec
- decision register

### Blockers
- none if Weeks 2–3 landed.

### Completion proof
- all frontend clients use unified auth posture,
- control calls route through control session/proxy path only.

### Tickets advanced
- `ANU-009`

## Week 5 — 2026-05-06 to 2026-05-12
### Goal
Enforce control audience for privileged impact routes.

### Tasks
- harden Falak privileged route audience checks,
- normalize privileged Falak route family,
- add control-audience coverage tests.

### Exact repo/services touched
- `services/impact-service/src/falak/security/routeGuard.ts`
- `services/impact-service/src/falak/routes/registerFalakRoutes.ts`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`
- `services/impact-service/tests/falak/falakControlPlaneAudience.test.ts`
- `services/impact-service/tests/falak/falakMapRouteGuard.test.ts`

### Exact docs touched
- control-plane separation spec

### Blockers
- none if control proxy/session posture exists.

### Completion proof
- privileged Falak routes reject public tokens and accept control posture,
- plane logging is visible.

### Tickets advanced
- `ANU-010`

## Week 6 — 2026-05-13 to 2026-05-19
### Goal
Introduce backend↔Falak node binding foundation.

### Tasks
- add `NodeServiceBinding` model/service,
- add impact tenant binding fields or equivalent binding table,
- add binding verification tests.

### Exact repo/services touched
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/node_binding_service.py`
- `flora-fauna/backend/tests/test_node_service_binding.py`
- `services/impact-service/prisma/schema.prisma`
- `services/impact-service/tests/falak/falakTenantBinding.test.ts`

### Exact docs touched
- node tenancy spec
- decision register

### Blockers
- D006 affects final contract sign-off, not initial implementation.

### Completion proof
- explicit node↔tenant binding exists and is tested.

### Tickets advanced
- `ANU-011`

## Week 7 — 2026-05-20 to 2026-05-26
### Goal
Make route and threshold canon executable.

### Tasks
- add `routePurposeRegistry.ts`,
- add `thresholdRegistry.ts`,
- refactor guidance/signal code to consume registries,
- add registry tests.

### Exact repo/services touched
- `frontend-next/src/ui-system/anu/routePurposeRegistry.ts`
- `frontend-next/src/ui-system/anu/thresholdRegistry.ts`
- `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- `frontend-next/src/test/routePurposeRegistry.test.ts`
- `frontend-next/src/test/thresholdRegistry.test.ts`

### Exact docs touched
- route-purpose registry
- threshold language spec
- doctrine spec

### Blockers
- D007 affects final copy language, not registry implementation.

### Completion proof
- registry tests pass,
- flagship routes render consistent threshold semantics.

### Tickets advanced
- `ANU-012`
- `ANU-013`

## Week 8 — 2026-05-27 to 2026-06-02
### Goal
Stand up connector schema and public connector API.

### Tasks
- add connector entities and transition proof model,
- add connector service,
- add public connector API,
- seed first flagship journey records.

### Exact repo/services touched
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/connector_service.py`
- `flora-fauna/backend/app/api/public_connectors.py`
- `flora-fauna/backend/tests/test_journey_transition_proof.py`
- `flora-fauna/backend/tests/test_connector_public_api.py`
- `flora-fauna/backend/tests/test_connector_provenance.py`

### Exact docs touched
- connector architecture spec
- requirements spec

### Blockers
- Weeks 6–7 must land first.

### Completion proof
- connector records persist,
- public connector API returns typed payload with provenance posture.

### Tickets advanced
- `ANU-014`
- `ANU-015`

## Week 9 — 2026-06-03 to 2026-06-09
### Goal
Ship first connector UI rail and archive skeleton routes.

### Tasks
- implement connector UI components,
- integrate first route connector rail,
- add archive index and archive detail skeleton.

### Exact repo/services touched
- `frontend-next/src/components/connectors/*`
- `frontend-next/src/components/trust/*`
- `frontend-next/src/app/(app)/education/maps/[mapId]/page.tsx`
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/app/(public)/archive/[id]/page.tsx`
- `frontend-next/src/test/connectorRail.test.tsx`
- `frontend-next/src/test/provenancePanel.test.tsx`
- `frontend-next/src/test/archivePage.test.tsx`

### Exact docs touched
- connector architecture spec
- route-purpose registry
- trust/archive spec

### Blockers
- connector API availability from Week 8.

### Completion proof
- connector rail renders from live connector payload,
- archive skeleton routes are deep-linkable.

### Tickets advanced
- `ANU-016`
- `ANU-017`

## Week 10 — 2026-06-10 to 2026-06-16
### Goal
Add public trust report model/API and sponsor disclosure surface.

### Tasks
- add trust report model and API endpoints,
- add sponsor disclosure modules on trust/transparency surfaces,
- enforce non-distortion placement.

### Exact repo/services touched
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/tests/test_public_trust_reports.py`
- `flora-fauna/backend/tests/test_sponsor_disclosure.py`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(public)/trust/page.tsx`
- `frontend-next/src/test/transparencyPage.test.tsx`
- `frontend-next/src/test/trustCenterPage.test.tsx`

### Exact docs touched
- civic economy doctrine
- trust/archive spec
- decision register

### Blockers
- D002, D004, and D005 constrain final sign-off but not initial implementation.

### Completion proof
- trust report API and disclosure UI are live and tested,
- ordering integrity remains unchanged.

### Tickets advanced
- `ANU-018`
- `ANU-019`

## Week 11 — 2026-06-17 to 2026-06-23
### Goal
Complete proving-ground node isolation proofs.

### Tasks
- add or extend cross-tenant isolation tests across all services,
- validate proving-ground node host, branding, and binding,
- validate control-plane and connector behaviour under proving-ground scope.

### Exact repo/services touched
- `flora-fauna/backend/tests/test_node_isolation.py`
- `flora-fauna/backend/tests/test_domain_resolution.py`
- `services/impact-service/tests/falak/falakService.test.ts`
- `services/impact-service/tests/falak/falakTenantBinding.test.ts`
- `frontend-next/src/test/tenantBrandContract.test.tsx`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`
- `frontend-next/src/test/flagshipJourney.test.tsx`

### Exact docs touched
- node tenancy spec
- decision register
- route-purpose registry

### Blockers
- external domain configuration for final proving-ground host proof.

### Completion proof
- cross-tenant denial tests pass,
- proving-ground public and control host proofs are captured.

### Tickets advanced
- `ANU-020`
- `ANU-021`
- `ANU-022`

## Week 12 — 2026-06-24 to 2026-06-30
### Goal
Finalize milestone proof packs and close the first execution slice.

### Tasks
- run targeted proof suite for M1–M5,
- capture operator evidence and rollback evidence,
- update decision register statuses and unresolved impacts,
- prepare sign-off pack with artifacts and links,
- finalize PR-group definitions for the next tranche.

### Exact repo/services touched
- `docs/program/*`
- `.github/workflows/*` (extension edits only; no renames)
- targeted test suites across frontend, backend, and impact-service

### Exact docs touched
- milestone acceptance pack
- milestone evidence template
- milestone acceptance templates
- decision register
- PR group definitions

### Blockers
- unresolved leadership decisions that alter defaults,
- missing live/operator artifacts.

### Completion proof
- M1–M5 evidence bundle complete with code, tests, live proof, operator proof, and rollback proof.

### Tickets advanced
- `ANU-023`
- `ANU-024`
- `ANU-025`
