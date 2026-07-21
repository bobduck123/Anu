# ExecPlan: Presence Studio V3 specification

## Objective

Produce one coherent, implementation-ready product specification and architecture for a marketable Presence Studio V3: a live-feeling digital showroom/home/world editor that uses the proven Studio V2 engine underneath and keeps public, private, and publication boundaries intact.

This pass ends at reviewed documentation. It intentionally does not implement the prototype.

## Operating baseline

- Date: 2026-07-21 (Australia/Sydney)
- Source branch: `feat/presence-studio-owner-experience-overhaul`
- Starting commit: `7ab8b965e9f173ef011b84f0ed38fd6fe1d80c64`
- Task branch: `feat/presence-studio-v3-specification`
- Repository: `C:\Dev\Flora_fauna`
- App: `C:\Dev\Flora_fauna\presence-app`
- Change class: docs-only product/architecture work
- Runtime blast radius: low
- Downstream product-decision blast radius: high; independent no-merge review required

The working tree was clean before the task branch was created. The branch starts directly from the approved owner-experience commit.

## Inputs inspected

- Repository and app-local `AGENTS.md` instructions.
- Required Presence launch, canon, migration, proof, routing, sizing, security, planning, daily-operator, and no-merge documents.
- The Studio V2 editor gate, model, adapters, layouts, public projection, editor surface, actual public-room renderer, owner Works/Collections APIs, draft APIs, public-payload sanitization, preview, and publish-confirmation boundaries.
- BBB publish-execution and owner-experience evidence.
- The user-approved Studio V3 work order.

## Binding architecture

1. V3 is a new owner-facing presentation/controller shell over the V2 engine, not a backend rewrite, renderer rewrite, or second public product.
2. The prototype enters through the existing `/studio/[id]/editor` route behind a default-off local/test BBB pilot gate. It does not introduce a permanent `/editor-v3` route.
3. The canvas uses the actual `PresenceStudioV2PublicRoom` path so owner edits are judged against the visitor experience. The optional editor bridge has a normative selection/suppression contract at the native BBB callback seams; absent bridge props preserve public behavior.
4. V3 compiles client concepts into the existing V2 draft shape and never publishes. P0/P1 are zero-write. The current client refetch plus POST is not an atomic concurrency control and a disposable local/test replacement/deletion characterisation cannot enable product Save. Runtime Save Draft and server Visitor Preview remain disabled until a separately approved server precondition checks the expected existing draft identity/revision/stable fingerprint and replaces in one transaction. Current PATCH is forbidden, and this docs task does not authorize backend work.
5. Prototype-only locks, named Looks, savepoints, and staged comparison state remain browser-local in separate Presence/Room envelopes under an opaque authenticated-owner partition, scoped by complete immutable base identity plus a stable stored-semantic fingerprint. The projection omits only owner-GET-added private-media URL/expiry values; every other value remains authoritative. Full V3 metadata must not be placed in the current editable-config envelope.
6. Works and Collections remain canonical Library records; room Pieces are compiled placements/snapshots with explicit source references.
7. Public BBB behavior, routes, and payload boundaries remain unchanged. GGM remains private reference material only.

The complete binding set is in [`DECISION_LOG.md`](DECISION_LOG.md).

## In scope

- Eleven requested V3 specification documents under `docs/program/presence-studio-v3/`.
- This four-file evidence pack.
- One bounded app-local canon update reconciling the completed BBB proof and V3-over-V2 direction.
- Repo-grounded implementation paths, sequencing, acceptance tests, risks, evidence requirements, and rollback notes.
- An independent binary no-merge review after integration.

## Non-goals

- No UI, model, API, test, CSS, backend, auth, ownership, tenant, or public-renderer code.
- No hosted API call, data mutation, publish, unpublish, rollback, deploy, or production verification.
- No new dependency or architecture implementation.
- No public GGM screenshot, content, claim, or route.
- No claim that documentation alone proves Studio V3 usability.

## Work lanes

The specifications are drafted in parallel but governed by one decision log and reconciled by the primary agent.

| Lane | Documents | Review lens |
| --- | --- | --- |
| Product and UX | Product Spec, Interaction Model, Content Architecture, Customisation Model | Owner comprehension, spatial editing, client language, safety |
| Architecture and prototype | View Model and Compiler, Implementation Plan, Prototype Slice | Current V2 truth, compatibility, persistence and public containment |
| Delivery and validation | Milestones, Acceptance Tests, Risk Register, Subagent Tasks | Executability, failure paths, evidence, rollback, weak-agent handoff |
| Integration and evidence | Evidence pack and Presence canon | Coherence, decision traceability, scope containment |
| Independent review | No-Merge Review | Adversarial completeness, contradictions, privacy, launch risk |

## Milestones for this planning pass

### 1. Baseline and decision lock

Exit criteria:

- clean source commit and isolated branch recorded;
- operating documents and relevant runtime seams inspected;
- ambiguous product choices resolved in a shared decision log;
- no runtime file changed.

### 2. Specification draft

Exit criteria:

- all eleven requested documents exist;
- every requested capability maps to product behavior, implementation responsibility, or explicit deferral;
- current facts and proposed work are distinguishable;
- all documents use the same client vocabulary and architecture.

### 3. Integration and evidence

Exit criteria:

- cross-links resolve;
- prototype, milestones, tests, risks, and subagent packets agree;
- canon states the current BBB proof and V3/V2 relationship truthfully;
- evidence pack identifies limitations and protected boundaries.

### 4. Validation and no-merge review

Exit criteria:

- allowlist confirms documentation-only scope;
- `git diff --check` passes;
- no secrets or private GGM artefacts are introduced;
- an independent reviewer returns `VERDICT: MERGE`, or the task reports partial/blocking status honestly;
- blocking findings are fixed and re-reviewed before commit.

## Validation plan

Safe, local, read-only checks after documentation writes:

```text
git status --short --branch
git diff --name-only 7ab8b965e9f173ef011b84f0ed38fd6fe1d80c64
git diff --check 7ab8b965e9f173ef011b84f0ed38fd6fe1d80c64
rg checks for required headings, terms, links, verdict, and protected-boundary claims
```

Manual QA:

- read all fifteen new documents and the canon diff as one product contract;
- trace each locked requirement into at least one specification and one acceptance or delivery artefact;
- verify current code paths and symbols named by the architecture exist;
- verify no document presents proposed V3 behavior as already shipped;
- verify BBB is the pilot/proof target and GGM remains private/local reference only;
- verify all publish behavior is a human-confirmed final gate and outside the prototype.

Typecheck, build, browser QA, and screenshots are not required because no runtime code changes. They become mandatory in the prototype implementation task.

## Rollback

Revert the single documentation commit or remove this branch. No runtime, hosted-data, deployment, backend, or publication rollback is required because none is touched.

## Progress log

```text
2026-07-21 — Re-read the work order and applicable architecture/UX workflow instructions.
2026-07-21 — Confirmed a clean source branch at 7ab8b965e9f173ef011b84f0ed38fd6fe1d80c64.
2026-07-21 — Created feat/presence-studio-v3-specification.
2026-07-21 — Reconfirmed there is no project-context.md customization override.
2026-07-21 — Split the eleven documents into non-overlapping product/UX, architecture/prototype, and delivery/validation lanes.
2026-07-21 — Completed and reconciled all eleven requested specifications plus bounded evidence and canon updates.
2026-07-21 — Independent adversarial review returned MERGE AFTER FIXES with four blockers and eight implementation-boundary findings.
2026-07-21 — Remediated the full finding set: canonical-base concurrency, POST/PATCH deletion safety, normative compiler ownership, editor event interception, owner-partitioned local envelopes, Named Look media, durable source identity, P0/P1 gates, mode persistence, acceptance tagging, canonical tests, and bounded child work packets.
2026-07-21 — First re-review returned MERGE AFTER FIXES with four residual cross-document contradictions and one branch-packet wording follow-up.
2026-07-21 — Aligned P0 to the user-required minimum owner loop; separated ten-field logical comparison from the nine-field POST transport with explicit `schema_version` retention; replaced the last singular local-envelope example; removed timestamp authority; and clarified packet/integration branches.
2026-07-21 — Froze the corrected documentation snapshot for final independent re-review.
2026-07-21 — Source-seam re-review returned MERGE AFTER FIXES: owner-GET private-media hydration made the fingerprint unstable, current client-refetch/POST was non-atomic and create-capable, and the BBB bridge lacked an implementation-ready native-callback contract.
2026-07-21 — Froze the stable stored-semantic and exact JSON wire projections; made current POST/PATCH disposable characterization only; blocked runtime Save Draft/server Visitor Preview pending a separately approved atomic server precondition; and specified synchronous BBB interception, navigation suppression, and pending-focus cancellation/recheck.
2026-07-21 — Reconciled all eleven specifications, the decision log, evidence index, and canon; froze the snapshot for the final independent binary review.
2026-07-21 — Independent final review returned `VERDICT: MERGE`; recorded the binary review and closed the Stage 0 documentation gate.
```

## Human gates and remaining work

- Human review is required before merge.
- A separate work order is required to implement the default-off prototype slice.
- A separate review is required before enabling the slice beyond local/test BBB.
- Deployment and publication remain explicitly out of scope.
