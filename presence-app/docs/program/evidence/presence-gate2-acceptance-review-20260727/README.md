# Presence Gate 2 Acceptance / Hardening Review

Review date: 2026-07-28.

## Verdict

SUPERSEDED BY AUTH-MOCK HARDENING CLOSEOUT - ACCEPT GATE 2.

Gate 2 owner capability is proven locally against the real BBBVision backend path. The remaining auth-mock blocker identified in this review was closed on 2026-07-28; see `docs/program/evidence/presence-gate2-auth-mock-hardening-20260727/README.md`.

## Summary

The M1.5-M6 proof chain now demonstrates that an owner can shape real BBBVision content through private V3 overlays: edit Work `2901`, organise it into Room `gallery`, privately curate it into Collection `292`, save/reload, preview honestly, recover from a stale base, and keep public output unchanged.

This review originally held acceptance on one security posture issue: browser client support for `NEXT_PUBLIC_E2E_AUTH_TOKEN` when `NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK=true`. That support has now been removed from runtime client auth, and the proof path was rerun cleanly.

## Hardening completed in this review

- Backend private-state source validation now checks non-numeric `legacy-object:*` refs against the locked current base config.
- Backend private-state source validation now allows `collection:loaded-owner-library` only when the Room actually has Collections.
- Backend tests now reject `legacy-object:not-in-current-base` with zero mutation.
- Preview/review copy no longer claims the public route is off; it states that the action does not publish or change the public payload.
- Protected placement actions now use real disabled buttons, not only `aria-disabled`.
- M1.5, M2, and M3 real-backend proof specs now seed local owner storage and cookie consistently with M4-M6.

## Files changed

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_studio_v3_backend_foundation.py`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\PresenceStudioV3Shell.tsx`
- `C:\Dev\Flora_fauna\presence-app\components\presence-studio-v3\StudioV3ArrangeControls.tsx`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\sourceTruth.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m15-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m2-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m3-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\tests\e2e\presence-gate2-m4-bbbvision-real-backend.spec.ts`
- `C:\Dev\Flora_fauna\presence-app\docs\program\evidence\presence-gate2-acceptance-review-20260727\README.md`

## Commands/tests run

- `cmd /c npm run typecheck` - passed.
- `cmd /c npm run build` - passed.
- `npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts` - passed, 47 tests.
- `npx.cmd tsx --test lib\api\studioV3.test.ts` - passed, 2 tests.
- `python -m py_compile app\api\presence_graph.py app\services\presence_studio_v3_state.py` - passed.
- `python -m pytest tests\test_presence_gate2_bbbvision_local_seed.py tests\test_presence_studio_v3_backend_foundation.py -q` - passed, 40 tests. Warnings were SQLAlchemy legacy API warnings plus pytest cache write warning.
- `npx.cmd playwright test tests/e2e/presence-gate2-m15-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 2 tests.
- `npx.cmd playwright test tests/e2e/presence-gate2-m2-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m3-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m4-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test after wording assertions were updated.
- `npx.cmd playwright test tests/e2e/presence-gate2-m5-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m6-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.

## Evidence reviewed

- `docs/program/evidence/presence-gate2-m1-owner-content-source-truth-20260727/README.md`
- `docs/program/evidence/presence-gate2-target-switch-bbbvision-20260727/README.md`
- `docs/program/evidence/presence-gate2-m15-bbbvision-local-seed-connect-20260727/README.md`
- `docs/program/evidence/presence-gate2-m2-first-real-work-edit-bbbvision-20260727/README.md`
- `docs/program/evidence/presence-gate2-m3-bbbvision-private-organisation-20260727/README.md`
- `docs/program/evidence/presence-gate2-m4-safe-draft-private-preview-20260727/README.md`
- `docs/program/evidence/presence-gate2-m5-persistence-recovery-rebase-20260727/README.md`
- `docs/program/evidence/presence-gate2-m6-bbbvision-private-collection-curation-20260727/README.md`

## Gate 2 minimum pass finding

Product capability passes locally:

- Owner can add/edit at least one real Work/Piece via private Work `2901` title overlay.
- Owner can organise content into a Room via private `gallery` placement and arrangement.
- Owner can organise content into a Collection via private `collectionSourceRef: collection:292` curation overlay.
- Draft/private changes can be previewed in an explicitly local/private preview.
- Save/reload works through owner-private V3 state.
- UI does not imply publish or public persistence.
- Public BBBVision remains unpublished/non-public.

Gate 2 acceptance is no longer held by the auth mock item. The hardening closeout accepted Gate 2 for local/dev owner capability.

## Owner capability finding

Owner capability is coherent enough for Gate 2 local/dev proof. The route uses real BBBVision owner Works and Collections from the local backend, not placeholder or GGM material. Room `1` remains the empty/control target.

## Persistence safety finding

The product UI write ledger for the real proofs uses only:

- `PUT /api/presence/owner/rooms/29/editor/v3/state`
- `PUT /api/presence/owner/rooms/29/editor/v3/state/rebase`

No direct canonical Work/Collection write, draft replacement, preview POST, publish, booking, payment, or notification route was used by the product UI proof.

## Preview truth finding

The preview is labelled as local/private and not a public preview link. The wording now avoids an unproven unconditional claim that the public route is off.

## Public/private boundary finding

Real-backend proofs kept:

- `/api/presence/public/bbbvision` at 404.
- `/p/bbbvision` at 404.
- `/presence/bbbvision` free of private overlay copy when it returned a page.
- Room `1` free of BBBVision private overlay content.

## Mobile/accessibility finding

M1.5-M6 include mobile browser proof at a 390px viewport. Protected placement actions now use actual disabled buttons for keyboard/focus correctness.

## Remaining risks

- Media association is not accepted in Gate 2.
- Safe deletion/archive is not accepted in Gate 2.
- Server draft preview is still deferred.
- Direct Work/Collection PATCH remains canonical-row mutation and is not the accepted owner flow.
- Collection creation/editing remains private curation only, not full canonical Collection editing.
- Public launch, hosted proof, publish, booking, payment, and notification flows remain out of scope.
- Large moved legacy/reference folders are still present in the working tree and should be handled as a separate repository hygiene task before merge packaging.

## Rollback notes

- Revert the files listed above to remove this review's hardening and proof harness changes.
- If local BBBVision private state needs reset, clear only `PresenceStudioV3State` for room `29`.
- Do not alter hosted, production, or public data.

## Recommended next task

Proceed to Gate 3 design-system architecture planning only. Do not add publish, public sync, hosted launch, or direct canonical Work/Collection mutation without separate approval.
