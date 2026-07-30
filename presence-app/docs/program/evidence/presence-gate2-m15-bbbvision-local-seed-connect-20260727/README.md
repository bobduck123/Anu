# Gate 2 M1.5 - BBBVision Local Seed/Connect Evidence

Date: 2026-07-27

## Verdict

READY FOR GATE 2 M2, with restrictions.

BBVision is seeded and connected to the real local contract backend as the primary Gate 2 owner-capability proof target. This is not launch proof, not hosted proof, not publish proof, and not approval for public BBBVision V3 launch.

## Seeded Target

- App: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Database: local `presence_contract_local`
- Room id: `29`
- Slug: `bbbvision`
- Studio route: `/studio/29/editor`
- Status: `draft`
- Visibility: `private`
- Public status: `draft`

## Seeded Content

Collections:

- `291` - Threshold Sequence
- `292` - Gallery Field

Works:

- `2901` - `bbb-opening-image` - Opening image - Collection `291`
- `2902` - `bbb-portrait-field` - Portrait field - Collection `291`
- `2903` - `bbb-stage-image` - Stage image - Collection `292`
- `2904` - `bbb-shadow-image` - Shadow image - Collection `292`

Draft/base state:

- One draft editable config seeded for room `29`.
- No published editable config seeded.
- No publish route executed.

Control target:

- Room `1` remains unchanged with zero owner Works and zero Collections.

## Files Changed

- `C:\Dev\Flora_fauna\flora-fauna\backend\scripts\seed_presence_gate2_bbbvision_local.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_gate2_bbbvision_local_seed.py`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m15-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_2_M2_FIRST_REAL_WORK_EDIT_BBBVISION_WORK_ORDER.md`

## Commands Run

Backend tests:

```bash
python -m pytest tests\test_presence_gate2_bbbvision_local_seed.py -q
```

Result: 4 passed.

Seed/idempotency/rollback:

```bash
python scripts\seed_presence_gate2_bbbvision_local.py seed --json
python scripts\seed_presence_gate2_bbbvision_local.py seed --json
python scripts\seed_presence_gate2_bbbvision_local.py reset --json
python scripts\seed_presence_gate2_bbbvision_local.py seed --json
```

Result:

- First seed created room, 2 Collections, 4 Works, and draft config.
- Second seed created no duplicates.
- Reset removed only the marker-owned local BBBVision seed.
- Final seed restored BBBVision for M2 inspection.

Frontend checks:

```bash
cmd /c npm run typecheck
npm run build
```

Result: passed.

Real-backend browser proof:

```bash
npx.cmd playwright test tests/e2e/presence-gate2-m15-bbbvision-real-backend.spec.ts --project=chromium
```

Result: 2 passed.

## API Proof

Against the proof backend on `http://127.0.0.1:5015`:

- Owner Works: 200
- Owner Collections: 200
- Owner editor: 200
- V3 private state: 200
- Public BBBVision API: 404

Against the existing backend on `http://localhost:5000`:

- Owner Works: 200
- Owner Collections: 200
- Owner editor: 200
- V3 private state: 404 because that server was not started with the V3 backend flag
- Public BBBVision API: 404

## Browser Proof

Screenshots:

- `screenshots/01-studio-29-editor-desktop.png`
- `screenshots/02-studio-29-works.png`
- `screenshots/03-studio-29-collections.png`
- `screenshots/04-studio-29-private-visitor-preview.png`
- `screenshots/05-public-bbbvision-unpublished.png`
- `screenshots/06-room-1-empty-works-control.png`
- `screenshots/07-studio-29-editor-mobile.png`

## Public Safety

Public BBBVision remains unpublished:

- `/api/presence/public/bbbvision` returns 404.
- `/p/bbbvision` browser proof shows unpublished/not found state.
- No published config was created for room `29`.
- No publish endpoint was called.

## Rollback

Use:

```bash
python scripts\seed_presence_gate2_bbbvision_local.py reset --json
```

The reset refuses to remove BBBVision unless room `29`/`bbbvision` carries the local M1.5 seed marker.

## Remaining Risks

- Direct Work PATCH updates canonical `PresenceWork` rows. It is not a draft-only save path.
- Direct Collection PATCH updates canonical `PresenceCollection` rows. It is not a draft-only save path.
- Work delete is hard delete.
- Collection delete detaches Works and hard deletes the Collection.
- Gate 2 M2 must use owner-private/draft-safe persistence or explicitly block save unless the human approves direct canonical mutation risk.
- The existing backend on port `5000` may need restart with `PRESENCE_STUDIO_V3_BACKEND_ENABLED=1` before V3 private-state routes are available there for BBBVision.

## Recommended Next Task

Proceed to Gate 2 M2: first real BBBVision Work/Piece edit, using the real local seed, with no direct canonical Work PATCH unless explicitly approved after risk review.
