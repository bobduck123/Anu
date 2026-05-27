# Test Results

Date: 2026-05-27

| Test command | Result |
| --- | --- |
| `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_graph_integration_proof.py tests\test_presence_pass_paths.py tests\test_presence_nodes.py tests\test_presence_cors.py tests\test_external_frontend_cors.py -q -p no:cacheprovider` | PASS, 121 tests |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, route manifest includes `/room/[id]/key` |
| `node --test --experimental-strip-types ...` targeted editor/render/API suites | PASS, 35 tests |
| `npx playwright test ...` targeted auth/editor/media/public/RoomKey suites | PASS, 24 tests |
| `git diff --check` | PASS |

## Targeted New Coverage

- Missing V1C media migration does not make owner editor reads fail.
- Missing/disabled V1C capability retains V1B upload behavior.
- Remote private-media mode requires explicit deployment verification.
- Public numeric room entry endpoint supplies published-only content.
- `/room/[id]/key` renders in the Next application.
- Room entry hydrated HTML remains free of prohibited internal/private terms.

After tightening the restored numeric-entry endpoint to return only a minimal
public card before redirect, its three affected backend cases and six
frontend API/public-payload unit cases were re-run successfully; the
browser-facing endpoint/redirect hygiene assertion is included in the final
Playwright run.

## Notes

- Backend output includes existing SQLAlchemy legacy query warnings.
- Next build output includes an existing workspace-root/multiple-lockfiles
  warning.
- Git reports a line-ending conversion notice for the edited mock API file;
  no whitespace errors were found.
