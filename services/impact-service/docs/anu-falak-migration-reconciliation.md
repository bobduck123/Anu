# ANU Falak Migration Reconciliation Note

Date: 2026-03-15

## Summary

Historical Prisma migration files were rewritten so that a fresh PostgreSQL 16 + PostGIS database can replay the full Falak migration set cleanly.

That work is now validated locally.

This is good for new environments.
It also means any existing non-local database that previously recorded the old migration history must be treated carefully.

## What Changed

Fresh replay now works locally for:

- Prisma client generation
- `prisma migrate deploy`
- seed
- Falak integration tests
- the first ANU Falak product slice

The caution is not about fresh replay anymore.
The caution is about any database that may already have recorded the old migration checksums.

## Historical Migration Files Were Rewritten

The rewritten historical migrations are:

- `20260311_impact_service_baseline`
- `20260312_flora_fauna_allocation_reservations`
- `20260312_flora_fauna_allocation_reserve_accounts`
- `20260312_flora_fauna_memetics_foundation`

The current migration set also includes:

- `20260314_falak_map_autopilot`
- `20260314_falak_protocol_foundation`
- `20260315_falak_anu_event_contribution_allocation`

Fresh environments should use the current full migration directory as the source of truth.

## Why Existing Non-Local Databases Need Explicit Review

If a non-local database already applied earlier forms of the rewritten migrations, Prisma may now see:

- the same migration names
- different on-disk SQL
- different stored checksums in `_prisma_migrations`

That means:

- a brand new DB can replay cleanly
- an existing DB can still be historically divergent
- `prisma migrate deploy` must not be run casually against that existing DB

## Recommended First Hosted Path

For the first hosted Falak rollout:

- use a brand new staging app deployment
- use a brand new staging Postgres/PostGIS database
- run `prisma migrate deploy` against that fresh DB
- run the hosted staging seed and smoke verification there

This avoids mixing:

- rewritten history
- old checksums
- existing non-local state

in one environment.

## What To Check Before Touching Any Existing Non-Local Database

Before touching an existing staging or production DB:

1. confirm the exact target DB
2. capture a backup or verified snapshot
3. run `npx prisma migrate status --schema prisma/schema.prisma`
4. inspect `_prisma_migrations`
5. compare recorded checksums against the current migration files
6. stop if there is any divergence, failed migration, or checksum mismatch

For this project, check whether Prisma metadata lives in `falak._prisma_migrations`:

```sql
SELECT table_schema
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;
```

Then inspect the rows:

```sql
SELECT
  migration_name,
  checksum,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count,
  logs
FROM falak._prisma_migrations
ORDER BY started_at;
```

## When `prisma migrate resolve` Is Appropriate

Suitable:

- to mark a failed migration as rolled back
- to mark a manually completed migration as applied
- to baseline an existing database intentionally
- to reconcile a manual hotfix that exactly matches the committed migration state

Not suitable:

- to silence checksum drift on already successful historical migrations
- to paper over edited migration history
- to skip a real comparison between DB state and current migration SQL
- as a normal rollout command for fresh staging or production deploys

For normal rollout, use:

```powershell
npx prisma migrate deploy --schema prisma/schema.prisma
```

## Practical Team Rule

Use this rule until explicitly changed:

- fresh staging DBs: allowed
- fresh replacement environments: allowed
- existing non-local DBs with prior migration history: require explicit reconciliation review first

Do not casually point Falak rollout commands at an existing staging or production database.

## Reference

Use the deeper reconciliation checklist in [prisma-migration-reconciliation-plan.md](/C:/Dev/Flora_fauna/services/impact-service/docs/prisma-migration-reconciliation-plan.md) when an existing non-local DB must be assessed.
Use [anu-falak-db-replacement-strategy.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-db-replacement-strategy.md) when a production replacement or rebuild path is being considered.
