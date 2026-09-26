# ANU-003 ExecPlan — real membership onboarding

## Objective

An authenticated participant selects interests and one available microcosm, confirms the choice, and receives a persisted membership. Reloads and another device read the same server state. Failed requests never report completion.

## Why now

The current onboarding page stores its selections and completion flag only in the browser. ANU-003 is the first participant journey after the isolated OPS-004 build repair.

## Current state

- The page uses the older `/api/microcosms` listing and a local `onboarding_complete` flag.
- The intended HELL microcosm listing is mounted at `/api/microcosms` in this checkout; the older route is mounted there too. Existing frontend calls to `/api/hell/microcosms` return 404. A separate join operation rejects an already joined participant and does not enforce a node match. ANU-003 reads the available choices through its dedicated authenticated onboarding contract.
- `User` has a persisted microcosm relationship but no persisted onboarding interests.
- This branch starts at the OPS-004 commit `bf684373c7cb`; other P0 branches are separate and unmerged.

## Scope and boundaries

- Add private interests storage to `User` with a reviewed SQL migration.
- Add an authenticated, node-scoped onboarding read/confirm contract. Confirm saves interests and membership in one transaction and is safe to retry.
- Use that contract in the onboarding page and its profile completion indicator.
- Add synthetic backend and frontend tests plus a local browser journey if the browser can run.
- Do not change the existing join route, other membership plans, production data, auth configuration, or Presence behavior.

## Risks

High blast radius because membership and persistence are involved. An incorrect node check could expose or join another community. A failed response after a successful commit must be reconciled by reading the server, not by a browser-only completion flag. Migration execution requires separate release approval.

## Milestones

1. Confirm existing identity, node, projection, migration and test contracts.
2. Implement the smallest server contract and frontend flow.
3. Verify unauthenticated, cross-node, invalid, retry, reload and failure paths; review the full scoped diff.

## Validation

- Backend: targeted pytest with in-memory SQLite and synthetic users in two nodes.
- Frontend: targeted Vitest, lint on changed files, typecheck and build using the OPS-004 safe scripts.
- Manual QA: desktop and mobile flow with synthetic local API responses where feasible.

## Rollback

Revert the ANU-003 code commit. The nullable interests column may remain unused until a separately reviewed schema rollback; no live migration is run here.

## Human decisions

Human review before merge, migration or deployment. No production account or data is accessed in this task.
