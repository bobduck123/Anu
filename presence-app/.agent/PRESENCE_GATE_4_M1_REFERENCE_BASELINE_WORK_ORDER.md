# Work Order: Gate 4 M1 Reference Baseline Board

## Project

Presence

## Why now

Gate 4 needs a creative library, but the available reference programme currently has fewer than 10 complete reference packets. The first slice must prevent half-finished references from becoming runtime catalog truth.

## Task size

M

## Blast radius

Low for docs/evidence. Medium if it proceeds into catalog implementation.

## Agent route

Codex main builder, with Explorer-style audit first.

## Goal

Produce a reference baseline board for Gate 4 that identifies which reference Looks and Room Styles are complete, safe, incomplete, blocked, or ready for implementation planning.

## Context

- Gate 1/Gate 2/Gate 3 accepted in commit `3d2097e`.
- `presence-app` current catalog has 3 Looks and 3 Room Styles.
- Gate 4 target is 10 Looks, 10 Room Styles, 10 flagship pairings, and 30 supported pairings.
- Current references live at `C:\Dev\presence-reference`.
- `05-meridian` exists as a folder but does not yet have a manifest/GAPS/evidence packet.

## In scope

- Inspect `C:\Dev\presence-reference\README.md`.
- Inspect reference manifests and GAPS files for available slots.
- Record packet completeness for slots 01-05.
- Record missing slots 06-10.
- Map each ready reference to candidate Look, Room Style, Piece Treatments, Atmospheres, Motion Behaviours, public-safety posture, and import risk.
- Recommend first implementation order.
- Identify schema gaps against `lib/presence/studio-v3/styleCatalog.ts`.
- Update Gate 4 evidence.

## Out of scope

- Runtime catalog edits.
- Public renderer changes.
- Public routes or publish/sync paths.
- Auth, tenant, payment, backend validator, production data, or hosted deployment changes.
- Applying or popping the parked stash.
- Completing or modifying reference sites.
- Gate 5/Fable.

## Inputs

- `C:\Dev\presence-reference`
- `C:\Dev\.agent\reference-program\PROGRAM.md`
- `C:\Dev\.agent\reference-program\REQUIREMENTS_REGISTER.md`
- `C:\Dev\.agent\reference-program\QUALITY_AUDIT.md`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\styleCatalog.ts`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_EXECPLAN.md`

## Output required

- Evidence README under `docs/program/evidence/presence-gate4-m1-reference-baseline-<date>/`.
- Baseline table for references 01-10.
- Recommended import order.
- Schema-gap list.
- Human-decision list.
- Stop/go recommendation for Gate 4 M2.

## Acceptance criteria

- The board distinguishes complete references from incomplete references.
- `05-meridian` is not counted toward Gate 4 until its manifest/GAPS/evidence packet exists.
- GGM is marked internal/non-public unless fixture-safe replacement is approved.
- Soundings is marked blocked from public route posture until refusal/audio posture is approved.
- Atelier is evaluated as the first safe implementation candidate.
- No runtime code changed.

## Tests / QA

- `git diff --check`
- docs inspection

Runtime tests are not required unless the task expands into implementation.

## Evidence required

- `docs/program/evidence/presence-gate4-m1-reference-baseline-<date>/README.md`

## Human decision required

- Confirm whether to complete more reference sites before implementation.
- Confirm whether Atelier can be first runtime import.
- Confirm whether GGM can become fixture-safe registry metadata.
- Confirm Soundings audio/access-state posture.
- Confirm slot 06-10 directions.

## Stop conditions

- Reference files contain real private/client/member/donor data not already classified.
- A runtime catalog change becomes necessary.
- The task requires public renderer, publish, backend validator, auth, tenant, payment, hosted, or production-data changes.
- The parked stash appears necessary.

## Completion summary

To be filled by agent:

- Summary:
- Files changed:
- Tests run:
- Manual QA:
- Risks:
- Rollback:
- Next task:
