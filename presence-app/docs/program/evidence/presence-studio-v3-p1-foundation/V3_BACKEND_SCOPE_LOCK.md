# Studio V3 P1 backend scope lock

Decision date: 2026-07-21
Decision: **PROCEED — targeted additive backend pass**
Review status: technical repairs validated; formal `MERGE AFTER FIXES` remains recorded; the draft-row publish synchronization exception was explicitly approved on 2026-07-22 and fresh final review remains required

The original Studio V3 milestone pack defines P1 as a zero-write creative gate. The explicit P1 Foundation work order is the separately approved backend/security work order anticipated by that pack. This exception is limited to the contracts below; all other P1 renderer, privacy, and public-invariance constraints remain normative.

## 1. Requirements unsafe with the V2-era backend

- Browser-local named Looks, locks, structural savepoints, compatibility reports, and placement provenance are not durable or cross-device.
- Current `POST/PATCH /editor/draft` can create a draft implicitly and does not compare immutable identity, a mutation revision, or the stable stored-semantic fingerprint inside the write transaction. It is not a V3 Save Draft contract.
- Current draft `version` identifies a draft generation but does not change on edits, so it cannot detect concurrent replacements.
- Current media assignment synchronization does not make authoritative replacement and orphaning one explicit existing-draft operation.
- Putting V3-only state in `editable_config` or `locked_fields` would risk public serialization and conflate visitor configuration with owner-private editor state.

## 2. Targeted contracts required now

### Owner-private Studio V3 state

Add one `presence_studio_v3_state` table and owner route/service for versioned, room-scoped private metadata. The record is bound to:

- owning user;
- Presence Room;
- exact base source/status identity, version, revision, schema, and fingerprint (draft or explicit published fallback);
- a V3-private schema version and optimistic metadata revision.

The payload accepts only the registered V3 metadata categories. It rejects unknown top-level categories, URL/blob/base64/path/auth/token/secret fields or values, raw owner identity, GGM/private fixture markers, copied Work/Collection payloads, and unowned media IDs. Media may be referenced only by a stable `PresenceMediaAsset.id` owned by the current Room owner and scoped to the same Room. Numeric Work/Collection references are collected only from registered reference keys, bounded to the backend database integer range, and resolved against `PresenceWork`/`PresenceCollection` rows whose `node_id` equals the current Room. Missing, same-owner cross-Room, and cross-owner records reject the whole request with zero state mutation. Collection provenance still accepts the exact fallback token `collection:loaded-owner-library`, and registered legacy-object references remain supported; look-alike tokens are invalid.

An existing private-state row cannot be rebound implicitly to another base config. The request must match both the currently selected base and the state row's stored base; otherwise replacement conflicts with zero mutation and requires a future explicitly reviewed rebase or clear contract.

### Atomic existing-draft replacement

Add one owner-only `PUT` endpoint that:

1. normalizes the complete nine-field replacement before mutation;
2. selects the exact existing draft with a row lock;
3. compares Room/config identity, draft status, generation version, mutation revision, schema version, and stable stored-semantic fingerprint;
4. returns conflict before mutation on any mismatch and never initializes a draft;
5. authoritatively replaces all nine fields;
6. validates stable media ownership and applies attachment/orphaning status changes in the same database transaction;
7. increments revision and returns committed identity/revision/fingerprint;
8. relies on the route transaction to commit once or roll back config and media effects together.

Legacy draft mutation and cleanup paths must share the same ordering discipline: lock the draft row before any private-media row lock. Legacy POST/PATCH now locks the draft before mutation; orphan cleanup locks the draft and then the candidate media rows. This prevents legacy PATCH or cleanup from racing V3 replacement into a lost update or delete-vs-reattach inversion.

Publish synchronization is a separate authorization boundary. The repaired tree removes the unnecessary published-row lock and retains only a draft-row lock at the start of publish so publish cannot read a stale draft while V3 replacement holds that row. This is a real publish-path synchronization exception, not read-only validation. Explicit human approval for this narrow exception was granted on 2026-07-22 with conditions: keep only the draft-row lock, do not restore or add a published-row lock, do not invoke publish as evidence, and do not change publish semantics beyond preventing stale draft promotion during concurrent V3 replacement. Fresh final review remains required before commit/merge.

### Source and placement identity

Keep the canonical `PresenceWork` and `PresenceCollection` models unchanged. Store only registered stable refs and Room-scoped placement provenance inside the private-state contract. Numeric refs resolve by their registered key/type, fit the database integer domain, and must point to a canonical row in the current Room. The exact fallback Collection sentinel and validated legacy-object form remain non-numeric compatibility cases. This is the smallest compatibility layer required for P1/M1; it does not create a hidden Library or redesign Collection membership.

## 3. Deferred to V3.1 / pre-market

- Explicit first-draft initialization contract.
- Server Visitor Preview activation and verified Save Draft UI activation beyond the existing-draft pilot.
- Full placement relational model or many-to-many Collection redesign.
- Complete Library administration and asset processing expansion.
- Public/published V3 metadata projection, production eligibility, migration of public rooms, or hosted cutover.
- Durable multi-Presence savepoint graph and collaborative editing.
- Hosted catalog-drift inspection, migration lock-window approval, and any database-level composite owner/Room/base-config constraint.

## 4. Locked file/table/endpoint surface

Planned backend files:

- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- one focused Studio V3 private-state service module
- `flora-fauna/backend/app/api/presence_graph.py`
- one additive SQL migration
- focused backend tests

Planned frontend files are limited to existing `presence-app/lib/presence/studio-v3`, `components/presence-studio-v3`, the bounded V2 composition seam, focused tests, and this evidence pack.

New backend surface:

- table `presence_studio_v3_state`;
- column `presence_editable_config.revision`;
- owner-private Studio V3 state read/replace route;
- owner-private existing-draft atomic replace route.

No current public endpoint, public serializer, upload endpoint, auth decorator, tenant rule, control-plane route, or production flag is edited semantically. The only existing publish-path semantic diff is the narrowly isolated draft-row synchronization lock described above; the published-row lock was removed and must not be restored. The exception has explicit human approval, but the wider tree still must not be committed or merged without fresh final review.

## 5. Protected boundaries

- The private table is never read by public serializers.
- The nine-field public/published projection remains sourced only from the existing published `PresenceEditableConfig` path.
- The new replacement endpoint targets `status='draft'` only and cannot publish, archive, initialize, or mutate a published row.
- Existing owner authorization remains mandatory; metadata adds explicit owner and Room binding.
- The feature remains BBB-scoped, local/test-only, default-off, and production hard-false.
- P1 Film Strip and experience facets are editor-preview behavior only: they require `editorBridge`, while no-bridge rendering follows the exact pre-P1 shared path.
- Existing no-bridge BBB keyboard behavior remains public behavior; Enter prioritizes the visibly hovered shape as it did before P1.
- No evidence uses GGM, private routes, credentials, headers, tokens, signed URLs, or raw payloads.

## 6. Migration and rollback

The migration is additive: create the private table and add `revision INTEGER NOT NULL DEFAULT 1` to editable configs. Existing draft/published rows retain their current version and receive revision 1. No existing JSON or public data is rewritten. Disposable PostgreSQL validation passed the forward catalog/default/constraint checks, observed a legacy writer waiting on the V3-held draft row lock, verified both updates with revision `3` and no lost update, then passed rollback and predecessor-row integrity checks.

Rollback order:

1. disable the default-off Studio V3 pilot;
2. remove callers of the new owner-private endpoints;
3. drop `presence_studio_v3_state`;
4. drop `presence_editable_config.revision` only after endpoint/service rollback.

No public rollback, publish call, or hosted data mutation is required. No publish call was used as evidence for this approval pass; the disposable concurrency proof remains limited to V3 replacement versus legacy draft mutation. Detailed forward/backward SQL and operational checks are recorded in `MIGRATION_AND_ROLLBACK.md`.

The current schema uses independent foreign keys and owner/Room uniqueness. The authenticated route/service enforces composite owner/base/Room consistency by deriving the owner from the Room and locking the base config inside the same Room/status scope. Database-level composite enforcement remains a documented pre-market decision. Before any hosted application, the target catalog, migration drift, lock window, backup posture, and environment-specific rollback must be reviewed separately.

## 7. Explicitly out of scope

- Auth, tenant, control-plane, public route, public serializer, rollback-history, or production-eligibility changes. The one draft-row publish synchronization exception in the repaired tree has explicit human approval, but remains subject to fresh final review.
- Implicit draft creation or reuse of current POST/PATCH as V3 Save.
- A new public renderer or permanent `/editor-v3` route.
- Broad Works/Collections schema redesign, uploader/media pipeline, audio/video processing, arbitrary URLs, HTML/CSS/JS/code injection, or raw content snapshots in V3 metadata.
- Deployment, push, publication, hosted smoke writes, GGM exposure, or production data changes.

## Size conclusion

The required backend work is a bounded additive pass, not a broad migration. The `BLOCKED — ATOMIC DRAFT CONTRACT TOO LARGE` stop condition is not met at this gate. This size conclusion does not resolve the separate approval gate for publish draft-row synchronization.
