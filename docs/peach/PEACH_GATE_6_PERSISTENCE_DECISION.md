# PEACH Gate 6 Persistence Decision

Status: accepted for private staging rehearsal

## Chosen Approach

Gate 6 replaces `.peach-data/` JSON persistence with a durable SQLite database stored locally at:

```text
C:\Dev\PEACH\peach-gate6.db
```

The app uses `better-sqlite3` prepared statements behind the existing `src/lib/store.ts` repository API. The schema is defined by checked-in SQL migrations under `prisma/migrations/`.

## Why SQLite For Gate 6

Private staging needs durable records without overbuilding multi-Orchard infrastructure or requiring hosted Postgres before the pilot path is proven. SQLite is acceptable for one-machine private staging with trusted adult participants and non-sensitive material.

## Alternatives Rejected

- Keep `.peach-data/` JSON: rejected because Gate 6 requires pilot-critical records durable beyond local JSON files.
- Hosted Postgres/Supabase immediately: deferred until Gate 7 because private staging can validate workflows first.
- Prisma Client runtime: attempted, but Prisma 7's SQLite adapter failed at runtime in this Windows/Next environment. The project kept SQL migrations and moved app access to direct SQLite prepared statements.
- Generic CMS: rejected because PEACH's Contribution, ConsentRecord, support intent, review status, and audit concepts are domain records, not posts.

## Schema And Migration Approach

Migration file:

- `prisma/migrations/0001_gate6_initial/migration.sql`

Setup command:

```powershell
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"
npm.cmd run db:prepare
```

The setup script creates the database directory, applies pending SQL migrations, records applied migrations in `_peach_migrations`, enables WAL mode, and preserves existing records.

## Durable Records

- Contribution
- ConsentRecord
- SupportRecord
- ConsentOperationRequest
- AuditLog
- Steward review status on Contribution

## Static Records

Field 001 remains static in `src/data/field001.ts`.

## Privacy Controls

Public pages do not query contribution tables. Contribution responses include `publicDisplay: false`. Review statuses do not contain a publish state.

## Rollback

Stop the server, back up or remove `C:\Dev\PEACH\peach-gate6.db`, then rerun `npm.cmd run db:prepare`.

## Risks

- SQLite is not a multi-user production database.
- Local files are not encrypted by the app.
- Backup/retention policy is manual.
- Gate 7 should move to managed Postgres or another hosted database before broader staging.
