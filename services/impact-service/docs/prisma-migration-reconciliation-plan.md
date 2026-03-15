# Prisma Migration Reconciliation Plan

Date: 2026-03-15

## Scope

This plan exists because local Falak verification now passes on a fresh PostgreSQL 16 + PostGIS database, but several historical Prisma migration SQL files were edited after they had already existed in migration history.

That means:

- the migration files on disk are now the source of truth for fresh replay
- any non-local database that already recorded the old migration checksums may now disagree with the filesystem history
- `prisma migrate deploy` may warn and still continue, which is not safe to do casually on staging or production

Official Prisma references used for this plan:

- Migration histories: https://www.prisma.io/docs/v6/orm/prisma-migrate/understanding-prisma-migrate/migration-histories
- Development and production workflows: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- `prisma migrate resolve`: https://www.prisma.io/docs/cli/migrate/resolve
- Patching and hotfixing: https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing

## Why Rewritten History Is Risky

Prisma treats the `prisma/migrations` directory as the migration-history source of truth, and the database `_prisma_migrations` table as the record of what was actually applied.

If a migration file that was already applied is edited later:

- the checksum stored in `_prisma_migrations.checksum` no longer matches the file on disk
- `prisma migrate deploy` can warn that an applied migration was modified
- a fresh database replay may succeed while an existing database remains on the old historical shape
- two databases can both appear "migrated" while having arrived there through materially different SQL
- future failures become harder to reason about because the migration name no longer uniquely identifies one historical SQL body

Prisma explicitly recommends not editing migrations that have already been applied. If an applied migration was changed, the preferred fix is to restore or reconcile intentionally rather than ignore the warning.

## Current Migration Set

Current migration directories:

- `20260311_impact_service_baseline`
- `20260312_flora_fauna_allocation_reservations`
- `20260312_flora_fauna_allocation_reserve_accounts`
- `20260312_flora_fauna_memetics_foundation`
- `20260314_falak_map_autopilot`
- `20260314_falak_protocol_foundation`

Tracked historical migrations that were rewritten in the current working tree:

- `20260311_impact_service_baseline`
- `20260312_flora_fauna_allocation_reservations`
- `20260312_flora_fauna_allocation_reserve_accounts`
- `20260312_flora_fauna_memetics_foundation`

What changed in those rewrites:

- public-side migrations now pin `SET search_path TO public, falak;`
- `20260312_flora_fauna_allocation_reservations` was made conditional so it no-ops until the enum types actually exist
- `20260312_flora_fauna_allocation_reserve_accounts` was made conditional so it no-ops until the tables and enum value exist
- `20260312_flora_fauna_memetics_foundation` now creates the final enum values directly, including:
  - `LedgerAccountType.allocation_reserve`
  - `PoolLedgerEntryKind.allocation_reservation`
  - `PoolLedgerEntryKind.allocation_release`

Additional current-tree migrations used by the passing local replay:

- `20260314_falak_map_autopilot`
- `20260314_falak_protocol_foundation`

These are part of the current migration set and must be present for fresh replay, but the checksum-rewrite concern specifically applies to the four historical tracked migrations above unless a non-local database has already recorded the later Falak migrations too.

## Known Good Fresh-Replay Checksums

From the passing clean local verification database, the `_prisma_migrations` rows are:

| migration_name | checksum |
|---|---|
| `20260311_impact_service_baseline` | `11bc8411ee494c32f1b39799891e4e99ce6e896f7ca2f7e32115c8c7efd67291` |
| `20260312_flora_fauna_allocation_reservations` | `b17af93c82db915b8d4f12e884faffb2cb08479484b5ff53ecacee4470cb8aad` |
| `20260312_flora_fauna_allocation_reserve_accounts` | `db3ef879a22a698e08af520a79d689e6dfb1409a26165c2d9f0ee6e3878680e7` |
| `20260312_flora_fauna_memetics_foundation` | `90b270e635808458becc4247e3352e7cfd327f5187a0bf8d25b6224b6c4ce4ec` |
| `20260314_falak_map_autopilot` | `077cc5b6b78abea58fdfd3dd576f8a0d619f365cef54afefaa683a35365698f4` |
| `20260314_falak_protocol_foundation` | `fe38bd969c382b2d1ff8619f707816a24926cbd896def5778181cea68e08a50d` |

These values are useful for comparison, not for blind manual editing.

## What To Check In `_prisma_migrations`

For this project, the passing local database stores Prisma metadata in `falak._prisma_migrations`, not `public._prisma_migrations`.

Verify that first instead of assuming:

```sql
SELECT table_schema
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;
```

Then inspect the table contents:

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

Things to check:

- whether the table exists at all
- whether all expected migration names are present
- whether any historical migration checksum differs from the current filesystem history
- whether any row has `finished_at IS NULL`
- whether any row has `rolled_back_at IS NOT NULL`
- whether any row has non-empty `logs`
- whether the last applied migration in the database matches what you expect from the branch you are deploying

Also run Prisma’s own status check before any deploy:

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

Treat any divergence, failed migration, or modified-history warning as a stop condition on non-local databases.

## Preflight Checks Before Touching Any Existing Non-Local Database

Run these checks first against staging or production before any `migrate deploy`:

1. Confirm you are pointed at the intended database.
2. Back up the database or ensure a verified snapshot exists.
3. Run `prisma migrate status`.
4. Query `_prisma_migrations` and capture the results.
5. Compare existing checksums for these historical migrations against the current migration files:
   - `20260311_impact_service_baseline`
   - `20260312_flora_fauna_allocation_reservations`
   - `20260312_flora_fauna_allocation_reserve_accounts`
   - `20260312_flora_fauna_memetics_foundation`
6. Confirm whether the database has already applied any of the `20260314_*` Falak migrations.
7. If there is any mismatch, do not run `prisma migrate deploy` yet.

Suggested SQL bundle:

```sql
SELECT current_database(), current_user, current_schema();

SELECT table_schema
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;

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

## Decision Tree

### 1. Brand New Database

Condition:

- no application tables
- no `_prisma_migrations` table
- safe to initialize from scratch

Action:

- use the current migration directory as the source of truth
- run a normal fresh replay
- this is the safest target for validating the rewritten history

Result:

- safe to run `prisma migrate deploy`

### 2. Existing Staging Database With Old Checksums

Condition:

- `_prisma_migrations` exists
- one or more rewritten historical migrations are already recorded
- recorded checksums differ from the current filesystem history

Action:

- stop and do not run `prisma migrate deploy` against that database yet
- prefer creating a brand new staging database from scratch using the rewritten migration set
- validate the app against that fresh staging database
- keep the old staging database intact until the new one is verified

Why:

- staging is the right place to validate the rewritten history against a non-local environment without mutating an already-diverged database
- using `migrate resolve` is not the first move here because checksum mismatch on successful historical migrations is not what `resolve` is for

Result:

- safest path is replacement staging, not in-place reconciliation

### 3. Existing Production Database With Old Checksums

Condition:

- `_prisma_migrations` exists
- historical rows were already applied from the older SQL bodies
- current migration files no longer match the recorded history

Action:

- do not run `prisma migrate deploy` until you have explicitly reconciled the history plan
- do not edit `_prisma_migrations` manually
- do not use `migrate resolve` just to silence checksum mismatch on already successful migrations
- first compare the production schema state to:
  - the old intended end state
  - the new current migration end state
- if production already has the schema shape you need, the safer pattern is usually:
  - freeze the rewritten-history rollout for production
  - create a forward-only reconciliation migration if more changes are needed
  - or baseline a replacement environment rather than mutating production history

Result:

- production needs a deliberate reconciliation exercise, not an ad hoc deploy

## Safest Next Path For Staging

Recommended path:

1. Leave any existing staging database with old checksums untouched.
2. Provision a brand new empty staging database.
3. Run the current migration set against that empty database.
4. Run seed only if your staging policy allows it.
5. Point the staging app or staging verification job at the new database.
6. Validate app behavior.
7. Only after successful validation, decide whether the old staging database should be retired.

This avoids mixing:

- old historical checksums
- edited historical SQL
- new Falak migrations

in one in-place environment.

## When `prisma migrate resolve` Is Suitable

Suitable:

- a migration failed and you need to mark it `--rolled-back` before re-deploying
- a migration was completed manually and you need to mark it `--applied`
- you are baselining an existing database into Prisma migration history
- you are reconciling a manual production hotfix that exactly matches a committed migration

Not suitable:

- to rewrite checksum history for migrations that already succeeded long ago
- to hide the fact that committed migration files were edited after application
- to "fix" an existing production database before you have proven the database schema matches the new migration history exactly
- to skip careful comparison between current DB state and current migration SQL

Important Prisma constraint:

- `prisma migrate resolve` only works with failed migrations, baselining, or explicit applied/rolled-back reconciliation workflows
- it is not a generic tool for retroactively changing successful historical checksum records

## Exact Safe Commands For A Fresh Staging Database Replay

These commands assume:

- you have provisioned a brand new empty staging database
- you have a staging connection URL
- you are running from `services/impact-service`
- you are not pointing at production

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/NEW_STAGING_DB?schema=public"
$env:DIRECT_URL = $env:DATABASE_URL
$env:SHADOW_DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/NEW_STAGING_SHADOW?schema=public"

npx prisma migrate status --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
```

If staging should also be seeded and that is explicitly allowed:

```powershell
npm run prisma:seed
```

Recommended post-replay check:

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

And verify the migration rows:

```sql
SELECT
  migration_name,
  checksum,
  finished_at,
  rolled_back_at,
  applied_steps_count
FROM falak._prisma_migrations
ORDER BY started_at;
```

## Exact Checks Before Touching Any Existing Non-Local Database

From `services/impact-service`, after setting the target database env vars:

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

Then in SQL:

```sql
SELECT current_database(), current_user, current_schema();

SELECT table_schema
FROM information_schema.tables
WHERE table_name = '_prisma_migrations'
ORDER BY table_schema;

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

Stop immediately if any of the following are true:

- the target database is not the intended non-local environment
- `_prisma_migrations` is missing when you expected an existing Prisma-managed database
- any rewritten historical migration exists with a checksum that differs from the current source tree
- any migration row is failed or rolled back
- `prisma migrate status` reports divergence or failed migrations

## Recommended Operational Policy

- Fresh environments: use the rewritten history.
- Existing staging with old checksums: replace with a new staging database rather than reconciling in place.
- Existing production with old checksums: freeze deployment until an explicit reconciliation review is completed.
- Future schema changes: only add forward-only migrations; do not rewrite these historical files again.
