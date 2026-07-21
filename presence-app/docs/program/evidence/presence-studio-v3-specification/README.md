# Presence Studio V3 specification evidence

This evidence pack records the docs-only product specification and implementation architecture pass for Presence Studio V3. It turns the BBB Vision proof and owner-experience review into one implementation-ready product contract without changing runtime behavior.

## Outcome

- Studio V3 is specified as a client-facing, full-screen live editor shell over the proven Studio V2 renderer, composition, projection, draft, preview, and publication boundaries.
- The owner model is Presence, Rooms, Pieces, Collections, and Looks; V2 and backend terms remain implementation details.
- The first prototype slice is bounded, default-off, BBB-only in local/test environments, reversible, and split into zero-write P0 seam and P1 style gates. Milestone 1 may extend the local owner workflow, but product Save Draft and server Visitor Preview remain blocked until a separately approved atomic existing-draft precondition is implemented and independently qualified.
- Milestones, executable acceptance tests, risks, compiler rules, and eight subagent work packets are defined before implementation begins.
- GGM remains private reference material. It is never a publication target or public evidence source.

## Baseline

- Source branch: `feat/presence-studio-owner-experience-overhaul`
- Source commit: `7ab8b965e9f173ef011b84f0ed38fd6fe1d80c64`
- Task branch: `feat/presence-studio-v3-specification`
- Runtime changes: none
- Hosted-data changes: none
- Publish/deploy actions: none

## Specification index

1. [`STUDIO_V3_PRODUCT_SPEC.md`](../../presence-studio-v3/STUDIO_V3_PRODUCT_SPEC.md) — product promise, scope, experience principles, and success measures.
2. [`STUDIO_V3_INTERACTION_MODEL.md`](../../presence-studio-v3/STUDIO_V3_INTERACTION_MODEL.md) — spatial, contextual, touch-first editing behavior.
3. [`STUDIO_V3_CONTENT_ARCHITECTURE.md`](../../presence-studio-v3/STUDIO_V3_CONTENT_ARCHITECTURE.md) — Works, Collections, Rooms, Pieces, Library, and shelf semantics.
4. [`STUDIO_V3_CUSTOMISATION_MODEL.md`](../../presence-studio-v3/STUDIO_V3_CUSTOMISATION_MODEL.md) — Looks, layers, locks, savepoints, and transformation behavior.
5. [`STUDIO_V3_VIEW_MODEL_AND_COMPILER.md`](../../presence-studio-v3/STUDIO_V3_VIEW_MODEL_AND_COMPILER.md) — client view model and safe V2 compilation boundary.
6. [`STUDIO_V3_IMPLEMENTATION_PLAN.md`](../../presence-studio-v3/STUDIO_V3_IMPLEMENTATION_PLAN.md) — dependency-ordered implementation plan.
7. [`STUDIO_V3_MILESTONES.md`](../../presence-studio-v3/STUDIO_V3_MILESTONES.md) — milestone scope, gates, and exit criteria.
8. [`STUDIO_V3_ACCEPTANCE_TESTS.md`](../../presence-studio-v3/STUDIO_V3_ACCEPTANCE_TESTS.md) — north-star, functional, safety, accessibility, and containment tests.
9. [`STUDIO_V3_RISK_REGISTER.md`](../../presence-studio-v3/STUDIO_V3_RISK_REGISTER.md) — product, data, rendering, privacy, and delivery risks.
10. [`STUDIO_V3_SUBAGENT_TASKS.md`](../../presence-studio-v3/STUDIO_V3_SUBAGENT_TASKS.md) — eight narrow implementation work packets.
11. [`STUDIO_V3_PROTOTYPE_SLICE.md`](../../presence-studio-v3/STUDIO_V3_PROTOTYPE_SLICE.md) — smallest proof that V3 can sit safely over V2.

## Evidence index

- `README.md` — this index and safety statement.
- [`EXEC_PLAN.md`](EXEC_PLAN.md) — execution baseline, scope, work lanes, validation, and rollback.
- [`DECISION_LOG.md`](DECISION_LOG.md) — binding decisions that keep all eleven specifications coherent.
- [`NO_MERGE_REVIEW.md`](NO_MERGE_REVIEW.md) — independent binary review of the finished documentation diff.

## Evidence limitations

This is planning evidence, not runtime proof. No code was implemented, no browser capture was required, and no claim is made that the Studio V3 experience already exists. Repository paths and current behavior were inspected only to make future work packets truthful.

## Safety statement

The pass changes Markdown only: the eleven requested specifications, this evidence pack, and one bounded update to the app-local Presence canon. It does not change backend, auth, ownership, tenant isolation, control-plane behavior, runtime persistence contracts, public routes, public rendering, production data, or hosted state. It documents an atomic persistence precondition as a future approval gate; it does not authorize that backend work. It does not publish, deploy, contact a client, or expose private GGM material. Merge, implementation, deployment, and publication remain separate human-approved gates.
