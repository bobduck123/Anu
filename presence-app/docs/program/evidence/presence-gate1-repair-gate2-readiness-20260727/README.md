# Presence Gate 1 Repair / Gate 2 Persistence-Readiness Evidence

Date: 2026-07-27
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
Local room: `1` / `presence-contract-room`

## Summary

This slice repairs the local stale-base dead end without approving publish, launch, or broad persistence. The V3 Studio now exposes an explicit owner action to clear stale owner-private V3 state, reloads the current base, and keeps visitor/public output unchanged.

## Acceptance closeout

Human note recorded on 2026-07-27:

```text
2026-07-27 - Human check confirmed the `Clear stale private state` action works through the UI. Gate 1 stale-base dead end is no longer blocking acceptance.
```

Gate 1 closeout status: `Accepted - human smoke confirmed clear stale private state works`.

This acceptance is limited. Canonical owner Works are not migrated yet, style inheritance is deferred, private-state clear is a blunt Gate 1 recovery rather than final Gate 2 rebase UX, public site remains unchanged, and no publish exists.

## Stale-base finding

The previous `Reload latest` action only reloaded the browser. Because the stale private state still existed in the backend, the editor reloaded into the same `Conflict - stale base` state.

The repair adds owner-only `DELETE /api/presence/owner/rooms/:roomId/editor/v3/state`, deletes only the room-scoped owner-private V3 metadata row, and leaves draft/published Presence configs untouched. Backend tests prove wrong-owner access is rejected and clearing allows a new private save against the current base with `metadata_revision: 0`.

## Content-source finding

The apparent wrong pieces were not canonical owner Works. Room `1` currently has no canonical owner Works loaded into the V3 canvas, so the compiler is showing renderer-backed Room-native base objects from the existing Studio V2/base config. The UI now says this directly and removes the misleading non-BBB `BBB pilot` / `Room-native BBB Pieces` labels for the local room.

## Gallery/style inheritance finding

The active room style is currently projected from the existing renderer layout default (`gallery-wall`). Ancestor style inheritance / uniform nature style selection is not implemented in this Gate 1 repair slice. The editor now displays that as a state notice rather than presenting it as final inherited style behavior.

## Browser proof

- Before repair: `screenshots/01-desktop-stale-before.png`
- After explicit clear and private save: `screenshots/02-desktop-after-clear-and-save.png`
- Mobile after clear/save: `screenshots/03-mobile-after-clear-and-save.png`

Observed browser states:

- Before: `savePhase=conflict`, durable base state `mismatch`, `Save private state` disabled, action label `Clear stale private state`.
- After backend clear and editor reload: durable base state `current`, `Save private state` enabled, `Test as visitor` enabled, server preview still disabled as `Server preview deferred`.
- After browser save: `savePhase=saved`, text `Saved privately. Still unpublished. Visitor site unchanged.`
- In-memory visitor test: shell entered `is-testing-visitor`; editor topbar was absent.
- Mobile: `390x844` viewport, `scrollWidth=375`, saved state visible, save button enabled.

Note: the in-app browser mouse-input channel timed out twice on the clear button during automated proof. The owner-only clear endpoint was therefore invoked directly for that browser proof. Human review later confirmed the same `Clear stale private state` UI action works through the local browser.

## Commands/tests run

- `python -m py_compile app\api\presence_graph.py app\services\presence_studio_v3_state.py tests\test_presence_studio_v3_backend_foundation.py`
- `python -m pytest tests/test_presence_studio_v3_backend_foundation.py::test_private_state_revision_and_base_conflicts_have_zero_mutation tests/test_presence_studio_v3_backend_foundation.py::test_private_state_requires_explicit_rebase_and_preserves_published_state_when_a_draft_appears tests/test_presence_studio_v3_backend_foundation.py::test_wrong_owner_cannot_read_or_replace_private_state_or_atomic_draft -q`
- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- `cmd /c npm test -- lib/api/studioV3.test.ts` failed because no `test` script exists.
- `cmd /c npx tsx --test lib/api/studioV3.test.ts`

## Manual QA performed

- Loaded `http://localhost:3000/studio/1/editor` against local backend `http://127.0.0.1:5000`.
- Captured stale-base conflict before repair.
- Cleared stale owner-private state through the new owner-only backend contract.
- Reloaded editor and confirmed stale-base conflict cleared.
- Clicked `Save private state` in the browser and confirmed private save succeeded.
- Entered local in-memory `Test as visitor` and confirmed editor chrome was removed.
- Checked mobile layout after save at `390x844` and confirmed no horizontal overflow.

## Risks

- This is still owner-private V3 metadata persistence only. It is not draft replacement, publish, server visitor preview, production persistence, or launch approval.
- Direct API clear was used for automated browser proof because the in-app browser input channel timed out on the clear button. Human smoke has since confirmed the clear button works through the UI.
- Correct canonical Works migration for room `1` remains unimplemented.
- Ancestor style inheritance remains unimplemented.

## Rollback notes

- Frontend rollback: remove the clear-state client call, source/style notices, and mobile CSS additions.
- Backend rollback: remove `DELETE` handling from `/editor/v3/state` and remove `clear_studio_v3_private_state`.
- Data rollback: no public or published data was changed by this slice. The local owner-private V3 state for room `1` was cleared and then re-saved during QA.

## Remaining work

- Gate 2 should define reviewed rebase semantics if preserving private V3 edits across base changes is required.
- Gate 2/3 should define canonical content migration and style inheritance/registry behavior.

## Recommended next task

Review and accept the Gate 2 ExecPlan before assigning Builder work.

## Gate 1 acceptance recommendation

Accepted. Human smoke confirmed the clear-state UI action works. Gate 2 remains separate and must not infer canonical Works migration, style inheritance, publish, or final rebase UX from this Gate 1 acceptance.
