# ANU-007 ExecPlan — tracked background-job proof

## Gate

ANU standalone operations, ANU-007. This work does not change Presence V3.4 gates.

## Objective

Prepare one required, non-sending scheduled job for a repeatable staging invocation with a durable run receipt, bounded retries, duplicate-slot protection, and last-success/failure visibility. The selected first job is the impact service's read-only **weekly digest summary**. It currently aggregates data and logs a summary; it does not send email.

## Why now

ANU-006 found core scheduler stubs and an impact `node-cron` initializer with no caller. A function existing in source or a green health endpoint does not prove scheduled execution. Weekly summary is the smallest useful path that avoids Stripe reconciliation and outbound contact while proving the job mechanism.

## Current state

- `services/impact-service/src/jobs/weeklyDigest.ts` reads subscriptions, credits and pool entries, logs a summary, and disconnects a module-level Prisma client.
- `services/impact-service/src/jobs/scheduler.ts` declares cron schedules, but source search found no `initializeJobs` call. `vercel.json` has no cron configuration. External scheduler configuration outside this repository is unknown.
- Core Flask `SchedulerStub` and its reconciliation/member-update jobs are placeholders.
- Docker CLI exists but the local Docker daemon was unavailable on 2026-09-27. No staging target has been selected yet.

## Scope

In scope:

1. A versioned database receipt for a weekly summary slot, unique by job and scheduled time.
2. A bounded claim/retry mechanism and read-only summary result recording.
3. An explicit operator CLI for one slot and a read-only status view. No automatic runtime startup.
4. Synthetic tests for duplicate, failure, retry, stale run and last success; local typecheck/build.
5. A staged invocation only after a non-production target is selected and authorised.

Out of scope: production cron wiring, live migration, Stripe reconciliation, email/notification delivery, payment changes, production data, other jobs, and public launch claims. A logged summary is not a delivered digest.

## Risks and blast radius

Medium: new job receipt schema and a controlled CLI. A scheduler trigger or production migration would raise the blast radius and need a separate deployment ticket. A stale running slot needs a lease; the lease must be longer than the selected host's maximum execution time before enabling a real scheduler. The receipt must contain aggregate metrics only, no member identity or financial transaction detail.

## Milestones

1. **Source and trigger audit:** identify live/stub functions, deployment config and selected safe job. Evidence: source links and dated audit in delivery record.
2. **Reviewable implementation:** add receipt schema, deterministic weekly period and claim/retry runner, plus explicit CLI. Evidence: code diff and tests.
3. **Local validation:** typecheck, build, focused tests and migration syntax/schema check. Evidence: command outputs in delivery record.
4. **Staging proof:** on a separately selected non-production database, apply reviewed migration, invoke the same slot twice and a recovery case, then read receipt. Evidence: redacted run IDs/status/attempts/last-success. If no target is available, mark this milestone open rather than claiming ANU-007 complete.

## Likely files

`services/impact-service/prisma/schema.prisma`, one migration, `src/jobs/weeklyDigest.ts`, a tracked runner and CLI under `src/jobs`, package script, focused Jest tests, and `docs/anu-007/DELIVERY.md`.

## Validation

Use named scripts from `services/impact-service`: `npm.cmd run typecheck`, `npm.cmd run build` (OPS-004 makes it migration-free), and a focused Jest suite. Do not run `prisma:migrate:deploy` without a selected authorised target. Test both success and failure, same-slot duplicate prevention, retry limit, and status visibility.

## Rollback

Disable the new CLI/scheduler invocation first. Revert the code commit after review; the additive receipt table can remain unused until a separate schema rollback. The existing unscheduled digest function stays available. No email or Stripe side effect is introduced.

## Human decisions required

- Which non-production impact host/database is the staging proof target?
- Is weekly summary the required first job, and who owns its operational alert/receipt?
- A later deployment ticket must approve actual scheduler wiring and any Stripe reconciliation or outbound digest delivery.

## Progress log

2026-09-27 — Source audit complete; isolated branch created. Staging target requested. Receipt, runner, CLI and focused synthetic tests implemented. Final local build, typecheck, schema validation and 20 non-database suites / 120 tests passed. Staging invocation and scheduler proof remain open.
