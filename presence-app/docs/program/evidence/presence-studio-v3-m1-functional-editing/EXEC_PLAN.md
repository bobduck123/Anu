# ExecPlan: Studio V3 M1 Functional Creator Editing

Date opened: 2026-07-22
Branch: `feat/presence-studio-v3-m1-functional-editing`
Starting commit: `c33c56913d3e55f65e257b97432abe987f773cf0`
Risk: high — owner editing, private persistence, media references, editor/renderer compilation, and public-invariance boundaries

## Objective

Deliver the smallest reviewable owner-editing system in the hosted BBB-gated Studio V3 shell: immediate canvas editing, constrained direct manipulation, visual contextual controls, a truthful Pieces/Collections Library, visibly distinct Room Style previews, and unambiguous owner-private save feedback.

## Why now

P0, P1, and the hosted gate proved the V3 shell and private-state foundation, but human testing found that the hosted surface still behaves like a prototype. M1 must close the core owner edit loop without broadening launch exposure or compromising the already-published BBB Presence.

## Current state

- V3 opens for the explicitly allowlisted hosted BBB owner editor.
- The shell can select objects, place limited shelf items, stage Looks/Room Styles, and save the P1 private metadata categories.
- Piece sheets and much of the bottom bar are informational rather than editable.
- The compiler has no complete copy/media/per-piece presentation override path.
- There is no constrained drag/reorder interaction.
- Save feedback is generic and does not cover every required state.
- BBB's renderer objects and canonical owner Works/Collections are not yet presented as one truthful, inspectable Library model.
- Existing canonical Work endpoints can mutate canonical records. M1 now proves only a narrow owner-private inventory media upload; canonical Create Work and Work-field mutation remain unavailable.

The detailed pre-implementation mapping is in `M1_GAP_AUDIT.md`.

## Non-goals

- public launch or V3 enablement for all Rooms;
- public route or public renderer redesign;
- publish, publish automation, or server Visitor Preview activation;
- arbitrary freeform/off-canvas layout or code injection;
- canonical Work/Collection mutation without a separately proved public-invariant contract;
- backend rewrite, new renderer family, or unrelated architecture;
- production deployment, hosted data mutation, or GGM/private-client exposure.

## Scope

### In scope

- reference-safe private M1 edit metadata and strict validation;
- immediate copy/media-reference/placement/presentation compilation in the editor;
- registered-zone reordering and movement with non-pointer alternatives;
- visual, contextual bottom sheets/cards;
- truthful inspection of loaded BBB pieces and canonical Collections;
- place/unplace behavior against V3 private state;
- protected inventory-only Upload when the verified private capability is present, plus honest disabled Upload/Create states otherwise;
- meaningful preview/apply/cancel behavior for Threshold Portal, Gallery Wall, and Film Strip;
- typed private-save feedback, retry/reload affordances, and unpublished language;
- focused automated tests, manual QA, sanitized screenshots, request ledger, public-invariance proof, and independent review.

### Out of scope

- canonical Work create/update and non-inventory media attachment writes under the currently unproved boundary;
- public or published content changes;
- migration of existing public BBB data;
- new auth, tenant, payment, analytics, or deployment behavior.

## Risks and blast radius

Affected systems:

- Studio V3 model, private-state projection/restoration, and compiler;
- owner editor shell and V3-scoped styles;
- strict frontend/backend private-metadata validation if new optional categories are needed;
- browser-local fallback/reconciliation;
- Playwright BBB mocks and the three canonical V3 specs;
- publish-free public eligibility, payload, named gallery public-Enter, and payload/adapters test surfaces.

Primary risks:

- owner-private edits leaking into public-shaped output before publish;
- unsafe/raw media references entering private metadata;
- renderer identity drift or duplicate Library records;
- pointer-only interaction or cancel paths that do not restore exactly;
- misleading save/publish language;
- accidental calls to draft, publish, canonical Work/media, or public mutation endpoints.

## Milestones

### Milestone 1 — Research and map

Acceptance criteria:

- [x] Prerequisite branch/commit and clean starting tree verified by the main implementation task.
- [x] Required V3 contracts and prior evidence read by the main implementation task.
- [x] Human testing notes mapped to code, work type, scope, and evidence in `M1_GAP_AUDIT.md`.
- [x] Canonical CRUD/upload safety decision recorded before implementation.

Evidence:

- `M1_GAP_AUDIT.md`
- `LIBRARY_UPLOAD_MATRIX.md`
- `SECURITY_PRIVACY_REVIEW.md`

### Milestone 2 — Private edit model and compiler

Acceptance criteria:

- [x] Tests cover copy overrides, safe media references, placement/reorder, visibility, feature state, visual tokens, persistence, and rejection paths.
- [x] Supported edits compile immediately into the owner editor canvas.
- [x] Private projection/restoration is strict, bounded, stable-reference-only, and backward compatible.
- [x] Unsupported values are hidden or explicitly unavailable.

Evidence:

- `EDITABILITY_MATRIX.md`
- `TEST_MATRIX.md`
- `VALIDATION_RECORD.md`

### Milestone 3 — Functional owner interactions

Acceptance criteria:

- [x] Contextual copy/media/placement/treatment controls are functional.
- [x] Bounded selected-Piece movement to registered zone cards supports pointer, keyboard/tap, mobile, invalid-drop no-op, and exact Cancel; freeform canvas nearest-zone snap/clamp is not part of M1.
- [x] Bottom bar uses visual selectable cards with obvious selection and reasons for disabled states.
- [x] Save states and recovery actions are accurate and never imply publish.

Evidence:

- `DIRECT_MANIPULATION.md`
- `BOTTOM_BAR_VISUAL_SELECTION.md`
- `SAVE_FEEDBACK.md`
- `MANUAL_QA.md`

### Milestone 4 — Truthful Library and Room Style range

Acceptance criteria:

- [x] BBB pieces visible in the room/editor source appear in the Library without hidden duplication.
- [x] Canonical Collections remain identified as canonical; no fallback is presented as canonical.
- [x] Piece details and private placement/unplacement are usable.
- [x] Upload is protected-inventory capability-gated; Create Work remains honestly disabled.
- [x] Three Room Styles visibly change structure before Apply; Cancel restores exactly.

Evidence:

- `LIBRARY_UPLOAD_MATRIX.md`
- `EDITABILITY_MATRIX.md`
- screenshots 7, 9, 10, and 11 in `SCREENSHOT_INDEX.md`

### Milestone 5 — QA, evidence, and independent review

Acceptance criteria:

- [x] Required scoped publish-free automated validation passes on the final source tree.
- [x] Fresh desktop/mobile/accessibility/save-failure/visitor rendered evidence and visual inspection are recorded.
- [x] Final request-ledger rerun proves the permitted-write boundary.
- [x] All 18 required scenarios are freshly captured, decoded, independently hashed, sanitized, and visually inspected.
- [ ] Fresh independent no-merge review returns exact `VERDICT: MERGE`.
- [ ] Commit occurs only after that exact verdict.

Evidence:

- `VALIDATION_RECORD.md`
- `MANUAL_QA.md`
- `REQUEST_LEDGER.md`
- `PUBLIC_INVARIANCE.md`
- `SCREENSHOT_INDEX.md`
- `NO_MERGE_REVIEW.md`

## Files likely involved

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `components/presence-studio-v3/StudioV3Home.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/compiler.test.ts`
- `lib/presence/studio-v3/p1State.ts`
- `lib/presence/studio-v3/localState.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- `lib/api/studioV3.ts` and `lib/api/studioV3.test.ts` only if the client contract changes
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`
- `tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`
- `tests/e2e/presence-studio-v3-public-invariance.spec.ts`
- `tests/e2e/mock-presence-api.mjs`
- `flora-fauna/backend/app/services/presence_studio_v3_state.py` and its focused tests only if strict metadata categories change

No public route, public serializer, publish path, eligibility default, auth rule, tenant rule, or canonical Work/media mutation path is expected to change.

## Tests and validation

The exact matrix and results are in `TEST_MATRIX.md` and `VALIDATION_RECORD.md`. The final gate uses typecheck, compiler and non-publish API tests, focused non-publish backend tests, the three focused V3 Chromium specs with one worker, publish-free eligibility/payload specs, one explicitly named non-publish gallery public-Enter test, public payload/adapters tests, production build, and `git diff --check HEAD`. Full publish-fixture parity specs are not evidence for this pass.

## Rollback plan

The immediate operational rollback remains the existing default-off hosted gate: unset the hosted V3 frontend/backend human-test variables and rebuild/reload the relevant hosts. Code rollback is limited to this M1 diff. No canonical/public data migration or mutation is planned, so M1 should require no data rollback. See `ROLLBACK.md`.

## Human decisions required

- Human approval is required before any push, deploy, production/hosted write, publish, canonical media mutation, or merge.
- Future canonical Create Work/Work-field mutation requires explicit review of a private-draft contract and public-invariance tests. The narrow inventory-only upload is complete for M1.
- The final independent reviewer, not the builder, controls the commit gate through an exact verdict.

## Progress log

```text
2026-07-22 — M1 work order, V3 contracts, prior evidence, current shell/compiler/state paths, test fixtures, and owner media API were audited.
2026-07-22 — High-risk boundary recorded: canonical Work mutation is not accepted as draft-safe proof for published BBB.
2026-07-22 — Evidence skeleton and pre-implementation gap audit created.
2026-07-22 — Implemented bounded object edits, visual facets, registered-zone manipulation, visual Look/Room Style controls, truthful Library, protected inventory-only upload, and explicit private-save feedback.
2026-07-22 — React/source audit completed with no remaining actionable implementation blocker after async fencing, CTA, focus, drag provenance, collection accounting, and durable-state fixes.
2026-07-22 — Final scoped publish-free source gate passed: typecheck; 45/45 compiler/API tests; backend 35 passed, 1 deselected, 276 warnings; backend `py_compile`; 23/23 canonical V3 Chromium scenarios; 3/3 publish-free eligibility/payload scenarios; 1/1 named non-publish gallery public-Enter scenario; 27/27 public unit tests; mock syntax; and production build.
2026-07-22 — First independent frozen-tree review returned `VERDICT: MERGE AFTER FIXES` against 69 paths and manifest `53471092a577d88c8d314091e969a4aa37528a49e0cb59f43cad85cce116089f`. It required hidden-Piece capacity/accounting correction, complete current/savepoint layer scope validation, and draft-first published-fallback rejection.
2026-07-22 — All three review blockers were patched with focused regressions: visible resident/explicit arrangement reservation now survives save/hydration; current and savepoint layer scopes are Room/owner checked; published fallback conflicts while a draft exists. The approved publish exception remains the draft-row lock only, and publish was not invoked.
2026-07-22 — A second independent frozen-tree review returned `VERDICT: MERGE AFTER FIXES` against 69 paths and manifest `2040313d9e5f28568e61fcb9a99c20947525e8e1a10393bb2efc10deb8aafa67`. It found stale arrangement fields after cross-layout Room Style Apply and valid V1 placement-level hidden state that Show could not restore.
2026-07-22 — Both second-review blockers were patched: cross-layout Apply strips only layout-specific arrangement fields while retaining copy/media/visibility edits, and Show clears the legacy placement representation, remaps the current safe composition, and survives metadata reload. Focused unit tests and the Arrange → Film Strip → private Save → cache-independent hydration browser regression pass.
2026-07-22 approximately 15:05 AEST — An earlier command accidentally included two publish-fixture parity files and reached the local mock publish handler only. It completed 17 passed/1 failed, caused no hosted/production mutation, and is discarded with no evidence credit; full details are in `VALIDATION_RECORD.md`.
2026-07-22 — Eighteen screenshots decoded and were independently fingerprinted; the final set passed decode/hash/sanitization/visual inspection with 17 unique hashes. The two public route alias captures are intentionally byte-identical and are proved independently by route-specific DOM/payload assertions.
```

## Final review checklist

- [x] Implemented-scope acceptance is reverified on the final source tree; partial and deferred rows remain explicit.
- [x] Required scoped publish-free tests run and pass.
- [x] Fresh manual/rendered QA and visual inspection completed.
- [x] Eighteen required screenshot scenarios freshly captured and verified, including the feasible conflict shot.
- [x] Final request ledger and public invariance evidence completed with publish-free commands.
- [x] No unrelated scope.
- [x] No high-risk boundary changed without approval; the existing narrow draft-row publish lock remains the approved synchronization exception and publish was not invoked as evidence.
- [ ] Independent review returns exact `VERDICT: MERGE`.
- [ ] Commit occurs only after the exact merge verdict.
