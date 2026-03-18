# ANU Impact-Service Admin-Only Handoff

Date: 2026-03-19

## Purpose

Use this handoff when production Falak is stuck in `disabled` and the goal is to
move safely to `admin_only` on Vercel.

This is a production recovery and enablement sequence for the hosted
`anu-impact-service` deployment. It assumes Falak code is already on `main`.

## Current Live State

As of 2026-03-19, production still reports:

- `GET /v1/falak/readiness` -> `status=not_ready`
- `checks.database=error`
- `checks.prisma=error`
- `checks.postgis=skipped`
- `checks.falak_schema=skipped`
- `checks.migrations=skipped`
- `runtime.route_guard_mode=disabled`
- `runtime.map_route_guard_mode=disabled`
- `GET /v1/education/maps` -> `FALAK_MAPS_DISABLED`

That means the current blocker is not frontend login and not the Falak route
code. Production is still dark-launched and the service is failing before the
database-specific readiness checks can complete.

## What Must Be True Before `admin_only`

Do not flip production from `disabled` to `admin_only` until all of the
following are true:

1. `DATABASE_URL` reaches the intended production Postgres target from Vercel.
2. `DIRECT_URL` reaches the direct Postgres host for Prisma/manual inspection.
3. `GET /v1/falak/readiness` returns `database=ok` and `prisma=ok`.
4. PostGIS is enabled on the target database.
5. The `falak` schema exists.
6. `_prisma_migrations` is present and has no unfinished failures.
7. Impact-service JWT verification matches the core API:
   `JWT_SECRET_KEY` and, if used by the auth stack, `PUBLIC_JWT_SECRET_KEY`.
8. The production tenant and actor allowlists are intentional.

If readiness is still red, keep production in dark launch.

## Production Inputs To Set In Vercel

Project: `anu-impact-service`

Keep these values set before readiness is green:

```env
NODE_ENV=production
LOG_LEVEL=info
BETA_ALLOW_PLACEHOLDER_INFRA=false
DATABASE_URL=<production runtime postgres url>
DIRECT_URL=<production direct postgres url>
JWT_SECRET_KEY=<same verification secret used by the core API>
PUBLIC_JWT_SECRET_KEY=<same public verification secret used by the core API if applicable>
DISABLE_SCHEDULED_JOBS=true
MANARA_FEED_MODE=placeholder
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Production must not move to `admin_only` until readiness is clean.

## Safe Step Order

### 1. Fix Connectivity While Still Disabled

Set or verify the runtime env above, then redeploy production.

After redeploy, recheck:

```powershell
Invoke-RestMethod "https://anu-impact-service.vercel.app/v1/falak/readiness"
Invoke-RestMethod "https://anu-impact-service.vercel.app/v1/falak/health"
Invoke-WebRequest "https://anu-impact-service.vercel.app/v1/education/maps" -SkipHttpErrorCheck
```

Expected outcome before moving on:

- readiness `status=ok`
- `database=ok`
- `prisma=ok`
- `postgis=ok`
- `falak_schema=ok`
- `migrations=ok`
- maps route still returns `FALAK_MAPS_DISABLED` because the guard is still intentionally disabled

If readiness still reports `database:error` or `prisma:error`, stop and fix the
database/network/secret issue first. Do not change the guard mode yet.

### 2. Reconcile Existing Production DB State

If production is using the same long-lived Postgres target as the core API:

- confirm PostGIS can be enabled safely
- inspect whether `falak._prisma_migrations` or `public._prisma_migrations` exists
- inspect whether any migration rows are unfinished
- do not casually run `prisma migrate deploy` against an existing production DB
  until reconciliation review is complete

Use the existing migration reconciliation docs if migration history is unclear.

### 3. Promote To `admin_only`

Only after readiness is green, apply this overlay and redeploy:

```env
FALAK_ROUTE_GUARD_MODE=admin_only
FALAK_MAP_ROUTE_GUARD_MODE=admin_only
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

### 4. Verify Hosted Admin-Only Access

Verify with a real bearer token for an allowlisted actor and an explicit tenant
header:

```powershell
$headers = @{
  Authorization = "Bearer <real token>"
  "X-Tenant-Id" = "<real tenant uuid>"
}

Invoke-RestMethod "https://anu-impact-service.vercel.app/v1/education/maps" -Headers $headers
```

Expected outcome:

- allowlisted actor + allowlisted tenant -> success
- anonymous request -> denied
- wrong tenant -> denied
- non-allowlisted actor -> denied

## Frontend Follow-Up

If hosted `maanara.vercel.app` should access Falak-backed maps through the
frontend proxy, the frontend Vercel project also needs:

```env
NEXT_PUBLIC_FALAK_TENANT_ID=<real tenant uuid>
```

Without that, hosted requests can fail with `TENANT_HEADER_REQUIRED` even after
impact-service is healthy.

## Vercel V0 Prompt

Use this prompt if you want Vercel V0 or another hosting operator to perform the
hosting-side work:

```text
Update the production Vercel project for anu-impact-service so Falak can move from disabled to admin_only safely.

Constraints:
- Do not enable admin_only until readiness is fully green.
- Do not run prisma migrate deploy casually against an existing production database.
- Keep x-actor-id disabled.
- Keep verified bearer-auth required.

Current live symptoms:
- /v1/falak/readiness reports status=not_ready with database=error and prisma=error
- /v1/education/maps returns FALAK_MAPS_DISABLED
- This means production is still dark-launched and DB connectivity/readiness is not yet healthy

Tasks:
1. In the anu-impact-service production environment, verify and correct:
   - DATABASE_URL = production runtime Postgres URL
   - DIRECT_URL = production direct Postgres URL
   - JWT_SECRET_KEY = same verification secret used by the core API
   - PUBLIC_JWT_SECRET_KEY = same public verification secret used by the core API if applicable
   - BETA_ALLOW_PLACEHOLDER_INFRA = false
   - FALAK_ROUTE_GUARD_MODE = disabled
   - FALAK_MAP_ROUTE_GUARD_MODE = disabled
   - FALAK_TRUST_X_ACTOR_ID = false
   - FALAK_REQUIRE_VERIFIED_ACTOR = true
2. Redeploy production.
3. Recheck these endpoints:
   - https://anu-impact-service.vercel.app/v1/falak/readiness
   - https://anu-impact-service.vercel.app/v1/falak/health
   - https://anu-impact-service.vercel.app/v1/education/maps
4. Do not proceed unless readiness reports:
   - database=ok
   - prisma=ok
   - postgis=ok
   - falak_schema=ok
   - migrations=ok
5. Once readiness is green, change the Falak guard posture to:
   - FALAK_ROUTE_GUARD_MODE = admin_only
   - FALAK_MAP_ROUTE_GUARD_MODE = admin_only
   - FALAK_ALLOWED_TENANT_SLUGS = anu-beta
   - FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS = anu-admin,anu-governor
   - FALAK_TRUST_X_ACTOR_ID = false
   - FALAK_REQUIRE_VERIFIED_ACTOR = true
6. Redeploy production again.
7. Verify:
   - allowlisted bearer-auth actor + allowlisted tenant can access Falak maps
   - anonymous access is denied
   - non-allowlisted actor access is denied

If the frontend proxy is expected to work from maanara.vercel.app, also set:
- NEXT_PUBLIC_FALAK_TENANT_ID = <real tenant uuid>

Return:
- the exact env keys changed
- whether readiness turned green
- whether production is still disabled or has safely reached admin_only
- any blocker that still prevents admin_only
```

## Related Files

- [vercel.env.example](/C:/Dev/Flora_fauna/services/impact-service/vercel.env.example)
- [anu-falak-production-gating.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-gating.md)
- [anu-falak-production-operations.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-operations.md)
- [anu-falak-hosted-execution-runbook.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-hosted-execution-runbook.md)
- [prisma-migration-reconciliation-plan.md](/C:/Dev/Flora_fauna/services/impact-service/docs/prisma-migration-reconciliation-plan.md)
