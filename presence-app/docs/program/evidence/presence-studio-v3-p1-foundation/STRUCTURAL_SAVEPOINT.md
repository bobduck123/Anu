# Studio V3 P1 structural savepoint

Status: PASS; strict savepoint schema, projection, parse, staging, Cancel, and restore implemented; compiler passed 28/28; backend P1 passed 20/20; Studio V3 Chromium passed 10/10; formal `MERGE AFTER FIXES` remains recorded; fresh final review pending

## Structural snapshot contract

A structural change is staged state, not a named Look application and not an immediate mutation of the accepted document. Before remapping, Studio V3 captures a reference-only snapshot with these required top-level fields in its durable wire form:

- `id`, `createdAt`, `fingerprint`, and positive `baseRevision`;
- `activeRoomId` and `activeLookId`;
- non-empty unique `roomOrder` and an `entryRoomId` that resolves within it;
- `rooms`, ordered with complete zero-based ordinals;
- `layerValues` (layer overrides) and `locks`;
- `requiredCta` and fixed `navigationToken: "room-order-v1"`.

Each Room snapshot contains:

- stable `roomId`, `order`, and registered `styleId`;
- optional registered `collectionPresentationId`;
- complete `baseObjectIds` and Room-scoped placement refs;
- optional composition `layoutId` plus exact object/chamber/layout/zone/order/size/treatment placements.

The backend checks that Room order agrees with `roomOrder`, the active and entry Rooms resolve, a Room Style agrees with its composition layout, every composition placement belongs to that Room and resolves to a saved base object or placement, CTA Room destinations resolve, lock IDs are unique, and the structural digest/timestamp formats are valid. Unknown or legacy lossy fields reject the whole metadata request.

The snapshot does not copy canonical Work/Collection records, the comparable base config, visitor copy, media URLs/blobs, preview data, diagnostics, owner/auth identity, or executable content. Media and content remain stable references. Savepoints without a positive server base revision can remain local working state but are excluded from the durable private-state projection.

Source provenance is strict. Numeric Work/Collection values are accepted only under registered reference keys, bounded to `1..2147483647`, and resolved against canonical `PresenceWork`/`PresenceCollection` rows whose `node_id` equals the current Room before private state can mutate. That recursive validation covers placements, nested savepoint placements, CTA source refs, compatibility rows, and any other registered reference-key position while ignoring reference-shaped display text. Missing IDs, same-owner cross-Room IDs, and cross-owner IDs reject with zero mutation. Fallback grouping of the loaded owner Library still uses only `collection:loaded-owner-library`, and registered legacy-object refs remain supported; zero IDs and look-alike suffixes reject the envelope.

## Stage, Before/After, Apply, and Cancel

1. Capture the complete pre-change savepoint.
2. Resolve the explicit target Room Style, respecting Room-style override and lock precedence.
3. Remap every base object and placement deterministically into registered zones/capacities.
4. Keep incompatible, duplicate, overflow, and missing candidates in the accounting report and Piece shelf state.
5. Compile `Before` from the accepted document and `After` from the staged document through the same compiler/render path.
6. Freeze competing mutations and owner-private save while structural preview is open.
7. `Apply` promotes the staged document and appends its pre-change savepoint.
8. `Cancel` returns the original document object and verifies its structural fingerprint against the captured `Before` fingerprint.

Staging itself does not update the accepted document, browser-local snapshot, or server-private state. The UI exposes only Before/After, Apply, and Cancel as structural-preview actions while other Studio mutators are guarded.

## Durable projection and reconciliation

`projectStudioV3Metadata` exports all accepted durable savepoints together with named Looks, locks, placements, current Room styles, active Room/Look, compatibility rows, and restore metadata. The owner-private endpoint binds that envelope to the exact base config and an optimistic metadata revision.

On reload, the frontend applies the same strict metadata shape before reconstructing structural state. Malformed, unknown-key, unsafe, or legacy lossy envelopes are rejected as a whole. Browser-local snapshots contain the same full projected metadata and the server metadata revision. When a server state is available, a local overlay is accepted only when revisions match; a stale local overlay is ignored rather than overwriting newer durable state.

Durable state is also bound to its stored base identity. If the selected base changes - for example, a newer draft appears after state was saved against the published fallback - the previous server metadata remains untouched, is not applied to the new base, and cannot be saved over. The UI reports a durable-base mismatch and disables private-state save. The backend independently rejects an attempted implicit rebase with a `stored_base.*` conflict and zero mutation.

## Restore qualification

With all stable references available, restore is exact. It restores Room order/style/composition/placements, active Room and Look, CTA/navigation state, locks, and layer overrides while retaining the current canonical base, Piece index, and Collection index.

If the catalog has changed since capture, restore is partial and explicit:

- missing Rooms/Pieces/Looks and invalid scoped locks/overrides become issues;
- unresolved placements and composition entries are omitted;
- placements whose Piece becomes unavailable are retained only as shelved/hidden private state, and explicitly hidden placements remain hidden;
- a missing active Room/Look uses the current safe fallback;
- an unresolved CTA Room destination falls back to `existing-base`, and an unresolved CTA source is removed;
- current canonical Work/Collection/base records are never replaced or silently substituted.

The UI reports whether the latest structural savepoint was restored exactly or with missing references. The backend refuses internally unresolved savepoint shapes at write time; partial restore exists for references that disappear after a previously valid save.

## Confirmed automated evidence

The 28-test compiler suite includes deterministic savepoint/accounting equality, reference-only serialization, exact Cancel, partial missing-reference restore, full metadata round-trip, strict legacy-shape rejection, duplicate-safe placement identities, exact owner-Library sentinel round-trip, hidden/unavailable exclusion, and an exact restore from Film Strip back to Gallery Wall.

The 19-test focused backend suite includes a strict savepoint round-trip plus rejection of copied canonical content, raw media URL fields, missing object refs, invalid Collection tokens, wrong chambers, mismatched layouts, unresolved active Rooms, inconsistent order, unsafe CTA destinations, unsupported navigation tokens, invalid digests, and the prior lossy schema. It also proves key-aware/DB-int-bounded/current-Room numeric source validation with missing/cross-Room/cross-owner zero-mutation failures, stored-base preservation/rebase refusal, and the repaired writer lock discipline.

The Studio V3 Chromium suite passed 10/10, including exact structural Cancel, durable private-state save/reload/restore, rejection of a stale browser-local overlay after a newer private-state revision, preservation/lockout when a newer draft no longer matches the durable published base, and no-bridge fallback despite injected P1 layout/experience tokens. These results do not supersede the formal no-merge verdict or approve the remaining draft-row publish synchronization exception.
