# ExecPlan: Presence observed read contract

## Gate

V3.4 Gate 2 owner-capability support; this is the bounded read-contract foundation of proposed V4 G1. It does not reaccept Gate 2 or pass V4 G1.

## Objective

Publish a reviewable draft OpenAPI description of six existing Flask Presence GET routes, and make CI detect route or response-shape drift against local synthetic fixtures.

## Why now

The V4 seed contract uses proposed `/api/v1` paths, UUIDs and a different response envelope. The user confirmed retaining Flask/SQLAlchemy and the current routes for this first slice. Client and backend work need a truthful baseline before any additive versioned API is designed.

## Current state

The Flask API mounts `/api/presence/public/*` and `/api/presence/owner/*`. Public endpoints use `{ok,data,request_id}`; the selected owner endpoints use `{ok,data}`. IDs are integers; the public list uses limit/offset. Existing `presence-app/lib/api` is the active client.

## Scope

- Source-control a clearly labelled observed subset of OpenAPI 3.1 in the repository's existing `contracts/` directory.
- Cover public list, public node/work/collection detail and owner node list/detail GET responses.
- Use in-memory fixture data and a small contract test to validate Flask route registration, essential response fields, visibility and owner authorization.
- Run that test in the existing core runtime CI job.

## Non-goals

- No `/api/v1` runtime route, SDK replacement, database migration, auth or tenant change, publish change, payment or write endpoint.
- No complete production API, full JSON Schema certification, hosted proof or V4 G1 signoff.

## Risks and blast radius

Runtime blast radius is zero; CI gains one test. The contract intentionally specifies only stable essential fields of the existing rich payloads and leaves additional fields open. A green contract check is not a privacy or security certification. Synthetic SQLite responses may differ from hosted PostgreSQL behaviour.

## Milestones

1. Capture six observed route/response definitions and label planned V4 contract differences.
2. Add synthetic response and route-map contract checks, including hidden public data and unauthenticated owner negatives.
3. Run focused pytest, inspect the CI change and exact branch diff.

## Files likely involved

- `contracts/presence-current.openapi.json`
- `flora-fauna/backend/tests/test_presence_read_contract.py`
- `.github/workflows/m0-runtime-contracts.yml`
- `docs/presence-v4/G1_CONTRACT_EXECPLAN.md`
- `docs/presence-v4/G1_CONTRACT_RESULT.md`

## Tests and validation

Run the focused Python test from `flora-fauna/backend` with a workspace `--basetemp`, then `git diff --check`. Existing Presence tests may be run only if this slice reveals a concrete regression risk.

## Rollback plan

Revert this branch. It changes no live route or data; removing the added CI command restores the prior CI workload.
