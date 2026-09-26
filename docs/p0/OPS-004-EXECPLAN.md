# ExecPlan: OPS-004 — Restore reproducible local checks and safe setup

## Gate

ANU standalone. Separate branch: `p0/ops-004-2026-09-26`.

## Objective / why now

Make a fresh checkout checkable without live mutations. User authorised implementation of all P0 on 26 September 2026.

## Current state / inputs

Source baseline 135ed4478f2a13b996186b453021a03ae401df9f; original checkout and dirty work are preserved. Use the dated ANU assessment, September Presence state review, current governance and ticket acceptance criteria.

## Scope

Only /README.md, /frontend-next/, /services/impact-service/, /.github/workflows/, /docs/p0/. Task evidence is additive under docs/p0. OPS-001 may expand to exact tracked credential occurrences after masked inventory, without changing authentication logic. OPS-003 additionally updates C:/Dev/AGENTS.md and relevant C:/Dev/.agent governance with pre-edit backups.

## Non-goals

No merge, push, deployment, live authentication test, production-data mutation, unrelated refactor, migration execution or launch approval.

## Risks / blast radius

medium; Operations. Source examples may contain credentials: scan without printing values. Isolation and public routes remain within the explicitly approved P0 integrity repair only.

## Milestones

1. Map exact current source and define a bounded change.
2. Implement the scoped fix or concrete review packet.
3. Run meaningful targeted tests/checks and preserve evidence.
4. Review the full task diff; record limitations and safe rollback.

## Acceptance criteria

- Resolve stale generated PEACH references through supported regeneration
- repair root setup instructions
- separate impact compilation from database migration execution

## Tests and manual QA

Clean-checkout typecheck/build results and safe setup transcript. Commands are selected from actual local scripts; use isolated synthetic data only. UI-affecting changes require browser evidence or an explicit unresolved limitation.

## Rollback

Task work lives in a separate worktree/branch. Do not change the original checkout or reset existing work. Revert only the task's scoped commit after review. External governance files have pre-edit backups.

## Human decisions

Mobstar selected by the user for PRE-002. Any new protected live credential rotation, production action, merge or public release remains a separate final approval. Prepare target packets before requesting any remaining creative/permission decision.

## Progress

- Plan recorded before implementation.

- Clean build exposed seven existing Next 16 route-prop type declarations accepting plain objects. Narrowed those types to promised params; runtime code already awaits params and is unchanged. This is build compatibility, not a route/auth/renderer behaviour change.

- Delivery recorded in docs/p0 on the isolated task branch. Targeted evidence and review limitations are in START_HERE.md and per-ticket delivery. No merge/deploy occurred.
