# Studio V3 M1 security and privacy review

Status: implementation review and scoped validation evidence complete; independent no-merge review pending
Risk class: high

## Boundary result

- Owner authentication, Room ownership, tenant checks, and the BBB-only hosted allowlists are unchanged.
- No public route/serializer is modified to consume V3 private metadata.
- No publish, rollback, history, canonical Work, or canonical Collection path is invoked by M1.
- Inventory upload reuses the owner Room authorization boundary and is accepted only with verified private-draft storage/media records.
- Evidence and screenshots use the sanitized BBB fixture. No private-client data was added; legacy fixture material outside this task is not used as M1 evidence.
- No dependency was added.

## Metadata restrictions

Frontend and backend validators agree on optional `object_edits` and `layer_values`, registered enum/token sets, stable source/media IDs, list bounds, copy bounds, and reference ownership. They reject URLs, blob/data/file schemes, paths, signed previews, secrets/credentials, raw code/HTML, base64-like payloads, unknown keys, cross-Room/cross-owner references, ambiguous media refs, invalid zones, and unsupported values.

Current and nested savepoint layer locks/values are validated against their own Presence, Room, Collection, and Piece graphs. Numeric Work/Collection scope IDs are included in database ownership checks. Published-fallback private state is rejected whenever an active draft exists, while draft expectations alone use row locking; no published-row lock was introduced.

Runtime asset URLs are never projected. The saved envelope contains only `mediaId` or `mediaSourceRef`. Required CTA label/visibility is protected in the UI and core mutation layer.

## Async and local-state isolation

- Load, save, and upload completions are fenced by load epoch and owner identity/partition.
- Upload also uses a synchronous in-flight token and captures the sheet session/object before the first asynchronous validation step.
- Cancel/Escape cannot reattach late media; completed inventory remains private and available.
- Local snapshots remain owner-partitioned, lock-serialized, generation-atomic, fingerprint-bound, and disabled honestly when unavailable.
- Invalid durable metadata disables save rather than claiming successful restore.

## Reviewed scan findings

Changed source contains only synthetic credential rejection fixtures and generic defensive validation terms; no real token, secret, private payload, or hosted identifier. A pre-review audit removed client-name blacklists from the frontend and backend generic text validators and reused the existing canonical Studio V2 style-preset registry rather than duplicating a named legacy token. Creator copy is now validated equivalently without rejecting ordinary names. Existing unrelated legacy mock/test content is excluded from screenshots and M1 fixture execution. The scoped diff contains no new private-client content dependency.

## Checks

- [x] No unexpected auth, tenant, public-route, publish, or canonical CRUD path.
- [x] Frontend/backend metadata parity and fail-closed rejection.
- [x] Owner/private upload, MIME, storage fallback, draft invariance, and public exclusion tests.
- [x] Public payload/adapters and V3 public-invariance coverage.
- [x] Zero forbidden product writes in the canonical request ledger.
- [x] No new dependency or arbitrary code/URL input.
- [ ] Fresh independent final reviewer confirms the complete frozen diff/evidence.
