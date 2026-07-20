# Test Results

Date: 2026-05-25

| Test area | Command / scope | Result |
| --- | --- | --- |
| Type safety | `npm.cmd run typecheck` in `presence-app` | Passed |
| Production build | `npm.cmd run build` in `presence-app` | Passed |
| Media/editor/resolver unit coverage | `node --test --experimental-strip-types` for relevant API, validation, editor and render tests | 41 passed |
| Backend editor/public/RoomKey/CORS/node regression | `python -m pytest tests/test_presence_studio_editor_foundation.py tests/test_presence_graph_integration_proof.py tests/test_presence_pass_paths.py tests/test_presence_cors.py tests/test_presence_nodes.py -q -p no:cacheprovider` | 109 passed; existing SQLAlchemy deprecation warnings |
| Browser lifecycle regression | selected Playwright auth/editor/Canvas/RoomKey/V1A/V1B specifications | 27 passed |
| Diff hygiene | `git diff --check` | Passed |

## New Test Coverage

- Client accepts JPG/PNG/WEBP signatures and rejects mismatches and files over 8 MB.
- Backend rejects SVG, HTML, PDF, executable content, metadata misuse, mismatched image data, and oversized requests.
- Anonymous and wrong-owner upload attempts are denied.
- Editor upload CORS preflight succeeds without weakening POST authentication.
- Uploaded inventory is absent from public output until an image is selected and intentionally published.
- Media drawer browser flow uploads, describes, places, previews, publishes, checks RoomKey, and resets the mock fixture.

## Retained Non-Blocking Observations

- The Next build/dev process reports existing multiple-lockfile workspace-root inference.
- Backend suite emits existing SQLAlchemy `Query.get()` deprecation warnings.
- An exploratory raw `node --test` run over test files that declare `npx tsx` as their runner failed on their pre-existing extensionless import format; they are outside the Media V1B relevant Node test command.
