# ExecPlan: Studio V2 Chamber Layout Composition

## Objective

Add a bounded, typed chamber-composition contract: registered layouts, valid zones, safe placement order/size/treatment, and editor/preview parity. Owners arrange existing room objects; they do not obtain arbitrary page-building coordinates.

## Why Now

The environmental checkpoint establishes a living-room editor. Composition is the smallest next capability that lets owners shape a room meaningfully while preserving renderer, privacy, and draft contracts.

## Current State

- Environmental checkpoint: `d656add1dcd59fd422e0d76d9134c57052f27ffb`.
- Layout-composition checkpoint: `613745b5ec808e8a8a302c90a7b83ea5c878639b`.
- Proof-gate starting point: `3b3f6e256dbad09e27e36499e7915f41bb3dd73f`.
- V2 persists `scene_config.studio_v2.chambers` and object state through the existing draft bridge.
- Sanitized preview removes non-public objects before composition reaches the public projection.

## Non-Goals

- No backend/schema/auth/tenant/publish/public-route changes.
- No new renderer, dependency, WebGL/GSAP/canvas loop, or arbitrary pixel positioning.
- No hosted owner-bound proof claim.
- No public GGM proof claim.

## Scope

### In Scope

- Two registered layouts: `gallery-wall` and `portal-threshold`.
- Typed zone registry, compatibility validation, stable missing/invalid-placement fallback, zone order, safe size/treatment, editor controls, direct Arrange pointer placement, preview projection, mobile CSS, and focused proof.
- Local fixture save/reload proof for composition order.
- Local fixture proof that hidden-on-mobile remains authoritative.

### Out Of Scope

- General layout authoring, freeform zones, durable uploads, hosted proof, public GGM claims, and production publish flows.

## Risks And Blast Radius

Medium. This extends the existing persisted V2 draft payload and public renderer projection. It is bounded by normalization, object-ID validation, authoritative visibility filtering, and targeted privacy/preview regression tests.

## Milestones

### Milestone 1 - Contract And Persistence Map

Acceptance criteria:

- Layout/placement types, two registries, normalizers, and stable fallback are defined.
- Existing `scene_config.studio_v2` safely stores the data without backend/schema change.

Status: complete.

### Milestone 2 - Editor And Preview Slice

Acceptance criteria:

- Layout picker, zone visibility, move/reorder/size/treatment controls, direct Arrange placement, and distinct two-layout rendering work.
- Preview uses the same resolved placements without instrumentation.

Status: complete.

### Milestone 3 - QA And Evidence

Acceptance criteria:

- Focused and existing private/environment regressions, typecheck, build, and private screenshots pass.
- Reorder persistence evidence exists.
- Hidden-on-mobile evidence exists.
- No-merge review note exists.

Status: complete.

## Tests And Validation

Local Playwright validation used manually started local servers:

```bash
node tests/e2e/mock-presence-api.mjs
npm.cmd run dev -- --hostname 127.0.0.1 --port 3100 --webpack
```

The Playwright commands set `PRESENCE_HOSTED_SMOKE=1` to prevent duplicate webServer startup while still using `PRESENCE_E2E_BASE_URL=http://127.0.0.1:3100`.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 5 passed.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition-capture.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 1 passed.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-environmental-engine.spec.ts tests/e2e/presence-studio-v2-ggm-private-proof.spec.ts tests/e2e/ggm-public-containment.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-studio-v2-inspector-usability.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 15 passed.

```bash
npm.cmd run typecheck
```

Result: PASS.

```bash
npm.cmd run build
```

Result: PASS with the pre-existing multiple-lockfile workspace-root warning.

No confirmed lint or named unit-test script exists.

## Rollback Plan

Revert the dedicated layout-composition proof-gate commit. Missing or invalid persisted composition normalizes to the existing chamber object order.

## Human Decisions Required

- Human approval is still required before merge.
- Hosted owner-bound Studio proof remains a separate task.
- Public proof, GGM publication, BBB migration, and deployment are not part of this slice.

## Progress Log

```text
2026-07-20 - Environmental checkpoint validated and committed; layout branch created from it.
2026-07-20 - Contract/persistence audit confirmed scene_config.studio_v2 is the scoped draft-safe extension point.
2026-07-20 - Layout-composition implementation committed at 613745b5ec808e8a8a302c90a7b83ea5c878639b.
2026-07-20 - Proof branch checkpoint committed at 3b3f6e256dbad09e27e36499e7915f41bb3dd73f.
2026-07-20 - Blocker-clearing pass added validator-aware drop affordance, real pointer proof, reorder proof, hidden-on-mobile proof, screenshots, and no-merge review.
```

## Final Review Checklist

- [x] Acceptance criteria met.
- [x] Tests run.
- [x] Manual QA represented by screenshot evidence.
- [x] Screenshots captured.
- [x] Evidence README updated.
- [x] No-merge review note added.
- [x] No unrelated scope.
- [x] No high-risk boundaries changed.
