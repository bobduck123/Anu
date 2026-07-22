# Studio V3 M1 focused follow-ups

Status: definitions only; no follow-up is authorized in this pass

## Canonical Work draft/create contract

Inventory-only image upload is complete for M1. A separate reviewed contract is still required before enabling Create Work or canonical Work-field mutation from V3. It must define:

- whether edits are V3 presentation overlays or canonical Work drafts;
- owner/Room/tenant authorization and stable identities;
- revision conflict, cancel, cleanup, and reload behavior;
- public exclusion until a separately authorized publish;
- promotion/rollback semantics and request-ledger proof.

## Private media lifecycle

Define retention and owner cleanup UX for uploaded inventory media that is never selected or later replaced. Reuse the existing owner-private cleanup semantics; do not make cleanup implicit in Cancel because completed inventory upload is intentionally retained.

## Explicitly deferred creator controls

- Implement crop and focal-position transforms only after a bounded renderer and persistence contract exists.
- Implement Advanced Creative as a separate reversible gate with registered transforms and depth/layer constraints; the M1 control remains honestly disabled.
- Add canonical Work-field edit-once propagation, Collection membership/reorder, and permanent deletion only through reviewed canonical Library contracts with impact confirmation. M1 does not simulate these operations with presentation overrides.
- Add server-side draft Save and Visitor Preview only through PS-047; owner-private V3 metadata Save is not draft replacement.

## Regression hardening

Add isolated component-level tests for slow client file validation, duplicate upload attempts, route/owner switch during upload/save, invalid durable metadata, conflict confirmation, unavailable-source cleanup, and late upload completion during structural preview. The implementation is fenced; these tests reduce future regression risk.

Run a dedicated WebKit mobile verification outside the Chromium-only M1 gate. An exploratory dev/HMR run once measured the Edit action at 25px high even though scoped CSS specifies a 44px minimum; confirm on a clean WebKit production-build run before claiming cross-browser mobile acceptance.

## Persistence hardening

- Review a serialization mechanism for the published-fallback draft-absence check without adding a published-row lock. The M1-approved exception remains limited to locking a selected draft row so publish cannot promote a stale draft during concurrent V3 atomic replacement.
- Convert the possible unique-row race between simultaneous first private-state saves against a published fallback into a deterministic conflict response.
- Extend the pre-existing atomic-replacement media-key rejection/redaction hardening to normalized camel-case `mediaId`/`mediaIds`. The M1 client does not emit these keys into editable configuration.

These are separate follow-ups. They do not authorize a publish test, published-row lock, auth change, or public serializer change in M1.

## Broader product gates

All-room enablement, public launch, publish automation, a new public renderer family, arbitrary freeform layout, and private-client material remain outside M1.
