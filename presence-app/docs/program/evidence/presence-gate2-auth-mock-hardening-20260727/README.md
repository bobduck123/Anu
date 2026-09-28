# Presence Gate 2 Auth-Mock Hardening Closeout

Review date: 2026-07-28.

## Verdict

ACCEPT GATE 2.

Gate 2 is accepted for local/dev owner capability: real BBBVision content can be shaped through private overlays, the auth-mock blocker has been hardened, and public output remains unchanged.

## Summary

The prior Gate 2 acceptance review held acceptance because normal browser client auth could read a public owner-token variable. This closeout removes that route: the client no longer reads `NEXT_PUBLIC_E2E_AUTH_TOKEN`, no longer writes a fallback `owner-test-token`, and no longer mints a session from browser-readable env. Local tests still work because Playwright injects a token at runtime before sign-in.

## Auth hardening change

Before this closeout, `lib/supabase/client.ts` could create an E2E browser session from `NEXT_PUBLIC_E2E_AUTH_TOKEN` or the hardcoded fallback `owner-test-token` when `NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK=true`.

After this closeout:

- `NEXT_PUBLIC_E2E_AUTH_TOKEN` is not referenced in runtime client auth.
- The E2E auth mock is disabled in production builds.
- `signInWithPassword` only consumes an already-injected `presence:e2e:access_token`.
- If no injected token exists, the mock returns an explicit error instead of minting a session.
- Focused Playwright auth specs inject the test token at runtime before sign-in.

## Remaining auth env vars

- `NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK`: boolean local/test flag only; production-disabled and not an owner/bearer token.
- `NEXT_PUBLIC_E2E_AUTH_SUBJECT`: non-secret mock user id metadata only.
- `PRESENCE_GATE2_M*_OWNER_TOKEN`: non-public Playwright process envs used by the real-backend proof specs.
- `PRESENCE_REAL_OWNER_TOKEN`: local backend env source for proof execution only. The token value was not printed or recorded.

## Search result for NEXT_PUBLIC_E2E_AUTH_TOKEN

Runtime/client code result: no usage.

Remaining mentions after closeout are documentation/evidence only:

- `.agent/PRESENCE_GATE_1_REPAIR_GATE_2_PERSISTENCE_READINESS.md`
- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `docs/program/evidence/presence-gate2-acceptance-review-20260727/README.md`
- `docs/program/evidence/presence-gate2-auth-mock-hardening-20260727/README.md`

## Commands/tests run

- `cmd /c npm run typecheck` - failed once before `next build` because `.next/types/validator.ts` referenced missing generated `routes.js`.
- `cmd /c npm run build` - passed.
- `cmd /c npm run typecheck` - passed after build regenerated Next metadata.
- `npx.cmd playwright test tests/e2e/canvas-builder-auth-gate-session.spec.ts tests/e2e/auth-signout-rsc-safety.spec.ts --project=chromium --reporter=line` - passed, 6 tests.
- `npx.cmd playwright test tests/e2e/presence-gate2-m15-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 2 tests.
- `npx.cmd playwright test tests/e2e/presence-gate2-m2-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m3-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m4-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m5-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.
- `npx.cmd playwright test tests/e2e/presence-gate2-m6-bbbvision-real-backend.spec.ts --project=chromium --reporter=line` - passed, 1 test.

The focused auth tests first failed when run in parallel because Playwright could not own already-running local services. They passed when rerun in one sequence with Playwright owning the isolated mock-auth setup.

## Real-backend proof result

M1.5-M6 passed after hardening:

- M1.5: BBBVision seed/connect owner flow passed on desktop and mobile; public remained unpublished.
- M2: Work `2901` private title edit saved, reloaded, previewed, and left canonical/public output unchanged.
- M3: Work `2901` private Room placement saved, reloaded, previewed, and left canonical/public output unchanged.
- M4: private preview source truth remained explicit and private overlays did not leak publicly.
- M5: stale private state recovery preserved compatible overlays on the latest local base.
- M6: private Collection curation into Collection `292` saved, reloaded, previewed, and rebased without canonical or public mutation.

## Public/private boundary finding

The real-backend proof path continued to show BBBVision public output unchanged. Public BBBVision API/routes remained unpublished/non-public, and private overlay copy did not appear on the public Presence route when it returned a page.

## Room `1` isolation finding

Room `1` remained the empty-state/control target. The Gate 2 BBBVision overlays did not appear in the room `1` owner/control checks.

## Risks

- Gate 2 is accepted only for local/dev owner capability.
- Media association, safe deletion/archive, server draft preview, hosted proof, publish, public sync, and public launch remain out of scope.
- Direct Work/Collection PATCH remains canonical-row mutation and is not the accepted Gate 2 owner flow.
- The E2E mock still uses localStorage/cookie injection for tests; it no longer obtains the owner token from a browser-readable public env var.

## Rollback notes

- Revert `lib/supabase/client.ts` and the two focused auth specs to undo this auth-mock hardening.
- Revert the tracker/evidence docs to the pre-hardening Gate 2 review state.
- If local BBBVision private state needs reset, clear only `PresenceStudioV3State` for room `29`.
- Do not alter hosted, production, or public data.

## Remaining work

- Gate 3 design-system architecture planning.
- Separate future slices for media association, deletion/archive, server draft preview, and publish/public sync if approved.

## Recommended next task

Start Gate 3 ExecPlan for V3.2 design-system architecture, keeping publish and public sync explicitly out of scope.
