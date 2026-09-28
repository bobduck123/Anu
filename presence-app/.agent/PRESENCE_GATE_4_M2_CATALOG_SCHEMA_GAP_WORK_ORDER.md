# Work Order: Gate 4 M2 Catalog Schema Gap Decision

## Project

Presence

## Why now

Gate 4 M1 found Atelier is the safest first runtime import candidate, but the accepted Gate 3 V3 catalog is intentionally narrow. M2 decides what can be represented honestly before any runtime catalog implementation begins.

## Task size

M

## Blast radius

Low for docs/evidence. Medium for any follow-on runtime catalog changes. High if backend private-state validators or public renderers are changed, which is out of scope for M2.

## Agent route

Codex main builder, Explorer-style schema audit first.

## Goal

Compare the current Gate 3 V3 style catalog/model against the Atelier and Soundings reference manifests, decide whether Atelier can be the first safe import, and define the smallest safe M3 implementation slice.

## Context

- Gate 1/Gate 2/Gate 3 accepted in commit `3d2097e`.
- Gate 4 M1 completed the reference baseline board.
- `03-atelier` is fixture-only, safety tier A, and has manifest/GAPS/screens.
- `04-soundings` has manifest/GAPS/screens but introduces audio, access-state, and fixture-refusal risks.
- `05-meridian` has no manifest/GAPS/evidence packet and must not count.
- Slots `06`-`10` are missing.

## In scope

- Inspect current V3 model and catalog types.
- Inspect Atelier and Soundings manifests.
- Inspect reference-program requirements relevant to Atelier/Soundings.
- Identify union types that block new library primitives.
- Identify which current definition fields can carry Atelier metadata honestly.
- Identify which Atelier fields remain evidence-only/deferred.
- Decide whether Soundings remains deferred.
- Decide whether backend validator changes are required for the smallest M3 slice.
- Update Gate 4 evidence, ExecPlan, and tracker.

## Out of scope

- Runtime catalog implementation.
- Public renderer changes.
- Public routes.
- Publish or public sync.
- Backend validator changes.
- Auth, tenant, payment, production data, hosted deployment, merge, push, or stash operations.
- Soundings import.
- GGM fixture conversion.
- Completing `05-meridian` or slots `06`-`10`.
- Gate 5/Fable.

## Inputs

- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_M1_REFERENCE_BASELINE_WORK_ORDER.md`
- `C:\Dev\Flora_fauna\presence-app\docs\program\evidence\presence-gate4-m1-reference-baseline-20260730\README.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\styleCatalog.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\model.ts`
- `C:\Dev\presence-reference\03-atelier\presence.manifest.json`
- `C:\Dev\presence-reference\04-soundings\presence.manifest.json`
- `C:\Dev\.agent\reference-program\REQUIREMENTS_REGISTER.md`

## Output required

- Evidence README under `docs/program/evidence/presence-gate4-m2-catalog-schema-gap-20260730/`.
- This work order.
- Gate 4 ExecPlan update.
- Gate tracker update.

## Acceptance criteria

- No runtime code changed.
- Atelier-first import is either approved or blocked with concrete reasons.
- Soundings remains deferred or receives a concrete approval path.
- Backend validator change is explicitly marked required or not required for M3.
- `05-meridian` and slots `06`-`10` remain excluded from runtime counting.
- `git diff --check` passes.
- `git diff --cached --check` passes after staging.

## Decision

Atelier-first is approved as the next recommended implementation slice, but only as a frontend/private catalog metadata import. No backend persistence of new IDs is allowed in that smallest slice.

Soundings remains deferred until audio, access-state, reduced-audio, institutional-refusal, and public-route posture are decided.

Backend validator changes are not required for the smallest M3A slice if it avoids save/reload of new IDs. Backend validator changes are required before persisted private state can carry new Atelier IDs.

## Recommended M3 Slice

Gate 4 M3A - Atelier private catalog metadata import:

- Add frontend TypeScript catalog IDs and definitions for Brass Inlay and Refractive Threshold.
- Add metadata entries for Atelier treatments and atmospheres.
- Keep public renderer support `private-preview-only` or `metadata-only`.
- Add one internal/review-only pairing.
- Add tests proving catalog helpers, guardrails, and public-invariance boundaries.
- Do not change backend validators unless a separate approved task scopes persistence.

## Tests / QA

- `git diff --check`
- `git diff --cached --check`
- Docs inspection

Runtime tests are not required unless the task expands into implementation.

## Evidence required

- `docs/program/evidence/presence-gate4-m2-catalog-schema-gap-20260730/README.md`

## Human decision required

- Confirm M3A may edit the frontend runtime catalog.
- Confirm whether M3A should allow owner-control selection as internal-review only or remain metadata-only.
- Confirm whether backend persistence of new IDs should be a separate M3B/M4 task.

## Stop conditions

- M3 proof is expected to save/reload new IDs through the backend.
- Public renderer support becomes required.
- Backend validator, auth, tenant, payment, deploy, publish, merge, push, or stash work appears necessary.

## Completion summary

Summary: M2 completed as docs/evidence only.
Files changed: this work order, M2 evidence README, Gate 4 ExecPlan, Gate tracker.
Tests run: `git diff --check`; `git diff --cached --check`.
Manual QA: Compared V3 catalog/model/backend allowlists against Atelier/Soundings manifests.
Risks: Atelier import remains non-public and non-persisted until follow-on implementation validates it.
Rollback: Remove this work order/evidence and restore ExecPlan/tracker M2 entries.
Next task: Run M3A only after explicit approval to edit frontend catalog runtime code.
