# Studio V3 P1 backend contract

Status: implemented and technically validated; focused backend suite passed 20/20; cumulative editor/graph regressions passed 14/14 (34/34 combined); Python compilation passed; formal `MERGE AFTER FIXES` remains recorded; draft-row publish synchronization exception approved on 2026-07-22; fresh final review pending
Scope authority: `V3_BACKEND_SCOPE_LOCK.md`

## Boundary

Both contracts are authenticated owner operations beneath the existing Room owner namespace. Neither is a public, publish, preview, first-draft, or control-plane contract.

## Atomic existing-draft replacement

The replacement request carries:

- `expected.room_id`
- `expected.config_id`
- `expected.version`
- `expected.revision`
- `expected.schema_version`
- `expected.fingerprint`
- `config`, containing exactly the approved nine transport fields

The stable fingerprint is SHA-256 of canonical key-sorted JSON for the complete ten-field stored-semantic base (`schema_version` plus the nine transport fields). Arrays retain order. Only an object's own `url` and `preview_expires_at` are removed when that same object has a non-empty stable `media_id` and exact `visibility: "private_draft"`. No other URL or media field is stripped.

The server validates and normalizes the complete request before changing tracked rows, then locks/selects the exact `status='draft'` record and compares every expected field to current stored state. Absence or mismatch returns conflict without creating a draft or changing config/media rows.

On match, all nine fields are replaced authoritatively, referenced stable media IDs are checked against the same Room and owner, selected private media becomes attached, removed previously attached private media becomes orphaned, revision increments once, and one transaction commits. Any exception rolls back config and media changes together.

The repaired competing paths share one lock order: draft first, then any media rows they lock. V3 replacement locks the exact draft before media rows; legacy draft POST/PATCH obtains the draft row lock before mutation; media deletion and orphan cleanup lock the draft before affected media, and cleanup rechecks its orphan predicate under the media-row lock. Focused tests assert legacy `SELECT ... FOR UPDATE` use and exact draft-then-media cleanup order. Disposable PostgreSQL validation also observed a legacy writer waiting on the V3-held draft row lock and verified revision `3` plus both writers' JSON changes after serialization, proving no lost update in that exercised race.

The repaired publish path obtains only the draft-row lock before reading/promoting the draft; the earlier published-row lock was removed. The retained draft lock synchronizes publish with V3 replacement and prevents publish from promoting a stale pre-lock draft snapshot. It is also a real publish-path behavioral exception to the original work-order prohibition, not read-only validation. Explicit human approval for this narrow exception was granted on 2026-07-22, no publish was invoked as evidence for this pass, and fresh final review remains required.

The response returns the committed draft plus committed identity, revision, schema, and stable fingerprint. It does not return or change published state.

Implemented route: `PUT /api/presence/owner/rooms/:roomId/editor/v3/draft`.

## Owner-private V3 state

The private-state request is bound to:

- owner and Room scope established by the authenticated route;
- a supported V3-private schema version;
- exact base source/status/identity/version/revision/schema/fingerprint (draft or the explicit published fallback);
- expected metadata revision for optimistic replacement;
- registered private metadata categories only.

The metadata contract is reference-oriented. It may hold normalized named-Look tokens, layer locks, structural savepoint/layout tokens, stable source and placement refs, owner mode, restore metadata, and compatibility results. It may not hold visitor copy, canonical Work/Collection copies, arbitrary URLs or paths, blobs/base64, signed/private preview refs, tokens, auth/session/owner identity, executable content, secrets, or GGM/private fixture material.

Any `media_id` must resolve to a non-deleted `PresenceMediaAsset` owned by the Room owner and scoped to the same Room. Unknown or unowned IDs reject the whole request before mutation.

The private state has its own monotonic revision. A stale expected state revision conflicts with zero mutation. Base mismatch is also a conflict; no automatic merge or same-version rescue is allowed.

For an existing state row, replacement must match the row's stored config ID, source kind, status, version, revision, schema, and fingerprint as well as the currently loaded base. If a newer draft appears after private metadata was saved against a published fallback, the backend returns a `stored_base.*` conflict and leaves the prior revision, base identity, and metadata unchanged. The frontend detects the mismatch on read, does not apply the old metadata to the new base, displays an assertive status, and disables private-state save. P1 deliberately provides no implicit rebase or clear operation.

Placement provenance accepts numeric Work/Collection refs, registered legacy-object refs, and the exact fallback Collection token `collection:loaded-owner-library`. Numeric values are recognized only under registered `sourceRef`/`collectionSourceRef` keys, must fit the backend database integer domain (`1..2147483647`), and are resolved by type against `PresenceWork` or `PresenceCollection` with `node_id` equal to the current Room. This makes the canonical Room relation authoritative for both same-owner and cross-owner cases. Missing IDs, same-owner cross-Room IDs, cross-owner IDs, zero IDs, out-of-range IDs, and look-alike sentinel values reject the whole request. A regression first saves owned Work/Collection refs across placement, savepoint, CTA, and compatibility positions, then proves every rejected variant leaves metadata revision and JSON unchanged. Reference-shaped display text is ignored because collection is key-aware; exact sentinel and registered legacy forms remain compatibility cases rather than numeric database lookups.

Implemented routes: `GET|PUT /api/presence/owner/rooms/:roomId/editor/v3/state`.

## Scope integrity and known database limit

The authenticated owner route loads the owned Room first. The private-state service derives `owner_user_id` from that Room, row-locks the expected base by config ID, Room ID, and status, and compares version/revision/schema/fingerprint before replacing state. These checks enforce owner/base/Room consistency for all supported application writes.

The table itself has independent owner, Room, and base-config foreign keys plus owner/Room uniqueness; it does not have a composite database constraint proving that all three columns share one scope. Direct database writes could bypass the service-level invariant. A database-level composite constraint, or an explicitly reviewed equivalent, remains pre-market hardening rather than hidden P1 scope expansion.

## Public exclusion

The private-state model is not related to the public serializer traversal and is never added to:

- `serialize_public_editable_config`;
- public Presence payloads;
- public cards;
- RoomKey resolution;
- Test-as-visitor/public-room projections;
- `editable_config.locked_fields`.

Focused backend tests verify direct serializer exclusion and an unchanged public payload before/after private-state and draft operations. Public payload hygiene and V2 adapter tests passed 27/27; Studio V3 Chromium public-invariance coverage passed within the 10/10 browser gate; V2 BBB parity and eligibility passed 14/14, including explicit no-bridge P1 fallback and restored hovered-shape Enter behavior.

## Deferred activation

The contract makes a safe existing-draft save possible. First-draft creation and server Visitor Preview activation remain separate gates. The current POST/PATCH routes are not V3 Save and are never called by the P1 editor.

Focused backend result after the formal-review repairs: `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q` passed 20/20. The suite covers exact savepoint/reference validation, key-aware and Room-scoped numeric Work/Collection ownership, missing/cross-Room/cross-owner zero-mutation rejection, owner isolation, public exclusion, conflicts, rollback, no implicit creation, metadata safety, media ownership, fingerprint vectors, route serialization-before-commit, production hard-off behavior, stored-base rebase refusal/preservation, the legacy draft row lock, draft-before-media orphan cleanup ordering, and a non-mutating source inspection proving publish synchronization remains draft-row-only with no published-row lock.

The final cumulative editor-foundation and graph-integration rerun passed 14/14, for 34/34 backend tests combined, and `py_compile` passed for every touched backend module and the three backend test files. The formal independent review remains `VERDICT: MERGE AFTER FIXES`; the narrow draft-row publish synchronization exception is now explicitly approved, and a fresh independent final verdict is still required. This evidence is not authorization to commit, merge, publish, or deploy.
