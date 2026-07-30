# ExecPlan: Presence Gate 1 V3.0 Studio Foundation

Gate 1 is not a launch route, not a publish route, and not a persistence route.

Do not continue implementation until the actual configured app repo or intentional static-prototype target is confirmed.

Target confirmation: on 2026-07-27, the human confirmed `C:\Dev\Flora_fauna\presence-app` as the intended Gate 1 target.

## Objective

Create or verify a safe internal V3 Studio foundation in `C:\Dev\Flora_fauna\presence-app` where the owner enters a creative Studio centred around a live Presence canvas. V2 or existing editor behaviour remains available as fallback. No publish or unsafe persistence is added.

## Why now

The V3.4 plan makes Gate 1 the first implementation gate after docs/canon alignment. It creates the internal Studio surface needed for later-gated owner editing, style selection, visitor layer, and public execution work; Gate 1 itself is not public readiness.

## Current state

Known app files and routes:

- `app\(studio)\studio\[id]\editor\page.tsx` - existing editor route and V3 gate entry point.
- `components\presence-studio-v3\PresenceStudioV3Shell.tsx` - existing V3 Studio shell candidate.
- `lib\presence\studio-v3\feature.ts` - existing default-off/pilot-gate logic candidate.
- `tests\e2e\presence-studio-v3-public-invariance.spec.ts` - existing public-invariance and forbidden-write coverage.
- `tests\e2e\presence-studio-v3-mobile-accessibility.spec.ts` - existing mobile/accessibility coverage.

Verification notes from 2026-07-27:

- `/studio/[id]/editor` is the approved entry path.
- V3 is selected only when `getPresenceStudioV3GateDecision` enables it; otherwise V2 or the older editor remains fallback.
- Local V3 pilot requires `presence-studio-v3:bbb-pilot` or equivalent env flag and defaults to BBB room id 29 / slug `bbbvision`.
- Production disables V3 unless hosted-human-test and room allowlist gates are explicitly configured.
- The existing V3 shell included a prior private-state PUT to `/api/presence/owner/rooms/29/editor/v3/state`; Gate 1 verification did not approve it as final persistence architecture. The accepted repair only added a local/dev owner-private stale-state clear path so internal Studio QA could continue safely.

Known backend files to inspect before persistence/API claims:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\api\presence_owner.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_studio_v3_backend_foundation.py`

## Non-goals

- No public launch.
- No production deploy.
- No auth, tenant, payment, or tax changes.
- No publish action.
- No unsafe backend write path.
- No V2 renderer rewrite.
- No migration of all Looks/Room Styles.
- No Fable pass.

## Stop conditions

- Do not continue implementation until the actual configured app repo or intentional static-prototype target is confirmed.
- Stop if implementation would add launch, publish, or broad persistence behaviour beyond the later accepted local/dev owner-private stale-state repair.
- Stop if backend behaviour is assumed without inspecting `C:\Dev\Flora_fauna\flora-fauna\backend`.
- Stop if public renderer invariance cannot be verified.
- Stop if the work requires auth, tenant, payment, or production deployment changes.

## Scope

### In scope

- Verify the existing V3 Studio gate and route map.
- Keep V3 default-off or pilot-gated.
- Keep public pages unchanged outside local preview.
- Make the live Presence canvas the dominant surface.
- Verify or repair Studio Home/opening state.
- Verify or repair Shelf or bottom-sheet control model.
- Verify or repair direct selection from visible canvas objects/Pieces/Rooms.
- Verify local visitor preview.
- Ensure desktop/tablet/mobile layouts are intentional.
- Preserve no-save/no-publish honesty states.
- Capture desktop/tablet/mobile evidence.

### Out of scope

- Real Piece creation/editing beyond already-approved existing behaviour.
- Real Collection creation/editing beyond already-approved existing behaviour.
- New draft save/reload contract.
- Public publish.
- Enquiry/booking/support execution flows.
- Hosted smoke testing.

## Risks and blast radius

Risk: medium if limited to gated Studio UI; high if public renderer, owner APIs, persistence, auth, or routing are changed.

Affected systems:

- Studio/editor UI.
- Public preview surfaces.
- Feature-gate behaviour.
- Existing owner API calls if touched.

Safety constraints:

- Public renderer output must remain unchanged unless explicitly in local preview.
- V3 must not affect non-enabled Presences.
- No UI may imply persistence that does not exist.
- Any backend persistence work requires separate review and backend tests.

## Milestones

### Milestone 1 - Target and route verification

Acceptance criteria:

- Implementation target is confirmed as `presence-app`.
- Existing Studio and public routes are listed.
- V2/fallback path is identified.
- Gate flag/pilot strategy is documented.

Evidence:

- File/route map.
- Updated tracker.

### Milestone 2 - Studio shell foundation

Acceptance criteria:

- V3 Studio opens through the approved route.
- Canvas dominates over controls.
- Studio Home/opening state exists.
- Shelf or bottom-sheet model exists.
- No new save/publish action is introduced.
- Local preview is clearly labelled as preview.

Evidence:

- Files changed, if any.
- Desktop/tablet/mobile screenshots.
- Manual QA notes.

### Milestone 3 - Direct canvas selection

Acceptance criteria:

- Owner can select a visible object/Piece/Room element from the canvas.
- Selection updates contextual controls.
- Interaction works with pointer and touch.
- Keyboard focus remains coherent.

Evidence:

- Manual QA notes.
- Screenshot or short capture.
- Accessibility notes.

### Milestone 4 - Public invariance and QA

Acceptance criteria:

- Existing public route still loads.
- Non-enabled Presence path remains unchanged.
- Forbidden public/publish write calls are absent.
- Reduced-motion handling is not broken.
- Mobile does not feel like squeezed desktop.

Evidence:

- Public before/after comparison.
- Mobile/tablet/desktop screenshots.
- `npm run typecheck`.
- Targeted Playwright V3 tests where available.

## Tests and validation

Frontend commands:

```bash
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/presence-studio-v3-public-invariance.spec.ts
npm run test:e2e -- tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
```

Backend commands may be required only if backend contracts are touched. Inspect the backend first; do not guess.

## Rollback plan

Revert only the Gate 1 branch/files. No production or hosted state should be touched.

## Human decisions required

- Resolved for Gate 1: existing private-state behaviour and the clear-state repair are accepted only as local/dev owner-private Studio foundation evidence, not final persistence architecture or public readiness.
- Confirm the canonical pilot Presence for screenshots and manual QA.

## Progress log

```text
2026-07-27 - ExecPlan created in corrected app path during Gate 0 alignment.
2026-07-27 - Human confirmed target as `C:\Dev\Flora_fauna\presence-app`.
2026-07-27 - Target and route verification completed. `npm run typecheck` initially failed because moved reference folders were included by TypeScript; fixed by excluding `Presence (3)` and `legacy presence docs` from `tsconfig.json`.
2026-07-27 - `npm run typecheck` passed, `npm run build` passed, and targeted Chromium V3 Playwright tests passed serially 4/4. Parallel run produced two first-attempt flakes that passed on retry.
2026-07-27 - Visual evidence review found an action-bar label that implied publishing (`Review & publish`). Changed it to `Review private state`; reran `npm run typecheck`, targeted Chromium V3 Playwright tests 4/4, and `npm run build` successfully.
```

## Final review checklist

- [x] Acceptance criteria met with the accepted Gate 1 limits recorded in the progress log and repair evidence.
- [x] Tests run or unavailable command documented.
- [x] Manual QA completed, including the later human smoke confirmation for stale private-state clear.
- [x] Screenshots captured in `docs/program/evidence/presence-gate1-repair-gate2-readiness-20260727/`.
- [x] Public route invariance checked for the scoped local Gate 1 repair.
- [x] No unrelated scope.
- [x] No high-risk boundaries changed without approval.
