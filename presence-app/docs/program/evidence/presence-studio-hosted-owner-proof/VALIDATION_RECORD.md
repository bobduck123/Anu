# Validation record

## Local validation

- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run build`

Build retained the known Next workspace-root warning caused by multiple lockfiles.

## Hosted read-only smoke

- Command: `npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-hosted-owner-readonly.spec.ts --project=chromium --retries=0 --workers=1`
- First run: blocked by sandbox network denial before reaching hosted frontend.
- Escalated hosted run: reached hosted owner sign-in and the deployed Studio V2 editor shell.
- Final result: FAIL/BLOCKED because `presence-studio-v2-layout-label` was not found.

## Draft/publish safety

- Draft write/revert: not attempted.
- Publish: not attempted.
- Mutation-capable lifecycle specs: not run.
- Public state mutation: not attempted.

## Evidence safety

- Real env file: `.env.hosted-owner-proof.local`, ignored by git.
- Private values emitted: none.
- Hosted screenshots retained: none from the failed run.
- Route/status JSON: not generated because the proof stopped on the layout-control blocker.

## Result

The hosted owner auth path is no longer blocked by missing local env. The active hosted frontend is not currently proving the completed local layout-composition slice.
