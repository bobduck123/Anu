# ANU Falak Production Gating

Date: 2026-03-15

## Purpose

Falak is now guarded so it can be deployed to production in a fail-closed state.

This does not mean Falak should be broadly enabled in production yet.
It means:

- Falak routes can ship with route access disabled by default
- privileged Falak operations no longer blindly trust `x-actor-id`
- operators can selectively enable Falak later for tightly controlled internal rollout
- runtime decisions are centralized in `src/falak/config/falakRuntimeConfig.ts`
- startup safety checks run through `src/falak/startup/falakStartupGuard.ts`

## How Route Gating Works

Falak route access is controlled by:

- `FALAK_ROUTE_GUARD_MODE`
- `FALAK_MAP_ROUTE_GUARD_MODE`
- `FALAK_ALLOWED_TENANT_SLUGS`
- `FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS`
- `FALAK_TRUST_X_ACTOR_ID`
- `FALAK_REQUIRE_VERIFIED_ACTOR`

The core guard is applied to the Falak HTTP surface registered by `registerFalakRoutes`.
The maps guard is applied to the Falak-backed education maps surface registered by `registerMapRoutes`.
`FALAK_MAP_ROUTE_GUARD_MODE=inherit` makes maps follow the core Falak guard, but staged/production overlays should set the maps mode explicitly so rollout intent is visible in the env itself.
`/v1/health` remains outside the gate.

### Modes

`disabled`

- all guarded Falak routes return `404`
- response code: `FALAK_DISABLED`
- use this as the production default

`admin_only`

- only allowlisted tenants may access Falak routes
- only allowlisted verified actors may access Falak routes
- privileged requests still require verified actor identity unless strict mode is intentionally relaxed outside production
- missing allowlists fail closed

`tenant_allowlist`

- only allowlisted tenants may access Falak routes
- public Falak routes may be accessed for those tenants
- privileged Falak routes still require actor resolution according to `FALAK_REQUIRE_VERIFIED_ACTOR`
- recommended for hosted staging verification

`enabled`

- guarded Falak routes are enabled normally
- privileged routes still require actor resolution
- use only after explicit operator approval

## Actor Resolution

Privileged actor resolution now works in this order:

1. inspect `Authorization: Bearer ...`
2. verify the JWT with `PUBLIC_JWT_SECRET_KEY` or `JWT_SECRET_KEY`
3. extract authenticated identity candidates from existing claims
4. map that identity to a Falak actor by `external_auth_id` or email
5. attach verified actor context if the mapping succeeds

Current authenticated identity candidates are derived from existing token shapes already present in the codebase:

- `sub.external_auth_id`
- `sub.username`
- `sub.email`
- top-level `external_auth_id`
- top-level `preferred_username`
- top-level `email`

If no verified actor can be resolved:

- privileged routes fail closed when `FALAK_REQUIRE_VERIFIED_ACTOR=true`
- a local-only `x-actor-id` override may be used only when explicitly enabled

## `x-actor-id` Override Policy

`x-actor-id` is no longer trusted by default.

It is only considered when:

- `FALAK_TRUST_X_ACTOR_ID=true`
- `NODE_ENV` is not `production`
- no verified bearer identity was resolved first

This keeps local/internal verification possible while preventing broad staging/production header spoofing.

## Safe Default Production Settings

Use this by default when Falak code is present in production but not enabled:

```env
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

## Recommended Staging Settings

Use this for the fresh hosted staging deployment:

```env
FALAK_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_MAP_ROUTE_GUARD_MODE=tenant_allowlist
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Hosted staging smoke verification should use bearer tokens for privileged requests.
Do not rely on `x-actor-id` in hosted staging.

## Local / Internal Verification Settings

Use this only for explicit local/internal verification:

```env
FALAK_ROUTE_GUARD_MODE=enabled
FALAK_MAP_ROUTE_GUARD_MODE=enabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=true
FALAK_REQUIRE_VERIFIED_ACTOR=false
```

This preserves current local verification workflows without making header trust the default anywhere else.

## Production Admin-Only Internal Enablement

Use this only after hosted staging has passed and operators explicitly choose to expose Falak to internal ANU actors:

```env
FALAK_ROUTE_GUARD_MODE=admin_only
FALAK_MAP_ROUTE_GUARD_MODE=admin_only
FALAK_ALLOWED_TENANT_SLUGS=anu-beta
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=anu-admin,anu-governor
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

This should be paired with:

- a production deployment carrying Falak code but not replacing current alpha behavior
- explicit internal actor provisioning in Falak
- operational logging review
- rollback readiness

## Error Codes

The route layer uses these explicit codes:

- `FALAK_DISABLED`
- `FALAK_MAPS_DISABLED`
- `FALAK_FORBIDDEN`
- `VERIFIED_ACTOR_REQUIRED`
- `TENANT_NOT_ALLOWED`
- `ACTOR_NOT_ALLOWED`

Blocked responses are intentionally terse and do not leak unnecessary policy detail.

## Operational Endpoints

Falak now exposes:

- `GET /v1/falak/health`
- `GET /v1/falak/readiness`

These endpoints remain available during dark launch so operators can verify Falak readiness even while guarded routes are disabled.
The runtime payload now reports both `route_guard_mode` and `map_route_guard_mode`.

## Operator Checklist

Before enabling anything beyond `disabled`:

1. confirm the deployment is not pointed at the current production database unless explicitly planned
2. confirm the target tenant slugs are intentional
3. confirm the allowed actor external auth ids are intentional
4. confirm `FALAK_TRUST_X_ACTOR_ID=false` for hosted staging or production
5. confirm `FALAK_REQUIRE_VERIFIED_ACTOR=true` for hosted staging or production
6. confirm bearer-auth actor mapping works for the intended internal actors
7. run staging readiness and smoke verification

## Current Limitations

This is a safer intermediary, not the final identity architecture.

What is now true:

- bearer-auth identity is preferred over header override
- privileged Falak routes can require verified actor resolution
- production can fail closed by default

What still remains before broad production rollout:

- a fully explicit production auth/session integration for Fastify Falak routes
- formal operator provisioning for Falak actors mapped from real production identities
- broader rollout validation beyond internal/admin-only access

Do not treat this as permission to broadly expose Falak in production yet.

## Related Docs

- [anu-falak-staging-rollout.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-staging-rollout.md)
- [anu-falak-migration-reconciliation.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-migration-reconciliation.md)
- [prisma-migration-reconciliation-plan.md](/C:/Dev/Flora_fauna/services/impact-service/docs/prisma-migration-reconciliation-plan.md)
