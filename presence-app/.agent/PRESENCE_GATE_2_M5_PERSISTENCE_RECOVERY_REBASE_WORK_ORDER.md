# Presence Gate 2 M5 - Persistence Recovery / Rebase Work Order

Date: 2026-07-27

## Status

Implemented and accepted for the scoped local/dev BBBVision proof target as part of the Gate 2 M5/M6 real-backend proof and later auth-mock hardening closeout.

## Target

- App: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Control room: `1`

## Objective

Replace the blunt stale private-state dead end with explicit owner-controlled recovery:

- preserve compatible private V3 overlays where safe;
- keep clear/discard available when preservation is unsafe or intentionally chosen;
- never silently rebase, silently drop owner changes, publish, or mutate canonical Works/Collections.

## Implemented

- Added an owner-only backend rebase route: `PUT /api/presence/owner/rooms/:roomId/editor/v3/state/rebase`.
- Added backend private-state base matching helpers so the stale base and target base are checked explicitly.
- Added UI recovery panel when saved private Studio state belongs to an older base.
- Added owner actions:
  - `Keep compatible private changes`;
  - `Clear stale private Studio state`.
- Preserved compatible M2/M3 BBBVision overlays for `work:2901`:
  - title `Opening image - private M2 proof`;
  - Room `gallery`;
  - zone `main-wall`;
  - size `large`.
- Added incompatible-reference handling in the mock browser proof: preservation is blocked when overlays reference missing Works, while clear remains explicit.
- Kept private preview source language from M4.

## Explicit Non-Actions

- No direct canonical Work PATCH/POST.
- No direct canonical Collection PATCH/POST.
- No Collection membership mutation.
- No publish request.
- No public BBBVision mutation.
- No server draft preview.
- No hosted/prod data change.
- No auth/tenant/payment/deployment change.

## Evidence

Evidence lives at:

`docs/program/evidence/presence-gate2-m5-persistence-recovery-rebase-20260727/`

The passing real-backend proof:

- created the M2/M3 private overlay;
- bumped the local draft base through the approved atomic draft route for test setup;
- detected stale private state;
- preserved compatible private metadata through the rebase route;
- reloaded without a stale conflict;
- previewed the preserved private overlay;
- proved public BBBVision remained unpublished/404;
- proved canonical Works and Collections were unchanged;
- proved room `1` isolation;
- captured mobile proof.

## Remaining Risks

- Rebase currently preserves only metadata categories that pass the existing strict V3 private metadata restore/normalisation path.
- Server draft preview remains deferred.
- Collection membership editing remains deferred.
- Safe deletion/archive remains deferred.
- Hosted owner proof remains out of scope.
