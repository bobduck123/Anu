# Work Order: Gate 4 M3A Atelier Private Catalog Staging

## Project

Presence

## Why now

Gate 4 M1 identified Atelier as the safest complete reference packet, and Gate 4 M2 approved Atelier-first as the next implementation slice if it stays frontend/private catalog metadata only.

## Goal

Stage `03-atelier` / Brass Inlay x Refractive Threshold in the V3 frontend catalog without claiming public renderer support or backend persistence.

## In Scope

- Add TypeScript catalog IDs for Brass Inlay, Refractive Threshold, Atelier piece treatments, and Atelier atmospheres.
- Add catalog definitions with mobile, reduced-motion, performance, safety, and evidence posture.
- Add one blocked/private compatibility row for Brass Inlay x Refractive Threshold.
- Preserve accepted Gate 3 active P1 hydration/compiler catalog.
- Add focused compiler/catalog tests.
- Add M3A evidence and update Gate 4 tracker/ExecPlan.

## Out Of Scope

- Backend validator changes.
- Backend save/reload proof for new Atelier IDs.
- Public renderer adapter.
- Public route or public payload projection change.
- WebGL, shader, cube-camera, material sampler, or generated measured-plate implementation.
- Soundings import.
- GGM conversion.
- `05-meridian` or slots `06` through `10`.
- 10 Looks / 10 Room Styles acceptance.
- Publish, deploy, merge, push, auth, tenant, payment, production data, stash apply/pop, or Gate 5.

## Acceptance Criteria

- Existing Gate 3 style selections still compile.
- Atelier metadata is represented without public renderer claims.
- Atelier IDs are not active P1 hydrated Looks and cannot be applied to a hydrated P1 document.
- Atelier pairing is blocked until adapter and backend persistence work is separately approved.
- Backend validators are not changed.
- Public route/projection is not changed.
- `05-meridian` and slots `06` through `10` remain excluded from Gate 4 counts.
- `cmd /c npm run typecheck` passes.
- Focused compiler/catalog tests pass.
- `git diff --check` passes.
- `git diff --cached --check` passes after staging.

## Implementation Notes

The broad catalog can describe Atelier so later UI/adapter work has typed metadata. The active P1 catalog remains intentionally smaller so Gate 3 behaviour is preserved and new Atelier IDs are not saved through current backend paths.

The current V3 motion schema still uses V2 `still`, `gentle`, and `living`. Atelier's named behaviours stay evidence-only in M3A.

## Completion Summary

Summary: M3A staged Atelier as frontend/private catalog metadata only, with active owner controls and private metadata restore paths constrained to the accepted Gate 3 persistable facet set.
Files changed: `model.ts`, `styleCatalog.ts`, `p1Catalog.ts`, `p1State.ts`, `compiler.ts`, `compiler.test.ts`, `StudioV3LookControls.tsx`, this work order, M3A evidence, Gate 4 ExecPlan, and Gate tracker.
Tests run: `cmd /c npm run typecheck`; `cmd /c node --test lib\presence\studio-v3\compiler.test.ts`; `git diff --check`; `git diff --cached --check`.
Manual QA: Confirmed Atelier has broad catalog metadata but no public preset, no active P1 hydration entry, no active owner facet control entry, no backend validator change, and blocked/private compatibility behavior for missing and cross pairings.
Risks: Backend persistence and public renderer support remain deferred.
Rollback: Revert the M3A runtime/docs/tracker files only.
Next task: Review M3A, then decide whether M3B is a private no-save preview adapter or a backend validator extension.
