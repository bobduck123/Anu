# PR Group Definitions — M1 (2026-04-07)

## PR Group 1 — Tenant Contract Repair
**Purpose**
Repair node config and domain resolution so frontend branding and node semantics rely on canonical backend contracts.

**Likely files**
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_node_config_contract.py`
- `frontend-next/src/proxy.ts`
- `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
- `frontend-next/src/test/tenantBrandContract.test.tsx`

**Depends on**
- none

**Tests**
- node config contract tests
- middleware/branding contract tests

**Proof**
- object-shaped `config_json`
- public node config endpoint response
- custom-domain branding screenshot

**Rollback**
- revert DTO expansion and wrapper change together; do not leave split contract state behind

---

## PR Group 2 — Control-Plane Route Foundation
**Purpose**
Create the dedicated control route family and host gating.

**Likely files**
- `frontend-next/src/app/(control)/control/layout.tsx`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/app/(control)/control/runtime-health/page.tsx`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`

**Depends on**
- PR Group 1

**Tests**
- control host routing tests
- public-host deny tests

**Proof**
- public host rejects `/control/*`
- control host renders initial control pages

**Rollback**
- remove control route family and keep operator entrypoints disabled rather than re-exposing public admin

---

## PR Group 3 — Control Proxy + Admin Migration
**Purpose**
Ensure privileged browser flows pass only through server-side proxy and begin migration away from `/admin/*`.

**Likely files**
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(app)/admin/**`
- `frontend-next/src/app/(control)/control/**`
- `frontend-next/src/test/controlProxyRoute.test.ts`

**Depends on**
- PR Group 2

**Tests**
- control proxy route tests
- migrated admin page tests
- runtime-health page tests

**Proof**
- no browser-held control secret
- control pages use proxy path only

**Rollback**
- disable proxy and retain control-host-only compatibility shims; do not reopen public-host admin

---

## PR Group 4 — Impact Control Audience Enforcement
**Purpose**
Bring privileged Falak route posture into parity with backend control rules.

**Likely files**
- `services/impact-service/src/falak/security/routeGuard.ts`
- `services/impact-service/src/falak/routes/registerFalakRoutes.ts`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`
- `services/impact-service/tests/falak/falakControlPlaneAudience.test.ts`
- `services/impact-service/tests/falak/falakMapRouteGuard.test.ts`

**Depends on**
- PR Group 3

**Tests**
- control-audience acceptance and rejection tests
- telemetry plane-tag tests

**Proof**
- privileged Falak routes reject public tokens
- plane logging visible

**Rollback**
- revert privileged route family split while preserving existing public-safe Falak routes

---

## PR Group 5 — Node Binding Foundation
**Purpose**
Create the canonical backend↔Falak binding required for real node tenancy.

**Likely files**
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/node_binding_service.py`
- `flora-fauna/backend/tests/test_node_service_binding.py`
- `services/impact-service/prisma/schema.prisma`
- `services/impact-service/tests/falak/falakTenantBinding.test.ts`

**Depends on**
- PR Group 1
- PR Group 4

**Tests**
- node binding tests
- cross-service tenant consistency tests

**Proof**
- one proving-ground node resolves consistently through backend and impact-service

**Rollback**
- leave node tenancy claims in pilot state and remove binding-dependent rollout assumptions
