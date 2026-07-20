# ExecPlan: BBB Vision hosted Studio V2 generalisation proof

## Objective

Prove that hosted BBB Vision room `29 / bbbvision` enters Studio V2 on the deployed branch preview, renders the environmental/layout-composition editor controls, loads private preview, and leaves anonymous public routes unchanged.

## Why now

BBB is the approved eventual publication candidate. The prior eligibility fix is not enough until the hosted owner-bound path proves the real room can enter Studio V2 without public-state mutation.

## Current state

- Branch: `feat/presence-studio-bbbvision-v2-eligibility`
- Expected commit: `653fe2dc6d7766405b5792a2cddd64be2ff3701e`
- BBB target: room `29`, slug `bbbvision`, title `bbb.vision`
- Draft-write flag for this pass: disabled

## Non-goals

- No publish.
- No draft write/revert.
- No backend/control-plane/auth/tenant/schema change.
- No deployment config change.
- No BBB public launch claim.
- No WebGL or renderer dependency work.

## Scope

### In scope

- Add a focused hosted Playwright proof.
- Capture screenshots and route/status matrix.
- Run typecheck, build, and the focused hosted proof.
- Commit proof-only test/evidence if validation passes.

### Out of scope

- Production deployment.
- Backend mutation.
- Public status change.
- Draft mutation.
- GGM work.
- BBB intake/content migration.

## Risks and blast radius

Risk: medium, because this touches hosted proof around owner/private/public boundaries.

Mitigation:

- Read-only mode enforced by `PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=0`.
- Test fails on publish requests.
- Test fails on owner mutation requests except the existing safe private-preview generation endpoint.
- Public route status is captured before and after and must remain unchanged.

## Tests and validation

Commands:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts --project=chromium --retries=0 --workers=1
```

## Rollback plan

Revert the proof commit. No runtime state should change in this read-only pass.

## Human decisions required

- Draft write/revert requires a separate explicit enablement of `PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=1`.
- BBB publication requires a separate launch/publish task.

## Progress log

```text
2026-07-21 — Created focused read-only proof spec and evidence pack shell.
```
