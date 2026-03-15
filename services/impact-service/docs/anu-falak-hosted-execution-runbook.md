# ANU Falak Hosted Execution Runbook

Date: 2026-03-15

## Rollout Decision Memo

The next safe sequence is:

1. fresh hosted staging verification
2. production dark launch with Falak disabled
3. tiny internal or admin-only enablement
4. broader production exposure only after explicit approval

Required safety posture:

- do not switch the live alpha to Falak yet
- do not broadly enable Falak in production yet
- do not degrade existing live alpha behavior
- prefer fresh DB replay on a brand new hosted staging database
- treat any production database replacement or reformat as a separate controlled cutover project

## When Database Replacement Is Acceptable

Fresh staging DB:

- acceptable now
- preferred default
- use `prisma migrate deploy` on the fresh staging DB

Fresh replacement production DB:

- acceptable only after hosted staging passes and a formal cutover plan is approved
- requires export or backup, validation, rollback, and operator approval

Existing production DB with prior Prisma migration history:

- not acceptable for casual `prisma migrate deploy`
- requires explicit reconciliation review before any migration action
- `prisma migrate resolve` may be relevant only after manual review and only for a deliberate reconciliation step

In-place production DB rewrite or reformat:

- not the default next step
- acceptable only as an explicit approved cutover or incident response project
- requires backup or export, downtime or cutover plan, rollback plan, validation plan, and approval gates

## Hosted Staging Execution Checklist

### Preflight

- confirm the target app is a new hosted staging deployment
- confirm the target DB is a new hosted Postgres/PostGIS database
- confirm staging uses staging-only secrets
- confirm no env value points at the current production DB
- confirm the commit has already passed local `build`, Falak route tests, and `falak:verify:local`

### Staging Env Template

Use [.env.falak-staging.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-staging.example).

Required staging Falak posture:

```env
FALAK_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

### Exact Command Order

From [services/impact-service](/C:/Dev/Flora_fauna/services/impact-service):

```powershell
npm ci
npm run build
npx jest tests/falak/falakService.test.ts --runInBand
```

Operator action outside this repo:

- create the fresh hosted staging app deployment in the hosting provider
- create the fresh hosted staging Postgres/PostGIS database in the database provider
- apply the env values from [.env.falak-staging.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-staging.example)

Then run:

```powershell
npm run falak:prisma:generate:staging
npm run falak:migrate:staging
npm run falak:seed:staging
npm run falak:readiness:staging
npm run falak:smoke:staging
npm run falak:contract:staging
```

Optional one-shot verification:

```powershell
npm run falak:verify:staging
```

### Exact Verification Order

1. `npm run build`
2. `npx jest tests/falak/falakService.test.ts --runInBand`
3. hosted staging deploy by provider action
4. `npm run falak:prisma:generate:staging`
5. `npm run falak:migrate:staging`
6. `npm run falak:seed:staging`
7. `npm run falak:readiness:staging`
8. `npm run falak:smoke:staging`
9. `npm run falak:contract:staging`

### Hosted Staging Go / No-Go Criteria

Go only if all are true:

- the hosted app boots
- the staging DB is reachable
- PostGIS is available
- `prisma migrate deploy` succeeds on the fresh DB
- readiness passes
- smoke passes
- route contract checks pass
- maps guard behavior matches the staging posture
- event creation, contribution recording, allocation proposal, approval voting, allocation execution, ledger writes, and impact queries pass over HTTP
- map resolve, map detail fetch, and guarded map admin mutation pass over HTTP
- staging logs are usable and do not reference production resources

No-go if any are true:

- staging points at the production DB
- staging uses production secrets
- migration replay fails
- readiness fails
- smoke fails
- approval-backed allocation does not execute exactly once
- ledger or event immutability checks fail

## Production Dark Launch Execution

### Purpose

Deploy Falak code to production with zero user-visible Falak behavior.

### Production Env Overlay

Use [.env.falak-production-dark-launch.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-production-dark-launch.example).

Required Falak production posture:

```env
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

### Exact Dark Launch Steps

From [services/impact-service](/C:/Dev/Flora_fauna/services/impact-service):

```powershell
npm ci
npm run build
npx jest tests/falak/falakService.test.ts --runInBand
```

Operator action outside this repo:

- apply the production Falak env overlay with routes disabled
- deploy the current commit or image through the existing production deployment path
- do not run `prisma migrate deploy` against an existing production DB unless a separate DB reconciliation or replacement plan has been approved

### Post-Deploy Verification

Use the real production base URL:

```powershell
Invoke-RestMethod "$env:PRODUCTION_BASE_URL/v1/falak/health"
Invoke-RestMethod "$env:PRODUCTION_BASE_URL/v1/falak/readiness"
```

Guarded Falak routes should short-circuit:

```powershell
$headers = @{ "X-Tenant-Id" = "00000000-0000-4000-8000-000000000000" }
Invoke-WebRequest "$env:PRODUCTION_BASE_URL/v1/falak/pools/00000000-0000-4000-8000-000000000000/balance" -Headers $headers -SkipHttpErrorCheck
```

Expected result:

- HTTP `404`
- error code `FALAK_DISABLED`

Falak-backed maps should also short-circuit:

```powershell
Invoke-WebRequest "$env:PRODUCTION_BASE_URL/v1/education/maps" -Headers $headers -SkipHttpErrorCheck
```

Expected result:

- HTTP `404`
- error code `FALAK_MAPS_DISABLED`

Also verify:

- non-Falak live alpha paths still behave normally
- logs show `falak.route_guard` with `FALAK_DISABLED`
- logs show `falak.route_guard` with `FALAK_MAPS_DISABLED` for the maps surface
- no unexpected Falak mutation logs appear
- current scheduler posture has not been changed as part of dark launch

### Dark Launch Rollback

If verification fails:

1. keep `FALAK_ROUTE_GUARD_MODE=disabled`
2. keep `FALAK_MAP_ROUTE_GUARD_MODE=disabled`
3. redeploy the previous known-good image if the current image is faulty
4. verify non-Falak live alpha behavior
5. do not restore or rewrite the database as a first response

Use [anu-falak-production-rollback.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-rollback.md) for the full rollback flow.

## Internal / Admin-Only Enablement

### Smallest Safe Cohort

- `FALAK_ROUTE_GUARD_MODE=admin_only`
- `FALAK_MAP_ROUTE_GUARD_MODE=admin_only`
- `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
- `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor`
- bearer-auth actors only

Use [.env.falak-production-admin-only.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-production-admin-only.example).

### Enable Steps

1. confirm dark launch has been stable
2. confirm the allowlisted tenant slug
3. confirm the allowlisted actor external auth ids
4. apply the admin-only env overlay
5. redeploy production
6. verify only the internal cohort can access privileged Falak routes

### Disable Steps

1. set `FALAK_ROUTE_GUARD_MODE=disabled`
2. set `FALAK_MAP_ROUTE_GUARD_MODE=disabled`
3. clear `FALAK_ALLOWED_TENANT_SLUGS`
4. clear `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS`
5. redeploy production

### Monitor Closely

- `falak.route_guard`
- `falak.actor_resolution`
- `falak.policy_decision`
- `falak.approval_created`
- `falak.approval_vote`
- `falak.ledger_write`
- `falak.allocation_execute`
- `falak.rejected_operation`

Failure signals:

- repeated `ACTOR_NOT_ALLOWED` for intended internal actors
- repeated `VERIFIED_ACTOR_REQUIRED`
- unexpected public access to Falak routes
- unexpected ledger writes
- unexpected allocation execution attempts
- readiness regressions

## Operator Signoff

Preflight signoff:

- target environment confirmed
- target DB confirmed
- rollback owner assigned
- provider deploy owner assigned
- Vercel staging or preview configuration reviewed via [anu-falak-vercel-staging.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-vercel-staging.md)

Staging signoff:

- staging go criteria all passed
- provider logs reviewed
- no production resources referenced

Production dark launch signoff:

- Falak health and readiness reachable
- guarded Falak routes return `FALAK_DISABLED`
- current live alpha behavior unchanged

Admin-only signoff:

- only allowlisted tenant and actors can access Falak
- all other access remains denied
- no abnormal ledger, approval, or allocation behavior observed
