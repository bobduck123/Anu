# ANU-007 — background job execution proof packet

## Status

Reviewable code and local synthetic evidence are ready. **Staging execution and external scheduling are not yet proven.** No production database, deployment, scheduler or email service was changed.

## Source audit (2026-09-27)

- The impact service defines daily reconciliation and weekly digest cron expressions in `src/jobs/scheduler.ts`, but there is no source call to `initializeJobs`. `services/impact-service/vercel.json` has no cron entry. This audit cannot see scheduler settings outside the repository.
- The Flask backend's `SchedulerStub` and its reconciliation/member update jobs are placeholders.
- Daily reconciliation calls Stripe and changes subscription state. It is not included in this ticket. Weekly digest currently reads data and logs an aggregate; it does not deliver messages.

## Change

- Added one receipt per `(jobName, scheduledAt)` in `public.ScheduledJobRuns`. It stores aggregate result metrics or a safe error class/code, never member identity or individual transactions.
- Added an explicit weekly summary runner. A unique receipt prevents a second successful run of the same Monday 08:00 UTC slot. A conditional claim prevents concurrent workers from executing that slot. Failed/stale claims may retry up to three attempts. A 15 minute lease is provisional and must be checked against the actual host's maximum execution time before an external trigger is enabled.
- The reporting window is the seven days ending at the slot. The legacy unscheduled manual function remains available and still logs a summary only.
- Added `status` output with latest run, last success, last failure (including one recovered by retry) and five unresolved failures. The CLI is not called by server startup or any deployment configuration.

## Local evidence

- `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund` — passed.
- `npm.cmd run build` — passed; Prisma generated the client and TypeScript compiled without running migrations.
- `npm.cmd run typecheck` — passed.
- `npx.cmd prisma validate --schema prisma/schema.prisma` — passed, with pre-existing `multiSchema` deprecation warning.
- `npm.cmd run test:non-db -- --silent` — 20 suites and 120 tests passed, including eight focused tracked-job tests.
- `npm.cmd run job:weekly -- status` without a database — exited with a clear configuration message; this verified the standalone CLI does not require web-server JWT settings. It did not query a database.
- `git diff --check` — passed.
- No live database/manual hosted QA was performed. The local Docker daemon was unavailable.

## Staging proof still required

1. Select a **non-production** impact service and disposable/permissioned database. Confirm the database target before any migration; inspect all pending migrations because `prisma migrate deploy` applies the queue, not just this change.
2. Deploy this branch to that service, apply the reviewed migration through the approved staging path, and set its normal database connection through the host's secure configuration. Do not paste credentials into task comments or documentation.
3. Build and invoke `npm run job:weekly -- run` for the latest Monday 08:00 UTC slot. Invoke the same slot again and confirm the second result says `skipped` with reason `succeeded`, with one durable receipt. Run `npm run job:weekly -- status` and capture redacted status output.
4. On a disposable fixture, demonstrate failed-run retry and stale-claim recovery, then inspect attempts and the last-success/failure view. Confirm duplicate invocations do not repeat the summary work.
5. Verify the chosen external scheduler's invocation and last-success timestamp after its actual schedule. Its configuration and alert owner need a separate approved deployment ticket. No scheduler proof can be claimed from a manual CLI call alone.

## Risks and rollback

The new receipt is additive. Disable any later trigger first, then revert the code if needed; the table can remain unused pending a separately reviewed schema rollback. The 15 minute lease is provisional. The aggregate includes current active counts, so a retry after source data changes may record different active totals. There is no outbound delivery; a successful receipt proves summary computation only.

## Next decision

Provide the non-production impact host/database target and the owner for scheduler visibility. Then complete the staging invocation and recovery evidence before treating ANU-007 as complete or using job outcome totals.
