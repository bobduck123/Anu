# Systems Audit Requirements

Date: 2026-03-19

## Purpose

This document consolidates the first and second audit rounds across:

- `frontend-next`
- `flora-fauna/backend`
- `services/impact-service`
- Vercel hosting and environment wiring
- Supabase auth integration

It is intended to serve as the current requirements and remediation reference for restoring a coherent hosted system.

## Verified Current State

Verified during this audit:

- `frontend-next` local verification passes:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test -- --run src/test/educationMaps.test.ts`
- `services/impact-service` local verification passes:
  - `npm run typecheck`
  - `npm test -- --runInBand`
- `flora-fauna/backend` local verification does not currently bootstrap cleanly:
  - `python -m pytest tests/test_health.py -q` fails during app import
- Live `anu-impact-service` is healthy and in `admin_only`
- Live `maanara/_impact/v1/education/maps` still fails without tenant header
- Live `anu-back-end` and proxied `maanara/_core/*` routes are currently failing with `FUNCTION_INVOCATION_FAILED`

## Findings

### 1. Critical: Core backend startup is broken

Evidence:

- `flora-fauna/backend/app/api/domain_resolution.py` imports `app.utils.auth`, which does not exist.
- `flora-fauna/backend/app/api/__init__.py` imports and registers `domain_resolution_bp` during app startup.
- `flora-fauna/backend/app/__init__.py` registers `api_bp` during app startup.
- Local reproduction:
  - `python -m pytest tests/test_health.py -q`
  - failure: `ModuleNotFoundError: No module named 'app.utils'`
- Live reproduction:
  - `https://anu-back-end.vercel.app/health` -> `FUNCTION_INVOCATION_FAILED`
  - `https://anu-back-end.vercel.app/readiness` -> `FUNCTION_INVOCATION_FAILED`
  - `https://anu-back-end.vercel.app/public/transparency/node-summary` -> `FUNCTION_INVOCATION_FAILED`
  - `https://maanara.vercel.app/_core/health` -> `FUNCTION_INVOCATION_FAILED`

Requirements:

- Fix `flora-fauna/backend/app/api/domain_resolution.py` so it imports real auth decorators or removes the broken dependency path.
- Ensure the Flask app can import and boot before any request handling is attempted.
- Add a backend bootstrap smoke test that imports `create_app()` and exercises `/healthz`.
- Treat all `_core`-backed features as unreliable until this is fixed.

### 2. High: Domain-resolution routes are double-prefixed

Evidence:

- `flora-fauna/backend/app/api/__init__.py` mounts `api_bp` at `/api`.
- `flora-fauna/backend/app/api/domain_resolution.py` defines routes such as `/api/domains/resolve`.
- That yields an effective backend path of `/api/api/domains/resolve`.
- `frontend-next/src/middleware.ts` calls `${apiBase}/api/domains/resolve`.

Requirements:

- Standardize the backend contract to one of:
  - blueprint mounted at `/api` with route path `/domains/resolve`, or
  - blueprint mounted at root with route path `/api/domains/resolve`
- Do not keep `/api` in both layers.
- Add one route-contract test that verifies the exact path used by frontend middleware exists.

### 3. High: Frontend middleware uses the wrong core API env contract

Evidence:

- `frontend-next/next.config.ts` and `frontend-next/src/lib/runtime.ts` use `CORE_API_ORIGIN`.
- `frontend-next/src/middleware.ts` uses `NEXT_PUBLIC_CORE_API_URL` or falls back to `https://api.anu.eco`.
- `frontend-next/vercel.env.example` documents `CORE_API_ORIGIN`, not `NEXT_PUBLIC_CORE_API_URL`.

Requirements:

- Unify frontend server-side core API origin resolution behind one helper.
- `middleware.ts`, `next.config.ts`, and `runtime.ts` must all use the same env contract.
- Remove undocumented fallback to `https://api.anu.eco` unless that host is intentionally authoritative.
- Document one single source of truth for:
  - core API origin
  - impact API origin
  - memetics API origin

### 4. High: Hosted Falak maps still fail without tenant header

Evidence:

- `services/impact-service/src/falak/plugins/requestContext.ts` requires `X-Tenant-Id`.
- `frontend-next/src/lib/maps/sandbox.ts` only sends a tenant header when `NEXT_PUBLIC_FALAK_TENANT_ID` is present.
- `frontend-next/src/lib/api/educationMaps.ts` adds `X-Tenant-Id` only when a tenant id resolves.
- Live check:
  - `https://anu-impact-service.vercel.app/v1/falak/readiness` is healthy
  - `https://maanara.vercel.app/_impact/v1/education/maps` returns `TENANT_HEADER_REQUIRED`

Requirements:

- Set `NEXT_PUBLIC_FALAK_TENANT_ID` on the Vercel project serving `https://maanara.vercel.app`.
- Redeploy the frontend after setting the env because `NEXT_PUBLIC_*` is build-time.
- Add a production-visible diagnostic for missing `NEXT_PUBLIC_FALAK_TENANT_ID` when hosted Falak routes are expected.

### 5. Medium: Supabase misconfiguration is silently degraded instead of loudly surfaced

Evidence:

- `frontend-next/src/lib/supabase/client.ts` creates a no-op auth client when Supabase env is missing.
- `frontend-next/src/lib/supabase/server.ts` and `frontend-next/src/lib/supabase/middleware.ts` also degrade to no-op behavior.
- `frontend-next/src/lib/supabase/config.ts` only checks env presence, then the rest of the app proceeds.

Risk:

- Production can appear partially functional while auth is effectively disabled or inert.
- Failures get converted into generic UX breakage instead of explicit environment failures.

Requirements:

- Keep no-op fallback only for explicit local/dev modes, not silent production behavior.
- In production, missing Supabase env must emit strong telemetry and a clear operator-visible failure mode.
- Add one startup assertion or runtime health warning for missing Supabase env in hosted environments.

### 6. Medium: Frontend “admin” is not equivalent to Falak `admin_only`

Evidence:

- `frontend-next/src/contexts/AuthContext.tsx` marks admin from user metadata only:
  - `metadata.is_admin === true || metadata.role === 'admin'`
- `services/impact-service/src/falak/auth/actorIdentity.ts` resolves backend identity from bearer token claims.
- `services/impact-service/src/auth/jwt.ts` extracts identity candidates from:
  - `sub`
  - `external_auth_id`
  - `username`
  - `email`
- `services/impact-service/src/falak/security/routeGuard.ts` allows `admin_only` only for actors whose `externalAuthId` is in `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS`.

Risk:

- A user can look “admin” in frontend UI while still failing Falak authorization.

Requirements:

- Separate “frontend admin UI” from “Falak actor authorized” in the product language and checks.
- Add one explicit hosted check that confirms the logged-in user resolves to a Falak actor in the current tenant.
- Do not assume Supabase metadata admin implies Falak actor allowlist membership.

### 7. Medium: Core backend production env contract is strict and likely under-verified

Evidence:

- `flora-fauna/backend/app/config.py` production validation requires:
  - `SECRET_KEY`
  - `JWT_SECRET_KEY`
  - `PUBLIC_JWT_SECRET_KEY`
  - `CONTROL_JWT_SECRET_KEY`
  - `DATABASE_URL`
  - `CORS_ORIGINS`
  - `CONTROL_PLANE_HOSTS`
  - `CONTROL_PLANE_SHARED_SECRET`
  - Stripe secret unless placeholder mode is intentionally enabled
- `flora-fauna/backend/vercel.env.example` documents this contract.

Risk:

- Even after the import crash is fixed, production startup can still fail if env parity is incomplete.

Requirements:

- Verify the full Vercel env set for `flora-fauna/backend` against `vercel.env.example`.
- Use `/healthz` for liveness and `/readiness` for DB-backed readiness.
- Do not point monitoring at DB-backed routes for pure liveness checks.

### 8. Medium: Next.js middleware contract is deprecated

Evidence:

- `frontend-next` build warns that the `middleware` file convention is deprecated and `proxy` should be used instead.

Requirements:

- Plan migration from `frontend-next/src/middleware.ts` to the supported `proxy` convention before future framework upgrades.
- Keep behavior identical during migration and re-verify tenant resolution plus Supabase session refresh.

### 9. Medium: Runtime and proxy resolution are split across too many places

Evidence:

- `frontend-next/next.config.ts`
- `frontend-next/src/lib/runtime.ts`
- `frontend-next/src/middleware.ts`
- Vercel env examples

Risk:

- Different code paths can point at different backends depending on client/server/proxy/middleware context.

Requirements:

- Consolidate origin resolution logic for:
  - core API
  - impact API
  - memetics API
- Remove duplicated env parsing where practical.
- Add a route contract checklist for:
  - `/_core/*`
  - `/_impact/*`
  - domain resolution endpoint

### 10. Low: Frontend fallback UX hides root causes

Evidence:

- `frontend-next/src/app/(app)/pools/page.tsx` shows generic “temporarily unavailable” language and then falls back to seeded snapshot data.
- `frontend-next/src/lib/api/client.ts` normalizes 500s into generic service errors.
- `frontend-next/src/lib/api/educationMaps.ts` also falls back to bundled read-only data on multiple backend failures.

Risk:

- Operators and users can misread a hard outage as a soft content fallback.

Requirements:

- Preserve user-friendly fallback UI, but log and expose the precise machine reason for operators.
- Include route, status code, and request id where available.
- Differentiate between:
  - backend unavailable
  - missing tenant header
  - auth mismatch
  - intentionally dark-launched route

## Consolidated Requirements By Project

### `flora-fauna/backend`

- Fix the import crash in `app/api/domain_resolution.py`.
- Fix domain route path registration so middleware calls the real path.
- Verify Vercel env parity against `vercel.env.example`.
- Restore successful responses on:
  - `/healthz`
  - `/health`
  - `/readiness`
  - `/public/transparency/node-summary`
- Add bootstrap smoke coverage in tests/CI.

### `frontend-next`

- Align middleware core-origin resolution with `CORE_API_ORIGIN`.
- Set and verify `NEXT_PUBLIC_FALAK_TENANT_ID`.
- Stop silently degrading Supabase in production.
- Preserve the universe-style map work, but do not deploy more frontend-only UX changes while core API is still failing.
- Migrate deprecated `middleware` file convention.

### `services/impact-service`

- Keep current healthy `admin_only` state intact.
- Continue requiring:
  - verified bearer auth
  - tenant header
  - allowlisted tenant slug
  - allowlisted actor external auth id
- Do not loosen route guard behavior to work around frontend env gaps.

### Supabase / Auth

- Verify hosted Supabase env exists in frontend production.
- Verify the intended admin user maps to Falak actor identity through token claims.
- Distinguish frontend admin metadata from Falak actor authorization in UI and diagnostics.

### Vercel Hosting

- `maanara` frontend:
  - `CORE_API_ORIGIN`
  - `IMPACT_API_ORIGIN`
  - `MEMETICS_API_ORIGIN`
  - `NEXT_PUBLIC_FALAK_TENANT_ID`
  - Supabase public envs
- `anu-back-end`:
  - full strict production env set
- `anu-impact-service`:
  - preserve current healthy Falak env posture

## Recommended Execution Order

1. Fix `flora-fauna/backend` startup import failure.
2. Fix domain-resolution route registration.
3. Align frontend middleware to the documented core API origin env.
4. Restore live `_core/healthz`, `_core/health`, and transparency endpoint behavior.
5. Set `NEXT_PUBLIC_FALAK_TENANT_ID` on `maanara` and redeploy.
6. Verify hosted Supabase env and actor mapping.
7. Only then continue broader UI promotion of the learning-universe work.

## Acceptance Criteria

The system should not be considered coherent again until all of the following are true:

- `https://anu-back-end.vercel.app/healthz` returns `200`
- `https://anu-back-end.vercel.app/health` returns `200`
- `https://anu-back-end.vercel.app/readiness` returns `200` or an intentional, well-understood degraded status
- `https://maanara.vercel.app/_core/public/transparency/node-summary` returns JSON, not `FUNCTION_INVOCATION_FAILED`
- `https://maanara.vercel.app/_impact/v1/education/maps` no longer returns `TENANT_HEADER_REQUIRED`
- hosted admin login reaches the live Falak API without fallback
- local backend bootstrap tests pass
- local frontend and impact-service verification remain green

## Notes

- This document is an audit artifact. No remediation changes were executed as part of writing it.
- The current repo also contains broad uncommitted frontend work across maps, pools, universe, auth, and middleware. That work should be isolated carefully from backend recovery so new deploys do not blur root-cause analysis.
