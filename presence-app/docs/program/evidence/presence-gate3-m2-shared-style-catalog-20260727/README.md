# Gate 3 M2 Evidence - Shared Style Catalog

Date: 2026-07-28
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - Builder implementation with no-merge review
Verdict: ACCEPT M2

## Summary

Gate 3 M2 added a typed shared frontend style catalog for existing Presence style IDs only.

The catalog lives at `lib/presence/studio-v3/styleCatalog.ts`. It defines existing Looks, Room Styles, Piece Treatments, Atmosphere modules, Motion behaviours, public preset candidates, and Look/Room Style compatibility tiers. It includes the BBBVision flagship pair, the room `1` / Gallery P2 control pair, and `christina-liquid-gallery` as a metadata-only public preset candidate.

No new Look IDs or Room Style IDs were added. Public renderer dispatch was not changed. Public projection was not changed. Private V3 metadata categories were not changed.

## Files Changed

| File | Change |
|---|---|
| `lib/presence/studio-v3/styleCatalog.ts` | New typed shared style catalog for existing IDs, compatibility tiers, fallback helpers, mobile/reduced-motion/performance metadata, and Christina candidate metadata. |
| `lib/presence/studio-v3/p1Catalog.ts` | Converted the old P1 catalog path into a compatibility wrapper over the shared catalog. |
| `lib/presence/studio-v3/compiler.ts` | Uses catalog helpers for initial private Look bridge decisions, V2 layout to Room Style mapping, and existing Room Style ID lists. |
| `lib/presence/studio-v3/p1State.ts` | Uses catalog validators for existing style-token private metadata parsing where safe. No metadata shape change. |
| `lib/presence/studio-v3/index.ts` | Exports the shared catalog. |
| `components/presence-studio-v3/StudioV3LookControls.tsx` | Reads Look, Room Style, Atmosphere, Piece Treatment, Motion, and Typography option labels from the catalog-backed definitions. |
| `lib/presence/studio-v3/compiler.test.ts` | Adds focused M2 catalog coverage for existing IDs, compatibility tiers, fallbacks, Christina metadata-only status, and compiler bridge parity. |
| `.agent/PRESENCE_GATE_TRACKER.md` | Updated Gate 3 status and log for M2. |
| `.agent/PRESENCE_GATE_3_EXECPLAN.md` | Marked M2 complete and updated next milestone status. |
| `.agent/PRESENCE_GATE_3_M2_SHARED_STYLE_CATALOG_WORK_ORDER.md` | Created the M2 work order record. |

Note: several files in this workspace were already dirty before M2 started. This evidence describes only the M2-scoped changes above.

## Commands And Tests Run

| Command | Result |
|---|---|
| `cmd /c npm run typecheck` | PASS |
| `node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts` | PASS - 51/51. Node emitted existing module-type warnings for `.ts` ES module tests. |
| `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 27/27. Covers public payload hygiene and V2 adapter/style-preset round trips. |
| `npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium` | PASS on retry - 2 Chromium tests. First attempt failed to discover due Windows path form; after retry with forward-slash path, one test passed first run and one passed on retry after a transient manifest/shell visibility failure. |
| `cmd /c npm run build` | PASS |
| `git diff --check -- <M2 scoped files>` | PASS |

The first Playwright attempt was blocked by a stale Next dev lock at PID `39064`. The process required escalated `taskkill /PID 39064 /F` before the focused public-invariance spec could start its controlled dev server.

## Catalog Location

`lib/presence/studio-v3/styleCatalog.ts`

The older `lib/presence/studio-v3/p1Catalog.ts` import path remains available as a compatibility wrapper so existing compiler and state code do not need a broad import migration.

## Catalog Type Summary

The catalog defines:

- `PresenceLookDefinition`
- `PresenceRoomStyleDefinition`
- `PresencePieceTreatmentDefinition`
- `PresenceAtmosphereDefinition`
- `PresenceMotionBehaviourDefinition`
- `PresenceLookRoomStyleCompatibilityDefinition`
- `PresencePublicPresetCandidateDefinition`

Each definition includes owner-facing label/description data, V2 bridge data where relevant, compatibility metadata, mobile behaviour, reduced-motion behaviour, performance expectation, intended wow moment, evidence status, and renderer support status.

## IDs Included

Looks:

- `soft-editorial`
- `nocturnal-gallery`
- `zine-archive`

Room Styles:

- `threshold-portal`
- `gallery-wall`
- `film-strip-selected-works`

Piece Treatments:

- `quiet-framed`
- `luminous-depth`
- `captioned-ledger`

Atmosphere Modules:

- `paper-light`
- `nocturnal-depth`
- `ledger-scan`

Motion Behaviours:

- `still`
- `gentle`
- `living`

Public preset candidates:

- `gallery-p2`
- `bbbvision-threshold-gallery`
- `christina-liquid-gallery`

Christina remains metadata-only in M2. It is not exposed as a new V3 Look.

## Compatibility Model

The catalog defines a 3x3 Look/Room Style compatibility matrix with explicit tiers:

- `flagship`
- `supported`
- `experimental`
- `blocked`

Current M2 pairings preserve behaviour by not blocking any existing combinations.

Flagship pairings:

- `soft-editorial` + `gallery-wall`: room `1` / Gallery P2 control pair.
- `nocturnal-gallery` + `threshold-portal`: BBBVision flagship private style pair.

Experimental scaffold pairing:

- `zine-archive` + `film-strip-selected-works`: V3-native scaffold candidate, not public-proofed as a flagship style.

Compatibility helpers can answer:

- whether a Look/Room Style pair is compatible;
- the tier for a pair;
- fallback Room Style where one is declared;
- owner warning text for experimental pairings.

## V3 Studio And Compiler Wiring

Studio wiring:

- Look cards read name, description, dimension summary, and recommended Room Style from catalog definitions.
- Room Style cards read name and description from catalog definitions.
- Atmosphere, Piece Treatment, Motion, and Typography facet options are generated from catalog-backed definitions.
- Existing data test IDs and callbacks remain in place.

Compiler/private bridge wiring:

- initial private Look selection uses `initialStudioV3LookIdForBridge`;
- V2 layout to V3 Room Style mapping uses `studioV3RoomStyleIdForV2Layout`;
- legacy and Work Piece compatible Room Style lists use catalog ID arrays;
- P1 catalog exports remain stable through the wrapper.

Public renderer wiring:

- unchanged.
- `PresenceStudioV2PublicRoom` does not import or depend on the new catalog.
- public payload/projection code was not edited.

## Backend Validator Changes

No backend files were changed for M2.

Frontend private metadata parsing now uses catalog-backed validators for existing style token values where safe. The backend validator already accepted these existing IDs, so no backend schema/list update was required.

Private metadata categories remain:

- `owner_mode`
- `named_looks`
- `layer_locks`
- `layer_values`
- `object_edits`
- `savepoints`
- `placements`
- `restore`
- `compatibility`

No `style_selection` category was added.

## Public-Invariance Proof

Public renderer dependency:

- No public renderer or public projection files were edited.
- The new catalog is consumed by V3 Studio/compiler/private metadata parsing only.

Tests:

- public payload/V2 adapter unit tests passed 27/27;
- focused Chromium public-invariance Playwright spec passed on retry;
- the Playwright proof checked public route signature preservation, no Studio V3 shell on public route, no private `object_edits`, no `layer_values`, no `mediaId`, no private rehearsal text in public API/route, and private-state write boundaries.

Real local unpublished/404 BBBVision proof was not rerun in M2. Gate 2 acceptance evidence remains the latest real-backend proof that local BBBVision public routes stayed unpublished/non-public. M2 did not touch backend publication, public route, or public renderer code.

## Room `1` Control Proof

Room `1` remains the simple/control target:

- no feature-gate changes were made;
- no public route changes were made;
- `presence-contract-room` bridge logic still resolves to `soft-editorial` for the Gallery P2/generic path;
- `soft-editorial` + `gallery-wall` is explicitly marked as the catalog flagship control pair;
- tests cover the starting Look bridge for `presence-contract-room` resolving to `soft-editorial`.

## Gate 2 Regression Proof

Gate 2 private overlay posture was preserved:

- private metadata categories unchanged;
- private-state API client tests passed 2/2;
- compiler/private metadata tests passed in the 51-test focused suite;
- focused Playwright public-invariance spec exercised private V3 edits, private save, Test as visitor, and public output preservation.

## No-Merge Review

VERDICT: MERGE

Summary:

- Scope is approved by the M2 work order.
- No new style IDs were invented.
- No public renderer dependency was introduced.
- Private metadata shape stayed stable.
- Typecheck, build, focused unit tests, public payload tests, and focused browser public-invariance proof passed.

Blocking issues:

- None.

Non-blocking issues:

- The public-invariance browser proof was flaky on first attempt for one test and passed on retry. This is consistent with existing retry posture, but should remain visible.
- Real-backend BBBVision unpublished/404 proof was not rerun because M2 did not touch backend/public route code.

Security/privacy risks:

- No auth, tenant, payment, publish, production-data, or public route code was changed.
- Private style metadata remains private V3 metadata only.

Rollback notes:

- Revert the M2-scoped frontend/catalog/test/docs changes.
- No data migration or backend cleanup is required.

## Risks

- Backend validators still mirror frontend token assumptions, so adding future IDs needs a backend-aware slice.
- Christina is represented only as an existing public preset candidate and still needs reduced-motion/V3 primitive audit before support.
- `zine-archive` remains a scaffold candidate, not public flagship proof.
- The Playwright public-invariance spec showed one transient retry.
- The workspace had preexisting uncommitted changes before M2; review should scope only the listed M2 changes.

## Rollback Notes

Rollback is code/docs only:

1. Remove `lib/presence/studio-v3/styleCatalog.ts`.
2. Restore `lib/presence/studio-v3/p1Catalog.ts` to its previous inline P1 definitions.
3. Revert catalog imports/wiring in `compiler.ts`, `p1State.ts`, `index.ts`, and `StudioV3LookControls.tsx`.
4. Remove the M2 tests added to `compiler.test.ts`.
5. Revert M2 evidence/tracker/ExecPlan/work-order docs.

No backend state, production data, public publication status, or hosted config was changed.

## Recommended Next Task

Gate 3 M3 - Owner Controls From Registry.

Recommended scope:

- remove any remaining duplicated V3 option assumptions where safe;
- surface compatibility tier/warning metadata in the existing owner controls without adding a new selector experience;
- keep private metadata categories unchanged;
- rerun compiler/API/public payload tests, build/typecheck, and focused Chromium public-invariance proof;
- add mobile viewport proof if the owner control layout changes visually.
