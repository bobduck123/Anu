# Falak Local Verification

This environment exists to verify the Falak protocol against a live PostgreSQL + PostGIS database without touching the already-launched app or its database settings.

## Why This Is Safe

- It uses a dedicated Docker Compose file: `docker-compose.falak-local.yml`.
- It uses a separate local-only env file: `.env.falak-local`.
- It binds PostgreSQL on `localhost:5433`, not the app's normal database port.
- It uses dedicated databases: `anu_falak_test` and `anu_falak_shadow`.
- Safety guards block seed and integration commands unless the database target is clearly local and non-production.
- Destructive verification commands also require `ALLOW_DB_RESET_FOR_TESTS=true`.

## Files

- `docker-compose.falak-local.yml`: isolated PostGIS container for Falak verification.
- `.env.falak-local.example`: template for the local-only verification environment.
- `scripts/falak-local/*.mjs`: local orchestration helpers that always load `.env.falak-local`.
- `src/falak/utils/localVerificationGuard.ts`: safety-critical protection against pointing verification commands at the live app database.

## Setup

From `services/impact-service`:

```powershell
Copy-Item .env.falak-local.example .env.falak-local
npm run falak:db:up
npm run falak:prisma:generate:local
npm run falak:migrate:local
npm run falak:seed:local
npm run falak:test:integration:local
```

For the full verification flow:

```powershell
npm run falak:verify:local
```

## What `falak:verify:local` Checks

The local verification flow does this in order:

1. Starts the isolated PostGIS container.
2. Waits for Docker health to report ready.
3. Generates the Prisma client using the local-only env file.
4. Applies existing Prisma migrations to the local verification database.
5. Seeds Falak test data into the local verification database.
6. Runs the Falak live-database integration suite.

The integration suite explicitly verifies:

- Prisma migrations apply to a real Postgres/PostGIS instance.
- Seed execution succeeds against the isolated local database.
- Nearby spatial queries work against real PostGIS geometry.
- `events` rejects `UPDATE` and `DELETE`.
- `ledger_entries` rejects `UPDATE` and `DELETE`.
- `requires_approval` materializes an approval inside the same blocked transaction.
- optimistic concurrency rejects stale node updates.
- public callers cannot read restricted nodes.
- federation links reject non-public cross-tenant targets.

## Why `migrate deploy` Is Used

`falak:migrate:local` uses `prisma migrate deploy`, not `prisma migrate dev`.

That is intentional:

- `migrate deploy` deterministically replays checked-in migrations.
- `migrate dev` is a schema-iteration workflow and uses a shadow database.
- For verification, deterministic replay of the committed Falak migrations is the safer default.

Keep `prisma migrate dev` for actual local schema authoring only, and only against `.env.falak-local`.
The `.env.falak-local` template includes `SHADOW_DATABASE_URL` so any future schema-iteration session remains isolated from the launched app as well.

## Common Failure Cases

- `.env.falak-local` does not exist.
  Copy `.env.falak-local.example` to `.env.falak-local`.

- Docker is not running.
  Start Docker Desktop, then run `npm run falak:db:up`.

- Guard blocks a command.
  The command was refused because the configured database target did not look local-only. Check `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`, and `ALLOW_DB_RESET_FOR_TESTS`.

- Prisma reports connection or migration errors.
  Confirm the container is healthy with `npm run falak:db:ps` and inspect logs with `npm run falak:db:logs`.

- Port `5433` is already in use.
  Free that port or change only the local verification port values together in `docker-compose.falak-local.yml` and `.env.falak-local`.

## Safe Wipe And Recreate

To fully wipe the isolated Falak verification database and recreate it safely:

```powershell
npm run falak:db:down
docker compose -f docker-compose.falak-local.yml down -v
npm run falak:verify:local
```

The `down -v` step deletes only the dedicated local verification volume for `falak-postgis`. It does not touch the launched app database because the container, port, env file, and database names are separate.
