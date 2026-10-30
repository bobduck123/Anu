# V5 Gate 1 result — 30 October 2026

## Status

Implemented in an isolated branch and locally validated at schema/TypeScript level. **Database acceptance is pending** because no disposable PostgreSQL/PostGIS target or local Docker daemon was available. No migration was applied, API exposed, Preview deployed or Production changed.

## Changes

- Added two Falak tables for route patterns and ordered station calls. A network, line, station, venue, event or artist remains one canonical Falak node; the route tables hold only topology. Patterns support alternate branches, shared interchanges, repeated station calls, geometry and stable source IDs.
- Added database triggers that reject cross-tenant or wrong-type network, line and station references, including writes that bypass the API.
- Added a database-gated integration fixture with intersecting lines, a branch, repeated station calls, a venue linked to two stations, an event and an artist. It checks canonical station identity and scope rejection. This fixture uses synthetic data only.
- Recorded the repository inventory and gate dependencies in `REPOSITORY_INVENTORY_2026-10-30.md`.

## Verification actually run

- Flask G2 baseline: 83 passed, 447 warnings.
- `npm.cmd ci --ignore-scripts`: dependencies installed. Initial offline attempt failed due missing cached Zod package; normal install passed.
- `npm.cmd run prisma:generate`: passed after approved engine download; regenerated client remains ignored under `node_modules`.
- `npx.cmd prisma validate`: passed, with an existing `multiSchema` deprecation warning.
- `npm.cmd run typecheck`: passed after final schema change.
- `npm.cmd run build`: passed; this manifest runs Prisma generation and TypeScript compilation only, with no migration command.
- `npm.cmd run test:non-db -- --cacheDirectory <worktree>/services/impact-service/node_modules/.cache/jest --silent`: 20 suites passed, 120 tests passed, 1 database suite skipped (2 tests). The default sandbox run first failed due a protected Jest cache directory and blocked loopback; the rerun used a workspace cache and loopback access.
- `git diff --check`: passed.

## Migration and rollback

Migration: `services/impact-service/prisma/migrations/20261030_falak_transport_topology/migration.sql`. Apply only through the existing Prisma migration process to an explicitly selected, backed-up target after disposable PostgreSQL validation and review. It creates new tables, indexes, functions and triggers; it does not modify existing rows. On a separate approved rollback, stop dependent writes, drop the two new tables (calls first) and their validation functions, then restore the prior schema migration state. Do not treat rollback as an ordinary production command.

## Remaining work

1. Run the new database integration test and migration on disposable PostgreSQL/PostGIS.
2. Gate 2: choose a licensed TfNSW static feed, implement a fixture-driven, idempotent importer with removed-record handling and attribution.
3. Gate 3: published-only cultural discovery and station/line APIs, including Sydney week boundaries and bounded spatial queries.
4. Gates 4–6: Presence experience registry, trusted scene module manifests, versioned publication, journey state, frontend contract harness, hosted and load proof.

Existing Presence V3.4 Gate 9 launch approval, V4 G2 review and Preview provisioning issues are unaffected.
