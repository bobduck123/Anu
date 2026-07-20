# Validation record

## Commands

| Command | Result | Notes |
|---|---|---|
| `npx.cmd tsx --test lib\presence\studio-v2\feature.test.ts` | PASS | 12/12 tests passed. `npx` emitted a package-cache warning for `tsx`; no repo package files changed. |
| `npx playwright test tests\e2e\presence-studio-v2-bbbvision-eligibility.spec.ts --project=chromium` | BLOCKED BY HARNESS | Default Playwright webServer let Next infer `C:\Dev` as workspace root due parent lockfile and failed resolving app dependencies. |
| Manual app-root server + `npx.cmd playwright test presence-studio-v2-bbbvision-eligibility.spec.ts --project=chromium` | PASS | 1/1 Chromium test passed using `next dev --webpack`, local mock API, hosted-smoke mode pointed to `127.0.0.1:3100`. |
| `npm.cmd run typecheck` | PASS | `tsc --noEmit`. |
| `npm.cmd run build` | PASS | `next build` completed. Existing multiple-lockfile workspace-root warning remains. |

## Focused e2e assertions

- `/studio/29/editor` renders `presence-studio-v2-root`.
- BBB editor title is `bbb.vision`.
- Layout-composition controls are visible.
- Initial save button is disabled.
- Private preview is reachable.
- Private preview renders V2 public-room shell.
- `/p/bbbvision` returns 200.
- `/presence/bbbvision` returns 200.
- `/studio/101/editor` does not render V2 root.
- `/studio/101/editor` renders legacy editor UI.
- Mock request log contains no publish request.
- Mock request log contains no draft write request.

## Hosted state

No hosted draft write/revert, publish, backend mutation, deployment, or public state mutation was performed.
