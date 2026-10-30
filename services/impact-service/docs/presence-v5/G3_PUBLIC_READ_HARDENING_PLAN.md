# ExecPlan: legacy Falak public node read hardening

## Gate

Presence V3.4 Gate 7 public-execution safety, as a bounded V5 G3 follow-up. No gate acceptance or deployment is implied.

## Objective

Make legacy public node list, single-node, graph and spatial-nearby reads obey the same active/public/normal-sensitivity boundary as the new transport discovery routes.

## Why now

The transport discovery contract is strict, but existing generic public reads currently admit any non-deleted node whose visibility is public. A draft cultural node marked public could therefore be read through an older endpoint.

## Current state and scope

The Prisma repository uses `canAccessNode` for single-node/graph reads, but list and PostGIS nearby use SQL filters. The in-memory repository used by tests has its own `canAccessNode`. Change these read predicates and add focused regression tests. Keep privileged reads, mutations, auth/tenant resolution, event-stream and ledger APIs unchanged. This is a medium-risk public-read behavior change; no migration or data write is needed.

## Milestones

1. Align Prisma and in-memory public node access checks.
2. Verify draft, archived, restricted-sensitivity and cross-tenant denials through list, detail, graph and nearby reads, while privileged reads remain available.
3. Run guarded PostGIS and non-database suites, build/typecheck, record evidence and inspect the branch diff.

## Rollback

Revert this isolated read-only branch. No persisted rows or schema change.
