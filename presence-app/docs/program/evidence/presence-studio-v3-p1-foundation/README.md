# Presence Studio V3 P1 Foundation evidence

Status: repaired-tree implementation and validation complete; formal `MERGE AFTER FIXES` remains recorded; explicit approval of the draft-row publish synchronization exception was granted on 2026-07-22; fresh independent final review pending
Branch: `feat/presence-studio-v3-p1-foundation`
Starting commit: `36204ca0c87e96f2fdbc61bf3fcad8606102e5f3`
Fixture: sanitized BBB / `bbbvision` only

## Intended proof

This pack proves:

- one additive owner-private V3 metadata contract with strict reference/media safety;
- one conflict-safe, existing-draft-only atomic nine-field replacement contract;
- key-aware, DB-integer-bounded numeric Work/Collection references resolved to canonical records in the current Room;
- zero public serialization, auth, or control-plane weakening, with the sole publish synchronization diff isolated as a human-approved draft-row-lock exception;
- three materially distinct Looks and three structurally distinct Room Styles;
- bounded Film Strip editor preview through the existing V2 public-room component, gated by `editorBridge` with exact no-bridge fallback;
- reference-safe structural savepoint, state-based Before/After, exact Cancel, and qualified restore;
- deterministic compatibility and Piece/shelf accounting;
- mobile, keyboard, focus, target-size, and reduced-motion behavior;
- unchanged canonical and alias BBB public routes;
- independent aesthetic review, with the independent no-merge review retained as the final gate.

## Validation summary

- frontend typecheck and production build: PASS;
- Studio V3 compiler: PASS, 28/28;
- Studio V3 API client: PASS, 1/1;
- P1 backend foundation: PASS, 20/20;
- cumulative backend editor/graph regressions: PASS, 14/14;
- combined backend validation: PASS, 34/34;
- touched backend Python compilation: PASS;
- disposable local PostgreSQL forward/catalog, concurrent V3-versus-legacy row-lock/no-lost-update, and operational rollback validation: PASS;
- Studio V3 Chromium: PASS, 10/10;
- V2 BBB parity and eligibility: PASS, 14/14;
- post-review publish-free public Enter regression: PASS, 1/1;
- post-review public invariance rerun: PASS, 2/2;
- public payload hygiene and V2 adapters: PASS, 27/27;
- Playwright mock syntax: PASS;
- production build: PASS, 29/29 pages;
- scoped credential/private-material and public-route inventory checks: PASS;
- `git diff --check HEAD`: PASS after the final evidence refresh (only existing LF-to-CRLF notices);
- screenshot PNG decode: PASS, 22/22;
- independent aesthetic review: PASS.

## Repair history and formal-review response

Before the formal review, the repaired tree already covered five safety findings:

1. Works marked unavailable and placements restored against unavailable Works are forced to `shelved`/hidden owner state and cannot compile into public objects or compositions.
2. The fallback owner-Library Collection uses the single registered token `collection:loaded-owner-library`; numeric zero and look-alike suffixes are rejected by frontend and backend validators.
3. Durable metadata remains bound to its stored base. When a newer draft replaces a published fallback, the prior metadata is preserved, automatic rebase is refused, and private-state save is disabled until a separately reviewed rebase/clear flow exists.
4. Legacy draft mutation and orphan cleanup now follow the same draft-row-then-media-row lock order as V3 replacement; PostgreSQL validation observed the legacy writer waiting and confirmed both writers committed without a lost update.
5. Explicitly hidden placements are excluded from generic public object projection and every composition path, including Film Strip and restored/savepoint state.

The formal independent no-merge review then recorded `VERDICT: MERGE AFTER FIXES` with four boundary blockers. The current technical repair pass adds:

1. Numeric `work:<id>` and `collection:<id>` values are recognized only in registered reference keys, bounded to the backend database integer range, and resolved through `PresenceWork`/`PresenceCollection` with `node_id` equal to the current Room. Missing IDs, same-owner cross-Room IDs, and cross-owner IDs reject with zero private-state mutation. Exact owner-Library sentinel and registered legacy-object references remain supported.
2. Film Strip and every P1 experience facet require `editorBridge`. A no-bridge caller ignores P1 layout/experience tokens and follows the pre-P1 shared renderer path.
3. The pre-P1 public BBB Enter-key rule is restored when no bridge exists: Enter prioritizes the visibly hovered canvas shape. Editor-specific active-index behavior remains bridge-scoped.
4. The unnecessary published-row lock was removed. The remaining draft-row lock at publish start is a real synchronization exception, not read-only validation; explicit human approval was granted on 2026-07-22, no publish was invoked as evidence, and the fresh final review remains required.

The repaired implementation, human approval, and green rerun do not alter or supersede the recorded formal verdict. They are not merge authorization. A fresh independent final review is still required before commit or merge.

## Evidence index

- `EXEC_PLAN.md`
- `V3_BACKEND_SCOPE_LOCK.md`
- `BACKEND_CONTRACT.md`
- `MIGRATION_AND_ROLLBACK.md`
- `LOOK_STYLE_MATRIX.md`
- `ROOM_STYLE_MATRIX.md`
- `STRUCTURAL_SAVEPOINT.md`
- `AESTHETIC_REVIEW.md`
- `PUBLIC_INVARIANCE.md`
- `REQUEST_LEDGER.md`
- `VALIDATION_RECORD.md`
- `NO_MERGE_REVIEW.md` (records the formal `MERGE AFTER FIXES`; it is intentionally unchanged until the fresh final review)
- `screenshots/` (fresh P1, P0-regression, mobile, visitor, and public-invariance captures)

## P0 baseline note

The work order identifies P0 commit `36204ca` and its independent `VERDICT: MERGE` as the accepted starting gate. Some retained P0 narrative files still contain pre-review wording and inconsistent historical test counts. P1 treats the committed code and final P0 no-merge verdict as authoritative, reruns all cumulative invariants, and records fresh exact commands/counts here rather than silently rewriting historical evidence.

## Safety statement

No push, deploy, publish, hosted write, production migration execution, public route mutation, GGM exposure, arbitrary code support, or production-default V3 activation was performed or is authorized by this pack. Migration evidence comes only from a disposable local PostgreSQL 16 database.
