# Gate 3 M5 Evidence - Style Compatibility Guardrails

Date: 2026-07-29
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - Builder implementation with no-merge review
Verdict: ACCEPT M5

## Summary

Gate 3 M5 adds explicit guardrails for style candidate status and Look/Room Style compatibility.

The shared style catalog can now answer whether public preset candidates, Looks, Room Styles, and Look/Room Style pairings are selectable in V3. Metadata-only candidates, including `christina-liquid-gallery`, remain reference/audit-only and cannot become active V3 style state through owner controls, private layer values, local envelopes, or compiler output.

No public renderer, public projection, public route, backend validator, publish/public sync, hosted/prod data, auth, tenant, payment, or deployment config was changed.

## Files Changed

| File | Change |
|---|---|
| `lib/presence/studio-v3/styleCatalog.ts` | Added typed guardrail helpers for candidate readiness, Look/Room Style selectability, pairing status, metadata-only detection, fallback/reason, and experimental/blocked handling. |
| `components/presence-studio-v3/StudioV3LookControls.tsx` | Routes existing Look/Room Style cards and compatibility readout through guardrail helpers; keeps experimental styles explicitly internal-review enabled; omits non-selectable options. |
| `lib/presence/studio-v3/p1State.ts` | Blocks structural staging when the effective Look/Room Style pairing is not allowed; rejects metadata-only public preset values in restored Look/layer metadata. |
| `lib/presence/studio-v3/compiler.ts` | Downgrades malformed in-memory active Looks that reference non-selectable public preset candidates to the Soft Editorial fallback and emits a warning issue. |
| `lib/presence/studio-v3/editing.ts` | Rejects live layer overrides that try to set a metadata-only public preset candidate. |
| `lib/presence/studio-v3/localState.ts` | Rejects browser-local named Look values that reference non-selectable public preset candidates. |
| `lib/presence/studio-v3/compiler.test.ts` | Added M5 tests for Christina metadata-only non-selectability, experimental opt-in, blocked fixture handling, private metadata rejection, compiler fallback, and owner-control helper usage. |
| `docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/README.md` | Added this evidence packet. |
| `.agent/PRESENCE_GATE_3_M5_STYLE_COMPATIBILITY_GUARDRAILS_WORK_ORDER.md` | Added the completed M5 work order record. |
| `.agent/PRESENCE_GATE_TRACKER.md` | Updated Gate 3 status and log for M5. |
| `.agent/PRESENCE_GATE_3_EXECPLAN.md` | Marked M5 complete and advanced the next task. |

The workspace had preexisting uncommitted changes before M5. This evidence describes only the M5-scoped changes above.

## Commands And Tests Run

| Command | Result |
|---|---|
| `node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts` | PASS - 59/59. Node emitted existing module-type warnings for `.ts` ES module tests. |
| `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 27/27. |
| `cmd /c npm run typecheck` | PASS |
| `npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium --grep "visual Look, Room Style"` | PASS - 1 Chromium test. First attempt failed because M5 briefly replaced the M3 tier summary copy; implementation was fixed to preserve the M3 copy, then the proof passed. |
| `npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium` | PASS - 2 Chromium tests. |
| `cmd /c npm run build` | PASS |
| `git diff --check -- lib/presence/studio-v3/styleCatalog.ts components/presence-studio-v3/StudioV3LookControls.tsx lib/presence/studio-v3/p1State.ts lib/presence/studio-v3/compiler.ts lib/presence/studio-v3/editing.ts lib/presence/studio-v3/localState.ts lib/presence/studio-v3/compiler.test.ts docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/README.md .agent/PRESENCE_GATE_3_M5_STYLE_COMPATIBILITY_GUARDRAILS_WORK_ORDER.md .agent/PRESENCE_GATE_TRACKER.md .agent/PRESENCE_GATE_3_EXECPLAN.md` | PASS |

## Guardrails Implemented

Catalog helpers added:

- `getPresenceStyleCandidateReadiness`
- `isPresencePublicPresetCandidateMetadataOnly`
- `isPresencePublicPresetCandidateSelectableInV3`
- `presenceStylePairingGuardrail`
- `getPresenceStylePairingStatus`
- `isPresenceStylePairingAllowed`
- `getPresenceLookSelectionStatus`
- `isPresenceLookSelectable`
- `getPresenceRoomStyleSelectionStatus`
- `isPresenceRoomStyleSelectable`

The default posture is conservative:

- `flagship` and `supported` are selectable;
- `experimental` is not selectable unless an explicit internal-review option is passed;
- `blocked` is not selectable;
- `metadata-only` is not selectable even when experimental review is enabled.

## Christina Metadata-Only Enforcement

`christina-liquid-gallery` remains:

- `supportStatus: "metadata-only"`;
- `candidateEvidenceStatus: "public-proof"`;
- no represented V3 Look;
- no represented V3 Room Style;
- no catalog Look projection to `christina-liquid-gallery`;
- fallback Look `soft-editorial`;
- fallback Room Style `gallery-wall`.

Tests prove:

- Christina readiness is non-selectable;
- Christina is metadata-only;
- Christina cannot be selected through V3 Look controls;
- live layer overrides with Christina public preset are rejected;
- durable/private metadata envelopes with Christina public preset values are unsafe;
- malformed in-memory active Looks using Christina compile through the Soft Editorial fallback with a warning issue.

## Experimental Handling

Experimental pairings are blocked by default.

The current V3 owner-control surface opts in explicitly with `OWNER_REVIEW_STYLE_GUARDRAILS: { allowExperimental: true }`, preserving the existing internal/dev ability to preview `zine-archive` and `film-strip-selected-works`.

Owner copy continues to warn: `Internal/dev style pairing; public renderer proof is not complete.`

Experimental options are therefore internal-review options, not launch-ready or supported public styles.

## Blocked Handling

No production Gate 3 M5 pairings are blocked yet.

Blocked behavior is tested with a fixture through `presenceStylePairingGuardrail`. The fixture is non-selectable, preserves fallback, and returns `preventsSelection: "blocked"`.

Structural staging now calls `isPresenceStylePairingAllowed` and has a `style-pairing-blocked` blocked stage reason for future blocked production rows.

## Supported And Flagship Handling

Supported and flagship paths remain selectable:

- Gallery P2 / room `1` control remains `soft-editorial` + `gallery-wall`.
- BBBVision flagship remains `nocturnal-gallery` + `threshold-portal`.

M3 tier copy remains intact:

- `Flagship pairing` / `Designed for the strongest version of this room.`
- `Supported pairing` / `Safe to use, but not the signature arrangement.`

The focused owner-control browser proof passed after this copy was restored.

## Owner Control Behaviour

The existing V3 Look controls remain catalog-driven.

M5 did not add a marketplace, large selector, new style picker, or new style IDs. It routes existing Look/Room Style options through guardrail helpers:

- non-selectable Looks are omitted;
- non-selectable Room Styles are omitted from the static option set;
- Room Style cards are disabled if the active Look/pairing is not allowed;
- experimental visibility is explicit through internal-review guardrail options;
- the compact M3 compatibility readout stays in place.

The focused Chromium owner-control proof passed and uses these existing visual-control screenshot paths as referenced evidence. Refreshed binaries for these three screenshots are not part of the staged Gate 3 reviewability packet:

- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/06-visual-look-cards.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/07-visual-room-style-cards.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/08-visual-treatment-background-motion.png`

## Compiler And Private Metadata Behaviour

Private metadata shape stayed stable. M5 did not add a metadata category.

Guardrails are enforced in these paths:

- `p1State.ts`: restored Look values and layer values reject non-selectable public preset candidates.
- `localState.ts`: browser-local named Look values reject non-selectable public preset candidates.
- `editing.ts`: live layer overrides reject non-selectable public preset candidates.
- `compiler.ts`: malformed in-memory active Looks with non-selectable public preset candidates compile through Soft Editorial and emit `style-candidate-unavailable`.
- `p1State.ts`: structural staging blocks disallowed pairings before remapping room state.

Existing valid private selections still compile and save through the same private metadata categories.

## Public And Private Safety Finding

M5 did not edit:

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- public route files
- public payload projection
- backend validators
- publish/public sync code
- hosted/prod data

The focused public-invariance Chromium spec passed 2/2. It proved:

- `/p/bbbvision` stayed free of Studio V3 shell/editor state;
- `/presence/bbbvision` stayed free of Studio V3 shell/editor state;
- public API text did not expose `owner_user_id`, `object_edits`, `layer_values`, `mediaId`, or private rehearsal text;
- private V3 edits wrote only to `/api/presence/owner/rooms/29/editor/v3/state`;
- bridge-free Test as visitor preserved current local visuals without editor chrome.

Real local backend unpublished/404 BBBVision proof was not rerun because M5 did not touch backend publication, public route, or public renderer code. Gate 2 acceptance remains the latest real-backend proof for unpublished/non-public BBBVision.

## Room `1` Control Proof

Room `1` remains the simple/control style path:

- `gallery-p2` remains supported;
- `soft-editorial` + `gallery-wall` remains the room `1` control flagship pair;
- focused catalog tests pass for Gallery P2 supported readiness;
- public renderer/projection files were not edited.

No room `1`, public route, backend, seed, or publication code was changed.

## Gate 2 Regression Proof

Gate 2 private overlay posture was preserved:

- private metadata categories unchanged;
- focused compiler/API tests passed 59/59;
- public payload/V2 adapter tests passed 27/27;
- focused public-invariance browser proof passed 2/2;
- owner-control browser proof passed and recorded no public/publish flow.

## Screenshots

No new visual feature was introduced. Existing focused browser proofs used the established screenshots listed under owner-control and public-invariance evidence. Refreshed owner-control binaries are intentionally outside the staged Gate 3 reviewability packet.

Public-invariance screenshot evidence:

- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/16-test-as-visitor-after-edits.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/17-public-p-bbbvision-unchanged.png`
- `docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/18-public-presence-bbbvision-unchanged.png`

## No-Merge Review

VERDICT: MERGE

Summary:

- M5 scope is approved by the work order.
- Metadata-only candidates cannot become active V3 styles through normal catalog/control/private-state paths.
- Experimental status requires explicit internal-review opt-in.
- Blocked behavior is guarded and tested without adding production blocked options.
- Public renderer/projection stayed untouched.
- Typecheck, build, focused unit tests, public payload/V2 adapter tests, owner-control browser proof, and public-invariance browser proof passed.

Blocking issues:

- None.

Non-blocking issues:

- First owner-control browser proof attempt failed after M5 temporarily replaced the M3 tier summary copy. The implementation was corrected and the proof passed.
- Real-backend unpublished/404 BBBVision proof was not rerun because M5 did not touch backend/public route/public renderer code.

Security/privacy risks:

- No auth, tenant, payment, publish, production-data, public route, public renderer, or backend validator code was changed.

Rollback notes:

- Revert the M5-scoped catalog/control/compiler/private-validation/test/docs changes.
- No backend migration, public-route cleanup, hosted rollback, or data rollback is required.

## Risks

- Backend validators still mirror existing V3 token assumptions. A later new style ID remains backend-aware work.
- There are still no production blocked pairings, so blocked active staging is source/helper-tested rather than proven through a real production blocked catalog row.
- Christina remains a V2 public preset branch outside V3 support; later adapter work must avoid public renderer dependency until public invariance is proven.

## Rollback Notes

Rollback is code/docs only:

1. Remove M5 guardrail helpers from `styleCatalog.ts`.
2. Restore `StudioV3LookControls.tsx` to direct catalog option mapping.
3. Remove M5 validation changes from `p1State.ts`, `compiler.ts`, `editing.ts`, and `localState.ts`.
4. Remove M5 assertions from `compiler.test.ts`.
5. Remove M5 evidence/work-order/tracker/ExecPlan updates.

No backend state, production data, public publication status, or hosted config was changed.

## Remaining Work

- Gate 3 M6 acceptance review should audit the whole Gate 3 packet end to end.
- A later backend-aware slice is required before adding new style IDs.
- Christina still needs V3 primitive, reduced-motion, performance, and private preview adapter proof before any support upgrade.

## Recommended Next Task

Gate 3 M6 - Gate 3 acceptance review.

Recommended focus:

- audit M1-M5 evidence and diffs;
- rerun final focused public/private invariance checks;
- confirm BBBVision remains private/local until later publish-readiness gates;
- confirm room `1` remains the control;
- decide whether Gate 3 is acceptable for moving to Gate 4 planning.
