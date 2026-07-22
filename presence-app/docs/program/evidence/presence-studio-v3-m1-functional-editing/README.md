# Presence Studio V3 M1 Functional Creator Editing evidence

Status: scoped publish-free validation and evidence refresh complete; independent no-merge review pending
Branch: `feat/presence-studio-v3-m1-functional-editing`
Starting commit: `c33c56913d3e55f65e257b97432abe987f773cf0`
Prerequisites: P1 Foundation `5f33f353cc8266ad13b315a423b1789f8bd3611b`; hosted gate `c33c56913d3e55f65e257b97432abe987f773cf0`
Fixture boundary: sanitized BBB / `bbbvision` only

## Delivered outcome

M1 turns the hosted V3 shell into a bounded owner editor:

- copy, caption, CTA-label, existing-media, placement, visibility, Look, treatment, background, typography, and motion edits compile immediately on the private canvas;
- registered-zone drag/drop plus keyboard/tap alternatives provide constrained direct manipulation;
- owner Works, canonical Collections, and Room-native BBB Pieces appear in one truthful Library without a synthetic Collection;
- a narrow owner-private inventory upload returns a stable `media_id` without attaching to or rewriting draft/public configuration;
- canonical Create Work remains disabled because its current contract can mutate the live owner Library;
- private save reports saving, success, failure, conflict, memory-only, disabled, retry, and guarded reload states without implying publish;
- Threshold Portal, Gallery Wall, and Film Strip preview visibly distinct structures before Apply and cancel exactly;
- editor bridge, required CTA, owner/session fencing, metadata bounds, and unsafe-reference rejection keep the loop fail-closed.

No deployment, hosted write, hosted/production publish invocation, public BBB mutation, all-room gate expansion, auth weakening, or production data use occurred. An earlier accidental test command reached a local mock publish handler only; it caused no hosted/production mutation, is excluded from evidence, and is disclosed in `VALIDATION_RECORD.md`.

## Upload boundary

The existing canonical Work-create path remains outside M1. M1 adds only `inventory_only=1` to the already owner-authorized media upload route. It is accepted only when private-draft storage and its media-record migration are verified. The response policy is exactly `private_draft_inventory_only`; the route creates an owner/Room-scoped `draft_uploaded` media record and returns `draft: null` or the unchanged current draft. It does not call draft attachment, draft replacement, publish, or canonical Work creation.

V3 metadata persists `mediaId`, never the signed preview URL, file bytes, blob URL, path, token, or raw payload. Canonical Create Work stays visibly disabled with an adjacent reason.

## Evidence index

- `EXEC_PLAN.md`
- `M1_GAP_AUDIT.md`
- `EDITABILITY_MATRIX.md`
- `LIBRARY_UPLOAD_MATRIX.md`
- `DIRECT_MANIPULATION.md`
- `BOTTOM_BAR_VISUAL_SELECTION.md`
- `SAVE_FEEDBACK.md`
- `TEST_MATRIX.md`
- `ACCEPTANCE_TRACEABILITY.md`
- `MANUAL_QA.md`
- `SCREENSHOT_INDEX.md`
- `SECURITY_PRIVACY_REVIEW.md`
- `PUBLIC_INVARIANCE.md`
- `REQUEST_LEDGER.md`
- `VALIDATION_RECORD.md`
- `ROLLBACK.md`
- `FOLLOW_UPS.md`
- `NO_MERGE_REVIEW.md`
- `screenshots/`

## Completion gate

The final scoped publish-free gate is green: typecheck; 45 frontend compiler/API tests; 35 focused backend tests with the publish-synchronization source test deselected; backend syntax compilation; 23 canonical V3 Chromium scenarios; 3 publish-free public eligibility/payload scenarios; 1 named publish-free gallery public-Enter scenario; 27 public unit tests; mock syntax; production build; diff hygiene; and 18/18 screenshot decode/hash/inspection. The second frozen-tree review's layout-transition save and legacy placement-visibility blockers now have focused save/reload regressions. `V3-BRIDGE-004` and `V3-EDIT-001` remain `PARTIAL`, and the documented deferred/manual gates remain open. Commit remains permitted only after a fresh independent reviewer returns exact `VERDICT: MERGE`. Push, deployment, publish, and hosted mutation remain unauthorized.
