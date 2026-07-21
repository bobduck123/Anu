# Validation record

Status: implementation validation complete; independent no-merge review pending

## Commands run

| Command | Result | Notes |
|---|---|---|
| `node --test lib\presence\studio-v3\feature.test.ts` | PASS - 6/6 | Initial hosted gate unit coverage. |
| `node --test lib\presence\studio-v3\compiler.test.ts` | PASS - 28/28 | Existing V3 compiler and legacy local gate coverage. |
| `node --test lib\presence\studio-v3\feature.test.ts lib\presence\studio-v3\compiler.test.ts` | PASS - 34/34 | Combined V3 gate/compiler run. |
| `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 27/27 | Public payload hygiene and V2 adapter regression. |
| `npm.cmd run typecheck` | PASS | Frontend TypeScript. |
| `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q` | PASS - 20/20 | Backend V3 owner route gate, private-state, atomic replacement, and safety coverage. |
| `python -m py_compile app/api/presence_graph.py tests/test_presence_studio_v3_backend_foundation.py` | PASS | Touched backend route/test compilation. |
| `npx.cmd playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 10/10 | Fresh rerun after hosted-gate implementation. |
| `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts tests/e2e/presence-studio-v2-bbbvision-eligibility.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 14/14 | V2 BBB eligibility and public renderer regression. |
| `npx.cmd playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 2/2 | Clean rerun after the full V3 suite's flaky retry. |
| `npm.cmd run build` | PASS - 29/29 pages | Next production build. |
| `git diff --check HEAD` | PASS | Whitespace check before evidence update. |

## Post-review-fix commands

| Command | Result | Notes |
|---|---|---|
| `node --test lib\presence\studio-v3\feature.test.ts` | PASS - 8/8 | Adds strict hosted ID+slug matching, ID-only rejection, slug-only rejection, wildcard rejection, and missing-dimension rejection. |
| `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q` | PASS - 20/20 | Adds hosted backend fail-closed behavior for missing explicit pilot IDs/slugs and ID/slug mismatches. |
| `npm.cmd run typecheck` | PASS | Rerun after gate/reporting fixes. |
| `npm.cmd run build` | PASS - 29/29 pages | Rerun after gate/reporting fixes; no `/editor-v3` route emitted. |
| `git diff --check HEAD` | PASS | Rerun after no-merge review fixes and evidence updates. |

## Runner notes

- Playwright and Next emitted existing non-blocking `NO_COLOR`/`FORCE_COLOR` and multiple-lockfile workspace-root warnings.
- Node emitted existing module-type warnings for `node --test` TypeScript/ES module test files.

No hosted tests, deploys, migrations, publishes, or hosted writes were run.
