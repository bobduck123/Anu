# ANU-004 delivery evidence

## Summary

Implemented a private, account-backed commitment-to-outcome workflow for one node-scoped action. A participant explicitly confirms, cancels or submits evidence. A different steward in the same node can request changes or verify the outcome. The public endpoint exposes only a verified count for the action. Successful transitions write existing audit records in the same transaction.

## Files changed

- `flora-fauna/backend/app/models.py` and `migrations/versions/20260926_anu_action_commitments.sql`: commitment table and migration.
- `flora-fauna/backend/app/api/action_commitments.py` and `app/api/__init__.py`: lifecycle, review queue and public count endpoints.
- `flora-fauna/backend/app/routes.py`: prevent an action with participant commitments from being deleted.
- `flora-fauna/backend/tests/test_anu_action_commitments.py`: lifecycle, retry, node isolation, independent review, audit and redaction checks.
- `frontend-next/src/lib/api/actionCommitments.ts`, `src/components/actions/ActionCommitmentPanel.tsx`, action board/detail pages and new `/commitments` and `/commitments/review` pages: participant and steward interfaces.
- `frontend-next/src/test/actionCommitmentPanel.test.tsx`: confirmation, reload state and unavailable account checks.
- `docs/anu-004/EXECPLAN.md`: scope and release boundary.

## Commands/tests run

- Backend: `python -X utf8 -m pytest tests/test_anu_action_commitments.py tests/test_anu_onboarding.py tests/test_node_isolation.py -q --tb=short`: 6 passed; existing SQLAlchemy legacy query warnings.
- Frontend: `npm.cmd test -- --run src/test/actionCommitmentPanel.test.tsx src/test/onboardingPage.test.tsx src/test/profilePage.test.tsx`: 12 passed.
- `npm.cmd run typecheck`: passed.
- Focused `npm.cmd run lint -- ...`: passed.
- `npm.cmd run build -- --webpack` with synthetic local configuration: passed, 147 static pages.
- `git diff --check`: passed before staging.

## Manual QA performed

In a local production-mode browser with synthetic API responses, recorded confirm → reload → submit evidence → steward review → verified participant status and public count. Checked the final action detail at 390 px mobile width and confirmed the status and links remain reachable by scrolling. The final action detail no longer displays the old direct proof upload control.

## Screenshots/links if visual

Local evidence outside the commit: `C:/Dev/anu-004-work/output/playwright/anu004-pilot.webm`, `C:/Dev/anu-004-work/output/playwright/anu004-verified-panel.png`, `C:/Dev/anu-004-work/output/playwright/anu004-mobile-scrolled.png`. These use synthetic responses; unrelated shell health checks showed fallback mode because other services were not running.

## Risks

- The migration has not been run on a real database. Release order is migration, backend, then frontend.
- Hosted authentication, real evidence storage and physical-device QA remain unverified.
- Legacy `/complete_action` and `ActionProof` API routes remain callable by existing consumers and may change legacy completion/point records without steward review. They do not affect the new verified public count. Resolve their migration and reporting treatment before using total completions as pilot outcomes.
- OPS-004 and ANU-003 are separate, unmerged dependencies. This branch contains their commits as its base.
- Local worktree `node_modules` junctions are rejected by Turbopack; Webpack build and production-mode browser session worked.

## Rollback notes

Revert the ANU-004 commit. The additive private table may remain unused until a separately reviewed schema rollback. No live data was changed.

## Remaining work

Human review, migration plan, hosted pilot with a real participant and steward, and a decision on legacy completion/point paths. No merge or deployment was performed.

## Recommended next task

ANU-004 release reconciliation: decide how legacy completion and proof routes coexist with the reviewed commitment workflow, then verify the selected rule on a hosted pilot before using outcome totals publicly.
