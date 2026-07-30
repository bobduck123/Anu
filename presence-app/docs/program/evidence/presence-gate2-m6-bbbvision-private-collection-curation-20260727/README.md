# Gate 2 M6 - BBBVision Private Collection Curation Evidence

Date: 2026-07-27

## Verdict

ACCEPT M6.

Real-backend BBBVision private Collection curation proof passed on 2026-07-28 against the local contract backend. Owner token was loaded from the local backend environment for the run and was not printed or recorded.

## Summary

- Target app: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Selected Work: `2901`, `work:2901`, canonical title `Opening image`
- Selected Collection: `292`, `collection:292`, canonical title `Gallery Field`
- Private title overlay preserved: `Opening image - private M2 proof`
- Private Room placement preserved: `gallery` / `main-wall` / `large`
- Private Collection curation overlay: `placements[].collectionSourceRef = collection:292`

## Files Changed

- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\PresenceStudioV3Shell.tsx`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\StudioV3ArrangeControls.tsx`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\presence-studio-v3.css`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\editing.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\p1State.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\compiler.test.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-studio-v3-bbb-prototype.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m6-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_M6_PRIVATE_COLLECTION_CURATION_BBBVISION_WORK_ORDER.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`

## Private Overlay Payload Shape

```text
placements[0].sourceRef: work:2901
placements[0].roomId: gallery
placements[0].status: placed
placements[0].collectionSourceRef: collection:292
object_edits[0].sourceRef: work:2901
object_edits[0].title: Opening image - private M2 proof
object_edits[0].zoneId: main-wall
object_edits[0].size: large
```

This is owner-private Studio metadata only. It is not canonical Work membership and not canonical Collection membership.

## Implementation Notes

- Added `setStudioV3PlacementCollection()` as a pure private-overlay edit.
- The function only works on an existing placed owner Work.
- It rejects room/base legacy material and unavailable Collections.
- The Arrange sheet now includes `Private Collection curation` controls.
- The action bar shows `Private Collection: Gallery Field` after selection/reload.
- The private preview source panel reports active private Collection curation.
- Restore/rebase now treats missing private Collection references as partial restore issues instead of silently accepting them.

## Commands And Tests

```text
npx.cmd tsx --test lib/presence/studio-v3/compiler.test.ts
```

Result: passed, 47 tests.

```text
cmd /c npm run typecheck
```

Result: passed.

```text
cmd /c npm run build
```

Result: passed.

```text
npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts -g "private Collection curation saves" --project=chromium
```

Result: passed, 1 Chromium test.

```text
npx.cmd playwright test tests/e2e/presence-gate2-m6-bbbvision-real-backend.spec.ts --project=chromium --reporter=line
```

Environment: `PRESENCE_GATE2_M6_REAL_BACKEND=1`, `PRESENCE_GATE2_M6_API_BASE=http://127.0.0.1:5015`, `PRESENCE_E2E_BASE_URL=http://127.0.0.1:3000`, local owner token loaded without printing.

Result: passed, 1 Chromium real-backend test.

## Mock Browser Proof

The passing mock proof covered:

- selected BBBVision owner Work `work:2901`;
- selected real BBBVision Collection `collection:292`;
- saved private state payload with `collectionSourceRef: collection:292`;
- reload restored the private Collection curation;
- private preview source panel reflected Collection curation;
- preserve-compatible rebase kept `collectionSourceRef: collection:292`;
- mobile Arrange sheet showed `Gallery Field`;
- product write ledger contained only:

```text
PUT /api/presence/owner/rooms/29/editor/v3/state
PUT /api/presence/owner/rooms/29/editor/v3/state/rebase
```

## Real-Backend Browser Proof

The passing real-backend proof covered:

- selected BBBVision owner Work `2901` / `work:2901`;
- selected BBBVision Collection `292` / `collection:292`;
- saved private metadata with `placements[].collectionSourceRef = collection:292`;
- reloaded Studio from durable private V3 state and restored the Collection curation;
- private preview showed the M2 title overlay, M3 Room placement, and M6 private Collection curation source;
- induced a stale base by replacing the local draft config through the test setup path;
- preserved the compatible private Collection curation overlay through `PUT /api/presence/owner/rooms/29/editor/v3/state/rebase`;
- proved canonical owner Works and Collections were byte-for-byte equal before and after the product UI flow;
- proved public BBBVision API stayed `404`, `/p/bbbvision` stayed `404`, and `/presence/bbbvision` did not expose the private title or private Collection curation language;
- proved room `1` did not show the BBBVision private overlay;
- captured desktop and mobile screenshots.

Product UI write ledger contained only:

```text
PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state
PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state/rebase
```

## Canonical Mutation Findings

- No direct canonical Work PATCH/POST was used by the product UI proof.
- No direct canonical Collection PATCH/POST was used by the product UI proof.
- No canonical Collection membership mutation was used.
- The unit proof asserts Work `2901` remains canonically assigned to Collection `291` while the private placement overlay uses `collection:292`.

## Public / Private Safety

- No publish path was added.
- No server public preview path was added.
- Private preview remains labelled local/private.
- M6 real-backend proof confirmed public BBBVision stayed unpublished/non-public and did not expose the private overlay.

## Screenshots

- `screenshots/01-m6-private-collection-curation-control.png`
- `screenshots/02-m6-private-save-with-collection-curation.png`
- `screenshots/03-m6-private-preview-collection-curation.png`
- `screenshots/04-m6-stale-base-compatible-collection-curation.png`
- `screenshots/05-m6-rebased-private-collection-curation.png`
- `screenshots/06-m6-mobile-collection-curation-control.png`
- `screenshots/07-m6-public-p-bbbvision-unpublished.png`
- `screenshots/08-m6-public-presence-bbbvision-unchanged.png`
- `screenshots/09-m6-room-1-editor-control.png`
- `screenshots/mock-01-private-collection-curation-control.png`
- `screenshots/mock-02-private-preview-collection-curation.png`
- `screenshots/mock-03-preserve-compatible-collection-curation.png`
- `screenshots/mock-04-mobile-collection-curation-control.png`

## Risks

- M6 does not implement canonical Collection editing or creation.
- M6 does not implement deletion/archive.
- M6 does not implement server draft preview.
- Public launch remains blocked by later gates and human Gate 9 approval.

## Rollback Notes

- Revert the M6 frontend/model/test/doc files.
- Clear only owner-private V3 state for room `29` if local proof state needs cleanup.
- No canonical Work, canonical Collection, published config, public route, hosted, or production rollback is required for the implemented product path.

## Remaining Work

- Gate 2 still needs media association, draft validation, safe deletion/archive, and broader owner help language.

## Recommended Next Task

Proceed to a separately scoped Gate 2 media association, draft validation, or safe deletion/archive slice.
