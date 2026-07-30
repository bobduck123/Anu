# Presence Gate 2 M1 - Owner Content Source Truth Evidence

Date: 2026-07-27
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend inspected: `C:\Dev\Flora_fauna\flora-fauna\backend`
Current target update: BBBVision local/dev room `29` / slug `bbbvision` is now the primary Gate 2 owner-capability target. Room `1` / `presence-contract-room` remains the empty-state and public-invariance control.

## Summary

This slice makes V3 Studio source truth explicit before real owner content editing begins. The owner shelf now separates owner Works, owner Collections, and renderer-backed room/base material. It does not create Works, edit Collections, change Room assignment, publish, or alter public renderer output.

## Files changed in this slice

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3PieceShelf.tsx`
- `lib/presence/studio-v3/sourceTruth.ts`
- `lib/presence/studio-v3/index.ts`
- `lib/presence/studio-v3/compiler.test.ts`
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`
- `tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`
- `tests/e2e/presence-studio-v3-public-invariance.spec.ts`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `.agent/PRESENCE_GATE_2_M1_OWNER_CONTENT_SOURCE_TRUTH_WORK_ORDER.md`

## Content-source map

- V3 canvas still hydrates from the selected editable config: draft first, otherwise published.
- Renderer-backed room/base material comes from Studio V2 chambers and objects and is represented as `legacy-object:<object-id>`.
- Owner Works come only from canonical Work rows loaded through `GET /api/presence/owner/nodes/:nodeId/works` and represented as `work:<id>`.
- Owner Collections come only from canonical Collection rows loaded through `GET /api/presence/owner/nodes/:nodeId/collections` and represented as `collection:<id>`.
- Room placement in this slice remains inherited from the current room/base config plus private V3 placement metadata. Owner-owned Room assignment editing is not enabled.

## Canonical Works and Collections finding

Local room `1` has zero owner Works and zero Collections in the local contract backend, as recorded in the Gate 2 ExecPlan. This slice did not seed local Works because an honest empty/import-needed state is safer than creating local rows before the first real editing contract.

Human target switch after this slice: BBBVision is approved as the primary local/dev Gate 2 owner-capability proof target. Current BBBVision owner-content proof is available through the controlled local e2e mock harness, not through the real local contract backend. It does not mean room `1` has been migrated or seeded, and it is not public or hosted launch proof.

The new source summary test proves the zero-owner-library state produces:

- `0` owner Works;
- `0` Collections;
- `1` renderer-backed base item in the focused fixture;
- no GGM, placeholder, raw `work:<id>`, raw `collection:<id>`, or `loaded-owner-library` text in the empty-source summary.

## Renderer-backed room material finding

Renderer-backed material remains visible for current canvas continuity, but is now labelled as `Renderer-backed room/base material` or `Renderer-backed BBB base material` in the BBB harness. It is no longer counted in the Owner Works tab count.

## Placeholder / GGM leak finding

No placeholder, GGM, or loaded-owner-library label is presented as owner content by the changed V3 shelf/source-summary path. Existing GGM references remain in unrelated legacy/test fixtures and were not touched.

## Local data changes

None. No canonical owner Works or Collections were seeded. No backend rows were created, patched, or deleted by this slice.

## Public/private safety

The public-invariance browser test passed. The test edited private V3 state, entered local Test as visitor, then proved both `/p/bbbvision` and `/presence/bbbvision` public routes remained unchanged and the public API did not expose private V3 metadata.

## Commands/tests run

- `cmd /c npx tsx --test lib\presence\studio-v3\compiler.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium -g "M1 Library exposes"`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium -g "leave both BBB public routes"`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium -g "mobile bottom bar"`

## Manual QA

- Restarted the local app at `http://localhost:3000`.
- Opened a controlled in-app browser tab to `http://localhost:3000/studio/1/editor`.
- Fresh controlled browser access reached the protected owner sign-in screen with no console errors. This is the expected route guard for an unauthenticated tab, but it means final room `1` visual acceptance still needs a human authenticated local smoke check.
- The owner-auth Playwright harness loaded the Studio route and verified source labels, local Test as visitor, public invariance, and mobile flow.

## Screenshots

- `screenshots/01-owner-works-and-base-material.png`
- `screenshots/02-owner-collections.png`
- `screenshots/03-mobile-owner-flow.png`
- `screenshots/04-local-test-as-visitor.png`
- `screenshots/05-public-p-bbbvision-unchanged.png`
- `screenshots/06-public-presence-bbbvision-unchanged.png`

## Risks

- The real local room `1` source-truth UI still needs human authenticated browser inspection because a fresh controlled tab is correctly auth-gated.
- This does not migrate canonical owner Works.
- This does not implement real Work editing, Collection editing, Room assignment editing, draft replacement, server visitor preview, publish, or style inheritance.
- Existing backend Work/Collection mutation and hard-delete paths remain high risk and were not exposed in V3.

## Rollback notes

Revert this slice's source-truth helper, shelf/shell label changes, focused test updates, and this evidence folder. No local or hosted data rollback is required because no data was changed.

## Remaining work

- Gate 2 M2: first real BBBVision Work/Piece edit against `/studio/29/editor` in the approved local/dev harness, or stop first for a separate local BBB backend seed/connect decision if real contract-backend persistence is required.
- Keep room `1` as the empty-state/public-invariance control.
- Later Gate 2: reviewed Collection/Room assignment and safer stale-state recovery if blunt clear is no longer acceptable.

## Recommended next task

Gate 2 M2 - First real BBBVision Work/Piece edit contract.

## Gate 2 M1 recommendation

Accept as the room `1` source-truth/control slice. It does not pass Gate 2 owner capability by itself; M2 must prove the first real BBBVision Work/Piece edit.
