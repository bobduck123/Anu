# ExecPlan: Falak transport topology foundation

## Gate

Presence V3.4 Gate 6 (visitor discovery capability); ANU/Presence V5 Gate 1 (cultural and spatial model). This branch contains only the V5 Gate 1 schema and contract slice.

## Objective

Represent a transport network, lines, route variants and ordered station calls using Falak canonical nodes and additive relational tables. A station can occur in multiple lines or more than once in a route pattern.

## Why now

The Sydney network reference journey needs reliable topology before discovery and experience delivery APIs can bind to it.

## Current state

Falak in `services/impact-service` already has tenant-scoped nodes and edges, PostGIS geometry, public visibility, source metadata and nearby spatial queries. Flask Presence has a separate owner publish lifecycle. No transport route pattern tables or authorised transport import exist. The Flask `Event` and `Venue` models have no suitable published cultural discovery contract.

## Non-goals

No auth, tenant policy, public route, ingestion, publication, production data or renderer changes in this gate.

## Scope

Add route pattern and ordered call models and a PostgreSQL migration. Add a typed topology contract and deterministic fixture tests. Reuse Falak nodes for network, line and station identity and geometry, and Falak edges for associations.

## Risks and blast radius

Medium: additive schema in the impact service. The migration is unexecuted against PostgreSQL until a disposable target is available. New records have no public endpoint in this branch.

## Milestones

1. Audit existing graph, spatial, Presence and migration contracts; record inventory.
2. Add schema, migration and typed topology validation.
3. Run schema validation and fixture tests; review the full branch diff.

## Tests and validation

`npm.cmd run typecheck`, `npm.cmd run test:non-db`, and `npx prisma validate` if dependencies are available. Verify SQL on a disposable PostgreSQL/PostGIS target before deployment. Existing Flask Presence regression baseline is recorded separately.

## Rollback plan

Revert the branch before migration. If later applied, stop dependent reads/writes before dropping only the new `falak.transport_pattern_calls` and `falak.transport_patterns` tables in a separately approved rollback; no existing Falak nodes are modified by this migration.

## Human decisions required

Production migration target and deployment approval; authoritative Transport for NSW dataset/licence review; launch and creative acceptance remain separate.

## Progress log

- 2026-10-30: Audited current checkout and V4 hardening lineage; selected the existing Falak/PostGIS model as canonical rather than introducing a Flask transport copy.
- 2026-10-30: Added topology migration, Prisma models, scope triggers and synthetic integration fixture. Schema validation, typecheck and 120 non-database tests pass. PostgreSQL execution remains pending because Docker is unavailable.
