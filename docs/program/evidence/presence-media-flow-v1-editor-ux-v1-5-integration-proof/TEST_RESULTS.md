# Test Results

Date: 2026-05-25

| Test area | Command / scope | Result |
| --- | --- | --- |
| Type safety | `npm.cmd run typecheck` in `presence-app` | Passed |
| Production frontend build | `npm.cmd run build` in `presence-app` | Passed |
| Editor/resolver/assets/registries | `node --test --experimental-strip-types` over 12 relevant frontend test files | 38 passed |
| Backend Presence/editor/CORS/RoomKey | `python -m pytest tests/test_presence_studio_editor_foundation.py tests/test_presence_graph_integration_proof.py tests/test_presence_pass_paths.py tests/test_presence_cors.py tests/test_presence_nodes.py -q` | 105 passed; existing SQLAlchemy legacy warnings |
| Browser lifecycle/auth/Studio/RoomKey/V1.5 Media | selected local Playwright suite | 26 passed; 1 skipped |
| Diff hygiene | `git diff --check` | Passed |

## Playwright Scope

The browser run included:

- auth sign-out RSC safety,
- standard/debug editor auth-gate persistence,
- Canvas builder parity,
- private preview and publish,
- Canvas direct manipulation,
- new Editor UX V1.5 / Media Flow V1A journey,
- RoomKey and public route regressions,
- retained Advanced controls.

The skipped `auth-permanence` scenario requires a real hosted Supabase session and is not runnable against the local mocked browser fixture.

## Warnings

- Next build/dev reports multiple workspace lockfiles when determining the Turbopack root. This is not caused by this pass.
- Backend tests report pre-existing SQLAlchemy `Query.get()` deprecation warnings.
