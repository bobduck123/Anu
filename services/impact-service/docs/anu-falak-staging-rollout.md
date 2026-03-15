# ANU Falak Staging Rollout

Date: 2026-03-15

## Decision Memo

### Decision

Do not update the current live online alpha to the Falak model yet.

### Current State Of Proof

What is already proven locally:

- isolated local Postgres 16 + PostGIS verification passes
- `prisma generate` passes
- `prisma migrate deploy` passes on a fresh Falak database
- Falak seed passes
- Falak protocol integration tests pass against a live local DB
- the first ANU product slice, `Cultural Event -> Contribution -> Allocation`, passes locally end to end

What is not yet proven in hosting:

- fresh hosted staging app boot with hosted secrets
- fresh hosted staging Postgres/PostGIS provisioning
- hosted `prisma migrate deploy` against a non-local fresh database
- hosted Falak seed against a fresh non-local database
- hosted Falak smoke verification over the deployed URL
- staged restart/redeploy behavior
- operator observability and rollback discipline in hosting
- safe live gating for privileged Falak routes

### Why Rollout Caution Is Higher Than Normal

Historical Prisma migration SQL was rewritten to make fresh replay correct.

That is the right fix for fresh databases, but it means any existing non-local database may already have old migration checksums in `_prisma_migrations`.

That creates two separate concerns:

- fresh replay is now the source of truth for new environments
- existing non-local databases require explicit reconciliation review before any deploy touching their migration history

### Conditions Before Any Live Promotion

Do not promote Falak beyond hosted staging until all of the following are true:

- a brand new hosted staging app is deployed
- a brand new hosted staging Postgres/PostGIS database is provisioned
- hosted staging passes all Stage A through Stage D gates in this document
- no current production database is referenced anywhere in staging env or workflow config
- a production introduction gate exists for Falak routes and is disabled by default
- only explicitly allowlisted internal tenants and actors can access Falak in production
- privileged Falak access is verified from bearer identity in hosted environments rather than relying on unrestricted `x-actor-id` header spoofing

## Hosted Staging Rollout Package

### Target Topology

Use a completely fresh staging environment:

- new hosted staging app deployment
- new hosted staging Postgres/PostGIS database
- isolated staging secrets
- isolated staging URL
- no connection to the current production DB
- no reuse of any existing staging DB with historical checksum drift

### Files In This Package

- [.env.falak-staging.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-staging.example)
- [scripts/falak-staging/common.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/common.mjs)
- [scripts/falak-staging/prisma-generate.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/prisma-generate.mjs)
- [scripts/falak-staging/migrate-deploy.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/migrate-deploy.mjs)
- [scripts/falak-staging/seed.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/seed.mjs)
- [scripts/falak-staging/readiness.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/readiness.mjs)
- [scripts/falak-staging/smoke.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/smoke.mjs)
- [scripts/falak-staging/verify.mjs](/C:/Dev/Flora_fauna/services/impact-service/scripts/falak-staging/verify.mjs)
- [.github/workflows/anu-falak-staging-verify.yml](/C:/Dev/Flora_fauna/.github/workflows/anu-falak-staging-verify.yml)

### Exact Staging Commands

From [services/impact-service](/C:/Dev/Flora_fauna/services/impact-service):

```powershell
Copy-Item .env.falak-staging.example .env.falak-staging
```

Edit `.env.falak-staging` with:

- the fresh staging app URL
- the fresh staging Postgres/PostGIS URL
- a staging-only JWT secret
- `FALAK_ROUTE_GUARD_MODE=tenant_allowlist`
- `FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist`
- `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
- `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor`
- `FALAK_TRUST_X_ACTOR_ID=false`
- `FALAK_REQUIRE_VERIFIED_ACTOR=true`
- `FALAK_STAGING_DATABASE_EXPECTED_NAME` set to the exact fresh staging DB name
- `FALAK_STAGING_ALLOW_MUTATIONS=true` only while running rollout commands

Then run:

```powershell
npm ci
npm run build
npm run falak:prisma:generate:staging
npm run falak:migrate:staging
npm run falak:seed:staging
npm run falak:readiness:staging
npm run falak:smoke:staging
npx jest tests/falak/falakService.test.ts --runInBand
```

For the one-shot hosted verification flow:

```powershell
npm run falak:verify:staging
```

### Fresh Hosted Staging Pipeline Order

For CI or operator automation, the safe order is:

1. deploy the new staging app with staging-only env vars
2. run `npm run build`
3. run `npm run falak:prisma:generate:staging`
4. run `npm run falak:migrate:staging`
5. run `npm run falak:seed:staging`
6. run `npm run falak:verify:staging`
7. run `npx jest tests/falak/falakService.test.ts --runInBand`

`prisma migrate deploy` is the correct deploy-time command here.

Do not use `prisma migrate dev` in hosted staging.
Do not use `prisma migrate resolve` as part of normal rollout.

### Health And Readiness Validation

The hosted staging readiness script verifies:

- DB connection
- PostGIS availability via `postgis_full_version()`
- Prisma metadata table exists in `falak._prisma_migrations`
- `/v1/falak/health` reports healthy Falak runtime checks
- `/v1/falak/readiness` reports ready migration and schema state
- seeded Falak tenant exists
- `/health` returns `ok`

Run it directly:

```powershell
npm run falak:readiness:staging
```

### Seed Strategy

Use the dedicated hosted staging seed path:

```powershell
npm run falak:seed:staging
```

This is intentionally separate from the local-only seed entrypoint.

The staging seed is allowed only when all of the following are true:

- `FALAK_STAGING_ALLOW_MUTATIONS=true`
- `FALAK_STAGING_ENVIRONMENT_NAME` contains `staging`
- `DATABASE_URL` points to the exact DB named by `FALAK_STAGING_DATABASE_EXPECTED_NAME`

The staging seed creates:

- the Falak ANU tenant and actors
- venue, community, campaign, pool, and event nodes
- baseline Falak policies
- seeded contributions
- a pending governed allocation proposal for demo and smoke verification

### Hosted Smoke Tests

Run:

```powershell
npm run falak:smoke:staging
```

This script verifies both the base Falak protocol and the first ANU slice over the hosted URL.
Privileged requests in the smoke flow use bearer tokens derived from staging-only secrets, not `x-actor-id`.
The smoke flow also verifies ledger updates through the HTTP surface after allocation execution.

## Go / No-Go Gates

### Stage A: Infra Gates

- [ ] app boots in hosted staging
- [ ] DB connects from the app and verification scripts
- [ ] PostGIS is available
- [ ] `prisma migrate deploy` succeeds on the fresh staging DB
- [ ] `/health` returns `ok`
- [ ] `/v1/falak/health` returns healthy Falak checks
- [ ] `/v1/falak/readiness` returns ready Falak checks

### Stage B: Falak Protocol Gates

- [ ] create node works
- [ ] create edge works
- [ ] restricted visibility filtering works on public routes
- [ ] `requires_approval` auto-creates approval
- [ ] approval voting resolves
- [ ] immutable ledger and append-only event protections still reject tampering
- [ ] nearby spatial query works against hosted PostGIS
- [ ] Falak-backed education maps follow the declared maps guard mode
- [ ] map resolve and guarded admin map mutation both behave as expected

### Stage C: First ANU Slice Gates

- [ ] create event works through `/v1/falak/events`
- [ ] record contribution works through `/v1/falak/contributions`
- [ ] propose allocation works through `/v1/falak/allocations/propose`
- [ ] approval-backed allocation executes exactly once
- [ ] pool balance stays coherent
- [ ] event impact query returns coherent event, graph, totals, and event stream
- [ ] ledger updates are visible through HTTP verification

### Stage D: Operational Gates

- [ ] redeploy succeeds without manual DB repair
- [ ] app restart succeeds without manual DB repair
- [ ] staging logs clearly show request path, status, and trace identifiers
- [ ] no production secrets, hosts, or databases appear in staging env or logs
- [ ] rollback steps are documented
- [ ] rollback steps are tested against staging

No-go means:

- keep Falak out of the live alpha
- keep the fresh staging deployment isolated
- fix the failing gate
- rerun the staging package from the failed step forward

## Concise Operator Release Checklist

1. Provision a brand new staging Postgres/PostGIS database.
2. Provision a brand new staging app deployment.
3. Set staging-only env vars from [.env.falak-staging.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-staging.example).
4. Confirm `STAGING_BASE_URL` is not the live alpha URL.
5. Confirm `DATABASE_URL` points to the fresh staging DB only.
6. Set `FALAK_STAGING_ALLOW_MUTATIONS=true`.
7. Run `npm run falak:prisma:generate:staging`.
8. Run `npm run build`.
9. Run `npm run falak:migrate:staging`.
10. Run `npm run falak:seed:staging`.
11. Run `npm run falak:verify:staging`.
12. Run `npx jest tests/falak/falakService.test.ts --runInBand`.
13. Review Stage A through Stage D gates.
14. Set `FALAK_STAGING_ALLOW_MUTATIONS=false` after rollout commands complete.

## Safety Notes

- Do not point staging commands at the current production DB.
- Do not reuse an existing staging DB that may already contain old Prisma checksums.
- Do not run `prisma migrate resolve` as part of normal rollout.
- Do not expose Falak publicly in production before route gating exists.
- Do not treat the current `x-actor-id` header path as production-grade privileged auth for internet-facing rollout.

## Production Introduction Strategy

### Recommended Pattern

Use a separate Falak-backed path alongside the current alpha path, with Falak routes disabled by default and later enabled only for specific internal tenants and actors.

This is safer than an in-place swap because:

- the current live alpha remains untouched
- the current production DB remains untouched
- Falak already lives under a naturally isolated route family, `/v1/falak/*`
- blast radius stays constrained to a path that can be denied at the edge or app middleware

### Route Isolation Plan

Keep the current live alpha routes as the default public path.

Falak production introduction should use:

- the existing isolated route family, `/v1/falak/*`
- the Falak-backed maps route family, `/v1/education/maps/*`
- an app-level or edge-level deny-by-default gate in front of all `/v1/falak/*` routes
- an explicit maps gate in front of `/v1/education/maps/*`
- internal-only access initially for ANU internal operators

Recommended gate behavior:

- `disabled`: all `/v1/falak/*` routes return `404`
- `admin_only`: only allowlisted actors in allowlisted tenants can reach `/v1/falak/*`
- `tenant_allowlist`: only allowlisted Falak tenants can reach `/v1/falak/*`
- `enabled`: wider access only after explicit approval

### Feature Flag Plan

Implement these next, before any production introduction:

- `FALAK_ROUTE_GUARD_MODE=disabled|admin_only|tenant_allowlist|enabled`
- `FALAK_MAP_ROUTE_GUARD_MODE=inherit|disabled|admin_only|tenant_allowlist|enabled`
- `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
- `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor`
- `FALAK_TRUST_X_ACTOR_ID=false` for internet-facing production exposure
- `FALAK_REQUIRE_VERIFIED_ACTOR=true`

Disabled must be the default.
If maps should track the same rollout stage as core Falak, set the maps mode explicitly to the same value in staging and production overlays.

### Rollout Order

1. keep the current live alpha unchanged
2. prove fresh hosted staging
3. implement Falak production route gating
4. deploy Falak code to production with the gate still disabled
5. enable for internal ANU tenant and internal admin/governor actors only
6. observe logs, events, approvals, and ledger behavior
7. decide whether to expand exposure

### Operator Enable / Disable Steps

Enable:

1. set `FALAK_ROUTE_GUARD_MODE=admin_only`
2. set `FALAK_MAP_ROUTE_GUARD_MODE=admin_only`
3. set `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
4. set `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS` to internal operator identities only
5. redeploy production app
6. verify gated access with internal actors only

Disable:

1. set `FALAK_ROUTE_GUARD_MODE=disabled`
2. set `FALAK_MAP_ROUTE_GUARD_MODE=disabled`
3. redeploy production app
4. confirm `/v1/falak/*` returns `404`
5. confirm `/v1/education/maps/*` returns `404`

### Blast Radius Analysis

With the recommended pattern:

- current live alpha user paths remain unchanged
- current production DB remains untouched
- Falak traffic is limited to isolated routes
- operator rollback is environment-variable-driven and immediate on redeploy
- failures in Falak do not require replacing the current alpha model

Without the gate:

- privileged Falak behavior would be exposed too broadly
- current header-based actor selection would be unsafe for live internet exposure
- operational rollback would be less controlled

## Next Build Order

Recommended order:

1. hosted staging rollout
2. staged production introduction mechanism
3. Community Stewardship slice
4. subsequent slices after stewardship governance is proven

### Why Community Stewardship Should Be Next

Community Stewardship is the right next slice because it exercises the governance substrate more directly than another financial or content slice.

It will force the next important protocol-hardening work:

- role delegation
- custodian visibility
- region and community scoped authority
- governance over sensitive objects

That is the right next step after proving event contribution allocation, because the next risk in ANU is not raw CRUD breadth. It is governed authority over who may see, delegate, approve, and steward culturally sensitive objects.

## Assumptions

- hosted staging uses a fresh dedicated Postgres database with PostGIS enabled
- the first hosted rollout may use Vercel or an equivalent hosted Node deployment
- provider-specific app deployment automation is not yet checked into this repo
- hosted staging verification uses bearer-auth actor resolution, not the local-only `x-actor-id` override path
- any existing non-local database with prior Prisma history is out of scope for the first hosted rollout

For the operator-facing execution sequence, use [anu-falak-hosted-execution-runbook.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-hosted-execution-runbook.md).
For DB replacement or rebuild decisions, use [anu-falak-db-replacement-strategy.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-db-replacement-strategy.md).
For Vercel branch, env, auto-deploy specifics, and the narrow Falak-only route map, use [anu-falak-vercel-staging.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-vercel-staging.md).
