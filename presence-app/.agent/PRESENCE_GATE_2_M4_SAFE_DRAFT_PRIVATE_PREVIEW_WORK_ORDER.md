# Work Order: Gate 2 M4 - Safe Draft / Private Preview Source Truth

## Project

Presence

## Gate

Gate 2 - V3.1 Owner Capability

## Objective

Make the V3 Studio preview model honest, explicit, and provable without publish, public route mutation, canonical Work mutation, canonical Collection mutation, or server draft-preview architecture work.

## Target

- Frontend: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Studio route: `/studio/29/editor`
- Control: room `1`

## Human Decision

Proceed using BBBVision room `29`.

The current in-memory/private preview may remain, but it must be labelled accurately and tested against public route invariance.

Do not build public publish.
Do not make BBBVision public.
Do not mutate canonical Work or Collection rows.
Do not implement full server public preview unless the existing backend already supports it safely.

## Accepted M4 Shape

M4 keeps the current local/private Studio projection:

- the top action is labelled `Private preview`;
- preview mode displays a source/status panel;
- the source panel says local/private preview uses unsent Studio changes;
- the source panel says the visitor site is unchanged and public route is off;
- the review sheet says server draft preview is deferred;
- no publish-shaped control appears in the review sheet;
- public routes remain unchanged.

## Out Of Scope

- Publish.
- Public execution flows.
- Public BBBVision enablement.
- Canonical Work mutation.
- Canonical Collection mutation.
- Collection membership mutation.
- Server draft preview wiring.
- Media uploads.
- Delete/archive.
- Gate 3 style registry.
- Hosted/prod data changes.

## Evidence

Evidence lives under:

`docs/program/evidence/presence-gate2-m4-safe-draft-private-preview-20260727/`

## Completion

Status: Accepted for the scoped M4 private preview source-truth slice on 2026-07-27.

Implemented and proved:

- selected real BBBVision Work `2901` / `work:2901`;
- applied M2 title overlay `Opening image - private M2 proof`;
- applied M3 private Room placement/arrangement into Room `gallery`, zone `main-wall`, size `large`;
- saved through `PUT /api/presence/owner/rooms/29/editor/v3/state`;
- reopened the editor in a fresh page and restored the private overlay from durable V3 state;
- displayed explicit `Private preview` source/status language;
- proved private preview reflected the title and placement overlay;
- proved canonical Work and Collection rows stayed unchanged;
- proved public BBBVision API/routes stayed unpublished/unchanged;
- proved room `1` remained isolated;
- captured desktop and mobile proof.

Remaining limit:

Server draft preview is deferred. Current M4 preview is a local/private Studio projection.
