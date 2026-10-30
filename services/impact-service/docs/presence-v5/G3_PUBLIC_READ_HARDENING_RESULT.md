# V5 G3 follow-up: generic Falak public node reads

## Change

The legacy node list, detail, graph and PostGIS nearby paths now require `active`, `public`, normal-sensitivity nodes for public or anonymous reads. This matches the published-only transport discovery predicate. Public list requests that explicitly ask for draft/archived status or non-public visibility return an empty page. Privileged reads retain their existing access rules. No route, schema, mutation, publish action or persisted data changed.

## Evidence

On a dedicated disposable PostgreSQL 16/PostGIS 3.4 cluster (`presence_v5_g3_reads`, database `presence_v5_g3_reads_validation`), all 11 migrations applied. The guarded `npm.cmd run falak:test:integration:local` run passed 18/18 tests in four suites. Its new live case verifies draft, archived and cultural-sensitive public nodes are absent from list, detail, graph and nearby reads while an administrator can read them. The existing nearby ordering case now explicitly activates its fixture nodes before exercising a public read.

The in-memory regression checks the same four read shapes and privileged access. `npm.cmd run test:non-db` passed 124 tests, with six guarded database tests skipped by design. `npm.cmd run typecheck`, `npm.cmd run build` and `git diff --check` passed. Logs are in `C:\Dev\artifacts\presence-v5-g3-public-read-hardening-2026-10-30\`.

The first migration attempt failed because WSL stopped when the setup command ended; a keepalive session resolved it and the second migration completed. The first non-database run was blocked by sandbox loopback `EACCES`; its local-loopback rerun passed. These setup failures did not indicate application test failures.

## Review and limits

This is a read-only safety change on its own branch. It does not validate a hosted deployment or authorize publication. Generic Falak event-stream, ledger and pool-balance read contracts are outside this node-read scope and need a separate public-disclosure review before being used as Presence data sources. V3.4 Gate 7 and Gate 9 remain subject to their established reviews.

## Rollback

Revert this branch. There is no migration or data correction to undo.
