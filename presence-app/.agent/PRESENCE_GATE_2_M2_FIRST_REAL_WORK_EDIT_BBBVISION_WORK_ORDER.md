# Work Order: Gate 2 M2 - First Real Work/Piece Edit for BBBVision

## Project

Presence

## Gate

Gate 2 - V3.1 Owner Capability

## Target model

Gate 2 primary development target:

- BBBVision local/dev Presence.
- Current controlled target identity: room `29`, slug `bbbvision`, Studio path `/studio/29/editor`.
- Current controlled public paths in the e2e harness: `/p/bbbvision` and `/presence/bbbvision`.

Gate 2 control target:

- Room `1` / `presence-contract-room`.
- Use only for honest empty-state, no fake owner Works, public-invariance, and fallback/control evidence.

Important boundary:

- BBBVision is approved as the primary local/dev Gate 2 owner-capability proof target.
- BBBVision is not public launch proof, not hosted launch proof, and not evidence that BBBVision is approved for public V3 launch.
- Gate 2 M1.5 seeded BBBVision into the real local contract backend with room `29`, four canonical owner Works, two Collections, and a draft editor base.
- The M1.5 seed/connect evidence is `docs/program/evidence/presence-gate2-m15-bbbvision-local-seed-connect-20260727/`.
- The local backend must be started with `PRESENCE_STUDIO_V3_BACKEND_ENABLED=1` and pilot allowlist `29`/`bbbvision` for V3 private-state routes to be available.

## Why now

Gate 2 M1 separated owner Works, Collections, and renderer-backed room/base material. The next smallest useful capability is one real owner-content edit on BBBVision, because room `1` has no canonical owner Works and cannot prove the owner editing journey.

## Size

M

## Blast radius

Medium to high.

This touches owner editing semantics and persistence language. Treat any canonical Work PATCH/POST, draft replacement, or public preview route as high-risk.

M1.5 confirmed the current owner Work and Collection PATCH endpoints mutate canonical rows directly. They are not draft-only save routes.

## Agent

Builder after reading the Gate 2 ExecPlan, then independent Reviewer.

## Objective

Allow the owner to edit one safe field on one real BBBVision Work/Piece in V3 Studio, persist it privately or to an approved draft-safe path, reload it, preview it locally, and prove public output remains unchanged.

## Preferred edit

Use one of these safe fields:

- Work/Piece display title;
- short description;
- owner-facing label.

Recommended first candidate:

- BBBVision Work `2901`, slug `bbb-opening-image`, title `Opening image`, source ref `work:2901`.
- Alternate candidates: `2902` `Portrait field`, `2903` `Stage image`, `2904` `Shadow image`.

## In scope

- Load BBBVision V3 Studio locally through `/studio/29/editor` in the controlled local/dev harness.
- Prefer the real local backend seed from M1.5 for owner Work/Collection source truth. The mock harness may still be used for existing focused UI tests where appropriate, but cannot replace real-local persistence proof.
- Select one canonical BBBVision owner Work/Piece from the Owner Works Library.
- Edit one safe display field.
- Persist the edit through the safest available private/draft-safe contract.
- Reload and prove the edit returns.
- Use local Test as visitor to preview the draft/private projection.
- Prove `/p/bbbvision`, `/presence/bbbvision`, and `/api/presence/public/bbbvision` remain unchanged in the harness.
- Keep room `1` empty-state/control behaviour intact.
- Add focused validation/failure-state tests.
- Capture desktop and mobile screenshots.

## Out of scope

- Full owner editing.
- Collection creation/editing.
- Room assignment CRUD.
- Drag/drop Room assignment.
- Deletion or archive.
- Uploads.
- Payment, support, booking, enquiry, analytics, or notification fields.
- Public publish.
- Public renderer changes.
- Hosted/prod writes.
- Auth, tenant, route-guard, or deploy config changes.
- Style inheritance or style registry.
- Fable.

## Persistence rule

Do not use unsafe Work PATCH/POST simply to show a save.

Acceptable M2 persistence paths:

- owner-private V3 metadata that references `work:<id>` and stores only the edited safe field; or
- an explicitly reviewed draft-only backend path that cannot mutate public output; or
- explicit blocked-save UI if neither safe path exists.

If direct canonical Work update is proposed, the slice must first prove whether that row is public-visible and must stop unless the human explicitly approves that risk.

## Acceptance criteria

- BBBVision V3 Studio loads locally.
- One real canonical BBBVision Work/Piece is selected from Owner Works, not renderer-backed base material.
- One safe field can be edited.
- The UI says whether the edit is private/draft-only and does not imply publish.
- Save/reload either works honestly or is explicitly blocked with correct UI.
- Local Test as visitor reflects the private/draft projection truthfully.
- Public BBBVision routes and public API remain unchanged.
- Room `1` still shows honest empty/import-needed state for owner Works.
- No publish action appears.
- No placeholder/GGM leakage appears as BBB owner content.
- Stale private-state clear still works or remains explicitly available where applicable.
- Typecheck passes.
- Build passes.
- Focused frontend tests pass.
- Backend tests pass if backend code changes.
- Browser/mobile screenshots are captured.

## Required evidence

Create evidence under:

`docs/program/evidence/presence-gate2-m2-first-real-work-edit-bbbvision-20260727/`

Include:

- selected BBBVision Work/Piece id, slug, title, and source ref;
- edit field chosen;
- persistence path used, or blocked-save explanation;
- save/reload proof, or blocked-save proof;
- local Test as visitor proof;
- public unchanged proof for `/p/bbbvision`, `/presence/bbbvision`, and `/api/presence/public/bbbvision`;
- room `1` empty-state/control proof;
- request/write ledger proving no publish/draft/public mutation;
- desktop screenshot;
- mobile screenshot;
- commands/tests run;
- risks and rollback notes.

## Required tests

If frontend code changes:

```bash
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npx tsx --test lib\presence\studio-v3\compiler.test.ts
cmd /c npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium -g "<focused M2 test>"
cmd /c npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium -g "<focused public invariance test>"
cmd /c npx playwright test tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium -g "<focused mobile M2 test>"
```

If backend code changes:

```bash
python -m py_compile app\api\presence_owner.py app\api\presence_graph.py app\services\presence_service.py app\services\presence_editor_config.py app\services\presence_studio_v3_state.py
python -m pytest tests/test_presence_nodes.py::<focused_test> tests/test_presence_studio_v3_backend_foundation.py::<focused_test> -q
```

## Stop conditions

Stop and report if:

- BBBVision cannot load through the controlled local/dev target;
- the selected Work is actually renderer-backed material rather than canonical owner content;
- persistence would require direct public-visible canonical Work mutation;
- the chosen persistence path is direct `PATCH /api/presence/owner/works/:workId` or direct `PATCH /api/presence/owner/collections/:collectionId` without explicit human approval of canonical-row mutation risk;
- the only available save route implies publish or public sync;
- correct target selection requires auth/tenant changes;
- the real local backend has not been started with the BBBVision V3 backend flags required for private-state routes;
- M2 expands into Collection CRUD, Room assignment CRUD, uploads, deletion/archive, publish, or style registry work.

## Completion summary format

Return:

- Summary
- Files changed
- Commands/tests run
- Selected BBBVision Work/Piece
- Persistence path
- Save/reload evidence
- Preview evidence
- Public unchanged evidence
- Room `1` control evidence
- Risks
- Rollback notes
- Recommended next task

## Completion note

Completed on 2026-07-27.

- Selected Work: `2901`, slug `bbb-opening-image`, source ref `work:2901`.
- Edited field: private display title overlay.
- Persistence path: `PUT /api/presence/owner/rooms/29/editor/v3/state`, metadata `object_edits`, no canonical Work PATCH/POST.
- Result: save/reload passed, local Test as visitor reflected the overlay, canonical Work title remained `Opening image`, public BBBVision API/routes did not expose the overlay, and room `1` remained the empty owner Works control.
- Evidence: `docs/program/evidence/presence-gate2-m2-first-real-work-edit-bbbvision-20260727/`.
