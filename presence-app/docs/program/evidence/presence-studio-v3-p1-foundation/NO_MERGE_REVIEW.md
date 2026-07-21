VERDICT: MERGE

## Verdict

The current Studio V3 P1 Foundation working tree is mergeable after the final post-fix review. The prior evidence blocker is closed: the added public Enter regression now uses direct mock state seeding via `useBbbVisionPublishedThreshold` and does not call `saveDraft`, `publishDraft`, or the mock publish route.

Human approval is still required before commit/merge/deploy. This review does not commit, push, deploy, publish, or touch hosted/production state.

## Summary

- The final blocker is fixed: `presence-studio-v2-bbbvision-gallery-parity.spec.ts` seeds the published BBB Threshold fixture through `/__test__/state` and does not invoke publish in the added public Enter regression.
- Evidence wording now accurately states that the post-review targeted public Enter and public-invariance reruns are publish-free.
- `publish_draft_config` retains only the draft-row lock at publish start and does not restore or add a published-row lock.
- The prior technical blockers remain closed: numeric source refs are Room-scoped, P1 Film Strip/facet behavior is editorBridge-only, and no-bridge public Enter behavior again prioritizes the hovered visible canvas shape.
- No auth, tenant, public serializer, public route, GGM/private-data, production, deployment, or unrelated scope-creep regression was found in this review pass.

## Blocking issues

None.

## Non-blocking issues

- One fresh run of `presence-studio-v3-public-invariance.spec.ts` exited successfully but reported the first scenario as flaky after retry. The immediate rerun was clean `2 passed`. This is not a merge blocker for this final fix, but it should be watched because public-invariance evidence is high value.
- Playwright/Next emitted existing environment warnings about `NO_COLOR`/`FORCE_COLOR` and multiple lockfiles. These did not affect pass/fail.
- `git diff --check HEAD` passed with only LF-to-CRLF warnings for three working-copy files.

## Evidence reviewed

Mandatory project/review/security docs:

- `C:\Dev\.agent\PRESENCE_CANON.md`
- `C:\Dev\.agent\SUBAGENT_ROUTING.md`
- `C:\Dev\.agent\TASK_SIZING.md`
- `C:\Dev\.agent\NO_MERGE_REVIEW.md`
- `C:\Dev\.agent\SECURITY_AND_PRIVACY.md`

Evidence pack:

- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/README.md`
- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/BACKEND_CONTRACT.md`
- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/V3_BACKEND_SCOPE_LOCK.md`
- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/VALIDATION_RECORD.md`
- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/PUBLIC_INVARIANCE.md`
- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/REQUEST_LEDGER.md`
- Prior `NO_MERGE_REVIEW.md` as stale historical context only.

Focused code/evidence checks:

- `presence-app/tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- `flora-fauna/backend/app/services/presence_studio_v3_state.py`
- `flora-fauna/backend/tests/test_presence_studio_v3_backend_foundation.py`
- `presence-app/components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `presence-app/components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- Current working-tree status and scoped searches for publish locking, publish invocation, editorBridge gating, hovered-shape Enter behavior, source-ref validation, and private/GGM leakage indicators.

## Tests/build/typecheck

Fresh commands run in this final review:

- From `C:\Dev\Flora_fauna\presence-app`: `node --check tests/e2e/mock-presence-api.mjs` — PASS.
- From `C:\Dev\Flora_fauna\presence-app`: `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts --project=chromium --workers=1 --reporter=line -g "public Enter prioritizes"` — PASS, 1/1.
- From `C:\Dev\Flora_fauna\presence-app`: `npx.cmd playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --reporter=line` — exited 0 with 1 flaky / 1 passed on first run; immediate rerun PASS, 2/2.
- From `C:\Dev\Flora_fauna`: `git diff --check HEAD` — PASS with only LF-to-CRLF warnings.

Previously recorded green gates reviewed in `VALIDATION_RECORD.md` and treated as standing evidence:

- Backend P1 foundation: 20/20.
- Cumulative backend regressions: 14/14.
- `py_compile`: PASS.
- Studio V3 Chromium gate: 10/10.
- Studio V3 compiler/public payload hygiene/V2 adapter gates as recorded.
- Screenshot/public route evidence as recorded.

## Files changed

Current working-tree changes remain the scoped Studio V3 P1 Foundation implementation/evidence set, including:

- Backend API/model/service/migration/test changes under `flora-fauna/backend`.
- Studio V2 public renderer/canvas/gallery changes under `presence-app/components/presence-studio-v2`.
- Studio V3 shell/look-control/style/API/compiler/state/source-ref changes under `presence-app/components`, `presence-app/lib`, and `presence-app/tests`.
- Playwright mock/e2e changes under `presence-app/tests/e2e`.
- Evidence pack under `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation`.
- BBB pilot assets under `presence-app/public/bbb-pilot`.
- Local validation scripts under `scripts`.

This review pass intentionally overwrote only:

- `presence-app/docs/program/evidence/presence-studio-v3-p1-foundation/NO_MERGE_REVIEW.md`

## Unexpected changes

None found.

The repository contains a large scoped working tree for the Studio V3 P1 Foundation, but the reviewed changes align with the work order and evidence pack. No unrelated auth, tenant, payment, deployment, public claims, or production-control changes were found.

## Security/privacy risks

- No secrets, credentials, signed/private preview URLs, raw private payloads, donor/member data, or copied private GGM client material were found in the scoped review.
- V3 private state remains owner-private and outside public serialization.
- Public evidence continues to assert absence of owner/private preview/V3 metadata fields from public responses.
- Private metadata validation remains designed to reject unsafe URL/path/blob/base64/token/executable/GGM-like content.

## Auth/tenant/routing risks

- No auth decorator weakening, tenant bypass, public route registration, or control-plane route expansion was found.
- Owner endpoints remain scoped through owner Room access.
- Numeric `work:<id>` / `collection:<id>` source references are now validated against `PresenceWork.node_id == room.id` and `PresenceCollection.node_id == room.id`, closing the prior Room/tenant integrity blocker.
- Public routes remain read-only in the reviewed scope.

## Data persistence risks

- The approved synchronization exception is narrow: `publish_draft_config` locks only the draft row via `draft_config_for_room(room, for_update=True)`.
- No `published_config_for_room(room, for_update=True)` call was found; the backend source-inspection regression asserts the same without invoking publish.
- The added public Enter regression no longer invokes save or publish.
- Studio V3 state replacement remains constrained to existing draft replacement with exact identity/revision/schema/fingerprint expectations and no implicit first-draft creation.
- Conflict/failure behavior remains no partial mutation and no automatic retry.
- No hosted endpoint, production data, deploy, publish, asset mutation, or public-route mutation was performed in this review.

## UX/mobile/accessibility

- No-bridge public Enter behavior in `BbbVisionCanvasGallery.tsx` prioritizes `s.hoveredShape` before active-index fallback.
- Editor-specific active-index keyboard behavior remains guarded by `editorBridge`.
- Film Strip rendering in `PresenceStudioV2PublicRoom.tsx` requires `editorBridge`; no-bridge rendering remaps the P1-only `film-strip-selected-works` layout to the pre-P1 `gallery-wall` fallback.
- P1 experience facets/classes/data attributes remain editorBridge-only.
- Recorded visual/mobile/accessibility evidence remains in the evidence pack; no new visual blocker was found.

## Launch/revenue impact

Positive. The repaired evidence pack is now clean enough to support Presence launch proof without overstating the publish-boundary approval. The implementation remains scoped to P1 foundation/private-state/editor-proof work and does not broaden public claims or commercial positioning.

## Rollback notes

- Because the implementation is still uncommitted, product-code rollback is straightforward by reverting the scoped working-tree changes before commit.
- Backend rollback remains documented as additive migration rollback: remove/disable new endpoints first, then drop `presence_studio_v3_state` and the `revision` column only with explicit human approval.
- Evidence rollback is limited to restoring or replacing this review artifact.

## Required fixes

None before merge.

## Recommended follow-up

- Commit only after human approval, using the exact final verdict from this artifact as the merge gate.
- Watch the public-invariance spec for repeat flakiness in future CI/local runs; if it recurs, harden the timing/assertion around public signature capture.
- Do not expand the publish synchronization exception beyond the draft-row lock without a new approval and a new no-merge review.

## High-blast-radius checklist

- [x] Scope is explicitly approved.
- [x] Relevant files are expected.
- [x] No unrelated refactors.
- [x] Sensitive data is not exposed.
- [x] Public/private boundaries are preserved.
- [x] Tests cover core path.
- [x] Manual QA/evidence covers happy path and failure/public-invariance paths.
- [x] Rollback is clear.
- [x] Human approval is required before merge/deploy.

## Presence-specific review checklist

- [x] Public route loads are covered by recorded/fresh evidence.
- [x] Studio/editor route behavior is covered by recorded evidence.
- [x] Mobile layout is covered by recorded evidence.
- [x] Content/private metadata persistence is covered where in scope.
- [x] Existing demo/presence routes are not shown broken by the reviewed evidence.
- [x] Renderer and editor assumptions still match: P1 public behavior is bridge-scoped.
- [x] Existing migrated proof remains intact in recorded screenshots/evidence.
- [x] Screenshot evidence is included in the evidence pack.
