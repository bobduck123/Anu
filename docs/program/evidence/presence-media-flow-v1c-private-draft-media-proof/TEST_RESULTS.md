# Test Results

## Completed Locally

| Command | Result |
| --- | --- |
| `npm run typecheck` in `presence-app` | Passed |
| `npm run build` in `presence-app` | Passed; existing Next workspace-root warning retained |
| `node --test --experimental-strip-types lib/presence/render/resolver.test.ts lib/presence/render/publicPayload.test.ts lib/editor/readiness.test.ts lib/editor/mediaValidation.test.ts lib/editor/canvasModel.test.ts lib/api/editor.test.ts` | Passed, 25 tests |
| `python -m pytest tests/test_presence_studio_editor_foundation.py -q -p no:cacheprovider` | Passed, 9 tests; existing SQLAlchemy warnings retained |
| `python -m pytest tests/test_presence_studio_editor_foundation.py tests/test_presence_graph_integration_proof.py tests/test_presence_pass_paths.py tests/test_presence_cors.py tests/test_presence_nodes.py -q -p no:cacheprovider` | Passed, 112 tests; existing SQLAlchemy warnings retained |
| `npx playwright test tests/e2e/presence-media-flow-v1c-private-draft.spec.ts tests/e2e/presence-media-flow-v1b-upload.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts tests/e2e/canvas-builder-preview-publish-p0.spec.ts tests/e2e/auth-signout-rsc-safety.spec.ts tests/e2e/presence-pass-paths.spec.ts --workers=1 --retries=0 --reporter=list` | Passed, 22 tests |
| `git diff --check` | Passed |

## Tests Added Or Extended

- Protected media signed read and publish promotion.
- Private draft URL non-persistence.
- Orphan cleanup.
- Misconfigured public Supabase “private” bucket rejection.
- Canvas media reference retention.
- Public storage-control key hygiene.
- Browser protected upload/preview/publish flow.

## Hosted

Not run for V1C. Deployment, migration and protected Supabase bucket policy
must be applied before hosted verification.
