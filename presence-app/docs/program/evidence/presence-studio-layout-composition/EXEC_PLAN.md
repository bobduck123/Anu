# ExecPlan: Studio V2 chamber layout composition

## Objective

Add a bounded, typed chamber-composition contract: registered layouts, valid zones, safe placement order/size/treatment, and editor/preview parity. Owners arrange existing room objects; they do not obtain arbitrary page-building coordinates.

## Why now

The environmental checkpoint establishes a living-room editor. Composition is the smallest next capability that lets owners shape a room meaningfully while preserving renderer, privacy, and draft contracts.

## Current state

- Environmental checkpoint: `d656add1dcd59fd422e0d76d9134c57052f27ffb`.
- V2 persists `scene_config.studio_v2.chambers` and object state through the existing draft bridge.
- Sanitized preview already removes non-public objects. Composition must be passed only for valid public objects.

## Non-goals

- No backend/schema/auth/tenant/publish/public-route changes.
- No new renderer, dependency, WebGL/GSAP/canvas loop, or arbitrary pixel positioning.

## Scope

### In scope

- Two registered layouts: `gallery-wall` and `portal-threshold`.
- Typed zone registry, compatibility validation, stable missing/invalid-placement fallback, zone order, safe size/treatment, editor controls, preview projection, mobile CSS, and focused proof.

### Out of scope

- General layout authoring, freeform zones, durable uploads, hosted proof, and public GGM claims.

## Risks and blast radius

**Medium.** This extends the existing persisted V2 draft payload and public renderer projection. It is bounded by normalization, object-ID validation, authoritative visibility filtering, and targeted privacy/preview regression tests.

## Milestones

### Milestone 1 — Contract and persistence map

Acceptance criteria:
- Layout/placement types, two registries, normalizers, and stable fallback are defined.
- Existing `scene_config.studio_v2` safely stores the data without backend/schema change.

### Milestone 2 — Editor and preview slice

Acceptance criteria:
- Layout picker, zone visibility, move/reorder/size/treatment controls, and distinct two-layout rendering work.
- Preview uses the same resolved placements without instrumentation.

### Milestone 3 — QA and evidence

Acceptance criteria:
- Focused and existing private/environment regressions, typecheck, build, and private screenshots pass.

## Tests and validation

```bash
npm run typecheck
npm run test:e2e -- <layout and existing Studio V2 specs> --project=chromium --retries=0 --workers=1
npm run build
```

No confirmed lint or named unit-test script exists.

## Rollback plan

Revert the dedicated layout-composition commit. Missing or invalid persisted composition normalizes to the existing chamber object order.

## Progress log

```text
2026-07-20 — Environmental checkpoint validated and committed; layout branch created from it.
2026-07-20 — Contract/persistence audit confirmed scene_config.studio_v2 is the scoped draft-safe extension point.
```
