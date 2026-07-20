# Presence Gardens + Halls Real Backend Contract Proof

Date: 2026-05-21

## Summary

This pass adds a repeatable local real-backend environment for Presence Gardens
and Presence Halls frontend contract verification.

The environment:

- starts from a local Postgres contract database,
- uses the existing Flask app factory and JWT stack with local-only 32+ character
  development secrets,
- applies the existing Gardens/Halls additive SQL migration,
- checks the expected Postgres tables, indexes, and unique constraints,
- seeds canonical Room, Mask, Garden, Observation, Seed, Mood Board, Hall,
  Hall object, analytics-event, and Hall Path fixtures,
- emits local observer, secondary observer, owner, and admin tokens to an
  ignored `.env.presence-contract.local` handoff file,
- serves the backend on `http://127.0.0.1:5106`,
- runs the backend HTTP contract smoke against real Flask endpoints and
  Postgres,
- runs the frontend Playwright real-backend contract spec against that server.

No production secret or production data was used.

## Files Changed

- `flora-fauna/docker-compose.presence-contract.yml`
- `flora-fauna/backend/config/presence_contract_test.env.example`
- `flora-fauna/backend/scripts/dev_presence_contract_bootstrap.py`
- `flora-fauna/backend/scripts/smoke_presence_gardens_halls_contract.py`
- `presence-app/playwright.real-backend.config.ts`
- this report

Generated but ignored:

- `flora-fauna/backend/.env.presence-contract.local`

## Local Env And Config

`backend/config/presence_contract_test.env.example` records the safe local
configuration shape. The bootstrap script sets the same local defaults itself,
so copying the example file is optional.

The new Compose file supplies an isolated Postgres 16 contract database on
`127.0.0.1:55432`:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna
docker compose -f docker-compose.presence-contract.yml up -d
```

The bootstrap script accepts `--database-url`. Without it, it uses:

1. `PRESENCE_CONTRACT_DATABASE_URL`,
2. `DATABASE_URL` when it is Postgres,
3. `127.0.0.1:55432` when the Compose Postgres is listening,
4. `127.0.0.1:5433` when an existing local Postgres is listening,
5. the Compose URL as the final default.

It refuses to drop a database unless its database name starts with
`presence_contract_`.

## Bootstrap, Seed, And Tokens

Seed a clean contract database and print the frontend export block:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna
python backend\scripts\dev_presence_contract_bootstrap.py --print-playwright-env
```

The command writes:

```text
backend\.env.presence-contract.local
```

That file includes:

- Flask runtime values for the local contract environment,
- `PRESENCE_REAL_BACKEND_URL`,
- `PRESENCE_REAL_OBSERVER_TOKEN`,
- `PRESENCE_REAL_SECOND_OBSERVER_TOKEN`,
- `PRESENCE_REAL_OWNER_TOKEN`,
- `PRESENCE_REAL_ADMIN_TOKEN`,
- Hall slug/id, owner Room id/slug, Mask alias, Garden id,
- source Observation id,
- Mood Board id and item id,
- Hall portal, stall, and Hall Path ids.

Serve the seeded database after bootstrap:

```powershell
python backend\scripts\dev_presence_contract_bootstrap.py --serve --no-reset-db
```

One-shot boot and serve is also valid:

```powershell
python backend\scripts\dev_presence_contract_bootstrap.py --serve --print-playwright-env
```

That form resets and reseeds the contract database before serving.

## Postgres Migration Result

Proof database used by Codex:

- container: existing local `llsie-postgres`
- engine: Postgres 16
- URL: `postgresql://postgres:postgres@127.0.0.1:5433/presence_contract_local`
- database state: dropped, recreated, schema booted, migration applied, seeded

Bootstrap command result:

- `AUTO_CREATE_ALL` booted the current Flask SQLAlchemy schema.
- `backend/migrations/versions/20260521_presence_gardens_halls_backend.sql`
  applied cleanly through SQLAlchemy driver SQL execution.
- Postgres schema check passed for tables:
  `presence_garden`, `observation`, `observation_echo`, `garden_seed`,
  `garden_nurture`, `garden_prune`, `shared_space`, `presence_hall`,
  `hall_session`, `hall_participant`, `hall_zone`, `hall_portal`,
  `hall_stall`, `hall_moderation_action`, `hall_activity_event`.
- Index checks passed for Garden, Observation, Seed, Hall, and Hall activity
  event index families.
- Unique constraint checks passed for default Garden/slug, Seed target,
  Hall slug, and Hall stall Room placement.

Rollback is not provided by this repository path because the Gardens/Halls
migration is an additive SQL migration file rather than a reversible Alembic
revision. The bootstrap proves fresh schema boot plus clean apply.

## Seed Data Created

The canonical fixture data includes:

- one owner user and one public host Room,
- a companion Room available for stall/Seed coverage,
- two Observer users with public Masks and public Gardens,
- one Mood Board with a Room item seed target,
- public Garden Observations and an Echo with commentary,
- active, recently nurtured, wilting, composted, and pruned Seed coverage,
- a live public Hall with slug `presence-contract-hall`,
- Hall session, participant, guest participant, Hall Observation,
- Hall zones for Lobby, Stage, Table, Stall, Noticeboard, and Portal,
- Hall portal and Hall stall fixtures,
- Hall activity baseline events for join, portal click, and stall visit,
- Hall trailhead Path data,
- shared-space/Mood Board context for Garden home sections.

## Backend Smoke

With the backend server listening, run:

```powershell
python backend\scripts\smoke_presence_gardens_halls_contract.py --env-file backend\.env.presence-contract.local
```

Codex ran this smoke against real Flask + Postgres. It passed and exercised:

1. health,
2. public Hall list/detail,
3. guest Hall join,
4. Observer Hall join,
5. safe participant list,
6. Hall Observation create,
7. Hall portal click event capture,
8. Hall stall visit event capture,
9. owner Hall analytics,
10. Garden home,
11. normal Observation create,
12. self-promotion guard rejection,
13. Echo with commentary and attribution,
14. Mood Board item to Seed,
15. Hall Path read,
16. Hall Path generate,
17. unauthenticated World readiness denial.

Observed smoke result included:

- `portal_clicks >= 1`
- `stall_visits >= 1`
- Echo commentary id returned
- Mood Board Seed id returned
- Hall Path trailhead returned
- unauthenticated `/api/admin/presence/world-readiness` returned `401`

## Frontend Playwright Contract

`presence-app/playwright.real-backend.config.ts` is an API-only config for the
real-backend contract spec. The normal frontend Playwright config always starts
the mock API and Next dev servers; this contract spec uses only Playwright's
request fixture and does not need those servers.

Load the generated frontend env values in PowerShell:

```powershell
$envFile = 'C:\Dev\Flora_fauna\flora-fauna\backend\.env.presence-contract.local'
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $parts = $line.Split('=', 2)
    $key = $parts[0]
    $value = $parts[1].Trim('"')
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}
```

With the backend already serving, run:

```powershell
cd C:\Dev\Flora_fauna\presence-app
$env:PWTEST_CACHE_DIR = "$PWD\test-results\pw-transform-cache"
cmd /c npx playwright test tests/e2e/gardens-halls-contract.spec.ts --config playwright.real-backend.config.ts
```

Codex ran that real-backend Playwright command. Result:

```text
7 passed (1.1s)
```

The default frontend Playwright config was also attempted first. Its seven
contract tests printed `ok`, but the command did not exit before the outer tool
timeout because the default config keeps frontend web-server setup in the run.
The API-only config above is the clean frontend contract command.

## Test Results

Commands that passed:

```powershell
python -m py_compile backend\scripts\dev_presence_contract_bootstrap.py backend\scripts\smoke_presence_gardens_halls_contract.py backend\app\api\presence_gardens_halls.py backend\app\services\presence_garden_service.py backend\app\services\presence_hall_service.py backend\app\services\presence_hall_activity_service.py backend\app\services\presence_observation_service.py backend\app\services\presence_seed_service.py backend\app\services\presence_shared_space_service.py
python backend\scripts\dev_presence_contract_bootstrap.py --print-playwright-env
python backend\scripts\smoke_presence_gardens_halls_contract.py --env-file backend\.env.presence-contract.local
cd backend
python -m pytest tests\test_presence_gardens_halls.py tests\test_presence_pass_paths.py tests\test_presence_nodes.py
python -m pytest
git diff --check
```

Results:

- targeted backend Presence regression: `91 passed`
- full backend suite: `261 passed`
- frontend real-backend contract: `7 passed`
- Postgres schema/migration/seed bootstrap: passed
- backend HTTP real-Postgres contract smoke: passed

One initial targeted pytest command from the repository root failed collection
because these tests import `backend_factory` as a backend-root module. Rerunning
from `flora-fauna\backend` passed.

## Hall Analytics, Mood Board, Echo, World

- Portal click and stall visit calls create real `HallActivityEvent` rows in
  Postgres and increment owner analytics in the real HTTP smoke.
- Mood Board Room item seeding returns a Garden Seed and the
  `from_mood_boards` Garden home update hint in the real HTTP smoke.
- Echo without UI commentary remains supported, and Echo with commentary and
  source attribution is exercised in the real HTTP smoke.
- The World remains hidden/forming. The frontend contract spec and backend smoke
  both confirm an unauthenticated World readiness call does not return public
  readiness data.

## Known Limitations

- This is a local development Flask server and local Postgres flow, not a
  production deployment proof.
- The generated JWTs use local contract secrets and expire after seven days.
  Regenerate them when the contract environment is reseeded.
- Full backend pytest still uses the repository's default test harness; the
  Postgres proof comes from the bootstrap plus real HTTP smoke and frontend
  contract run.
- The SQL migration path is additive and has no scripted rollback.
- The real-backend Playwright config currently runs the Chromium request-suite
  contract only. Firefox/WebKit are not exercised by this proof.
- Hall V1 remains polling-ready. No realtime or Hall canvas work was added.

## Claude Handoff

Recommended Claude follow-up sequence:

1. Start Postgres with `docker compose -f docker-compose.presence-contract.yml up -d`
   or point `--database-url` at an existing local Postgres.
2. Run the bootstrap from `flora-fauna`:
   `python backend\scripts\dev_presence_contract_bootstrap.py --print-playwright-env`.
3. Serve without reseeding in a backend terminal:
   `python backend\scripts\dev_presence_contract_bootstrap.py --serve --no-reset-db`.
4. Load `backend\.env.presence-contract.local` values into the frontend process.
5. From `presence-app`, set `PWTEST_CACHE_DIR` under `test-results` and run:
   `cmd /c npx playwright test tests/e2e/gardens-halls-contract.spec.ts --config playwright.real-backend.config.ts`.
6. Keep frontend product UI changes separate from backend contract failures;
   the backend handoff now supplies canonical Room, Mask, Mood Board, Hall,
   analytics, Echo, Seed, and Path fixture ids.
