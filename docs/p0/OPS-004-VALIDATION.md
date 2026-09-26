# Reproducible checks and safe setup

26 September 2026. Isolated source pin 135ed44 with OPS-004 changes. Existing installed node_modules were reused through local junctions; this validates clean source, not a fresh online install.

## Changes

- Frontend typecheck runs supported `next typegen` before TypeScript. `.next/dev` is excluded; `.next/types` remains checked.
- Framework-generated build contracts exposed existing mismatches in seven Presence pages, archive index/detail and the control proxy route: params/searchParams now use Next's promised values. Archive detail now awaits params. Other page runtimes already awaited them. The unused unsupported route `__testables` export is removed; no consumers existed. Auth, proxy policy and tenant logic are unchanged.
- Impact build generates Prisma client and compiles TypeScript. Database migration is a separate explicit `prisma:migrate:deploy` command; it was not executed.
- Root README now describes actual per-service setup. There is no root ANU package pipeline.

## Evidence

| Check | Result |
|---|---|
| `npm.cmd run typecheck` in frontend | PASS after supported regeneration |
| Stale `.next/dev/types` reference fixture | Standard typecheck PASS; obsolete generated reference excluded |
| Genuine source type error fixture | Standard typecheck correctly FAILS with TS2322; proves errors are not hidden |
| After both task-owned fixtures removed | Standard typecheck PASS |
| `npm.cmd run build -- --webpack` in frontend | PASS, 145 static pages generated; synthetic localhost Supabase/core/impact origins |
| Four targeted page/proxy suites | 38 tests PASS: controlProxyRoute, archivePage, archiveRecordPage, presenceNodes |
| `npm.cmd run build` in impact-service | PASS: Prisma generation + tsc; no migrate step, no production DB mutation |

Initial builds failed on the pre-existing promised-parameter/export mismatches listed above. Corrected builds passed; no failures are hidden by exclusions. The only excluded generated directory is Next development output, not application source. Exact positive/negative typecheck output is in OPS-004-typecheck-boundary.json. Existing Prisma multiSchema and Vite CJS deprecation warnings remain; they are not build failures.

Reproduction: inspect per-service package.json/lockfiles, use an isolated checkout and synthetic local environment, run the listed commands from the service directory. `--webpack` avoids Turbopack's external junction restriction in this local verification environment. A clean dependency install and other deployment platforms remain untested. Do not copy a live .env or run the original pre-integration impact build, which still performs migration.

Summary: Standard checks regenerate current route types and compile without implicit database migration.
Files changed: README; frontend manifest/config, ten route/page contracts and two test fixtures; impact manifest/config; this evidence.
Commands/tests run: Listed above. No migration, deployment or live service test.
Manual QA performed: Reviewed source and generated-check boundaries; existing page/proxy behaviour exercised by 38 tests.
Screenshots/links if visual: No intended visual change; regression suites cover existing routes.
Risks: Dependency installation, real environment configuration and full cross-branch integration are not certified.
Rollback notes: Revert the single task commit after review. Restoring old impact build also restores its migration side effect, so do not run it inadvertently.
Remaining work: Normal scoped integration review and separately authorised deployment verification.
Recommended next task: Review/integrate OPS-004 before running standard checks on the original checkout.
