# Gate 2 M2 - First Real BBBVision Work Edit Evidence

Date: 2026-07-27

## Verdict

ACCEPT GATE 2 M2.

BBVision Work `2901` was edited through owner-private V3 metadata, saved, reloaded, and previewed locally without direct canonical Work mutation, draft replacement, publish, or public route change.

## Target

- App: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Local Studio route: `/studio/29/editor`
- Room id: `29`
- Slug: `bbbvision`

## Selected Work/Piece

- Work id: `2901`
- Slug: `bbb-opening-image`
- Canonical title before edit: `Opening image`
- Source ref: `work:2901`
- Edited field: private display title overlay
- Edited value: `Opening image - private M2 proof`

## Persistence Path

M2 uses existing owner-private V3 metadata:

- Frontend save route: `PUT /api/presence/owner/rooms/29/editor/v3/state`
- Metadata section: `object_edits`
- Overlay reference: `sourceRef: work:2901`
- Real local overlay room id: `threshold`
- Direct canonical Work PATCH/POST: not used
- Draft replacement/publish route: not used

## Save/Reload Proof

- Studio loaded at `/studio/29/editor` against `http://127.0.0.1:5015`.
- Owner Work card `work:2901` was selected from Owner Works, placed in the Room, edited, and saved privately.
- Saved private-state payload contained an `object_edits` row for `sourceRef: work:2901` with title `Opening image - private M2 proof`.
- Reload restored the private overlay in Studio.
- Canonical owner Work API still returned Work `2901` title as `Opening image` after save/reload.

## Preview Proof

- `Test as visitor` uses the in-memory/private V3 projection.
- The local visitor threshold control rendered the edited owner-private title in its accessible button label: `Set opening image to Opening image - private M2 proof`.
- This is preview proof only. It is not a server public preview and not publication.

## Public/Private Safety Proof

- `/api/presence/public/bbbvision` returned `404` before and after the edit.
- `/p/bbbvision` returned `404` after the edit and did not contain the private title.
- `/presence/bbbvision` remained unchanged/non-editor and did not contain the private title.
- Browser request ledger during the owner edit flow contained exactly one product write:
  - `PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state`
- No `PATCH /api/presence/owner/works/:workId`, Work POST, draft replacement, publish, public API write, or canonical Collection write was observed.

## Room 1 Control

- `/studio/1/works` still showed the empty owner Works state: `Add your first work`.
- Room `1` did not inherit BBBVision Works or Collections.

## Screenshots

- `screenshots/01-desktop-work-2901-private-title-edit.png`
- `screenshots/02-desktop-work-2901-saved-privately.png`
- `screenshots/03-desktop-work-2901-reloaded-private-overlay.png`
- `screenshots/04-desktop-test-as-visitor-private-overlay.png`
- `screenshots/05-mobile-work-2901-reloaded-private-overlay.png`
- `screenshots/06-public-p-bbbvision-unpublished.png`
- `screenshots/07-public-presence-bbbvision-unchanged.png`
- `screenshots/08-room-1-empty-works-control.png`

## Commands Run

```bash
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npx tsx --test lib\presence\studio-v3\compiler.test.ts --test-name-pattern "BBVision Work title edits"
npx.cmd playwright test tests/e2e/presence-gate2-m2-bbbvision-real-backend.spec.ts --project=chromium
```

Results:

- Typecheck: passed.
- Build: passed.
- Focused compiler/model proof: passed. Full file run under the provided command reported 45 passed.
- Real-backend Chromium proof: passed, 1 passed.

Attempted but not counted as pass:

```bash
npx.cmd playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium -g "newer draft base preserves published durable state"
```

Result: blocked because the existing local app server on port `3000` was running for inspection, while this mock-harness test expects to start its own isolated Next server. The process was stopped without stopping app server PID `26012`.

## Stale-State Note

The M2 implementation did not change stale-base logic. Gate 1 already proved the `Clear stale private state` UI manually. The M2 real-backend proof clears only owner-private V3 state before the test setup and saves/reloads against the current base.

## Risks

- This is a private overlay on a placed Work/Piece, not canonical Work editing.
- The canonical Work edit APIs still mutate `PresenceWork` rows directly and remain unsuitable for Gate 2 until a draft-safe contract exists.
- `Test as visitor` is still an in-memory/local projection, not a saved server visitor preview.
- Full stale-base rebase is still future Gate 2 persistence recovery work.

## Rollback

- Clear the private V3 state for room `29` through `DELETE /api/presence/owner/rooms/29/editor/v3/state`, or use the Studio stale/private clear UI when available.
- To remove the local BBBVision seed entirely, use the M1.5 marker-guarded backend reset:

```bash
python scripts\seed_presence_gate2_bbbvision_local.py reset --json
```

## Recommended Next Task

Gate 2 M3: organise one real BBBVision Collection or Room placement using private/draft-safe metadata, still without direct canonical Collection mutation or publish.
