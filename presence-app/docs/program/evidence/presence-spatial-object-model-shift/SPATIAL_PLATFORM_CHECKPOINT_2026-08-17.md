# Presence Spatial Platform Checkpoint

Date: 2026-08-17

## Scope

This checkpoint reconciles the current `presence-app` worktree after the Gate 3 spatial object model, Mobstar Gate 4 art-direction candidate, Draco runtime support, spatial asset ingestion, Mobstar internal-use candidate selection, spatial authoring baseline and spatial authoring UX hardening passes.

No product feature was implemented for this checkpoint. The only checkpoint edits were documentation consistency and this inventory note.

## Repository State

- Branch: `feat/spatial-authoring-baseline`
- Git root: `C:/Dev/Flora_fauna`
- Working directory: `C:/Dev/Flora_fauna/presence-app`
- Allowed write scope for this checkpoint: `C:/Dev/Flora_fauna/presence-app`
- Dirty tracked files: 16 after evidence-consistency edits.
- Untracked outside `presence-app`: `C:/Dev/Flora_fauna/PEACH/` only. Not inspected in detail and not touched.

## Baseline Commands

Requested pre-change inventory was run from `presence-app` before checkpoint edits:

- `git status --short --branch` - dirty `feat/spatial-authoring-baseline` branch.
- `git diff --name-status` - tracked dirty files all under `presence-app`.
- `git diff --stat` - 14 tracked files, 622 insertions, 11 deletions before checkpoint edits.
- `npm run test:spatial` - PASS, 112/112.
- `npm run test:spatial-assets` - PASS, 30/30.
- `npx tsc --noEmit` - PASS.
- `npm run build` - PASS with existing Next workspace-root warning about multiple lockfiles.

Optional focused e2e checks:

- `npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "spatial authoring baseline"` - PASS, 1/1, clean exit.
- `npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "Draco GLB"` - PASS, 2/2, clean exit.

The full spatial Playwright suite was not rerun for this checkpoint because the Windows webServer teardown hang is already documented in `DRACO_RUNTIME_GATE_REVIEW_2026-08-17.md`.

## Dirty Worktree By Workstream

### 1. Gate 3 Spatial Object Model Foundation

Current tracked evidence consistency edits:

- `docs/program/evidence/presence-spatial-object-model-shift/README.md`
- `docs/program/evidence/presence-spatial-object-model-shift/SPATIAL_OBJECT_MODEL_QA_2026-08-17.md`

Existing tracked Gate 3 evidence present:

- `docs/program/evidence/presence-spatial-object-model-shift/EXEC_PLAN.md`
- `docs/program/evidence/presence-spatial-object-model-shift/FINAL_VERIFICATION_2026-08-17.md`
- `docs/program/evidence/presence-spatial-object-model-shift/PAYLOAD_REPORT.md`
- `docs/program/evidence/presence-spatial-object-model-shift/saved-layouts/*.json`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/01-mobstar-three-arranger-saved-preview.png`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/02-bbb-reusable-projection-wall-three.png`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/03-mobstar-mobile-semantic-fallback-390.png`

Classification: foundational evidence already exists; current checkpoint only updates wording/indexing to reflect later Draco and authoring passes.

### 2. Mobstar Gate 4 Art-Direction Work

Existing tracked evidence present:

- `docs/program/evidence/mobstar-gate4-art-direction/EXEC_PLAN.md`
- `docs/program/evidence/mobstar-gate4-art-direction/MOBSTAR_GATE4_ART_DIRECTION_REVIEW_2026-08-17.md`
- `docs/program/evidence/mobstar-gate4-art-direction/MOBSTAR_GATE4_COMPONENT_ADMISSION_2026-08-17.md`
- `docs/program/evidence/mobstar-gate4-art-direction/MOBSTAR_GATE4_PAYLOAD_2026-08-17.md`
- `docs/program/evidence/mobstar-gate4-art-direction/MOBSTAR_GATE4_QA_2026-08-17.md`
- `docs/program/evidence/mobstar-gate4-art-direction/screenshots/*.jpg`
- `public/presence-spatial/mobstar-gate4-candidate/*.webp`

Related tracked runtime files include Mobstar candidate procedural components and test coverage, but the currently dirty runtime files are now shared with later Draco/authoring changes:

- `lib/presence/spatial/registry.ts`
- `lib/presence/spatial/compile.ts`
- `lib/presence/spatial/model.ts`
- `lib/presence/spatial/validate.ts`
- `tests/e2e/presence-spatial-object-model.spec.ts`

Classification: keep Mobstar Gate 4 candidate art-direction evidence separate from generic platform/runtime commits where possible. The creative verdict remains `RETURN TO HARDENING`; no Mobstar acceptance claim is present.

### 3. Draco Runtime Support

Tracked dirty files:

- `components/presence-spatial/ThreeSpatialRenderer.tsx`
- `components/presence-spatial/SpatialObjectArranger.tsx`
- `lib/presence/spatial/compile.ts`
- `lib/presence/spatial/model.ts`
- `lib/presence/spatial/registry.ts`
- `lib/presence/spatial/rendererGeometryCache.test.ts`
- `lib/presence/spatial/validate.ts`
- `tests/e2e/presence-spatial-object-model.spec.ts`

Untracked source/runtime helper and fixture:

- `components/presence-spatial/threeGlbRenderGeometry.ts`
- `lib/presence/spatial/fixtures/dracoDisplayIslandProof.ts`
- `lib/presence/spatial/renderGeometry.ts`

Untracked runtime public assets:

- `public/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- `public/presence-spatial/draco/gltf/draco_decoder.js`
- `public/presence-spatial/draco/gltf/draco_decoder.wasm`
- `public/presence-spatial/draco/gltf/draco_wasm_wrapper.js`

Untracked evidence:

- `docs/program/evidence/presence-spatial-object-model-shift/DRACO_RUNTIME_SUPPORT_2026-08-17.md`
- `docs/program/evidence/presence-spatial-object-model-shift/DRACO_RUNTIME_GATE_REVIEW_2026-08-17.md`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/draco-manual-browser-qa.png`

Classification: bounded generic runtime support. Keep proxy geometry and semantic fallback as source of truth; do not treat the candidate GLB as admitted.

### 4. Asset Ingestion Pipeline

Tracked dirty files:

- `.gitignore`
- `package.json`

Untracked source code and tests:

- `lib/presence/spatial/assets/**`
- `scripts/ingest-spatial-assets.ts`

Untracked evidence/docs:

- `docs/program/presence-spatial-assets/ASSET_INGESTION_PIPELINE.md`
- `docs/program/presence-spatial-assets/COMPONENT_REVIEW_WORKFLOW.md`
- `docs/program/presence-spatial-assets/INITIAL_INGESTION_REPORT.md`

Untracked generated/source records:

- `assets/presence-spatial/source/reports/*.json`
- `assets/presence-spatial/source/reports/SOURCE_INSPECTION.md`
- `assets/presence-spatial/source/raw/README.md`
- `assets/presence-spatial/candidates/manifests/**`
- `assets/presence-spatial/candidates/thumbnails/*.webp`

Ignored/regenerable optimized candidate binaries exist under:

- `assets/presence-spatial/candidates/components/*.glb`

Classification: should be its own commit or PR. The generated optimized candidate GLBs under `assets/.../components` are ignored by the new `.gitignore` rule and should remain regenerable rather than committed, unless a later review explicitly promotes a specific optimized runtime asset.

### 5. Mobstar Internal-Use Candidate Selection

Untracked source/test/docs:

- `lib/presence/spatial/assets/mobstar/**`
- `scripts/select-mobstar-components.ts`
- `assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json`
- `assets/presence-spatial/candidates/component-bridge.mobstar-gate4.json`
- `assets/presence-spatial/candidates/mobstar-shortlist.json`
- `docs/program/presence-spatial-assets/MOBSTAR_COMPONENT_SHORTLIST_2026-08-17.md`
- `docs/program/presence-spatial-assets/MOBSTAR_INTERNAL_USE_CANDIDATE_REVIEW_2026-08-17.md`

Classification: separate from the generic ingestion pipeline if review effort allows; it depends on the ingestion candidate registry but records a Mobstar-specific internal-use selection. It grants no admission or public readiness.

### 6. Spatial Authoring Baseline

Tracked dirty files:

- `components/presence-spatial/SpatialObjectArranger.tsx`
- `components/presence-spatial/SpatialObjectArranger.module.css`
- `lib/presence/spatial/arranger.ts`
- `lib/presence/spatial/authoringBaseline.test.ts`
- `tests/e2e/presence-spatial-object-model.spec.ts`
- `docs/program/evidence/spatial-authoring-baseline/SPATIAL_AUTHORING_BASELINE_2026-08-17.md`

Existing tracked evidence present:

- `docs/program/evidence/spatial-authoring-baseline/EXEC_PLAN.md`
- `docs/program/evidence/spatial-authoring-baseline/ASSET_SOURCE_AUDIT_2026-08-17.md`
- `docs/program/evidence/spatial-authoring-baseline/SPATIAL_AUTHORING_BASELINE_QA_2026-08-17.md`
- `docs/program/evidence/spatial-authoring-baseline/screenshots/*.png`

Untracked newer evidence mirror:

- `docs/program/evidence/presence-spatial-object-model-shift/SPATIAL_AUTHORING_BASELINE_2026-08-17.md`

Classification: operator authoring workflow proof. It remains internal/default-off and browser-local only.

### 7. Spatial Authoring UX Hardening

Tracked dirty files shared with authoring baseline:

- `components/presence-spatial/SpatialObjectArranger.tsx`
- `components/presence-spatial/SpatialObjectArranger.module.css`
- `lib/presence/spatial/arranger.ts`
- `lib/presence/spatial/authoringBaseline.test.ts`
- `tests/e2e/presence-spatial-object-model.spec.ts`

Untracked evidence:

- `docs/program/evidence/presence-spatial-object-model-shift/SPATIAL_AUTHORING_UX_HARDENING_2026-08-17.md`
- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/04-authoring-ux-hardening-inspector.png`

Classification: should travel with the authoring baseline unless a reviewer wants a smaller incremental commit. The code is naturally layered on the same internal arranger surface.

### 8. Unrelated Or Outside-Scope Work

- `C:/Dev/Flora_fauna/PEACH/` is untracked outside `presence-app`. It was not touched.
- No tracked dirty file outside `presence-app` was found.
- No write was made outside `presence-app`.

## Generated Assets

Generated or binary assets should be reviewed separately from source code:

- Asset-ingestion thumbnails: `assets/presence-spatial/candidates/thumbnails/*.webp`.
- Asset-ingestion manifests/reports: `assets/presence-spatial/candidates/manifests/**`, `assets/presence-spatial/source/reports/**`.
- Ignored regenerated candidate GLBs: `assets/presence-spatial/candidates/components/*.glb`.
- Runtime Draco proof GLB: `public/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`.
- Runtime Draco decoder: `public/presence-spatial/draco/gltf/*`.
- Existing Mobstar Gate 4 candidate media: `public/presence-spatial/mobstar-gate4-candidate/*.webp`.

Raw source model promotion check:

- `git ls-files --others --exclude-standard | rg "(^|/)raw/|\\.glb$|\\.gltf$|\\.blend$|\\.fbx$|\\.obj$"` returned only `assets/presence-spatial/source/raw/README.md` from normal unignored files.
- Large optimized candidate GLBs exist locally under `assets/presence-spatial/candidates/components/*.glb`, but they are ignored by the new `.gitignore` rule and documented as regenerable candidate exports, not source models.
- One optimized runtime proof GLB exists under `public/presence-spatial/candidates/components/` for the Draco proof.

## Evidence Docs Present

Spatial object-model shift:

- `EXEC_PLAN.md`
- `README.md`
- `SPATIAL_OBJECT_MODEL_QA_2026-08-17.md`
- `PAYLOAD_REPORT.md`
- `FINAL_VERIFICATION_2026-08-17.md`
- `DRACO_RUNTIME_SUPPORT_2026-08-17.md`
- `DRACO_RUNTIME_GATE_REVIEW_2026-08-17.md`
- `SPATIAL_AUTHORING_BASELINE_2026-08-17.md`
- `SPATIAL_AUTHORING_UX_HARDENING_2026-08-17.md`
- `SPATIAL_PLATFORM_CHECKPOINT_2026-08-17.md`

Mobstar Gate 4 art-direction:

- `EXEC_PLAN.md`
- `MOBSTAR_GATE4_ART_DIRECTION_REVIEW_2026-08-17.md`
- `MOBSTAR_GATE4_COMPONENT_ADMISSION_2026-08-17.md`
- `MOBSTAR_GATE4_PAYLOAD_2026-08-17.md`
- `MOBSTAR_GATE4_QA_2026-08-17.md`

Spatial authoring baseline:

- `EXEC_PLAN.md`
- `ASSET_SOURCE_AUDIT_2026-08-17.md`
- `SPATIAL_AUTHORING_BASELINE_2026-08-17.md`
- `SPATIAL_AUTHORING_BASELINE_QA_2026-08-17.md`

Asset ingestion and Mobstar selection:

- `docs/program/presence-spatial-assets/ASSET_INGESTION_PIPELINE.md`
- `docs/program/presence-spatial-assets/COMPONENT_REVIEW_WORKFLOW.md`
- `docs/program/presence-spatial-assets/INITIAL_INGESTION_REPORT.md`
- `docs/program/presence-spatial-assets/MOBSTAR_COMPONENT_SHORTLIST_2026-08-17.md`
- `docs/program/presence-spatial-assets/MOBSTAR_INTERNAL_USE_CANDIDATE_REVIEW_2026-08-17.md`

## Screenshots Present

- Spatial object-model shift: `screenshots/01-mobstar-three-arranger-saved-preview.png`, `02-bbb-reusable-projection-wall-three.png`, `03-mobstar-mobile-semantic-fallback-390.png`, `draco-manual-browser-qa.png`, `04-authoring-ux-hardening-inspector.png`.
- Mobstar Gate 4 art-direction: seven desktop/mobile JPG screenshots under `docs/program/evidence/mobstar-gate4-art-direction/screenshots/`.
- Spatial authoring baseline: `01-before-blank-room.png`, `02-after-saved-room.png`, `03-mobile-semantic-fallback.png`.

## Evidence Consistency Review

Findings:

- Older Gate 3 QA wording still said no GLB loader/compression pipeline existed. This checkpoint corrected that wording to say the original Gate 3 state had no loader, while later Draco evidence added generic lazy optional GLB runtime support without admission or production status.
- The spatial object-model evidence index now links the newer Draco, authoring baseline and authoring UX hardening notes/screenshots.
- Authoring evidence distinguishes internal operator authoring from client self-serve.
- Gate 4 evidence distinguishes candidate visual work from Mobstar acceptance and records `RETURN TO HARDENING`.
- Asset docs distinguish internal-use candidates from admitted components and explicitly grant `admitted-presence-component` to nothing.
- No evidence doc reviewed claims public launch readiness.

Files changed by this consistency pass:

- `docs/program/evidence/presence-spatial-object-model-shift/README.md`
- `docs/program/evidence/presence-spatial-object-model-shift/SPATIAL_OBJECT_MODEL_QA_2026-08-17.md`
- `docs/program/evidence/presence-spatial-object-model-shift/SPATIAL_PLATFORM_CHECKPOINT_2026-08-17.md`

## Out-Of-Scope Checks

Checked:

- Public route changes: no dirty app route/public dispatcher files found.
- Auth changes: no dirty auth files found.
- Backend persistence changes: no backend/schema/API persistence files changed in the dirty tracked path list.
- Tenant changes: no tenant boundary files found in dirty tracked files.
- Publish flow changes: no publish implementation files found in dirty tracked files.
- Commerce/multiplayer additions: no implementation files found; docs only state these are out of scope.
- Raw GLB/GLTF source promotion: no unignored raw/source GLB/GLTF appears; optimized candidate GLBs under `assets/.../components` are ignored/regenerable; one public optimized proof GLB is present for Draco runtime proof.
- Component admission claims: registry metadata remains `prototype` / `not-evaluated`; asset docs grant admitted status to nothing.
- Mobstar creative acceptance claims: evidence records `RETURN TO HARDENING`, score 1.86/4, and no acceptance.

The only outside-scope worktree entry is `C:/Dev/Flora_fauna/PEACH/`, untracked and outside `presence-app`. It should remain separate and should not be included in any Presence spatial checkpoint commit.

## Recommended Commit Grouping

Do not commit without explicit user instruction.

Preferred staged grouping:

1. Gate 3 spatial object-model foundation and evidence consistency
   - Include core Gate 3 spatial model files if not already committed, saved-layout evidence, route gate evidence, and the two checkpoint wording/index corrections.

2. Mobstar Gate 4 art-direction candidate
   - Include Mobstar procedural component/profile changes, tracked candidate media under `public/presence-spatial/mobstar-gate4-candidate/`, Gate 4 e2e assertions and Mobstar Gate 4 evidence.
   - Keep verdict as `RETURN TO HARDENING`; no admission.

3. Spatial asset ingestion pipeline
   - Include `lib/presence/spatial/assets/**`, `scripts/ingest-spatial-assets.ts`, package scripts, `.gitignore`, ingestion docs, manifests/reports and thumbnails.
   - Do not include ignored `assets/presence-spatial/candidates/components/*.glb` unless a later review explicitly asks for them.

4. Mobstar internal-use candidate selection
   - Include `scripts/select-mobstar-components.ts`, `lib/presence/spatial/assets/mobstar/**`, candidate shortlist/bridge/internal-use JSON and Mobstar candidate review docs.
   - This can be folded into commit 3 if reviewer load matters, but keeping it separate makes the generic pipeline easier to review.

5. Draco runtime support
   - Include `renderGeometry` model/compiler/validator changes, `threeGlbRenderGeometry`, Three renderer integration, Draco proof fixture, decoder/proof public runtime assets and Draco evidence.
   - This commit touches shared spatial model files and may need careful staging because those files also carry Gate 4/platform edits.

6. Spatial authoring baseline plus UX hardening
   - Include arranger code/CSS/tests/e2e updates plus authoring evidence and screenshot.
   - The UX hardening is naturally layered on the baseline; split only if a reviewer wants incremental proof.

Honest entanglement note:

- The shared files `lib/presence/spatial/model.ts`, `compile.ts`, `validate.ts`, `registry.ts`, `components/presence-spatial/SpatialObjectArranger.tsx`, and `tests/e2e/presence-spatial-object-model.spec.ts` now carry multiple workstreams. Path-only staging will not cleanly isolate every logical commit. If the team wants maximum safety and low staging risk, a single checkpoint commit for the whole spatial platform is acceptable, but it will be harder to review than the grouped plan above.

## Risks

- Full spatial Playwright suite still has the documented Windows webServer teardown hang after assertions pass.
- Draco decoder payload must stay lazy and internal-proof-only.
- Public `presence-spatial` assets are not an access boundary; hosted review needs a separate asset-serving policy.
- Candidate thumbnails/manifests are numerous and should be reviewed as generated evidence, not hand-authored product code.
- Asset licensing/provenance remains review-state evidence, not legal clearance.
- Shared files are entangled enough that surgical commit staging may be error-prone.

## Rollback Grouping

- Gate 3 foundation rollback: remove spatial model/renderer/storage route surface and Gate 3 evidence; no auth/backend/publish rollback required.
- Mobstar Gate 4 rollback: remove Mobstar candidate fixture/profile/media/evidence only; leave generic Gate 3 platform if already accepted.
- Asset ingestion rollback: remove `lib/presence/spatial/assets/**`, ingestion scripts, generated reports/thumbnails and package scripts; ignored candidate GLBs can be deleted from local asset cache if desired.
- Draco rollback: remove `renderGeometry` model/runtime hooks, GLB helper, Draco proof fixture, public proof GLB/decoder files and Draco evidence.
- Authoring rollback: remove arranger baseline/UX changes and authoring evidence; browser-local drafts can be cleared through existing reset/remove controls.
- PEACH rollback: outside this task; do not include it in Presence spatial rollback.

## Recommended Next Task

Component Quality Round 1: improve the 5-10 most important reusable procedural components and material treatments while preserving the authoring model, proxy/fallback safety, default-off internal route, no admission claims and no public/backend/publish changes.
