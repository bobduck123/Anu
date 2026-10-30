# V5 Gate 2 transport import slice — 30 October 2026

## Status

Fixture-driven static GTFS topology reader and Falak importer are implemented and locally compiled. **Gate 2 is incomplete:** no real TfNSW data, event source, database migration, import transaction or hosted run was executed. The selected dataset's licence and attribution must be confirmed before a real import. This branch is stacked on Gate 1 `bb5dc03` and must be reviewed against that commit.

## Contract and behavior

The operator supplies an extracted GTFS directory containing `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt` and optional `shapes.txt`. The reader selects rail routes (`route_type=2`), resolves platform stops to parent stations, preserves repeated station calls, groups route variants by line/direction/shape/station sequence and returns deterministic station, line and pattern IDs. It rejects duplicate identifiers, malformed CSV, unknown stops, invalid coordinates and invalid sequences before opening a database transaction.

`npm.cmd run transport:import -- --directory <extracted-GTFS-dir> --tenant-id <uuid> --source-slug <stable-key> --source-version <bundle-version> --source-attribution <text> --source-licence <licence-id> --source-url <https-url> --network-id <stable-id> --network-name <name>` performs a dry run only. It reports counts and `database_writes: 0`. The operator-only `--apply` flag activates the transaction against the configured Falak database. No scheduler, API write endpoint or production trigger was added.

The importer creates draft, tenant-visible canonical Falak nodes and transport patterns. It uses stable source-derived slugs and external IDs, stores source provenance, skips unchanged records, retires absent source patterns, and reports source stations/lines missing from a later feed. For nodes with `editorial_override: true`, it refreshes provenance while preserving the curated title and geometry. It does not delete nodes or curated edges. Real public publication remains a separate workflow.

## Verification actually run

- Prisma schema validation passed.
- Impact-service build and TypeScript compilation passed.
- Synthetic GTFS parser test: 3 passed, including shared stations, a branch and repeated station call.
- Synthetic CLI dry run: 4 stations, 2 lines, 3 patterns, 0 database writes.
- Non-database regression suite: 21 suites and 123 tests passed; 2 database suites and 3 tests skipped.
- `git diff --check` passed.

The database-gated import test is written but unexecuted. It checks repeat import stability, retirement of a removed pattern and preservation of an editorial station-to-venue edge. It needs a disposable PostgreSQL/PostGIS database after both Gate 1 and Gate 2 migrations. Local Docker was unavailable in this session.

## Source and licence boundary

Transport for NSW [documents static GTFS](https://opendata.transport.nsw.gov.au/developers/documentation) with stops, routes, trips, stop times and shapes, and its [developer guide](https://opendata.transport.nsw.gov.au/blog/devapp) describes API-key access. This slice deliberately uses no TfNSW payload or credential. A human operator must select the exact dataset and record its licence/attribution before running the importer against real data. No legal conclusion is made here.

## Remaining Gate 2 work

Validate the additive migrations and importer on disposable PostgreSQL/PostGIS, test a licensed current Sydney feed, measure import cost, add controlled event ingestion/deduplication and an operational source-update schedule. Production import requires a separately approved target, backup and rollback procedure.
