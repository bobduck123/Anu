# Test Results

Date: 2026-05-26

| Test | Result | Notes |
| --- | --- | --- |
| `npm.cmd run typecheck` | Passed | TypeScript accepts public payload boundary changes |
| `npm.cmd run build` | Passed | Existing Next.js multiple-lockfiles workspace-root warning remains |
| Focused frontend Node suite | Passed, 18 tests | Resolver, public payload mapper, readiness, media policy, editor client |
| Backend Presence regression suite | Passed, 109 tests | Existing SQLAlchemy `Query.get()` deprecation warnings remain |
| Playwright regression set | Passed, 25 tests | Auth, preview/publish, parity, V1B upload, RoomKey and new source hygiene |
| `git diff --check` | Passed | No whitespace errors |

## New Assertions

- The published public display payload omits editor/control-plane keys while retaining the resolved visible title and hero image.
- Raw anonymous HTML for `/p/test-presence-room` and `/presence/test-presence-room` omits all restricted terms.
- Anonymous public HTML remains clean before and after the V1B upload is intentionally published.

## Lifecycle Covered Locally

Upload safe image, assign to draft, keep public unchanged before publish, show image in private preview, publish with confirmation, show image publicly, render RoomKey from published state, and reset local test state.
