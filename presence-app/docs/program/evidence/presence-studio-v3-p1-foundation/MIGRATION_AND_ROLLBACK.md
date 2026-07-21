# Studio V3 P1 migration and rollback

Status: additive migration implemented; disposable PostgreSQL forward/catalog/concurrency/rollback/integrity validation passed; no hosted migration was run; draft-row publish synchronization exception approved on 2026-07-22; fresh final review remains

## Migration surface

Migration: `flora-fauna/backend/migrations/versions/20260721_presence_studio_v3_p1_foundation.sql`

The migration makes two additive changes:

1. Adds `presence_editable_config.revision INTEGER NOT NULL DEFAULT 1`.
2. Creates `presence_studio_v3_state` for owner-private, Room-scoped V3 metadata.

The new table contains the owner and Room scope, exact base-config identity, base and metadata revisions, schema tokens, a lowercase 64-character fingerprint, JSONB metadata, audit-user references, and timestamps. It defines:

- one unique owner/Room constraint;
- checks for supported base source/status values, positive revisions, and the fingerprint shape;
- cascading foreign keys from Room and base config;
- Room/base and fingerprint lookup indexes.

Existing editable-config JSON, status, version, timestamps, media state, published rows, and public Presence data are not rewritten. Existing editable configs receive revision `1` through the non-null default.

## Actual disposable PostgreSQL validation

The checked-in validator was executed against a disposable local `postgres:16` instance:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Dev\Flora_fauna\scripts\validate-presence-studio-v3-p1-migration.ps1"
```

Result: `RESULT: PRESENCE STUDIO V3 P1 MIGRATION VALIDATION PASSED`

The validator:

- refuses to reuse existing Docker resources for its fixed validation project;
- resolves the checked-in Compose override and verifies that it has no published ports, container name, or persistent database volume; the override also disables automatic restart;
- uses tmpfs for PostgreSQL data and a read-only bind for migration files;
- starts the already-local `postgres:16` image with `--pull never`;
- creates the minimum predecessor `user` and `presence_node` tables, applies the real pre-P1 editable-config migration, and seeds representative draft and published configs;
- applies the P1 migration with PostgreSQL `psql` and `ON_ERROR_STOP=1`;
- verifies the revision default/nullability and revision-1 backfill on all three seeded configs;
- verifies the exact state-table column set, JSONB metadata/default/nullability, five named constraints, two cascading foreign keys, and two indexes;
- exercises the owner/Room uniqueness constraint and lowercase fingerprint check;
- starts a V3 transaction that row-locks the representative draft, updates its scene JSON and revision, and deliberately holds the lock;
- starts a legacy transaction against the same draft, observes it waiting with PostgreSQL `wait_event_type = 'Lock'`, then lets both writers complete;
- verifies revision `3` and both the V3 and legacy JSON markers, proving serialization without a lost update, then restores the seeded row before rollback;
- applies the operational rollback in a transaction;
- verifies that the table and revision column are gone, all three predecessor rows remain, and the representative draft/published identity and JSON content are intact;
- removes the disposable Compose project and its volumes in `finally` cleanup.

This is an actual PostgreSQL forward-and-backward schema proof plus a real row-lock contention/no-lost-update proof, not a SQLite model-creation substitute. Focused backend tests separately confirm that the application paths request the shared draft lock and that orphan cleanup locks draft before media.

The contention scenario exercises V3 replacement against the legacy draft writer; it does not execute or authorize publish. In the repaired application tree, the unnecessary published-row lock has been removed and only a draft-row lock remains at publish start to synchronize publish with V3 replacement. That publish-path exception is outside the migration itself, was explicitly approved on 2026-07-22 under the no-publish-evidence condition, and remains subject to fresh final review.

## Integrity boundary

Owner/base/Room consistency is enforced by the authenticated owner route and service:

- the owner is derived from the loaded Room;
- the expected base config is selected and row-locked by config ID, Room ID, and status;
- version, revision, schema, and fingerprint are compared before replacement;
- the private-state row is selected by the derived owner and Room.
- every numeric `work:<id>`/`collection:<id>` found under registered reference keys fits the backend database integer domain and resolves to a `PresenceWork`/`PresenceCollection` row whose `node_id` equals the current Room;
- the exact `collection:loaded-owner-library` sentinel and registered legacy-object refs remain non-numeric compatibility cases.

The migration intentionally uses separate foreign keys plus owner/Room uniqueness; it does not add a composite database constraint proving that `owner_user_id`, `room_id`, and `base_config_id` all belong to the same scope. Direct database writes could therefore bypass the service-level invariant. Database-level composite enforcement, or an explicitly reviewed equivalent, remains a pre-market hardening decision.

## Operational rollback

For a non-disposable environment, rollback order is:

1. Disable the default-off Studio V3 pilot/allowlist.
2. Remove frontend callers of the two owner-private V3 endpoints.
3. Remove the V3 owner routes and services.
4. Drop `presence_studio_v3_state` only after any human-approved private-state export decision.
5. Drop `presence_editable_config.revision` only after all replacement callers are removed.

Dropping the state table destroys V3-private metadata and requires explicit human approval outside a disposable environment. Removing it does not transform canonical Works/Collections, editable-config JSON, media records, published Room state, or public routes. A failed atomic replacement rolls back config and media changes together and needs no compensating publish.

## Gates before any hosted application

No hosted catalog was inspected or changed by this validation. Before any non-disposable application, a separate human-approved gate must:

- compare the target catalog with the expected predecessor schema and check migration drift;
- confirm backup/recovery posture and affected-row counts;
- define an acceptable lock window and concurrency plan for `ALTER TABLE` and table creation;
- rehearse the exact environment-specific rollback;
- decide whether service-enforced owner/base/Room consistency needs a database-level composite constraint;
- submit the explicitly approved narrow draft-row publish synchronization exception to the fresh final no-merge review;
- rerun application, public-exclusion, and public-invariance checks against the target environment.

Hosted deployment, migration execution, lock-window approval, and production activation remain out of scope for P1 Foundation.
