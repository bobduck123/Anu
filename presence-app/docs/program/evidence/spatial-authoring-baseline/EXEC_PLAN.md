# Spatial Authoring Baseline execution plan

Date: 2026-08-17
Baseline: Gate 4 commit `8a009e5`
Route: default-off `/internal/spatial-object-model` only

## Sequence

1. Extend the versioned component registry with the missing reusable procedural candidates.
2. Add validation-safe pure authoring mutations for duplicate, delete and overrides.
3. Expose the broader palette and property controls in the existing internal arranger.
4. Keep preview on the generic compiler/Three renderer and semantic fallback.
5. Prove browser-local JSON save/reload and capture before/after/reloaded evidence.
6. Run unit, typecheck, build, focused browser QA and adversarial review.

## Completion evidence

- 109/109 spatial tests pass.
- TypeScript and the production build pass; the internal route remains dynamic and production-disabled.
- The focused authoring workflow and complete 12/12 Chromium spatial suite pass with zero retries.
- Refreshed evidence records 6.7 KB layout JSON, 43.0 KB eager runtime and 244.1 KB total runtime.
- Adversarial findings covering shared Actions, authored anchors, position-independent budgets, fallback link parity, visible material capabilities and all three budget meters were corrected and regression-tested.
- A third acceptance audit exposed a no-op skin proof; the operator-only contrast skin, compiled colour assertions and saved/reloaded browser proof closed it, and re-review returned PASS.

## Safety boundary

No public-route, backend, persistence, publish, auth, commerce or multiplayer changes. No raw GLB/GLTF runtime assets. All added components remain internal candidate records and are not admitted by this task.

## Rollback unit

Revert only the authoring-baseline commit. Gate 3 commit `99c3618` and Gate 4 RETURN commit `8a009e5` remain intact. Browser-local drafts can be removed with the existing reset/remove controls; no server or production data exists.
