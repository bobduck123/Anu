# Gate 3 M3 Evidence - Owner Controls From Registry

Date: 2026-07-28
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - Builder implementation with no-merge review
Verdict: ACCEPT M3

## Summary

Gate 3 M3 surfaces the M2 shared style catalog through the existing V3 Look controls.

The Look sheet now shows a compact catalog-backed pairing readout for the active Look and current or previewed Room Style. It displays tier copy, reason, warning/fallback copy, safe owner controls, locked elements, intended wow moment, mobile behavior, reduced-motion behavior, performance expectation, and an explicit private/public boundary.

No new styles were added. No public renderer, public projection, backend validator, route, publish, or public-sync behavior was changed. Private V3 metadata shape stayed unchanged.

## Files Changed

| File | Change |
|---|---|
| `lib/presence/studio-v3/styleCatalog.ts` | Added owner-copy helpers for compatibility tier labels/summaries, fallback room style name, and warning text. |
| `components/presence-studio-v3/StudioV3LookControls.tsx` | Added compact catalog-backed style pairing readout to the existing Look controls. |
| `components/presence-studio-v3/presence-studio-v3.css` | Added responsive styles for the compact style pairing readout. |
| `lib/presence/studio-v3/compiler.test.ts` | Added focused M3 tests for owner copy, blocked fixture behavior, and source-level owner-control catalog wiring. |
| `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts` | Added browser assertions that the existing visual-controls flow renders catalog-backed tier, fallback, private-boundary, and preview pairing copy. |
| `.agent/PRESENCE_GATE_TRACKER.md` | Updated Gate 3 row and status log for M3. |
| `.agent/PRESENCE_GATE_3_EXECPLAN.md` | Marked M3 complete and advanced the next task. |
| `.agent/PRESENCE_GATE_3_M3_OWNER_CONTROLS_FROM_REGISTRY_WORK_ORDER.md` | Created the M3 work order record. |

The workspace had preexisting uncommitted changes before M3. This evidence describes only the M3-scoped changes above.

## Commands And Tests Run

| Command | Result |
|---|---|
| `cmd /c npm run typecheck` | PASS |
| `node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts` | PASS - 53/53. Node emitted existing module-type warnings for `.ts` ES module tests. |
| `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 27/27. |
| `npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium --grep "visual Look, Room Style"` | PASS - 1 Chromium test. |
| `npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium` | PASS - 2 Chromium tests. |
| `cmd /c npm run build` | PASS |

Development correction: two early runs of the focused owner-control browser proof failed because the assertions expected flagship/experimental labels for current supported pairings. The implementation was behaving according to the catalog. The assertions were corrected, then the focused browser proof passed.

## Files Inspected

- `.agent/PRESENCE_CANON.md`
- `.agent/PRESENCE_V34_GATED_PLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/PRESENCE_GATE_3_EXECPLAN.md`
- `.agent/PRESENCE_GATE_3_M2_SHARED_STYLE_CATALOG_WORK_ORDER.md`
- `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/README.md`
- `.agent/DESIGN_SYSTEM_PIPELINE.md`
- `.agent/LAUNCH_QUALITY_BAR.md`
- `.agent/NO_MERGE_REVIEW.md`
- `.agent/TASK_SIZING.md`
- `lib/presence/studio-v3/styleCatalog.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/p1State.ts`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
- `tests/e2e/presence-studio-v3-public-invariance.spec.ts`
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`

## Owner Controls Changed

`StudioV3LookControls` now contains a `presence-studio-v3-style-compatibility` panel above the existing Look and Room Style cards.

The panel resolves:

- active system Look ID directly when selected;
- saved/named Looks back to the closest existing catalog Look by current catalog values;
- current Room Style, or the previewed Room Style during structural preview.

It does not add a new selector. It uses the existing Look cards, Room Style cards, facet cards, and structural preview flow.

## Catalog Fields Surfaced

The owner control readout surfaces:

- Look name and description;
- Room Style name and description;
- compatibility tier label and summary;
- compatibility reason;
- compatibility warning;
- fallback Room Style name;
- safe owner controls;
- locked elements;
- intended wow moment;
- mobile behavior;
- reduced-motion behavior;
- performance expectation;
- private/public boundary copy.

## Compatibility Messaging Examples

Catalog helper output now uses the preferred M3 language:

- `flagship`: `Flagship pairing` / `Designed for the strongest version of this room.`
- `supported`: `Supported pairing` / `Safe to use, but not the signature arrangement.`
- `experimental`: `Experimental pairing` / `Available for internal review only.`
- `blocked`: `Blocked pairing` / `Not available because this combination breaks the room experience.`

Unit coverage confirms:

- `soft-editorial` + `gallery-wall` is the room `1` control flagship pair;
- `nocturnal-gallery` + `threshold-portal` is the BBBVision flagship pair;
- `zine-archive` + `film-strip-selected-works` is experimental;
- fallback copy resolves `zine-archive` + `threshold-portal` to `Film Strip / Selected Works`;
- blocked copy works through a test-only compatibility fixture without adding a production blocked option.

## Blocked And Experimental Handling

No production M3 pairing is blocked. The catalog still has no production row with `tier: "blocked"`.

Blocked behavior is covered by a unit-level fixture passed to `presenceStyleCompatibilityOwnerCopy`. That proves blocked owner copy can display without exposing a selectable production blocked pairing.

Experimental pairings display the catalog warning: `Internal/dev style pairing; public renderer proof is not complete.`

## Private Metadata Finding

Private V3 metadata shape stayed stable. M3 did not add a new metadata category and did not change `projectStudioV3Metadata`, `restoreStudioV3Metadata`, backend validation, or private-state API contracts.

Style selection remains represented by existing private V3 state:

- active Look in private document state;
- Room Style through existing room style metadata/restore paths;
- layer values, named Looks, room styles, savepoints, and compatibility rows as already accepted before M3.

## Public-Invariance Proof

Public renderer and projection files were not edited.

The focused public-invariance Chromium spec passed 2/2. It proved:

- `/p/bbbvision` stays free of the Studio V3 shell;
- `/presence/bbbvision` stays free of the Studio V3 shell;
- public API text does not contain `owner_user_id`, `object_edits`, `layer_values`, `mediaId`, or private rehearsal text;
- private V3 edits write only to `/api/presence/owner/rooms/29/editor/v3/state`;
- bridge-free Test as visitor preserves current local visuals without editor chrome.

Real local backend unpublished/404 BBBVision proof was not rerun in M3. Gate 2 acceptance remains the latest real-backend proof that BBBVision public routes stayed unpublished/non-public. M3 did not touch backend publication, public route, or public renderer code.

## Room `1` Control Proof

Room `1` remains the simple/control path.

Unit coverage confirms `presence-contract-room` still bridges to `soft-editorial`, and the M3 compatibility copy confirms `soft-editorial` + `gallery-wall` as the room `1` control flagship pair. No room `1`, public route, backend, or seed data code was changed.

## Gate 2 Regression Proof

Gate 2 private overlay posture was preserved:

- private metadata categories unchanged;
- focused compiler/API tests passed 53/53;
- public payload/V2 adapter tests passed 27/27;
- focused public-invariance browser spec passed 2/2;
- owner-control browser proof used the existing Look/Room Style/facet flow and recorded no product writes.

## Mobile And Reduced Motion Finding

The catalog readout surfaces mobile, reduced-motion, and performance contract fields in compact form.

The CSS uses existing mobile breakpoints and collapses the style contract grid to one column under `720px`. Existing reduced-motion handling remains unchanged: decorative save pulse is disabled and transition duration is minimized under `prefers-reduced-motion: reduce`.

No separate mobile browser proof was run for M3. The layout change is covered by responsive CSS and prior Gate 2/M2 mobile evidence remains the latest browser mobile proof.

## Screenshots

The focused owner-control browser proof uses these existing visual-control screenshot paths as referenced evidence. Refreshed binaries for these three screenshots are not part of the staged Gate 3 reviewability packet:

- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/06-visual-look-cards.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/07-visual-room-style-cards.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/08-visual-treatment-background-motion.png`

The public-invariance proof uses these public-invariance screenshot paths. The staged Gate 3 M6 packet includes the refreshed `16-test-as-visitor-after-edits.png`; `17` and `18` remain referenced prior public-route evidence:

- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/16-test-as-visitor-after-edits.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/17-public-p-bbbvision-unchanged.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/18-public-presence-bbbvision-unchanged.png`

## No-Merge Review

VERDICT: MERGE

Summary:

- M3 scope is approved by the work order.
- Owner controls consume catalog metadata through the existing Look sheet.
- No new styles were added.
- Public renderer/projection stayed untouched.
- Private metadata shape stayed stable.
- Typecheck, build, focused unit/API tests, public payload tests, owner-control browser proof, and public-invariance browser proof passed.

Blocking issues:

- None.

Non-blocking issues:

- Real-backend unpublished/404 BBBVision proof was not rerun because M3 did not touch backend/public route/public renderer code.
- The first two owner-control browser attempts failed due assertion assumptions and were corrected.
- No separate mobile browser proof was run for this compact CSS change.

Security/privacy risks:

- No auth, tenant, payment, publish, production-data, public route, or backend validation code was changed.
- The new readout explicitly says style metadata is owner-private and public routes stay unchanged.

Rollback notes:

- Revert the M3-scoped frontend/catalog/test/docs changes.
- No data migration, backend cleanup, or public-route rollback is required.

## Risks

- The control displays catalog contract fields, but actual public renderer style switching is still not registry-driven.
- Saved/named Looks are resolved back to the nearest existing catalog Look for owner copy. That is acceptable for M3, but future custom style recipes may need explicit base-style metadata in private state.
- Backend validators still mirror frontend token assumptions; adding future style IDs remains backend-aware work.
- Christina remains metadata-only and still needs primitive/reduced-motion audit before being treated as a supported V3 style.

## Rollback Notes

Rollback is code/docs only:

1. Remove the owner-copy helper additions in `styleCatalog.ts`.
2. Remove the `StyleCatalogSummary` panel and helper functions from `StudioV3LookControls.tsx`.
3. Remove the `.studio-v3-style-*` CSS block.
4. Remove M3 assertions from `compiler.test.ts` and `presence-studio-v3-bbb-prototype.spec.ts`.
5. Revert M3 evidence/tracker/ExecPlan/work-order docs.

No backend state, production data, public publication status, or hosted config was changed.

## Recommended Next Task

Gate 3 M4 - Candidate Style Definitions / Christina primitive audit.

Recommended scope:

- convert the Christina candidate from metadata-only public preset evidence into a V3 primitive map;
- keep no new public renderer dependency until public invariance is proven;
- preserve BBBVision flagship and room `1` control pairs;
- add mobile and reduced-motion audit evidence for Christina before upgrading support.
