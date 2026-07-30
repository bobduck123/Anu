# Gate 2 M3 - BBBVision Private Organisation Evidence

Date: 2026-07-27

## Verdict

ACCEPT Gate 2 M3 for the scoped private Room placement/arrangement slice.

At the time of this M3 slice, Gate 2 overall remained incomplete; later Gate 2 closeout accepted the local/dev owner-capability packet after M6 and auth-mock hardening. This slice proves one real BBBVision Work can be organised through private V3 metadata without canonical Work mutation, canonical Collection mutation, publish, or public route change.

## Scope Proven

- Target app: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Studio route: `/studio/29/editor`
- Selected Work: `2901`, slug `bbb-opening-image`, canonical title `Opening image`, source ref `work:2901`
- Organisation type: private Room/chamber/zone placement overlay
- Room placement: `gallery`
- Zone arrangement: `main-wall`
- Size arrangement: `large`
- Private title overlay used for proof: `Opening image - private M3 organisation proof`

M2's previous private title overlay was intentionally cleared during test setup so M3 could start from a clean private-state row. M3 then applied a fresh title overlay and proved it composes with Room placement/arrangement metadata in the same private V3 state save.

## Private Overlay Payload Shape

The proof uses owner-private V3 metadata persisted through the V3 state endpoint:

```json
{
  "placements": [
    {
      "roomId": "gallery",
      "sourceRef": "work:2901",
      "status": "placed",
      "order": 0
    }
  ],
  "object_edits": [
    {
      "sourceRef": "work:2901",
      "roomId": "gallery",
      "title": "Opening image - private M3 organisation proof",
      "zoneId": "main-wall",
      "size": "large"
    }
  ]
}
```

The concrete `object_edits[].objectId` is deterministic but opaque Studio V3 state, so assertions rely on `sourceRef: work:2901`, Room, zone, title, and size.

## Persistence Path

- Used: `PUT /api/presence/owner/rooms/29/editor/v3/state`
- Setup only: `DELETE /api/presence/owner/rooms/29/editor/v3/state`
- Not used: direct canonical Work PATCH/POST
- Not used: direct canonical Collection PATCH/POST
- Not used: canonical Collection membership mutation
- Not used: draft replacement
- Not used: publish/public sync

The Playwright request ledger found one product write during the owner operation:

```text
PUT http://127.0.0.1:5015/api/presence/owner/rooms/29/editor/v3/state
```

## Canonical Mutation Findings

Canonical Work rows before and after the M3 operation matched exactly.

- Work `2901` title remained `Opening image`.
- Work `2901` collection id remained `291`.
- Works `2901`-`2904` remained present.

Canonical Collection rows before and after the M3 operation matched exactly.

- Collection `291` remained `Threshold Sequence`.
- Collection `292` remained `Gallery Field`.
- No Collection membership was changed.

## Reload And Preview Findings

- Studio reload restored the private placement and arrangement for `work:2901`.
- The selected Work action bar restored the private title overlay.
- Arrange summary restored `main-wall` and `large`.
- Local `Test as visitor` reflected the private overlay in the in-memory/private projection.
- This is not server public preview proof and does not imply public publication.

## Public And Control Findings

- `GET /api/presence/public/bbbvision` remained `404`.
- `/p/bbbvision` remained unpublished/404 and did not contain the private title.
- `/presence/bbbvision` did not contain the private title.
- Room `1` remained the empty owner Works/Collections control and showed owner-language empty-state guidance.

## Screenshots

- `screenshots/01-desktop-private-room-placement-organised.png`
- `screenshots/02-desktop-private-organisation-saved.png`
- `screenshots/03-desktop-private-organisation-reloaded.png`
- `screenshots/04-desktop-test-as-visitor-private-organisation.png`
- `screenshots/05-mobile-private-organisation-reloaded.png`
- `screenshots/06-public-p-bbbvision-unpublished.png`
- `screenshots/07-public-presence-bbbvision-unchanged.png`
- `screenshots/08-room-1-empty-works-control.png`

## Commands And Tests

```text
cmd /c npm run typecheck
```

Result: passed.

```text
cmd /c npx tsx --test lib\presence\studio-v3\compiler.test.ts --test-name-pattern "BBVision private organisation"
```

Result: passed. The runner executed the full file: 46 tests passed.

```text
cmd /c npm run build
```

Result: passed.

```text
PRESENCE_GATE2_M3_REAL_BACKEND=1 npx.cmd playwright test tests/e2e/presence-gate2-m3-bbbvision-real-backend.spec.ts --project=chromium
```

Result: passed, 1 test passed.

## Manual QA

- Desktop BBBVision editor loaded from the real local backend.
- Owner Works count showed 4 and Collections count showed 2.
- Work `2901` was selected from Owner Works.
- The Arrange panel placed the Work into `gallery` / `main-wall` and set size `large`.
- Save private state completed without a stale-base conflict.
- Reload restored the private organisation.
- Local Test as visitor showed the private projection.
- Public BBBVision remained unpublished/unchanged.
- Mobile reload proof at 390px viewport restored the private organisation.

## Risks

- M3 proves private Room placement/arrangement, not canonical Collection membership.
- Existing direct Work and Collection PATCH routes still mutate canonical rows and remain unsuitable for unapproved Gate 2 draft-safe editing.
- Existing Collection delete detaches Works and hard deletes the Collection.
- Local `Test as visitor` is an in-memory/private projection, not a server preview route.
- The blunt stale private-state clear path remains a recovery tool, not a rebase UX.

## Rollback

- Clear the local owner-private V3 state for room `29` through `DELETE /api/presence/owner/rooms/29/editor/v3/state`.
- If needed, rerun the BBBVision local seed reset/reseed script in the backend.
- No public route, published config, canonical Work, or canonical Collection rollback is required for this M3 slice.

## Remaining Work

- Gate 2 still needs safe owner Collection creation/editing or a private Collection-membership overlay design.
- Gate 2 still needs safe media association, draft validation, safe deletion/archive, and stronger persistence recovery.
- Server draft preview remains deferred until the V3 draft replacement contract is separately approved.

## Recommended Next Task

Gate 2 M4: implement/prove safe draft/private preview with explicit preview-source language and no public mutation. If organisation remains the priority, run an M3.5 design/implementation slice for private Collection membership overlay without canonical Collection mutation.
