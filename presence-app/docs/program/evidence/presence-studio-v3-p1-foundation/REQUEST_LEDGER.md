# Studio V3 P1 request ledger

Status: PASS; Studio V3 Chromium 10/10 and backend 20/20; formal `MERGE AFTER FIXES` remains recorded; publish-lock exception approved on 2026-07-22; fresh final review pending

## Authorized local/test requests

Read requests:

- existing authenticated owner Room/editor reads;
- owner-private Studio V3 state read;
- existing public BBB reads used for invariance proof;
- local Playwright mock reset/request-log endpoints.

Explicit owner writes permitted by this work order, only in local/in-memory tests or through a deliberate owner action:

- replace V3-private metadata through the new owner-private endpoint;
- replace an already-existing draft through the new atomic endpoint after exact identity/revision/schema/fingerprint verification.

Backend integration tests use disposable in-memory database rows. Playwright uses the local mock API. No hosted endpoint or production data is in scope.

## Forbidden requests

- current draft `POST` or `PATCH` as V3 Save;
- implicit first-draft initialization;
- server preview until separately activated after verified atomic save;
- publish;
- rollback/history mutation;
- asset upload/delete/cleanup;
- public endpoint mutation;
- hosted/production/admin/control-plane mutation;
- deployment or publication.

## Expected P1 editor behavior

- Local edits, Look/style staging, Before/After toggle, Cancel, Test as visitor, and Film Strip navigation send no write requests.
- A private-state write occurs only through an explicit owner save action and contains only reference-safe V3 metadata.
- Numeric Work/Collection refs in that metadata are key-aware, database-integer-bounded, and must resolve to canonical rows in the current Room; invalid, missing, cross-Room, or cross-owner refs reject without changing stored metadata.
- Draft replacement remains disabled when the loaded base is published fallback or any exact expectation is unavailable.
- If existing durable metadata belongs to another base, it is preserved but not restored onto the new base; private-state save is disabled and no implicit rebase write is attempted.
- Conflict/failure does not automatically retry a write; the UI asks the owner to reload/restage.

## Captured result

The focused Studio V3 Chromium suite passed 10/10. Product-write assertions classify local mock-fixture controls under `/__test__/` as test-harness traffic rather than Presence product writes. The added no-bridge P1 fallback proof sends no Presence product write.

| Scenario | Product method/path | Count | Result |
|---|---|---:|---|
| Browser-local placement, Look/style staging, Before/After, exact Cancel, visitor preview, mobile, and public-invariance flows | none | 0 | PASS |
| Explicit durable private-state save | `PUT /api/presence/owner/rooms/29/editor/v3/state` | 1 | PASS; this was the only product write in that scenario |
| Stale-local reconciliation fixture | `PUT /api/presence/owner/rooms/29/editor/v3/state` | 2 | PASS; one explicit editor save plus one direct owner-test revision update; the editor ignored its stale local overlay and performed no automatic retry |
| Published durable state followed by a newer draft base | initial explicit `PUT /api/presence/owner/rooms/29/editor/v3/state` | 1 | PASS; the test harness changed the available base, the editor disabled save, a forced button click emitted no second write, and the server state remained byte-for-byte equivalent |
| Draft, preview, publish, rollback, asset, and public endpoint writes from the editor | none | 0 | PASS |

The backend P1 suite passed 20/20 for the atomic existing-draft replacement and owner-private metadata contracts. That coverage confirms no implicit first-draft creation or base rebind, no partial mutation on conflict/failure, preserved prior metadata on stored-base mismatch, shared draft/media lock ordering, and no cross-owner or public-state exposure. The added numeric-source regression accepts owned refs across placement/savepoint/CTA/compatibility locations, rejects missing, same-owner cross-Room, cross-owner, and out-of-range refs, and proves rejection leaves revision and metadata JSON unchanged. The publish-lock regression is non-mutating source inspection only: it confirms draft-row-only synchronization and no published-row lock without invoking publish. It is not evidence of a hosted request.

No hosted endpoint, production data, deploy, publish, asset mutation, or public-route mutation was used. The repaired code removes the published-row lock but retains a draft-row lock at publish start; because no publish request was made, this ledger neither exercises nor broadens that synchronization exception. After the fresh review flagged the added public Enter regression's inherited mock publish setup, that regression was changed to seed a direct published BBB Threshold fixture and passed 1/1 without save or publish. The public-invariance rerun passed 2/2 and treats publish endpoints only as forbidden-request assertions. The formal review remains `VERDICT: MERGE AFTER FIXES`; explicit human approval of the narrow exception is recorded, and a fresh independent final review remains the gate.
