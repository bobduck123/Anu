# Presence Gate 2 Target Switch - BBBVision Owner-Capability Target

Date: 2026-07-27
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend inspected: `C:\Dev\Flora_fauna\flora-fauna\backend`

## Target decision

BBBVision is now the primary local/dev Gate 2 owner-capability proof target.

Room `1` / `presence-contract-room` is now the empty-state and public-invariance control target.

BBBVision evidence is not public launch proof, not hosted launch proof, and not evidence that BBBVision is approved for public V3 launch.

## BBBVision target finding

Controlled local/dev target:

- Room id: `29`
- Slug: `bbbvision`
- Studio path: `/studio/29/editor`
- Public paths in the controlled harness: `/p/bbbvision`, `/presence/bbbvision`
- Public API path in the controlled harness: `/api/presence/public/bbbvision`
- Frontend harness origin: `http://127.0.0.1:3100`
- Mock API origin: `http://127.0.0.1:5105`

Evidence:

- `lib/presence/studio-v3/feature.ts` gates the default local BBB V3 target to room `29` or slug `bbbvision`.
- `tests/e2e/mock-presence-api.mjs` serves owner node, owner Works, owner Collections, editor overview, private V3 state, and public BBBVision routes for room `29`.
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts` opens `/studio/29/editor` under owner mock auth.

## Real local backend finding

At this target-switch point, the real local contract database at `presence_contract_local` was not seeded with BBBVision. The later Gate 2 M1.5 seed/connect slice superseded this gap for local/dev proof.

Read-only database inspection found:

- no `presence_node` rows matching slug/display name `bbb`;
- no `presence_work` rows for any node;
- no `presence_collection` rows for any node;
- only room `1` has a `presence_editable_config` row in the inspected contract DB;
- only room `1` has a `presence_studio_v3_state` row in the inspected contract DB.

Route checks against the currently running local app using the real local backend found:

- `http://localhost:3000/studio/29/editor` returns `200` for the route shell, but this does not prove authenticated BBB Studio load.
- `http://localhost:3000/p/bbbvision` returns `404`.
- `http://localhost:3000/presence/bbbvision` returns `404`.
- `http://localhost:3000/studio/1/editor` returns `200` for the route shell.

Conclusion at target-switch time: BBBVision was identifiable locally as the existing controlled e2e/mock owner-capability target, not yet as a real seeded contract-backend Presence. The M1.5 local seed/connect evidence later made it a real local contract-backend proof target.

## BBBVision content-source map

In the controlled local harness:

- owner node: room `29`, slug `bbbvision`, display name `bbb.vision`;
- canonical owner Works: 4 fixture rows exposed through `GET /api/presence/owner/nodes/29/works`;
- canonical owner Collections: 2 fixture rows exposed through `GET /api/presence/owner/nodes/29/collections`;
- renderer-backed base material: Studio V2 editable config objects exposed through `GET /api/presence/owner/rooms/29/editor`;
- private V3 state: in-memory mock state exposed through `GET/PUT /api/presence/owner/rooms/29/editor/v3/state`.

Canonical Work fixtures:

- `2901` / `bbb-opening-image` / `Opening image` / source ref `work:2901`
- `2902` / `bbb-portrait-field` / `Portrait field` / source ref `work:2902`
- `2903` / `bbb-stage-image` / `Stage image` / source ref `work:2903`
- `2904` / `bbb-shadow-image` / `Shadow image` / source ref `work:2904`

Canonical Collection fixtures:

- `291` / `Threshold Sequence`
- `292` / `Gallery Field`

## Room `1` control role

Room `1` / `presence-contract-room` remains the control target because it has:

- real local contract-backend identity;
- zero owner Works;
- zero owner Collections;
- an editable draft config;
- private V3 state in the local contract backend;
- no seeded BBB content.

Use it to prove empty owner Library language, no fake imported content, and fallback/public-invariance behaviour.

## Public/private safety finding

Safe for the target-switch planning slice:

- no code/config changed;
- no backend rows were created, patched, or deleted;
- no hosted/prod data was read or mutated;
- no publish, draft replacement, rollback, auth, tenant, payment, or deploy config changed.

Known boundary:

- BBBVision public unchanged proof is available in the controlled e2e harness from prior focused tests.
- At target-switch time, the real local backend could not prove BBB public route invariance beyond unpublished `404` responses.
- The later M1.5 local seed/connect work order supplied the real local backend persistence target before M2-M6 proof.

## Files changed

- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `.agent/PRESENCE_GATE_2_M1_OWNER_CONTENT_SOURCE_TRUTH_WORK_ORDER.md`
- `.agent/PRESENCE_GATE_2_M2_FIRST_REAL_WORK_EDIT_BBBVISION_WORK_ORDER.md`
- `docs/program/evidence/presence-gate2-m1-owner-content-source-truth-20260727/README.md`
- `docs/program/evidence/presence-gate2-target-switch-bbbvision-20260727/README.md`

## Commands/tests run

Read-only investigation commands only:

- local backend contract DB metadata/count queries through the `presence-contract-postgres` container;
- route status checks with `curl.exe -I` for `/studio/29/editor`, `/p/bbbvision`, `/presence/bbbvision`, and `/studio/1/editor`;
- source inspection of the V3 feature gate, BBB e2e specs, and `tests/e2e/mock-presence-api.mjs`.

No build or typecheck was run because this target-switch task changed docs/planning only.

## Next M2 work order

`.agent/PRESENCE_GATE_2_M2_FIRST_REAL_WORK_EDIT_BBBVISION_WORK_ORDER.md`

Recommended next task:

Implement the first real BBBVision Work/Piece edit against `work:2901` in the approved local/dev harness, or stop first for a local BBBVision backend seed/connect slice if real contract-backend persistence is required.
