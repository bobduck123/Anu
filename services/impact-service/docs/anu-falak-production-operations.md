# ANU Falak Production Operations

Date: 2026-03-15

## Operating Principle

Falak should move through these stages:

1. local verification
2. fresh hosted staging verification
3. production dark launch
4. internal-only activation
5. broader rollout only after explicit approval

Do not replace the current live alpha in place.

## Staging Rollout Procedure

Use a brand new hosted staging app and a brand new hosted Postgres/PostGIS database.

Required staging posture:

```env
FALAK_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Operator sequence:

1. provision fresh staging infra
2. set staging-only secrets
3. run `npm run build`
4. run `npm run falak:prisma:generate:staging`
5. run `npm run falak:migrate:staging`
6. run `npm run falak:seed:staging`
7. run `npm run falak:readiness:staging`
8. run `npm run falak:smoke:staging`
9. run `npx jest tests/falak/falakService.test.ts --runInBand`

## Production Dark Launch Procedure

Deploy Falak code with zero user-visible Falak behavior.

Required production posture:

```env
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Dark launch checklist:

1. confirm Falak code is included in the image
2. confirm Falak routes are disabled
3. confirm no hosted staging secrets are reused in production
4. deploy the image
5. verify:
   - `GET /v1/falak/health`
   - `GET /v1/falak/readiness`
   - guarded Falak routes return `404` with `FALAK_DISABLED`
   - Falak-backed maps return `404` with `FALAK_MAPS_DISABLED`

If production is reusing the existing core API Postgres instead of provisioning a fresh Falak-only database:

1. point runtime `DATABASE_URL` at the same production Postgres target already used by the core API
2. set `DIRECT_URL` to the direct Postgres host for Prisma/manual inspection work
3. keep `BETA_ALLOW_PLACEHOLDER_INFRA=false`
4. confirm PostGIS can be enabled safely on that target
5. inspect `_prisma_migrations` before running any hosted `migrate deploy`
6. do not move beyond dark launch until `GET /v1/falak/readiness` clears `database:error` and `prisma:error`

## Internal-Only Activation Procedure

Only after hosted staging passes:

```env
FALAK_ROUTE_GUARD_MODE=admin_only
FALAK_MAP_ROUTE_GUARD_MODE=admin_only
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Activation steps:

1. confirm the allowlisted tenant slug is correct
2. confirm the allowlisted actor external auth ids are correct
3. redeploy the service
4. verify access only with internal bearer-auth actors
5. confirm non-allowlisted or anonymous requests are denied

## Monitoring Guidance

Watch structured Falak log categories:

- `falak.route_guard`
- `falak.actor_resolution`
- `falak.policy_decision`
- `falak.approval_created`
- `falak.approval_vote`
- `falak.ledger_write`
- `falak.allocation_execute`
- `falak.rejected_operation`
- `falak.event_write`

Key signals:

- repeated `VERIFIED_ACTOR_REQUIRED`
- repeated `TENANT_NOT_ALLOWED`
- repeated `ACTOR_NOT_ALLOWED`
- failed readiness checks
- unexpected allocation execution attempts
- unexpected ledger write volume
- unexpected public access to `/v1/education/maps/*`

## Troubleshooting

If Falak routes are unexpectedly unavailable:

1. inspect `FALAK_ROUTE_GUARD_MODE`
2. inspect `FALAK_MAP_ROUTE_GUARD_MODE`
3. inspect tenant and actor allowlists
4. inspect `FALAK_REQUIRE_VERIFIED_ACTOR`
5. inspect bearer-auth identity mapping to Falak actors
6. inspect `GET /v1/falak/readiness`

If privileged requests fail unexpectedly:

1. verify bearer token validity
2. verify the actor exists in the tenant
3. verify `external_auth_id` mapping
4. confirm `FALAK_TRUST_X_ACTOR_ID=false` is not being treated as a bug in hosted environments

If allocation execution looks inconsistent:

1. inspect `falak.allocation_execute` logs
2. inspect `falak.ledger_write` logs
3. inspect `falak.events`
4. inspect `falak.ledger_entries`
5. confirm proposal `executed_at` is set only once

## Rollback

Use the rollback procedure in [anu-falak-production-rollback.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-rollback.md).

Route rollback is the first response.
Database restoration is not the normal rollback path.

## Deployment Checklist

1. build passes
2. unit and route tests pass
3. staging readiness passes
4. staging smoke passes
5. migration history concerns are understood for the target DB
6. production env posture matches the intended rollout stage
7. rollback instructions are ready before enablement

## Related Docs

- [anu-falak-production-gating.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-gating.md)
- [anu-impact-service-admin-only-handoff.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-impact-service-admin-only-handoff.md)
- [anu-falak-production-rollback.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-rollback.md)
- [anu-falak-staging-rollout.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-staging-rollout.md)
- [anu-falak-hosted-execution-runbook.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-hosted-execution-runbook.md)
- [anu-falak-db-replacement-strategy.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-db-replacement-strategy.md)
