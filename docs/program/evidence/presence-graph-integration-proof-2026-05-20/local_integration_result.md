# Local Integration Result

Date: 2026-05-20

## Summary

The Presence Graph proof now has a real backend integration layer in addition to the mocked browser acceptance layer. The local integration uses an in-memory SQLite backend app, real Flask routes, real service serializers, deterministic graph seed data, and JWTs generated through the existing test pattern.

## Seed

Seed file:

`flora-fauna/backend/tests/presence_graph_seed.py`

The deterministic seed creates:

- 3 public Presence Rooms
- 2 observer profiles
- 3 mood boards, including one public observer board and one private board
- 1 Presence Pass
- 1 active RoomKey with token `graph-test-room-key-token`
- 1 campaign/source context: `Graph Test NFC Card`
- 1 existing encounter
- saved connection and Passport stamps
- 1 Path from Room
- 1 Path from Mood Board
- path waypoints, choices, and trace data
- enough room key and connection data for owner analytics

All data is clearly test-labelled and local/in-memory.

## Tests

Test file:

`flora-fauna/backend/tests/test_presence_graph_integration_proof.py`

Coverage:

- RoomKey resolve returns public Room entry payload and captured encounter
- Encounter capture preserves source/token/campaign context
- Observer Passport reads entered/saved memory
- Observer Mood Boards list and Add Room to Mood Board persists
- Path from Room returns waypoints, choices, and reason_shown
- Path from Mood Board returns waypoints, choices, and reason_shown
- Observer path walk, trace, and fork-choice persist
- Owner passes return pass/key data
- Owner analytics returns encounters, saves, path activity, and RoomKey performance
- World readiness remains hidden/forming/preview-safe under control auth
- Observer and owner routes reject missing auth
- Cross-owner analytics access is denied
- Mocked browser fixture critical shape is checked against real backend response shape

## Commands Run

```powershell
python -m pytest tests/test_presence_graph_integration_proof.py -q
```

Result: `3 passed`

```powershell
python -m pytest tests/test_presence_pass_paths.py -q
```

Result: `5 passed`

```powershell
python -m py_compile scripts\presence_graph_hosted_smoke.py
```

Result: passed

## Warnings

- Existing SQLAlchemy `Query.get()` legacy warnings appeared in existing code paths.
- Pytest reported it could not write backend `.pytest_cache` because that path was access-denied in this workspace. This did not affect test execution.

## Duplicate Encounter Boundary

The backend RoomKey resolve endpoint intentionally captures one encounter and returns it in the response. The frontend browser proof already verifies that `/r/[token]` does not issue a second client-side capture when resolve returns an encounter. The local backend test proves that the returned encounter is real and that the separate direct encounter capture endpoint works when explicitly called.
