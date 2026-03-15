# ANU Falak Vercel Input Checklist

Date: 2026-03-15

Use this checklist before asking the hosted staging verification flow to run.
These are the exact inputs that must exist in git-tracked templates and then be
filled with real values in Vercel and local operator env.

## 1. Vercel Runtime Inputs

Set these in the dedicated staging Vercel project or isolated Preview env:

- use [vercel.staging.env.example](/C:/Dev/Flora_fauna/services/impact-service/vercel.staging.env.example)
- set the root directory to `services/impact-service`
- keep `FALAK_ROUTE_GUARD_MODE=tenant_allowlist`
- keep `FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist`
- keep `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
- keep `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS` limited to intended internal actors
- keep `FALAK_TRUST_X_ACTOR_ID=false`
- keep `FALAK_REQUIRE_VERIFIED_ACTOR=true`
- keep `DISABLE_SCHEDULED_JOBS=true`
- keep `FALAK_STAGING_ALLOW_MUTATIONS=false` in the hosted runtime env

Real values still required from the operator:

- the actual preview or staging `STAGING_BASE_URL`
- the fresh staging `DATABASE_URL`
- the fresh staging `DIRECT_URL`
- the staging-only `JWT_SECRET_KEY`
- the exact `FALAK_STAGING_DATABASE_EXPECTED_NAME`
- the intended `FALAK_STAGING_HOST_FRAGMENT`

## 2. Local Operator Verification Inputs

Set these in local `.env.falak-staging` or CI secrets before running the hosted
verification scripts:

- copy from [.env.falak-staging.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-staging.example)
- replace every placeholder with a real value
- set `STAGING_BASE_URL` to the real deployed Vercel preview or staging URL
- use the same fresh staging `DATABASE_URL` and `DIRECT_URL`
- use the same staging-only `JWT_SECRET_KEY`
- set `FALAK_STAGING_DATABASE_EXPECTED_NAME` to the exact DB name
- keep the guard posture values aligned with Vercel runtime env
- set `FALAK_STAGING_ALLOW_MUTATIONS=true` only while running
  `falak:migrate:staging` and `falak:seed:staging`

## 3. Fresh DB Confirmation

Do not proceed unless all of these are explicitly true:

- the DB is a fresh staging Postgres/PostGIS database
- the DB host and DB name do not look production-like
- the DB name matches `FALAK_STAGING_DATABASE_EXPECTED_NAME`
- `PRODUCTION_BASE_URL` is different from `STAGING_BASE_URL`
- the deployed URL contains `FALAK_STAGING_HOST_FRAGMENT`

## 4. Verification Hand-off

Once the real inputs above exist, the hosted staging run should execute:

1. `npm ci`
2. `npm run build`
3. `npx jest tests/falak/falakService.test.ts --runInBand`
4. `npm run falak:target:staging`
5. `npm run falak:prisma:generate:staging`
6. `npm run falak:migrate:staging`
7. `npm run falak:seed:staging`
8. `npm run falak:readiness:staging`
9. `npm run falak:smoke:staging`
