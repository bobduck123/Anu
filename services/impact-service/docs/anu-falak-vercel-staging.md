# ANU Falak Vercel Staging

Date: 2026-03-15

## Decision Note

Safest Vercel pattern:

- keep the current live alpha production project untouched
- use a dedicated Vercel staging project for Falak verification if possible
- if a separate project is not available, use a clearly isolated preview branch with Preview env vars only

Why this is safest:

- production env vars stay separate
- production DB credentials stay separate
- the current live alpha path remains untouched
- Falak verification can use a fresh staging DB with clean replay

Fresh staging DB replay is preferred because historical Prisma migrations were rewritten earlier and fresh replay is now the trusted path.

## Repo Routing Shape

The repo is now prepared so Vercel can route:

- `/api/*`, `/health`, `/`, and existing live alpha paths to [api/index.ts](/C:/Dev/Flora_fauna/services/impact-service/api/index.ts)
- `/v1/falak/*`, `/v1/education/maps/*`, `/docs`, and `/openapi.json` to [api/falak.ts](/C:/Dev/Flora_fauna/services/impact-service/api/falak.ts)

This keeps Falak on an isolated route family while preserving the current alpha app path.

Routing safety model:

- generic `/v1/*` is not handed to the Falak Vercel function
- only Falak-specific paths are
- this avoids future collisions if the existing app later grows unrelated `/v1/*` routes
- hosted Vercel smoke should verify `/health` for the non-Falak app and `/v1/falak/*` for Falak

## Recommended Vercel Project Mode

Preferred:

- separate Vercel project for staging
- root directory set to `services/impact-service`
- branch used only for Falak staging verification

Fallback:

- preview deployment branch in the existing repo integration
- Preview env vars only
- never reuse the production env set

## Branch Strategy

Recommended staging verification branch:

- `falak/vercel-staging`

Why:

- easy to recognize in Vercel
- easy to protect from accidental production merges
- stable branch-specific preview flow

## Vercel Environment Strategy

### Preview / Staging

Use [vercel.staging.env.example](/C:/Dev/Flora_fauna/services/impact-service/vercel.staging.env.example).
Use [anu-falak-vercel-input-checklist.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-vercel-input-checklist.md)
to collect the real hosted inputs before verification.

Key rules:

- use a fresh hosted staging Postgres/PostGIS DB
- keep `FALAK_TRUST_X_ACTOR_ID=false`
- keep `FALAK_REQUIRE_VERIFIED_ACTOR=true`
- use `tenant_allowlist` or `disabled`
- never point at the production DB

### Production

Use [vercel.env.example](/C:/Dev/Flora_fauna/services/impact-service/vercel.env.example) together with [.env.falak-production-dark-launch.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-production-dark-launch.example).

Key rules:

- keep Falak disabled
- do not change current non-Falak behavior
- do not run migrations against an existing production DB unless separately approved

Do not copy staging DB values into production.

## Vercel Build And Runtime Expectations

Root directory:

- `services/impact-service`

Install command:

```text
npm ci
```

Build behavior:

- Vercel uses [vercel.json](/C:/Dev/Flora_fauna/services/impact-service/vercel.json)
- `@vercel/node` serves [api/index.ts](/C:/Dev/Flora_fauna/services/impact-service/api/index.ts) and [api/falak.ts](/C:/Dev/Flora_fauna/services/impact-service/api/falak.ts)
- the service install/build path must run `prisma generate` so cached Vercel
  dependencies do not leave Prisma Client stale
- do not embed `prisma migrate deploy` into the Vercel build

Safe migration strategy:

- run `prisma migrate deploy` as an operator or CI step using the staging scripts after the preview or staging deployment exists
- keep production DB migration behavior separate from Vercel auto-deploy

## Exact Vercel Env Vars To Set

Preview or staging project settings:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `BETA_ALLOW_PLACEHOLDER_INFRA=false`
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/anu_falak_staging?schema=public`
- `DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/anu_falak_staging?schema=public`
- `JWT_SECRET_KEY=staging-only-secret`
- `CORS_ORIGINS=https://falak-staging.example.vercel.app`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app`
- `STAGING_BASE_URL=https://falak-staging.example.vercel.app`
- `PRODUCTION_BASE_URL=https://maanara.vercel.app` for proxy checks against the public frontend host
- `STAGING_FRONTEND_BASE_URL=https://frontend-staging.example.vercel.app` if a staging frontend deploy exists
- `STAGING_PROXY_MAP_ROUTE_MODE=falak`
- `STAGING_MANARA_FEED_MODE=placeholder`
- `STAGING_FALAK_TENANT_ID=<tenant-uuid-if-needed>`
- `FALAK_STAGING_HOST_FRAGMENT=vercel.app`
- `FALAK_STAGING_ENVIRONMENT_NAME=falak-vercel-staging`
- `FALAK_STAGING_ALLOW_MUTATIONS=false`
- `FALAK_STAGING_DATABASE_EXPECTED_NAME=anu_falak_staging`
- `FALAK_ROUTE_GUARD_MODE=tenant_allowlist`
- `FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist`
- `FALAK_ALLOWED_TENANT_SLUGS=anu-beta`
- `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor`
- `FALAK_TRUST_X_ACTOR_ID=false`
- `FALAK_REQUIRE_VERIFIED_ACTOR=true`
- `REQUIRE_STRIPE_INFRA=false`
- `DISABLE_SCHEDULED_JOBS=true`
- `PRODUCTION_PROXY_MAP_ROUTE_MODE=legacy` until the frontend proxy is routing Falak live
- `PRODUCTION_MANARA_FEED_MODE=placeholder` until `/manara` is data-backed

Important:

- keep `FALAK_STAGING_ALLOW_MUTATIONS=false` in Vercel runtime env
- use a separate local or CI `.env.falak-staging` for operator verification
- in that operator env, set `FALAK_STAGING_ALLOW_MUTATIONS=true` only while
  running `falak:migrate:staging` and `falak:seed:staging`
- do not treat placeholders in either template as valid hosted inputs
- do not continue until the fresh staging DB has been explicitly confirmed

Production project settings:

- keep the existing production values
- keep `FALAK_ROUTE_GUARD_MODE=disabled`
- keep `FALAK_MAP_ROUTE_GUARD_MODE=disabled`
- keep `FALAK_TRUST_X_ACTOR_ID=false`
- keep `FALAK_REQUIRE_VERIFIED_ACTOR=true`

## Git Push Execution Checklist

### Before Push

- confirm branch is `falak/vercel-staging`
- confirm the fresh staging DB exists
- confirm Vercel staging env vars are populated
- confirm no production DB URL is present in the staging project
- confirm Falak is disabled or tightly gated in staging

### Push / Deploy

From the repo root:

```powershell
git checkout -b falak/vercel-staging
git add services/impact-service/vercel.json `
        services/impact-service/api/falak.ts `
        services/impact-service/src/falak/vercelHandler.ts `
        services/impact-service/vercel.staging.env.example `
        services/impact-service/vercel.env.example `
        services/impact-service/docs/anu-falak-vercel-staging.md `
        services/impact-service/scripts/falak-staging/print-target.mjs `
        services/impact-service/package.json
git commit -m "Prepare Falak Vercel staging auto-deploy"
git push origin falak/vercel-staging
```

Then:

- wait for Vercel preview or staging deploy to complete
- capture the deployed URL

### After Deploy

From [services/impact-service](/C:/Dev/Flora_fauna/services/impact-service):

```powershell
npm run falak:target:staging
npm run falak:readiness:staging
npm run falak:smoke:staging
npm run falak:contract:staging
```

Manual checks:

- `GET /health`
- `GET /v1/falak/health`
- `GET /v1/falak/readiness`
- `GET /v1/education/maps`
- public frontend proxy checks via `PRODUCTION_BASE_URL`

### Go / No-Go

Go only if:

- Vercel deploy succeeds
- app boots
- DB connects
- PostGIS is available
- `prisma migrate deploy` succeeds on the fresh staging DB
- readiness passes
- smoke passes
- no unexpected public Falak access appears

No-go if:

- the staging project points at production DB values
- readiness fails
- smoke fails
- Falak is broader than intended
- non-Falak routes regress

## Manual Vercel Actions Still Required

These steps are still manual:

1. create the dedicated staging Vercel project, or confirm the preview project is isolated from production envs
2. set the root directory to `services/impact-service`
3. enter the staging env vars in Vercel
4. create or attach the fresh staging Postgres/PostGIS DB
5. capture the deployed URL and place it in `STAGING_BASE_URL` for local verification scripts if needed

## Production Dark Launch Prep

Production remains unchanged by default.

When production dark launch is later chosen:

- keep Falak disabled
- do not switch production traffic to Falak
- do not run production DB migrations casually
- use [.env.falak-production-dark-launch.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-production-dark-launch.example)
