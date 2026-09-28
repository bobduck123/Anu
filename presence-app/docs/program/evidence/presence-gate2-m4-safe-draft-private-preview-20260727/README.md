# Gate 2 M4 - Safe Draft / Private Preview Evidence

Date: 2026-07-27

## Verdict

ACCEPT Gate 2 M4 for the scoped private preview source-truth slice.

At the time of this M4 slice, Gate 2 overall remained incomplete; later Gate 2 closeout accepted the local/dev owner-capability packet after M6 and auth-mock hardening. M4 proves the current V3 preview is labelled as a local/private Studio projection, reflects private overlay state, and leaves public BBBVision unchanged.

## Summary

- Target app: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Control: room `1`
- Selected Work: `2901`, slug `bbb-opening-image`, canonical title `Opening image`, source ref `work:2901`
- Private title overlay: `Opening image - private M2 proof`
- Private placement overlay: Room `gallery`, zone `main-wall`, size `large`

## Files Changed

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3Home.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
- `tests/e2e/presence-gate2-m4-bbbvision-real-backend.spec.ts`
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`
- `.agent/PRESENCE_GATE_2_M4_SAFE_DRAFT_PRIVATE_PREVIEW_WORK_ORDER.md`
- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `docs/program/evidence/presence-gate2-m4-safe-draft-private-preview-20260727/README.md`

## Preview Source Map

- `Private preview`: current V3 Studio local/private projection.
- Source: in-memory Studio V3 document compiled through `compileStudioV3Document()` into the V2 public-room renderer shape.
- It can include unsent and/or saved owner-private V3 metadata.
- It is not a public route.
- It is not a public preview link.
- It is not server draft preview.
- It does not publish.

Server draft preview is deferred. Current M4 preview is a local/private Studio projection.

## Private Preview Behaviour

The owner-facing preview UI now says:

- `Private preview`
- `Local preview - uses your unsent Studio changes`
- `Private Studio overlay is active. Canonical Works and Collections stay unchanged.`
- `Visitor site unchanged`
- `Public route is still off`
- `Not a public preview link`
- `Publish is not available in this gate`

The review sheet now says server draft preview is deferred and no longer presents a disabled publish-shaped button.

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

Canonical Work rows before and after the M4 operation matched exactly.

- Work `2901` title remained `Opening image`.
- Work `2901` collection id remained `291`.
- Works `2901`-`2904` remained present.

Canonical Collection rows before and after the M4 operation matched exactly.

- Collection `291` remained `Threshold Sequence`.
- Collection `292` remained `Gallery Field`.
- No Collection membership was changed.

## Public Route Findings

- `GET /api/presence/public/bbbvision` remained `404`.
- `/p/bbbvision` remained unpublished/404 and did not contain the private title or `main-wall`.
- `/presence/bbbvision` did not contain the private title or `main-wall`.

## Room 1 Isolation

- `/studio/1/works` still showed `Add your first work`.
- `/studio/1/editor` did not contain BBBVision private title overlay.

## Stale-State Clear

M4 did not alter stale-base conflict handling.

The M4 browser proof used the existing `DELETE /api/presence/owner/rooms/29/editor/v3/state` clear endpoint during setup and received an accepted `200` or `404` response. Gate 1 remains the manual UI proof that the clear action works from the stale-state conflict UI.

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
PRESENCE_GATE2_M4_REAL_BACKEND=1 npx.cmd playwright test tests/e2e/presence-gate2-m4-bbbvision-real-backend.spec.ts --project=chromium
```

Result: passed, 1 test passed.

Attempted but not counted as pass:

```text
cmd /c npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium -g "Home exposes"
```

Result: blocked because the user's inspection Next dev server is already running for this app on port `3000`, and Next refused to start a second dev server for the mock Playwright config. The running inspection server was left in place.

In-app browser sanity:

- The in-app browser itself did not carry the local E2E owner token and showed the Studio auth/loading state.
- Authenticated Playwright against the real local app/backend is the valid M4 browser evidence.

No backend pytest was required because M4 did not change backend code.

## Manual QA

- Desktop BBBVision editor loaded from the real local backend through Playwright with the local owner token.
- Review status displayed the M4 preview-source language.
- No publish-shaped review button was present.
- Work `2901` was selected, privately titled, privately arranged, saved, reopened, and previewed.
- Private preview displayed the source/status panel and the private title overlay.
- Public routes remained unpublished/unchanged.
- Room `1` remained isolated.
- Mobile private preview at 390px viewport displayed the source/status panel and private title overlay.

## Screenshots

- `screenshots/01-desktop-preview-source-review-status.png`
- `screenshots/02-desktop-private-overlay-saved-before-preview.png`
- `screenshots/03-desktop-private-overlay-reloaded.png`
- `screenshots/04-desktop-private-preview-source-labelled.png`
- `screenshots/05-mobile-private-preview-source-labelled.png`
- `screenshots/06-public-p-bbbvision-unpublished.png`
- `screenshots/07-public-presence-bbbvision-unchanged.png`
- `screenshots/08-room-1-empty-works-control.png`
- `screenshots/09-room-1-editor-control.png`

## Risks

- M4 does not implement server draft preview.
- M4 does not implement publish, public sync, or public preview links.
- Direct Work/Collection PATCH routes still mutate canonical rows and remain unsuitable for unapproved draft-safe editing.
- Existing Collection delete remains a hard-delete path.
- The in-app browser may not have the local E2E owner session; use the automated authenticated Playwright proof for this slice.

## Rollback

- Revert the M4 frontend/test/doc changes.
- Clear local owner-private V3 state for room `29` through `DELETE /api/presence/owner/rooms/29/editor/v3/state`.
- No public route, published config, canonical Work, or canonical Collection rollback is required.

## Remaining Work

- Gate 2 still needs safe Collection creation/editing or a private Collection-membership overlay.
- Gate 2 still needs media association, draft validation, safe deletion/archive, and stronger stale-base recovery.
- Server draft preview remains deferred until V3 can safely write an approved draft replacement.

## Recommended Next Task

Gate 2 M5: persistence recovery/rebase design for stale private-state conflicts, or an M3.5/M5 split for private Collection membership overlay if Collection organisation is the immediate priority.
