# Control Plane Separation Spec (2026-04-07)

## Objective
Implement strict public-vs-privileged separation in the current ANU three-service kernel with minimal disruption, explicit migration steps, and auditable control posture.

## Current-State Gap Summary (Repo-Grounded)
1. **Backend posture is stronger than frontend posture**
   - `flora-fauna/backend/app/security/control_plane.py` and `app/auth.py` already encode a meaningful control posture.
   - This provides the foundation, but not full system-wide parity.

2. **Frontend control posture is incomplete**
   - Admin routes currently live under the public participant app tree (`src/app/(app)/admin/*`).
   - There is no canonical `(control)` route family.
   - There is no server-side control proxy path enforcing allowlisted forwarding.

3. **Tenant contract mismatch affects separation**
   - `frontend-next/src/proxy.ts` sets limited tenant cookie data.
   - `TenantBrandWrapper.tsx` expects richer tenant metadata and presently relies on non-canonical assumptions.

4. **Backend tenant config persistence defect exists**
   - `app/api/admin_tenants.py` currently risks stringified JSON writes to `NodeConfig.config_json`.
   - This must be repaired before node identity and control-surface assumptions are widened.

5. **Impact-service privileged route separation is partial**
   - `services/impact-service/src/falak/security/routeGuard.ts` contains guard modes, but privileged paths are not yet normalized under a distinct control audience strategy.

6. **Frontend client posture is mixed**
   - Some flows are session-aware, while service-specific API clients still imply direct browser token handling patterns that are inconsistent with control isolation.

## Target Architecture
### Exposure planes
| Plane | Host | Canonical Route Families | Allowed Users |
|---|---|---|---|
| Public | `maanara.vercel.app` + approved custom node domains | `/`, `/docs`, `/transparency`, `/archive`, public-safe reads | public, participant (read) |
| Participant | same public host family | `(app)` participation routes, excluding control/admin | participant, contributor, steward in non-privileged flows |
| Control | `ops.maanara.vercel.app` by default | `/control/*`, `/api/control/*`, `/api/control/falak/*` | operator, scoped steward |

### Design rule
Control may be *rendered* by `frontend-next`, but it must be *authorized* and *proxied* server-side only.

## Host / Domain Strategy
1. Public and participant traffic stays on current public host family and approved custom node domains.
2. Control traffic moves to the control host only.
3. Custom node domains never expose control routes.
4. Control session cookies are host-scoped to the control host only.
5. Public hosts must fail closed for `/control/*` and `/api/control/*`.
6. Temporary compatibility shims may exist only on control host and must not be permanent user-facing routes.

## Route Family Strategy
### Frontend
- Keep:
  - `src/app/(public)`
  - `src/app/(app)`
- Add:
  - `src/app/(control)/control/*`
  - `src/app/api/control/[...path]/route.ts`

### Backend
- `/api/public/*` for public-safe reads
- `/api/*` for participant application flows
- `/api/control/*` for privileged backend operations

### Impact-service
- `/api/public/falak/*` for public-safe reads
- `/api/falak/*` for participant-safe Falak operations where valid
- `/api/control/falak/*` for privileged Falak operations

## JWT Audience Strategy
### Public audience
- `aud=public`
- used for public and participant flows
- never valid for control routes

### Control audience
- `aud=control`
- `token_use=control`
- requires MFA/elevated posture
- carries scope and node scope where relevant

### Rules
1. Public tokens must never authorize control routes.
2. Control tokens must not be accepted from public or custom node hosts for privileged actions.
3. Partner credentials are not a substitute for control session.
4. Control session validation must happen before proxy forwarding.

## Control Session Model
1. Control browser state is cookie-based, server-validated, and host-scoped.
2. Default cookie posture:
   - name: `anu_control_session`
   - `HttpOnly`
   - `Secure`
   - `SameSite=Lax`
   - control-host scoped only

3. Flow:
   1. user authenticates normally,
   2. user performs control elevation with MFA,
   3. backend mints/authorizes control audience state,
   4. control host stores secure session,
   5. frontend control pages call server-side proxy only.

## Server-Side Proxy Pattern
### Required file
- `frontend-next/src/app/api/control/[...path]/route.ts`

### Required companion
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/lib/auth/controlSession.ts`

### Behaviour
1. Validate control host.
2. Validate control session.
3. Allowlist upstream control routes only.
4. Attach control auth server-side.
5. Attach trace and audit headers.
6. Reject public-host control-path access.
7. Never expose upstream control secrets to the browser.

## Logging / Audit Separation
### Mandatory log fields across all services
- `plane`
- `service_name` (or app/service identifier)
- `event_name`
- `level`
- `timestamp`
- `request_id` or `correlation_id` where available

### Additional required fields
**Frontend**
- `host` and route context for control proxy events
- no browser-side secret/session/token payloads in emitted context

**Backend**
- public/control route context (route/method/filter scope)
- actor/action context for control audit events
- no token/secret/session payload fields in emitted context

**Impact-service**
- `tenant_slug`
- `falak_execution_plane`
- `actor_id`

### Audit rule
Every control mutation must record:
- actor,
- scope,
- route/action,
- target object,
- node scope if applicable,
- timestamp,
- outcome.

## Affected Repo Paths
### Frontend
- `frontend-next/src/app/(app)/admin/**`
- `frontend-next/src/app/(control)/control/**`
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/lib/api/client.ts`
- `frontend-next/src/lib/api/impactApi.ts`
- `frontend-next/src/lib/api/floraFaunaApi.ts`
- `frontend-next/src/proxy.ts`

### Backend
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/app/auth.py`
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/api/control_nodes.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/app/schemas.py`

### Impact-service
- `services/impact-service/src/falak/security/routeGuard.ts`
- `services/impact-service/src/falak/routes/registerFalakRoutes.ts`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`

## DTOs / Contracts To Add
1. `DomainResolutionResponse`
2. `NodePublicConfig`
3. `NodeControlConfig`
4. `ControlSession`
5. `ControlRuntimeHealth`
6. `PlaneLogContract`
7. `ControlProxyRequestContext`

## Tests To Add
### Frontend
- `src/test/controlPlaneHostRouting.test.tsx`
- `src/test/controlProxyRoute.test.ts`
- updated tests for migrated admin/runtime-health pages

### Backend
- `flora-fauna/backend/tests/test_control_plane_separation.py`
- `flora-fauna/backend/tests/test_node_config_contract.py`

### Impact-service
- `services/impact-service/tests/falak/falakControlPlaneAudience.test.ts`
- updates to Falak privileged route tests

## Migration Plan
### Step 1 — Repair tenant contract
- fix `NodeConfig` persistence,
- expand domain resolution payload,
- add public node config endpoint,
- align `proxy.ts` and `TenantBrandWrapper.tsx`.

### Step 2 — Add control route foundation
- add `(control)` route group,
- add control layout and first pages,
- add host gating.

### Step 3 — Add server-side control proxy
- add allowlisted forwarding,
- add control client,
- migrate operator data access through proxy only.

### Step 4 — Migrate first operator surfaces
- move `/admin/tenants` → `/control/tenants`
- move `/admin/runtime-health` → `/control/runtime-health`

### Step 5 — Enforce impact-service control audience
- split privileged Falak route family,
- reject public tokens for privileged Falak operations,
- add plane logging.

### Step 6 — Roll out plane-aware envelope contract
- add canonical `PlaneLogContract` helpers with explicit plane validation in all three services,
- emit `plane=public` for public route events, `plane=control` for control proxy/audit events, and `plane=impact` for Falak telemetry,
- redact sensitive fields before emission (`authorization`, token/session/secret-like keys),
- reject unsupported plane values explicitly (no silent omission).

## Proof Required For Sign-Off
1. Public host denies `/control/*`.
2. Control host renders `/control/tenants` and `/control/runtime-health`.
3. Browser never holds control secret.
4. Control proxy only forwards to allowlisted privileged routes.
5. Privileged Falak routes reject public tokens and accept control audience posture.
6. Logs include `plane`, `service_name`, `event_name`, `level`, `timestamp`, and request/correlation id where available.
7. Rollback notes exist for route migration and control host gating.

## Rollback Posture
If control-plane migration needs rollback:
1. revert control route introduction,
2. disable proxy forwarding,
3. restore legacy admin entrypoints only on control host compatibility shims,
4. do **not** reopen public-host operator access as a fallback.

## Invalid End States
The following states fail this spec:
- `/admin/*` remaining canonical on public host,
- browser-side privileged upstream calls,
- public token acceptance on control routes,
- control routes on custom node domains,
- missing audit trail for control mutations.
