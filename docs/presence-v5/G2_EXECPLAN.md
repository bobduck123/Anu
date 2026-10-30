# ExecPlan: fixture-driven rail topology ingestion

## Gate

Presence V3.4 Gate 6; ANU/Presence V5 Gate 2. This branch contains only the static rail topology import slice, stacked on V5 Gate 1.

## Objective

Read an extracted, authorised GTFS static bundle and upsert network, line, station and route-pattern records through Falak's canonical tables. Re-running the same bundle changes no records; removed patterns are retired without deleting curated graph edges.

## Current state

Gate 1 added typed route pattern tables and scope validation but no importer. Falak has node/edge governance and PostGIS. Transport for NSW documents static GTFS stop, route, trip, stop-time and shape data. Dataset selection, exact licence and credentials remain an operator decision.

## Scope and non-goals

Parse extracted GTFS CSV files with stable external identifiers and synthetic fixtures. Add an explicit operator CLI requiring a tenant, source, attribution, version and `--apply` for database writes. No automatic scheduling, public route, live credential use, event feed, realtime vehicle tracking, auth/policy change or production import.

## Risks and blast radius

Medium. Direct DB writes occur only when the operator runs `--apply` against an explicitly selected database. The code must not mutate existing editorial edges or published experiences. No real data import will be run here.

## Milestones

1. Validate and normalize GTFS topology into a deterministic contract.
2. Implement idempotent Falak upsert and retirement within a transaction.
3. Test synthetic parsing and dry-run behavior; typecheck/build; document database test limitation.

## Rollback plan

Do not execute `--apply` during this task. Revert this branch to remove the CLI. A future real import rollback requires a source-scoped operator procedure because it may create nodes referenced by editorial edges.

## Human decisions required

Exact TfNSW feed licence/attribution, approved tenant/database target and any real import execution. Production data changes are separately approved.

## Progress log

- 2026-10-30: Started a separate branch from Gate 1 commit `bb5dc03`.
- 2026-10-30: Added extracted-GTFS reader, synthetic fixture, explicit dry-run/apply CLI and source-scoped idempotent upsert. Parser/dry run, schema validation, build and 123 non-database tests pass; PostgreSQL integration remains pending.
