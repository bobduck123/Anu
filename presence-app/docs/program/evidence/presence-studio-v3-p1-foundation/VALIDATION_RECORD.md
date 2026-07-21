# Studio V3 P1 validation record

Status: repaired-tree implementation validation complete; formal `MERGE AFTER FIXES` remains recorded and is not superseded; explicit approval of the draft-row publish synchronization exception was granted on 2026-07-22; fresh independent final review pending

## Environment

- OS/shell: Windows / PowerShell
- Node: `v24.12.0`
- npm: `11.6.2`
- Python: `3.12.10`
- pytest: `9.0.2`
- Browser target: Playwright Chromium, one worker
- Starting commit: `36204ca0c87e96f2fdbc61bf3fcad8606102e5f3`

## Confirmed repaired-tree results

| Command | Result | Scope / limitation |
|---|---|---|
| `npm.cmd run typecheck` | PASS | Final frontend TypeScript check from `presence-app`. |
| `node --test lib\presence\studio-v3\compiler.test.ts` | PASS - 28/28 | Covers material Look axes, 3x3 compatibility, chamber-local Film Strip, duplicate-safe identities, exact fallback Collection provenance, hidden/unavailable public exclusion, deterministic structural accounting, exact Cancel, qualified restore, and metadata round-trip. |
| `node --test lib\api\studioV3.test.ts` | PASS - 1/1 | Owner-private V3 state client request/response contract. |
| `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q` | PASS - 20/20 | Run from `flora-fauna/backend`; includes key-aware, DB-int-bounded, current-Room Work/Collection validation with missing/same-owner cross-Room/cross-owner zero-mutation rejection, stored-base preservation/no-rebase, legacy/cleanup lock-order coverage, and non-mutating source inspection proving publish synchronization remains draft-row-only with no published-row lock. |
| `python -m pytest tests/test_presence_studio_editor_foundation.py tests/test_presence_graph_integration_proof.py -q` | PASS - 14/14 | Final cumulative editor-foundation and graph-integration backend regression gate; combined backend result is 34/34. |
| `python -m py_compile app/api/presence_graph.py app/models.py app/services/presence_editor_config.py app/services/presence_studio_v3_state.py tests/test_presence_studio_v3_backend_foundation.py tests/test_presence_studio_editor_foundation.py tests/test_presence_graph_integration_proof.py` | PASS - exit 0 | Run from `flora-fauna/backend`; compiles every touched backend module and the focused/cumulative backend tests. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Dev\Flora_fauna\scripts\validate-presence-studio-v3-p1-migration.ps1"` | PASS | Disposable local PostgreSQL 16 forward catalog/default/constraint assertions, observed concurrent V3-versus-legacy row-lock wait, revision-3/no-lost-update assertion, operational rollback, and predecessor-row integrity. No hosted catalog or data was touched. |
| `npx.cmd playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 10/10 | P0 regression, Looks, Room Styles, exact Cancel, durable state/reload/restore, stale-local reconciliation, durable-base mismatch preservation/save lockout, mobile, keyboard, reduced motion, visitor preview, public invariance, request-ledger checks, and forced P1-token no-bridge fallback. |
| `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts tests/e2e/presence-studio-v2-bbbvision-eligibility.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 14/14 | Existing BBB renderer, focus/keyboard, reduced-motion, eligibility, and layout regression gate, including restored hovered-shape Enter priority without `editorBridge`. |
| `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts --project=chromium --workers=1 --reporter=line -g "public Enter prioritizes"` | PASS - 1/1 | Post-approval targeted rerun of the added public Enter regression. It uses the direct `useBbbVisionPublishedThreshold` mock fixture and does not save draft or invoke any publish helper. |
| `npx.cmd playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --reporter=line` | PASS - 2/2 | Post-approval public-invariance rerun. The spec asserts owner publish endpoints are forbidden requests and did not invoke publish. |
| `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 27/27 | Public payload hygiene and V2 adapter behavior. |
| `node --check tests/e2e/mock-presence-api.mjs` | PASS | Final Playwright mock syntax check. |
| `npm.cmd run build` | PASS - 29/29 pages | Next.js 16.2.7 production build completed, including compile, type generation/checking, and static generation. The existing multi-lockfile workspace-root warning remained non-blocking. |
| `git diff --check HEAD` | PASS after final evidence refresh | Required whitespace/error gate passed on the complete repaired tree; only existing LF-to-CRLF notices were emitted. |
| Scoped credential, secret, private-material, and GGM evidence scan | PASS | No credential/token/private URL, copied client payload, or positive GGM evidence was found in the scoped diff/evidence; expected occurrences are rejection rules, negative fixtures, or baseline identifiers. |
| Scoped public-route and route-mutation inventory | PASS | Canonical `/p/bbbvision`, alias `/presence/bbbvision`, and `/api/presence/public/bbbvision` remain the frozen surfaces; no route registration or public endpoint was added/changed, and the 10/10 plus 14/14 gates prove no-bridge fallback and public interaction parity through the edited shared component. |
| PNG decoder verification over `docs/program/evidence/presence-studio-v3-p1-foundation/screenshots/*.png` | PASS - 22/22 | Every retained P0/P1/mobile/visitor/public-invariance evidence PNG decoded successfully. |

## Manual evidence review

- Fresh desktop and mobile captures were inspected for the three Looks, three Room Styles, Before/After, exact Cancel restoration, compatibility/shelf accounting, visitor mode, and both BBB public routes.
- All 22 PNG evidence files passed decoder verification.
- The independent aesthetic review returned `AESTHETIC VERDICT: PASS` for the fresh screenshot set.
- Public invariance and request-ledger outcomes are recorded in `PUBLIC_INVARIANCE.md` and `REQUEST_LEDGER.md`; the approval-sensitive post-review reruns were publish-free.

## Repair verification

Before the formal review, the repaired tree and rerun already covered five earlier safety findings:

1. unavailable Works and restored unavailable placements remain shelved/hidden and nonpublic;
2. exact `collection:loaded-owner-library` compatibility with look-alike token rejection;
3. durable stored-base mismatch preserves prior metadata, disables save, and refuses implicit rebase;
4. legacy draft and cleanup writers share draft-then-media lock ordering, with real PostgreSQL wait/no-lost-update proof;
5. explicitly hidden placements remain excluded from public objects and compositions after projection/remap/restore.

The formal independent review then returned `VERDICT: MERGE AFTER FIXES` with four boundary blockers. The current repair pass and affected reruns now show:

1. numeric Work/Collection refs are collected only from registered reference keys, bounded to `1..2147483647`, and resolved through `PresenceWork`/`PresenceCollection` with `node_id` equal to the current Room; owned refs pass, while missing, same-owner cross-Room, cross-owner, and out-of-range refs reject with zero metadata mutation; exact sentinel and registered legacy forms remain supported;
2. Film Strip and every P1 experience facet require `editorBridge`; a supplied P1 layout/token set cannot change no-bridge output;
3. the pre-P1 no-bridge BBB Enter path again prioritizes the visibly hovered shape; after the evidence-boundary review, the added regression was changed to use a direct published BBB Threshold fixture and passed 1/1 without save or publish;
4. the unnecessary published-row lock is removed, leaving only draft-row publish synchronization. That remaining exception is a real publish-path change; explicit human approval was granted on 2026-07-22, no publish was invoked as evidence, and fresh final review remains required.

This record does not alter the original review file or promote its verdict. Green validation and human approval are evidence for the next review, not merge authorization.

## Remaining gate

The remaining gate is a fresh independent final no-merge review over the complete repaired tree. The formal `MERGE AFTER FIXES` is not merge authorization, and this record does not pre-empt the fresh verdict.

## Runner note

The normative spec pack also names `npx.cmd tsx --test`; no local `tsx.cmd` was present at the initial environment check. The explicit P1 Foundation work order requires `node --test`, which is the recorded compiler command. No dependency was added or network-installed merely to alter the test runner. All database migration evidence is local and disposable; no hosted migration, deploy, publish, or production write is claimed.
