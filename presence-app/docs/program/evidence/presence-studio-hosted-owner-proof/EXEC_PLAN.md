# ExecPlan: Presence Studio hosted owner read-only proof

## Objective

Prove whether the hosted Presence Studio V2 owner path can be accessed by a real owner credential for one configured pilot room without publishing, mutating public state, or using mutation-capable lifecycle specs.

## Why now

The local Studio V2 environmental and layout-composition slices are private fixture evidence only. A hosted owner-bound proof is required before claiming real client self-service.

## Current state

- Branch: `feat/presence-studio-hosted-owner-proof`
- Base proof commit: `3cdf794f7798bff53b5dcdb0c3caedd8f6defa4d`
- Existing hosted lifecycle specs include mutation/publish behaviour and are not safe for this gate.
- Real hosted values must come from a private local env source and must not be committed.

## Non-goals

- No publish.
- No draft write/revert unless a separately reviewed write flag and safe-room policy are used.
- No backend/control-plane changes.
- No auth, tenant, routing, persistence, deployment, or public/private-boundary changes.
- No GGM public launch proof.
- No WebGL, layout, or Studio feature expansion.

## Scope

### In scope

- Add a read-only hosted owner Playwright smoke.
- Add a non-secret env example.
- Capture route/status evidence and screenshots only after successful hosted access.
- Record a no-merge review focused on no secrets/no mutation/no publish.

### Out of scope

- Production deployment.
- Public publication.
- Mutation-capable hosted lifecycle specs.
- Backend policy repair.
- Persistence architecture changes.

## Risks and blast radius

Risk: high, because the proof uses hosted auth and public/private routes.

Mitigation:

- Default to read-only.
- Fail if owner API mutations or publish requests are observed.
- Store real env values only in ignored local files or shell process env.
- Commit only harness/evidence/template files.

## Milestones

### Milestone 1 — Config gate

Acceptance criteria:

- Required hosted owner env exists locally.
- Real env source is ignored.
- No secrets are printed or committed.

Evidence:

- Redacted env checklist in `README.md`.

### Milestone 2 — Read-only hosted smoke

Acceptance criteria:

- Owner login succeeds.
- Owner list/node/editor/draft GETs return readable owner-scoped responses.
- Studio V2 root and layout-composition controls render.
- Private preview renders without editor instrumentation.
- Public `/p/[slug]` and `/presence/[slug]` are loaded anonymously without editor instrumentation.
- No publish or owner mutation request is issued.

Evidence:

- `route-status-matrix.json`
- Hosted screenshots.
- `VALIDATION_RECORD.md`

### Milestone 3 — Review and commit

Acceptance criteria:

- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.
- Hosted read-only smoke passes, or a blocker is documented.
- No real env/secrets are staged.

Evidence:

- `NO_MERGE_REVIEW.md`
- Final handoff.

## Files involved

- `.gitignore`
- `.env.hosted-owner-proof.example`
- `tests/e2e/presence-studio-v2-hosted-owner-readonly.spec.ts`
- `docs/program/evidence/presence-studio-hosted-owner-proof/**`

## Rollback plan

Remove the read-only spec, env example/ignore exception, and this evidence folder. No backend or hosted state should require rollback because the proof is read-only.

## Human decisions required

- Whether a later write/revert proof is approved for a safe pilot room.
- Whether the captured private evidence can be shared beyond the local repo.
