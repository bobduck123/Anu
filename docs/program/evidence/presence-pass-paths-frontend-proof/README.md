# Presence Pass / Paths Frontend Proof

Date: 2026-05-20

## Summary

Presence now has frontend surfaces for the backend graph foundation: Room Key entry, guest encounter capture, Observer upgrade prompts, room save/follow actions, Passport memory, Mood Boards, Field Notes, Signals, Paths, owner Presence Pass / Room Key management, owner graph analytics, and a public World forming state.

The public World remains locked/forming. No fake map was introduced.

## Routes Added Or Verified

- `/r/[token]` resolves Room Keys and renders a fast Room entry screen.
- `/observer/passport` renders Observer Passport memory.
- `/observer/mood-boards` lists and creates Observer Mood Boards.
- `/observer/mood-boards/[id]` renders board items and can generate a Path.
- `/paths/[id]` renders an existing Path.
- `/paths/from-room/[roomId]` reads a deterministic Path from a Room.
- `/paths/from-mood-board/[boardId]` reads a deterministic Path from a Mood Board.
- `/studio/[id]/passes` manages owner Presence Passes and Room Keys.
- `/studio/[id]/analytics` includes graph activity and Room Key performance.
- `/world` shows the hidden/forming World state.

Existing public Presence routes remain dynamic and present in the production build:

- `/p/[slug]`
- `/presence/[slug]`
- `/dynamics/orbit`
- `/dynamics/tableau`
- `/dynamics/cascade`
- `/presence-chooser`
- `/studio`

## Components Added Or Extended

- `PresenceGraphActions` adds save, follow, Mood Board, Field Note, Signal, Observer upgrade, and encounter capture actions to public Presence Room rendering.
- `RoomKeyEntry` powers NFC/QR/short-link entry through `/r/[token]`.
- `ObserverPassportClient` renders Passport history and empty/auth states.
- `MoodBoardsClient` renders Observer board listing and creation.
- `MoodBoardDetailClient` renders board details and Path generation from a board.
- `PathClient` renders waypoints, reasons, and direction choices rather than a feed.
- `StudioPassesClient` renders Presence Pass and Room Key owner controls.
- Studio analytics now includes graph metrics from the owner analytics endpoint.

## API Client Functions Added

`presence-app/lib/api/presenceGraph.ts` centralises typed calls for:

- Room Key resolve and encounter capture.
- Observer profile, save, follow, Passport.
- Mood Boards and board items.
- Field Notes and Signals.
- Paths, walks, traces, and fork choices.
- Owner Presence Passes, Room Keys, analytics, encounters, connections, field notes, and generated Paths.

Shared types were added for Presence Passes, Room Keys, Encounters, Observer Profiles, Room Connections, Passport Stamps, Mood Boards, Field Notes, Signals, Paths, and World Readiness metrics.

## Test Commands Run

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
cmd /c npm run build
```

Result: passed. Next emitted the existing workspace-root inference warning because multiple lockfiles exist under `C:\Dev`.

## Known Limitations

- Observer creation depends on the existing Supabase account/session flow; guests are prompted rather than silently upgraded.
- Encounter capture is intentionally non-blocking and debounced client-side; backend rate limits remain authoritative.
- `/r/[token]` does not create a second encounter when the RoomKey resolve endpoint already returned one.
- Path generation and reading depend on backend deterministic Path endpoints returning waypoints and choices.
- Owner/admin moderation light UI was not added in this frontend pass; backend admin endpoints remain available for a later operator console pass.
- The public World route is intentionally a locked/forming page and does not expose admin readiness metrics.

## Follow-Up Recommendations

- Add Playwright coverage for `/r/[token]`, save/follow prompt behavior, Passport empty state, Mood Board create/add flow, and Path waypoint navigation once stable seeded graph fixtures exist.
- Add owner Studio screenshot QA for `/studio/[id]/passes` and graph analytics.
- Add an explicit public Room route smoke that verifies `PresenceGraphActions` renders on all room templates without visual overlap.

## World Status Confirmation

Public copy remains:

> The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist.

The frontend does not expose an empty global map.
