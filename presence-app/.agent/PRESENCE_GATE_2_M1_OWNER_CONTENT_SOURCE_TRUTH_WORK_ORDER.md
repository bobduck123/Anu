# Work Order: Gate 2 Milestone 1 - V3 Owner Content Source Truth

## Project

Presence

## Why now

Gate 1 is accepted. Gate 2 cannot safely start real owner editing while room `1` has no canonical owner Works/Collections and V3 is still showing renderer-backed Room-native material. The first Builder slice must make source truth obvious before any CRUD journey is expanded.

## Task size

M

## Blast radius

Medium to high

## Agent route

Builder after ExecPlan acceptance, then Reviewer

## Goal

Make the V3 Studio accurately distinguish canonical owner Works, Collections, and renderer-backed Room-native material for the Gate 2 test room, with honest empty/import-needed states and no public output changes.

## Context

- Target app: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Gate 2 ExecPlan: `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- Current local room `1` has zero owner Works and zero Collections.
- Current V3 canvas material comes from Studio V2/base config chambers and objects.
- Current owner Work/Collection APIs exist but direct mutation is high risk.

## In scope

- Document room `1` source mapping in evidence.
- Make canonical Works empty/import-needed state explicit in the V3 shelf/home.
- Make Collections empty/import-needed state explicit.
- Keep renderer-backed Room-native material available only with clear labels.
- Remove or quarantine misleading placeholder/GGM/non-room-specific labels.
- Add focused frontend tests where possible for empty source states and labels.
- Capture desktop and mobile screenshots.
- Prove public output is unchanged.

## Out of scope

- Creating real Works.
- Editing real Works.
- Creating/editing Collections.
- Assigning Works to Rooms.
- Draft replacement.
- Publish.
- Public renderer changes.
- Backend schema or auth/tenant changes.
- Gate 3 style inheritance/registry.

## Inputs

- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3PieceShelf.tsx`
- `lib/presence/studio-v3/compiler.ts`
- `lib/api/owner.ts`
- Backend owner Works/Collections read endpoints

## Output required

- Reviewable diff limited to source-truth/empty-state UI and tests.
- Evidence README under `docs/program/evidence/`.
- Desktop and mobile screenshots.
- Public unchanged proof.

## Acceptance criteria

- Room `1` with zero canonical owner Works shows an owner-language empty/import-needed state.
- Zero Collections shows an owner-language empty/import-needed state.
- Renderer-backed Room-native material is labelled separately and not presented as owner Works.
- No placeholder/GGM content is implied as real owner content.
- No save UI implies that missing Works/Collections were persisted.
- Public route output is unchanged.
- Mobile source-truth UI is usable.

## Tests / QA

Required if code changes:

```bash
cmd /c npm run typecheck
cmd /c npm run build
```

Recommended focused checks:

```bash
cmd /c npx tsx --test <focused V3 source-state test>
cmd /c npm run test:e2e -- <focused V3 source-truth spec>
```

Manual QA:

- Load local `/studio/1/editor`.
- Inspect Home source notice.
- Open Pieces shelf and verify canonical Works/Collections empty states.
- Verify Room-native material label.
- Verify mobile layout.
- Verify public route unchanged.

## Evidence required

- Source map for room `1`.
- Desktop screenshot.
- Mobile screenshot.
- Public unchanged screenshot or test output.
- Commands/tests run.
- Risks and rollback notes.

## Human decision required

- Confirm room `1` remains the Gate 2 test room.
- Confirm whether placeholder/demo content should be fully removed or only allowed behind explicit demo labels.

## Stop conditions

- Room `1` is not the intended Gate 2 room.
- Correct owner Works source remains unclear.
- Fix requires public renderer changes.
- Fix requires auth/tenant changes.
- Work starts implementing real Works/Collections CRUD before source truth is accepted.

## Completion summary

- Summary: Implemented source-truth UI for Gate 2 M1. Owner Works, Collections, and renderer-backed room/base material are now separated in the V3 shelf; zero-owner-library state is tested; no Work/Collection CRUD or data seed was added.
- Files changed: `components/presence-studio-v3/PresenceStudioV3Shell.tsx`, `components/presence-studio-v3/StudioV3PieceShelf.tsx`, `lib/presence/studio-v3/sourceTruth.ts`, `lib/presence/studio-v3/index.ts`, focused V3 tests, tracker, ExecPlan, and evidence.
- Tests run: `npx tsx --test lib\presence\studio-v3\compiler.test.ts`; `npm run typecheck`; `npm run build`; focused Chromium V3 source-label, public-invariance, and mobile tests.
- Manual QA: local app restarted at `http://localhost:3000`; fresh controlled browser tab to `/studio/1/editor` reached the protected owner sign-in screen with no console errors, so final room `1` visual acceptance remains a human authenticated smoke.
- Risks: no canonical owner Works are migrated for room `1`; backend Work/Collection mutation and hard-delete paths remain high risk; no publish, server preview, Room assignment editing, or style inheritance was implemented.
- Rollback: revert the Gate 2 M1 source-truth helper, shelf/shell copy changes, focused test updates, and evidence folder. No data rollback required.
- Next task: Gate 2 M2 - first real owner Work edit contract, after human authenticated room `1` smoke.

## Follow-up target switch

2026-07-27: BBBVision is now approved as the primary local/dev Gate 2 owner-capability proof target. Room `1` remains the empty-state/public-invariance control room.

Important boundary:

- BBBVision target identity in the controlled local harness is room `29`, slug `bbbvision`, owner Studio path `/studio/29/editor`.
- BBBVision has canonical owner Work and Collection fixtures in the local e2e mock API.
- At target-switch time, the real local contract backend was not seeded with BBBVision; the later M1.5 local seed/connect slice superseded that gap.
- BBBVision target evidence is not public launch proof, not hosted launch proof, and not approval to publish or mutate hosted BBBVision.
