# Studio V3 M1 validation record

Status: PASS for the scoped publish-free gate; independent no-merge review pending
Date: 2026-07-22
Branch: `feat/presence-studio-v3-m1-functional-editing`
Starting commit: `c33c56913d3e55f65e257b97432abe987f773cf0`

The successful commands below ran against the final M1 source tree in the stated working directories. None invokes the publish client, a hosted write, deployment, or production-data mutation. The broad legacy `lib/api/editor.test.ts` suite and full publish-fixture parity specs are deliberately excluded; M1 inventory-upload coverage lives in the focused non-publish `lib/api/studioV3.test.ts` suite instead.

| Validation | Working directory and exact command | Result |
|---|---|---|
| Typecheck | `presence-app`: `npm.cmd run typecheck` | PASS, exit 0 |
| Studio V3 compiler + non-publish owner API clients | `presence-app`: `node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts` | PASS, 45/45, exit 0 |
| Focused backend, including metadata/upload safety and public exclusion | `flora-fauna/backend`: `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q -k "not publish_synchronization_code"` | PASS, 35 passed, 1 deselected, 276 warnings; publish-synchronization source test deliberately deselected |
| Backend Python syntax | `flora-fauna/backend`: `python -m py_compile app/services/presence_studio_v3_state.py app/services/presence_editor_config.py app/api/presence_graph.py tests/test_presence_studio_v3_backend_foundation.py` | PASS, exit 0 |
| Canonical V3 BBB Chromium | `presence-app`: `npx.cmd playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line` | PASS, 23/23 in 3.4m, exit 0 |
| Publish-free public eligibility/payload regression | `presence-app`: `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-eligibility.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line` | PASS, 3/3 in 49.9s, exit 0 |
| Publish-free named gallery public-Enter regression | `presence-app`: `npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line --grep "public Enter prioritizes the hovered visible canvas shape"` | PASS, 1/1 in 27.0s, exit 0; only the named non-publish test ran |
| Public payload/adapters unit tests | `presence-app`: `node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS, 27/27, exit 0 |
| Mock API syntax | `presence-app`: `node --check tests/e2e/mock-presence-api.mjs` | PASS, exit 0 |
| Production build | `presence-app`: `npm.cmd run build` | PASS, exit 0 |
| Diff hygiene | repository root: `git diff --check HEAD` | PASS, exit 0; line-ending conversion warnings only |
| Screenshot PNG decode/hash | PowerShell `System.Drawing.Image::FromFile` plus `Get-FileHash -Algorithm SHA256` over the M1 `screenshots/*.png` set | PASS, exactly 18/18 decoded with 17 unique hashes; the two public alias captures are byte-identical; exact values in `SCREENSHOT_INDEX.md` |

## Excluded local-only process incident

At approximately 15:05 AEST (UTC+10) on 2026-07-22, the following earlier command was run in error:

```text
npx.cmd playwright test tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts tests/e2e/presence-studio-v2-bbbvision-eligibility.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line
```

That run reached only the local mock publish handler and finished with 17 passed and 1 failed. It made no hosted or production request and caused no hosted or production mutation. The run is discarded, excluded from every result above, and receives no evidence credit. The publish-free public commands in the table replace it.

## Media/upload safety coverage

Upload code changed, so it was not treated as not applicable. Coverage includes:

- owner/Room scoping and capability/migration gating;
- private-draft-only storage and `draft_uploaded` media records;
- unchanged current draft and public payload;
- stable `mediaId` persistence with URL/blob/data/path rejection;
- exact inventory-only POST plus private-state PUT ledger;
- public fallback rejection with zero mutation;
- late completion, cancel, owner/load epoch, and duplicate-request fencing.

The final focused backend command deliberately excludes the static publish-synchronization source test and does not invoke publish. The independent frozen-diff review must separately confirm that the approved synchronization exception remains a draft-row lock only and that no published-row lock was restored or added.

## Manual QA

See `MANUAL_QA.md`. Repository Playwright is the authoritative V3 interaction record because the in-app browser's read-only boundary cannot seed the local pilot flag. All 18 current captures decoded and passed visual/sanitization inspection; screenshot 11 is settled without a rendering transient, and screenshot 14 shows the bottom-anchored action bar at 390x844.

## Non-blocking diagnostics

- Next.js reports the repository's pre-existing multiple-lockfile workspace-root warning.
- Node reports the pre-existing module-type warning for TypeScript test files.
- Pytest reports 276 warnings, primarily SQLAlchemy legacy API diagnostics plus the sandbox cache-write warning.
- Canonical acceptance remains Chromium-only. An exploratory WebKit dev/HMR run observed a 25px Edit button even though CSS specifies 44px; WebKit remains unverified and is a follow-up rather than claimed evidence.
