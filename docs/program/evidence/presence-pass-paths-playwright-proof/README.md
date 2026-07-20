# Presence Pass / Paths Playwright Proof

Date: 2026-05-20

## Summary

Added deterministic browser acceptance coverage for the Presence Pass / Observer / Mood Board / Paths product flow.

The proof layer is intentionally fixture-backed and mocked at the API boundary. It does not depend on production data, a live backend database, or real Supabase auth. Server-rendered public routes and client-side graph actions both use the same local mock API server.

## Fixtures Added

- `presence-app/tests/fixtures/presenceGraph.json`

Fixture coverage:

- Presence Room: `Mara Vale Test Room`
- RoomKey: `test-room-key-token`, `key_type=nfc`, `campaign_label=Test NFC Card`
- Encounter: NFC source, RoomKey-linked
- ObserverProfile: `test-observer-mask`
- Passport: empty and saved/entered states
- Mood Board: empty and Room-saved states
- Path: three waypoints, two choices, `reason_shown` on each waypoint
- Owner analytics: entries, saves, source breakdown, best performing key

## Test Harness Added

- `presence-app/playwright.config.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-pass-paths.spec.ts`
- `presence-app/package.json` script: `test:e2e`

The mock API covers:

- `GET /api/presence/keys/<token>/resolve`
- `POST /api/presence/rooms/<id>/encounters`
- Observer profile, save/follow, Passport, Mood Boards, Field Notes, Signals
- Path read/generate/walk/trace/choose
- Owner Presence Passes, Room Keys, and analytics
- Public Presence read/list endpoints for SSR regression coverage

Auth is mocked only when `NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK=true`; production auth remains unchanged.

## Browser Tests Added

`presence-app/tests/e2e/presence-pass-paths.spec.ts` covers:

1. RoomKey entry success at `/r/test-room-key-token`
2. Invalid/revoked RoomKey safe state
3. Guest save prompts Observer Mask
4. Observer Mask creation then save
5. Passport empty and saved states
6. Mood Board creation and add-current-Room flow
7. Path from Room waypoint/fork navigation and observer walk recording
8. Path from Mood Board rendering
9. Owner Presence Pass / Room Key Studio
10. Owner analytics aggregate graph activity without private observer identity
11. Public `/world` hidden/forming state
12. Existing public route regression for `/p/[slug]`, `/presence/[slug]`, and `/presence-chooser`

## Bugs Fixed During Test Implementation

- Prevented duplicate guest Encounter capture by delaying `PresenceGraphActions` capture until entry context is ready.
- RoomKey entry now passes explicit source/token/campaign context into graph actions.
- `/r/[token]` skips client-side encounter capture when the resolve endpoint already returned an Encounter.
- Public room action button now says `Add to Mood Board`, matching the product flow and testable UX.

## Commands Run

From `presence-app`:

```text
cmd /c npm run typecheck
```

Result: passed.

```text
node --test lib\api\client.test.ts lib\api\presenceGraph.test.ts
```

Result: 6 passed. Node emitted the existing package-type ESM warning.

```text
node lib\presence\graph\copy.test.ts
```

Result: 11 passed. Node emitted the existing package-type ESM warning.

```text
cmd /c npx playwright test tests/e2e/presence-pass-paths.spec.ts
```

Result: 12 passed.

```text
cmd /c npm run build
```

Result: passed. Next emitted the existing workspace-root inference warning because multiple lockfiles exist under `C:\Dev`.

```text
git diff --check
```

Result: passed.

## Browser QA Boundary

This is mocked frontend Playwright acceptance coverage, not live backend E2E. That is intentional for release hardening because:

- tests do not depend on production data
- tests do not need real Supabase credentials
- tests cover both browser requests and server-rendered public route fetches through a local mock API

Hosted/local true integration smoke remains a separate follow-up once stable graph seed and test auth credentials are available.

## World Status Confirmation

`/world` remains hidden/forming. The test asserts the exact public copy:

> The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist.

No empty public World map is exposed.

## Known Limitations

- No real backend database writes are performed by these tests.
- No real Supabase session is used; the auth mock only supplies a bearer token to exercise authenticated UI branches.
- The npm script wrapper was added, but the verified command used `npx playwright test ...` directly in this environment.
- Existing Next build still warns about workspace-root inference due multiple lockfiles.

## Follow-Up Recommendations

- Add a separate hosted/local integration smoke once a stable seeded RoomKey and test auth token exist.
- Add screenshot assertions for mobile viewports after the graph fixture set is promoted to a shared QA fixture.
- Add owner moderation/admin world-readiness UI coverage when those frontend surfaces are implemented.
