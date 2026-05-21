# Presence Graph Integration Proof

Date: 2026-05-20

## Summary

This proof turns the Presence Passes / Observer / Mood Boards / Paths validation from mocked browser-only coverage into a layered test strategy:

- mocked browser acceptance remains in `presence-app/tests/e2e/presence-pass-paths.spec.ts`
- local/backend integration now runs against real Flask routes and deterministic in-memory seed data
- hosted smoke is prepared and explicitly blocked until real hosted seed IDs and auth tokens are supplied

## Files

- `presence_graph_contract_matrix.md`
- `local_integration_result.json`
- `local_integration_result.md`
- `hosted_smoke_preparation.md`
- `known_blockers.md`

## Local Proof Result

Passed.

Commands:

```powershell
python -m pytest tests/test_presence_graph_integration_proof.py -q
python -m pytest tests/test_presence_pass_paths.py -q
python -m py_compile scripts\presence_graph_hosted_smoke.py
```

Results:

- `tests/test_presence_graph_integration_proof.py`: 3 passed
- `tests/test_presence_pass_paths.py`: 5 passed
- hosted smoke script compiles

## Mocked Browser Proof

Preserved.

The mocked Playwright suite remains the fast frontend acceptance layer for:

- `/r/[token]`
- `/observer/passport`
- `/observer/mood-boards`
- `/paths/from-room/[roomId]`
- `/paths/from-mood-board/[boardId]`
- `/studio/[id]/passes`
- `/studio/[id]/analytics`
- `/world`
- public route regressions for `/p/[slug]`, `/presence/[slug]`, `/presence-chooser`

## Hosted Proof

Prepared but not completed in this pass.

Hosted auth-dependent proof requires real environment-provided test/operator credentials. The smoke script documents the exact env names and reports missing branches as blocked rather than passing them.

## Auth Safety

Production auth remains unchanged. The frontend E2E auth mock remains test-gated and is not used for hosted proof.

## World Safety

The public World remains hidden/forming. No fake public map was introduced.
