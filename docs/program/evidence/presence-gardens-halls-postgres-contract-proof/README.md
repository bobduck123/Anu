# Presence Gardens + Halls Postgres Contract Proof

Date: 2026-05-21

## Summary

Verified the Gardens + Halls backend migration and schema boot against local Postgres, not SQLite.

## Database Used

- Docker daemon: running
- Container: `llsie-postgres`
- PostgreSQL: 16.13
- Proof database: `presence_contract_proof_codex_20260521_01`
- Connection used by SQLAlchemy: `postgresql://postgres:postgres@localhost:5433/presence_contract_proof_codex_20260521_01`

## Commands Run

```powershell
Start-Service com.docker.service
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
docker info --format "{{.ServerVersion}}"
docker ps --format "{{.Names}} {{.Image}} {{.Ports}}"
docker exec llsie-postgres psql -U postgres -c "select version();"
docker exec llsie-postgres createdb -U postgres presence_contract_proof_codex_20260521_01
```

Then a SQLAlchemy proof script:

1. Booted the backend app with `AUTO_CREATE_ALL=True` against the Postgres proof DB.
2. Ran `db.create_all()` for fresh schema boot.
3. Applied `backend/migrations/versions/20260521_presence_gardens_halls_backend.sql` with `exec_driver_sql`.
4. Queried `information_schema` and `pg_indexes` for expected tables, indexes, and constraints.

## Apply Result

Passed. The migration SQL applied cleanly after a Postgres fresh schema boot.

Detected tables:

```text
garden_nurture
garden_prune
garden_seed
hall_activity_event
hall_moderation_action
hall_participant
hall_portal
hall_session
hall_stall
hall_zone
observation
observation_echo
presence_garden
presence_hall
shared_space
```

Detected indexes:

```text
ix_hall_activity_event_hall
ix_hall_activity_event_portal
ix_hall_activity_event_stall
ix_hall_activity_event_type
uq_garden_seed_target
uq_presence_garden_default_observer
uq_presence_garden_slug
uq_presence_hall_slug
```

Detected constraints:

```text
uq_garden_seed_target
uq_hall_stall_room
uq_presence_garden_default_observer
uq_presence_garden_slug
uq_presence_hall_slug
```

## Rollback Result

Rollback was not run because this repo migration is a standalone additive SQL file without a down/rollback migration. No destructive rollback command was executed.

## Tests Against Postgres

The existing pytest files hard-code `sqlite:///:memory:` in their app factories, so the current suite does not support a direct Postgres test run without test harness refactoring.

Postgres coverage achieved in this pass:

- Fresh schema boot with SQLAlchemy against Postgres.
- Gardens/Halls migration SQL applied against Postgres.
- Table/index/constraint checks passed against Postgres.

## Known Limitations

- The proof database was left in the local Docker Postgres container for inspection.
- This is not hosted production proof.
- Direct pytest-on-Postgres is blocked by current test factory configuration, not by the Gardens/Halls implementation.
