# Gate 2 M5 - Persistence Recovery / Rebase Evidence

Date: 2026-07-27

## Verdict

ACCEPT Gate 2 M5 for the scoped local/dev BBBVision persistence recovery slice.

This M5 packet was later superseded by the Gate 2 M6 real-backend proof and auth-mock hardening closeout, which accepted Gate 2 for local/dev owner capability. M5 itself proves safer stale private-state recovery for compatible V3 overlays only.

## Summary

- Target app: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Control: room `1`
- Selected Work: `2901`, slug `bbb-opening-image`, canonical title `Opening image`, source ref `work:2901`
- Private overlay preserved: `Opening image - private M2 proof`
- Private placement preserved: Room `gallery`, zone `main-wall`, size `large`

## Files Changed

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\api\presence_graph.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_studio_v3_backend_foundation.py`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\PresenceStudioV3Shell.tsx`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\presence-studio-v3.css`
- `C:\Dev\Flora_fauna\presence-app\lib\api\studioV3.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\api\studioV3.test.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\mock-presence-api.mjs`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-studio-v3-bbb-prototype.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m5-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_M5_PERSISTENCE_RECOVERY_REBASE_WORK_ORDER.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`
- `C:\Dev\Flora_fauna\presence-app\docs\program\evidence\presence-gate2-m5-persistence-recovery-rebase-20260727\README.md`

## Stale-Base Reproduction Method

The real-backend Playwright proof:

1. Cleared existing owner-private V3 state for BBBVision room `29`.
2. Opened `/studio/29/editor` with the local owner token.
3. Created the M2/M3 private overlays for `work:2901`.
4. Saved owner-private V3 state through `PUT /api/presence/owner/rooms/29/editor/v3/state`.
5. Advanced the local BBBVision draft base by writing a test marker through the existing atomic draft replacement contract.
6. Reopened the editor and observed `data-durable-base-state="mismatch"`.

This was a deliberate local/dev test setup only. The product recovery action did not write the draft, publish, or mutate public routes.

## Recovery UI Copy

Conflict panel:

```text
Your private Studio changes were saved against an older base.
You can try to keep compatible changes on the latest base, or clear the stale private Studio state and start from the latest base.
Visitor site unchanged. Publish is unavailable. Canonical Works and Collections stay unchanged.
```

Compatible state:

```text
Compatible private changes can be preserved: title, Room placement, zone, and size overlays still reference current Works.
```

Actions:

```text
Keep compatible private changes
Clear stale private Studio state
```

## Recovery Path Implemented

- New backend endpoint: `PUT /api/presence/owner/rooms/:roomId/editor/v3/state/rebase`.
- The request carries:
  - stale expected base identity plus `metadata_revision`;
  - latest target base identity;
  - strict V3 private metadata envelope.
- The backend checks:
  - target base is the current locked draft/published config;
  - stored private state still matches the stale expected base;
  - stored private `metadata_revision` still matches;
  - metadata normalises through the V3 private-state contract;
  - Work/media source ownership remains valid.
- On success, only owner-private V3 state is updated to the latest base.

## Private Overlay Before

The stale private state contained:

```text
metadata_revision: 1
object_edits[0].sourceRef: work:2901
object_edits[0].title: Opening image - private M2 proof
object_edits[0].roomId: gallery
object_edits[0].zoneId: main-wall
object_edits[0].size: large
placements[0].sourceRef: work:2901
placements[0].roomId: gallery
placements[0].status: placed
```

## Private Overlay After Preserve

Final backend read after the passing proof:

```text
metadata_revision: 2
base.config_id: 2
base.source_kind: draft
base.status: draft
base.revision: 6
base.fingerprint: 21bfac5a0c1db46e1966b958cd3d4113a87a12284f822ee96ead31fc5353f82d
object_edits[0].sourceRef: work:2901
object_edits[0].title: Opening image - private M2 proof
object_edits[0].roomId: gallery
object_edits[0].zoneId: main-wall
object_edits[0].size: large
placements[0].sourceRef: work:2901
placements[0].roomId: gallery
placements[0].status: placed
```

## Base Revision Finding

- Before stale-base simulation: private state was saved against the then-current draft base.
- Stale-base simulation advanced the draft revision.
- Preserve-compatible rebase updated the private state to the latest draft base revision.
- Final private-state read showed `base.revision: 6` and `metadata_revision: 2`.
- Reload after preservation showed `data-durable-base-state="current"` and no recovery panel.

## Private Preview Finding

After rebase and reload:

- `Private preview` remained labelled as local/private.
- Preview source panel said `Local preview - uses your unsent Studio changes`.
- The preserved title overlay was visible in private preview.
- The preview remained non-public and did not generate a public preview link.

## Public Route Finding

- `GET http://127.0.0.1:5015/api/presence/public/bbbvision` remained `404`.
- `/p/bbbvision` remained unpublished/404.
- `/presence/bbbvision` did not contain the private title overlay.
- No publish request was made.

## Canonical Work Mutation Finding

Canonical Works before and after matched exactly in the real-backend proof.

Final backend read confirmed:

```text
Work 2901 title: Opening image
Work 2901 collection_id: 291
Works present: 2901, 2902, 2903, 2904
```

The private title remained only in V3 private metadata.

## Canonical Collection Mutation Finding

Canonical Collections before and after matched exactly in the real-backend proof.

Final backend read confirmed:

```text
Collection 291: Threshold Sequence
Collection 292: Gallery Field
```

No Collection membership or ordering mutation was made.

## Clear / Discard Finding

The clear/discard action remains explicit in the stale-base UI:

```text
Clear stale private Studio state
```

The focused mock browser proof also covers an unsafe stale state where preservation is disabled because a private overlay references a missing Work. Clear remains available and uses only:

```text
DELETE /api/presence/owner/rooms/29/editor/v3/state
```

## Room 1 Isolation

The real-backend proof opened `/studio/1/editor` after the BBBVision recovery flow.

Findings:

- Room `1` did not contain `Opening image - private M2 proof`.
- Room `1` remained the control path.
- No BBBVision private overlay leaked into the control room.

## Product Write Ledger

Real-backend browser proof recorded only these product writes:

```text
PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state
PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state/rebase
```

Test setup used `DELETE /api/presence/owner/rooms/29/editor/v3/state` and the approved local draft replacement endpoint to manufacture the stale base.

Not used:

```text
PATCH/POST canonical Work
PATCH/POST canonical Collection
POST preview
POST publish
public sync
```

## Commands And Tests

```text
python -m py_compile app\api\presence_graph.py app\services\presence_studio_v3_state.py
```

Result: passed.

```text
python -m pytest tests\test_presence_studio_v3_backend_foundation.py::test_private_state_requires_explicit_rebase_and_preserves_published_state_when_a_draft_appears -q
```

Result: passed. Warnings were existing SQLAlchemy legacy API warnings plus a pytest cache write warning.

```text
cmd /c npx tsx --test lib\api\studioV3.test.ts
```

Result: passed, 2 tests.

```text
cmd /c npx tsx --test lib\presence\studio-v3\compiler.test.ts --test-name-pattern "reference metadata"
```

Result: passed. The runner executed the full file: 46 tests passed.

```text
cmd /c npm run typecheck
```

Result: passed.

```text
cmd /c npm run build
```

Result: passed.

```text
PRESENCE_GATE2_M5_REAL_BACKEND=1 npx.cmd playwright test tests/e2e/presence-gate2-m5-bbbvision-real-backend.spec.ts --project=chromium
```

Result: passed, 1 test.

```text
cmd /c npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium -g "newer draft base offers|stale base blocks preserve"
```

Result: passed, 2 tests.

## Manual QA

- Local backend was restarted from current code at `http://127.0.0.1:5015`.
- BBBVision seed status was checked: room `29`, slug `bbbvision`, four Works, two Collections, unpublished/private.
- Local frontend was restored at `http://127.0.0.1:3000` after the isolated mock proof.
- Real-backend Playwright captured desktop and mobile evidence for the owner flow.

## Screenshots

- `screenshots/01-m5-private-overlay-before-stale-base.png`
- `screenshots/02-m5-stale-base-recovery-choices.png`
- `screenshots/03-m5-preserve-compatible-success.png`
- `screenshots/04-m5-private-preview-after-rebase.png`
- `screenshots/05-m5-mobile-preview-after-rebase.png`
- `screenshots/06-m5-public-p-bbbvision-unpublished.png`
- `screenshots/07-m5-public-presence-bbbvision-unchanged.png`
- `screenshots/08-m5-room-1-editor-control.png`

## Risks

- M5 does not implement server draft preview.
- M5 does not implement Collection membership editing.
- M5 does not implement safe deletion/archive.
- Rebase only preserves metadata that passes the existing strict V3 private metadata restore and backend ownership checks.
- Hosted owner proof remains out of scope.
- Public launch remains blocked by later gates and human Gate 9 approval.

## Rollback Notes

- Revert the M5 backend, frontend, test, and doc files.
- Clear local owner-private V3 state for room `29` with `DELETE /api/presence/owner/rooms/29/editor/v3/state`.
- No canonical Work, canonical Collection, public route, published config, or hosted rollback is required.

## Remaining Work

- Gate 2 still needs private Collection membership/curation or real draft-safe Collection editing.
- Gate 2 still needs media association, draft validation, safe deletion/archive, and broader owner help language.
- Server draft preview remains deferred until V3 has an approved safe draft write path for product use.

## Recommended Next Task

Gate 2 M6: private Collection membership/curation overlay for BBBVision, preserving the same no-public-mutation and no-canonical-PATCH posture.
