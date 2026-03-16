# Manara Feed Rollout Mode

Date: 2026-03-16

## Why This Exists

Production Manara feed traffic currently reaches the impact-service through:

- frontend proxy `/_impact/api/manara/feed`
- impact-service route `/api/manara/feed`

The real `/api/manara/feed` implementation depends on the Prisma-backed impact database.
That path returned `500` in production, while hosted Falak staging was already progressing on a separate Supabase rollout.

The safer production stabilization step is:

- restore the public Manara feed to placeholder mode first
- keep production Falak dark-launched
- review the production database plan separately before re-enabling the live feed

## Rollout Variable

Use:

```text
MANARA_FEED_MODE=placeholder|live
```

Behavior:

- `placeholder`
  `/api/manara/feed` serves the placeholder preview feed and does not rely on the Prisma-backed feed query path
- `live`
  `/api/manara/feed` uses the existing Prisma-backed implementation

Default behavior:

- `production` defaults to `placeholder`
- non-production defaults to `live`

This default is intentionally fail-safe for production stabilization.

## Health Output

Impact-service health now exposes:

- `manaraFeed.configuredMode`
- `manaraFeed.activeMode`
- `manaraFeed.backend`
- `manaraFeed.dbBacked`

Examples:

- placeholder mode active:
  `configuredMode=placeholder`, `activeMode=placeholder`, `backend=placeholder`, `dbBacked=false`
- live configured but Prisma unavailable:
  `configuredMode=live`, `activeMode=placeholder`, `backend=placeholder`, `dbBacked=false`
- live mode active:
  `configuredMode=live`, `activeMode=live`, `backend=prisma`, `dbBacked=true`

This keeps the health output honest without mixing Manara feed mode with Falak readiness.

## Production Recommendation

Set this in the production impact-service Vercel project now:

```text
MANARA_FEED_MODE=placeholder
```

Keep these Falak settings unchanged:

```text
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

## When To Switch To `live`

Do not switch to `MANARA_FEED_MODE=live` until all of the following are explicitly true:

- the production impact-service database plan has been reviewed
- the production DB connection is healthy
- the Prisma-backed Manara feed path has been verified against production-ready data
- the rollback path is documented

Switching to `live` is an explicit rollout decision, not the default.
