# ANU-003 delivery evidence

## Summary

The Welcome Journey now reads a participant's interests and microcosm membership from their account. A confirmation request saves both in one database transaction, and the page advances only after the account confirms membership. Reloads and another client see the same state. The profile completion badge uses the account state.

## Files changed

- `flora-fauna/backend/app/models.py`: private, nullable onboarding interests field.
- `flora-fauna/backend/migrations/versions/20260926_anu_onboarding_interests.sql`: additive JSONB column; not run against a live database.
- `flora-fauna/backend/app/api/hell.py`: authenticated, node-scoped GET/POST `/api/hell/onboarding` contract.
- `flora-fauna/backend/tests/test_anu_onboarding.py`: membership, isolation, validation and retry checks.
- `frontend-next/src/lib/api/onboarding.ts`: typed account contract.
- `frontend-next/src/app/(app)/onboarding/page.tsx`: confirmation flow, retry/reconciliation, and saved-state display.
- `frontend-next/src/app/(app)/profile/page.tsx`: account-based completion badge.
- `frontend-next/src/test/onboardingPage.test.tsx` and `src/test/profilePage.test.tsx`: page behavior checks.
- `docs/anu-003/EXECPLAN.md`: scope and risk record.

## Commands/tests run

- `python -X utf8 -m pytest tests/test_anu_onboarding.py tests/test_node_isolation.py -q --tb=short` in `flora-fauna/backend`: 5 passed, 2 pre-existing SQLAlchemy deprecation warnings.
- `npm.cmd test -- --run src/test/onboardingPage.test.tsx src/test/profilePage.test.tsx` in `frontend-next`: 9 passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint -- 'src/app/(app)/onboarding/page.tsx' 'src/app/(app)/profile/page.tsx' src/lib/api/onboarding.ts src/test/onboardingPage.test.tsx src/test/profilePage.test.tsx`: passed.
- `npm.cmd run build -- --webpack` with synthetic local configuration: passed, 145 static pages.
- `git diff --check`: passed.

## Manual QA performed

- In a local browser with synthetic account responses, completed desktop interest → microcosm → confirmation flow and observed navigation only after POST success.
- At a 390 px mobile viewport, confirmed account state rendered without horizontal overflow; scrolling exposed the final action above the fixed mobile navigation.
- Reloaded an already completed account state and saw the account-based completion view.

## Screenshots/links if visual

Local evidence, outside the commit: `C:/Dev/anu-003-work/output/playwright/anu003-desktop-confirm.png` and `C:/Dev/anu-003-work/output/playwright/anu003-mobile-scrolled.png`. These use synthetic API responses. The local app shell's health checks reported fallback mode because its other services were not started.

## Risks

- The migration has not been applied to a real database. Release order is migration, backend, then frontend.
- The full flow has not been tested against a hosted authenticated account, a real database, or a physical mobile device.
- OPS-004 remains a separate unmerged dependency. The isolated worktree starts from its reviewed source commit.
- The existing local `node_modules` junction is rejected by Turbopack (`Symlink node_modules is invalid, it points out of filesystem root`); the Webpack build and production-mode browser session worked. This is a local worktree/browser development setup issue, not a Windows browser sandbox restriction.

## Rollback notes

Revert this branch's code commit. The nullable column can remain unused until a separately reviewed schema rollback. No live data or migration was changed here.

## Remaining work

Human review of the branch, database migration and release plan, plus hosted end-to-end verification after OPS-004 integration. No merge or deployment was performed.

## Recommended next task

ANU-004: persist a participant's selected starter action as a real commitment, with account-level confirmation and a safe retry path.
