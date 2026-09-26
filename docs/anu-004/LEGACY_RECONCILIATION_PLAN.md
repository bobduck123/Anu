# ANU-004 legacy completion and points reconciliation

## Objective

Use steward-verified action commitments as the only pilot outcome count and the only source of action completion rewards for node-scoped actions. Keep historical legacy records intact and identifiable.

## Current conflicts

- `POST /complete_action/<id>` increments `Action.completions`, completes a `Todo`, and awards user points and optional civic credit before review. Repeated calls award repeatedly.
- Legacy proof upload accepts a client `verified` flag, automatically verifies in alpha mode, and may award proof credit. Its public read returns evidence URLs.
- Education regeneration logs may increment `Action.completions` before review.
- The public impact summary and action board display `Action.completions` as if it were a trusted outcome. The frontend legacy completion and proof methods can even simulate success on backend failure.
- Weekly action challenge progress counts legacy completed to-dos and can grant extra points before review.

## Chosen pilot rule

1. For actions attached to a node, block the old completion and proof-write endpoints before any mutation. Historical unscoped action behavior remains available for compatibility but is explicitly legacy.
2. On a steward's first verification, award the action's configured points once in the same database transaction as the status and audit event. Record the award time and amount on the commitment. Optional civic credit is inserted in that transaction with a commitment reference. If a prior completed to-do, verified proof, or action completion audit exists for that participant and action, record the reviewed outcome with zero new action points; historical award records cannot prove whether another award is owed.
3. Keep old `Action.completions`, `Todo`, proof and education log records. They do not migrate into verified outcomes automatically.
4. Pilot-facing action totals and public impact summary derive from `ActionCommitment.status == VERIFIED`. Pilot action responses expose the old counter as `legacy_completions`; `completions` and `verified_outcomes` mean the reviewed count.
5. Remove frontend methods that simulated completion or verified proof after a failed request. Remove invented impact summary totals and challenge progress on service failure. Keep legacy records readable only where already required, without presenting them as reviewed evidence.
6. For node members, weekly action challenges count only commitments verified within the challenge week. Historical unscoped participants retain the old to-do path.

## Boundaries and verification

This branch starts at ANU-004 commit `ac7a8d4`; ANU-003 and OPS-004 remain earlier unmerged dependencies. No live migration, backfill, production data correction, merge, or deployment. Verify that rejected old writes have no count, point, credit, proof or audit side effects; verified review awards once; public totals exclude historical writes; cancellation and request-changes award nothing; cross-node review stays forbidden. A hosted pilot still needs a selected database, migration order, operator review and real-account checks.

## Rollback

Revert this commit. The additive award columns may remain unused until a separately reviewed schema rollback. Historical legacy records are never deleted or rewritten.
