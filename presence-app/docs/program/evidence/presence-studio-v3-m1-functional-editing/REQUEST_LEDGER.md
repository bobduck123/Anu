# Studio V3 M1 request ledger

Status: PASS - final canonical publish-free rerun complete

## Permitted product requests

Reads:

- authenticated owner Room/editor overview;
- owner-private Studio V3 state;
- authorized owner Works and Collections;
- protected owner media previews at runtime;
- public BBB reads used for invariance proof.

Writes, only after the corresponding deliberate owner action:

- `POST /api/presence/owner/rooms/29/assets/upload` with `inventory_only=1`, only when private capability is verified;
- `PUT /api/presence/owner/rooms/29/editor/v3/state` with strict stable-reference-only metadata and exact base/private revision expectations.

Test-harness `__test__` reset/control requests are excluded from product-write counts.

## Forbidden product requests

- draft create/update/atomic replacement;
- editor preview, publish, promotion, rollback, or history mutation;
- canonical Work/Collection create/update/delete;
- non-inventory or public/unlisted media upload;
- public endpoint mutation;
- automatic retry/rebase after conflict;
- hosted admin/control-plane/production mutation.

## Required scenario mapping

| Scenario | Permitted writes | Forbidden writes | Result |
|---|---:|---:|---|
| Copy/media/placement/facets before Save | 0 | 0 | PASS |
| Drag/reorder/Cancel/Look/Room Style preview | 0 | 0 | PASS |
| Library inspect/place/unplace before Save | 0 | 0 | PASS |
| Disabled upload/Create Work capability | 0 | 0 | PASS |
| Inventory upload + explicit private Save | 1 inventory POST + 1 state PUT | 0 | PASS |
| Explicit private Save | exactly 1 state PUT | 0 | PASS |
| Failed Save | 1 attempted state PUT; Retry only after explicit click | 0 | PASS |
| Stale conflict | 1 attempted state PUT; no automatic retry/rebase | 0 | PASS |
| Test as visitor | 0 | 0 | PASS |
| Both public-route comparisons | 0 | 0 | PASS |

The E2E helper rejects any write matching draft, preview, publish, rollback, or canonical CRUD patterns and compares the complete non-GET product ledger to the exact expected method/path sequence. Request bodies are inspected only in-process for stable references and forbidden URL/blob/data markers; tokens, headers, and payloads are not written to evidence.

Final canonical result: 23/23 Chromium scenarios passed with one worker and zero retries. The canonical command invoked no publish request or publish test and produced zero forbidden product writes. The added scenario proves Arrange → different Room Style → Apply → one private-state PUT → cache-independent hydration without stale layout metadata.

An earlier, excluded command accidentally reached a local mock publish handler. It caused no hosted/production mutation and receives no evidence credit; the exact command, approximate time, and result are disclosed in `VALIDATION_RECORD.md`.
