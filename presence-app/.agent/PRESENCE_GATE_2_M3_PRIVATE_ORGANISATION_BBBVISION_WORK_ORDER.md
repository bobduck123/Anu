# Work Order: Gate 2 M3 - BBBVision Private Organisation Overlay

## Project

Presence

## Gate

Gate 2 - V3.1 Owner Capability

## Objective

Allow the owner to organise one real BBBVision Work/Piece through private/draft-safe V3 metadata without canonical Work mutation, canonical Collection mutation, publish, or public route change.

## Target

- Frontend: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Studio route: `/studio/29/editor`
- Preferred Work: `2901`, slug `bbb-opening-image`, source ref `work:2901`

## Human Decision

Proceed using the same private/draft-safe V3 overlay pattern proven in M2.

Do not use direct canonical Work PATCH.
Do not use direct canonical Collection PATCH.
Do not mutate canonical Collection membership.
Do not publish.
Do not change public BBBVision output.

Prefer private Room/chamber/zone placement before Collection membership.

## Accepted M3 Shape

M3 uses private Room placement/arrangement metadata:

- `metadata.placements[]` references `sourceRef: work:2901`;
- `metadata.object_edits[]` stores Room/zone arrangement fields for the placed Work;
- existing private title overlay composes in the same object edit;
- canonical Work and Collection rows remain unchanged.

## Out Of Scope

- Full Collection CRUD.
- Collection membership mutation.
- Full Room assignment CRUD.
- Uploads.
- Delete/archive.
- Publish.
- Server public preview.
- Gate 3 style registry.

## Evidence

Create evidence under:

`docs/program/evidence/presence-gate2-m3-bbbvision-private-organisation-20260727/`

Include:

- selected Work;
- organisation type;
- payload shape;
- save/reload proof;
- local Test as visitor proof;
- canonical Work/Collection non-mutation proof;
- public unpublished proof;
- room `1` control proof;
- desktop/mobile screenshots;
- tests run;
- risks and rollback notes.

## Completion

Status: Accepted for the scoped M3 private Room organisation slice on 2026-07-27.

Implemented and proved:

- selected real BBBVision Work `2901` / `work:2901`;
- organised it through private V3 `placements` metadata into Room `gallery`;
- arranged it through private V3 `object_edits` metadata into zone `main-wall` with size `large`;
- saved through `PUT /api/presence/owner/rooms/29/editor/v3/state`;
- reloaded and restored the private organisation;
- reflected the private organisation in local `Test as visitor`;
- kept canonical Work rows unchanged;
- kept canonical Collection rows and membership unchanged;
- kept public BBBVision unpublished/unchanged;
- preserved room `1` as the empty owner Works control;
- captured desktop and mobile proof.

Evidence:

- `docs/program/evidence/presence-gate2-m3-bbbvision-private-organisation-20260727/`

Remaining limit:

M3 proves private Room placement/arrangement only. It does not prove safe Collection creation/editing, canonical membership mutation, media association, delete/archive, server draft preview, publish, or stale-base rebase.
