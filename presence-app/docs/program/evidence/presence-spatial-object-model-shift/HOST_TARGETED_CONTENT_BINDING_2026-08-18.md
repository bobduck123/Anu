# Host-Targeted Content Binding

Date: 2026-08-18

## Result

Presence spatial authoring now has a minimal reusable host-targeted content binding contract:

`select host -> bind owner work/media/action -> arrange deterministically -> save/reload -> preview through Three/proxy/semantic fallback`

This remains internal spatial platform evidence only. It is not a public self-serve editor, backend persistence path, publish flow, admission decision, Mobstar acceptance, commerce, booking, payment, multiplayer, hosted proof or launch-readiness claim.

## What Changed

- Added first-class `contentBindings` on spatial room definitions.
- Added `contentArrangement` on host placements.
- Added pure deterministic arrangement support for `grid`, `row` and `wall-grid`.
- Added explicit overflow state for `show-all-if-possible`, `paginate`, `overflow-list` and `reject-over-capacity`.
- Added compiler-derived `presence.piece-plane@1.0.0` render items for bound content, without storing derived child placement transforms in layout JSON.
- Added audio/video media kind validation and semantic/fallback support.
- Preserved `open-link`, `listen`, `watch` and `enquire` actions into runtime/fallback paths.
- Added an internal binding panel showing selected host, supported binding types, current bound pieces, arrangement kind, overflow state and fallback rows/actions.

## Arrangement Contract

The layout stores:

- host placement id
- ordered content binding ids
- piece ref/type
- label/caption
- media/action refs
- arrangement kind
- overflow policy/capacity

The compiler derives display slots and semantic rows. Derived transforms are not stored per bound piece.

The pure arrangement function is deterministic across input order and supports:

- `grid`
- `row`
- `wall-grid`

Every over-capacity result carries an explicit overflow state with total count, visible count, overflow count, page count and reject flag.

## Host Binding Flow

The internal arranger now exposes a bounded host-binding panel when a compatible host is selected. It shows:

- selected host id
- supported binding types
- binding media selector
- arrangement selector
- overflow policy selector
- action kind selector
- bound piece list
- fallback rows/actions summary

The proof path binds content to `presence.framed-media@1.0.0` and compiles it as derived `presence.piece-plane@1.0.0` renderer items while the saved layout retains only binding refs/order/spec.

## Media And Action Mapping

Minimum media support now includes:

- `image`
- `poster`
- `logo`
- `placeholder`
- `audio`
- `video`

Audio/video are validated logical refs and preserved through semantic fallback. No playback capability is claimed.

Action support preserved through runtime/fallback:

- `open-link`
- `listen`
- `watch`
- `enquire`

All link-like actions require credential-free HTTPS hrefs. `listen` requires audio media and `watch` requires video media.

## Archive Wall / Piece Plane Proof

Archive Wall now participates in the arrangement contract through host `contentArrangement` plus ordered `contentBindings`; it no longer needs fixed saved child transforms to represent ordered archive content. Unit proof forces capacity below bound count and verifies explicit overflow plus full fallback rows.

Framed Work / Piece Plane proof is covered by binding content to `presence.framed-media@1.0.0`; the compiler derives `presence.piece-plane@1.0.0` render items and mobile fallback links for `enquire` and `listen`.

## Spherical Gallery Status

Spherical Gallery remains a free/impossible-display primitive from the prior option pass. It was not retrofitted in this task. Next task should connect spherical gallery anchors to the same binding contract and verify sphere-specific slot transforms.

## Saved JSON / Payload

Focused binding proof metrics:

| Metric | Value |
| --- | ---: |
| Layout JSON | 6,386 bytes |
| Browser-local draft envelope | 6,573 bytes |
| Saved placements | 3 |
| Saved content bindings | 2 |
| Compiler-derived binding render items | 2 |
| Eager compressed runtime | 44,000 bytes |
| Total compressed runtime | 250,000 bytes |
| Lazy decoder bytes | 0 |

The saved JSON does not include raw GLB/GLTF source paths and stays below the 100 KB layout ceiling.

## Fallback Behaviour

Semantic fallback receives generated rows for every bound piece, including overflowed content. Link-like fallback actions render as accessible links for `open-link`, `listen`, `watch` and `enquire`.

If WebGL, GLB, media source resolution or runtime rendering fails, proxy/procedural host geometry and semantic rows remain operable. Proxy geometry remains the authoring/fallback source of truth.

## Screenshot / Description

Screenshot:

`docs/program/evidence/presence-spatial-object-model-shift/screenshots/16-host-targeted-content-binding.png`

The screenshot captures the internal arranger with a selected framed-media host, two bound content records, explicit `overflow-list` state, inspector content-binding count, and mobile-safe fallback links verified by Playwright.

## Tests Run

Baseline before changing files:

- `git status --short --branch` - dirty `feat/spatial-authoring-baseline` branch recorded.
- `cmd /c npm run test:spatial` - PASS, 136/136.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with existing Next multiple-lockfile workspace-root warning.

Post-change:

- `cmd /c npm run test:spatial` - PASS, 143/143.
- `cmd /c npm run test:spatial-assets` - PASS, 30/30.
- `cmd /c npx tsc --noEmit` - PASS.
- `cmd /c npm run build` - PASS with existing Next multiple-lockfile workspace-root warning.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "binding"` - PASS, 1/1, clean exit.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "fully arranged"` - PASS, 1/1, clean exit after fixing the top-down plan child-piece hit target.
- `cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "fully arranged|customises"` - final targeted verification PASS after repairs.
- `cmd /c npm run test:e2e:spatial` - all 17 scenarios printed `ok`; command stayed open for at least 60 seconds after the final `ok` and was interrupted, reproducing the documented Windows Playwright webServer teardown hang.

## Payload Impact

The contract adds small metadata fields only. It does not add eager public bundles, GLB assets, raw source assets, playback code, backend persistence, auth, publish logic or public routes.

Bound content uses refs/order/settings only:

- no copied media blobs
- no raw URLs in media refs
- no duplicate GLBs per client skin
- no derived transforms stored per bound piece

## Limitations

- Audio/video are validated and fallback-visible only; no playback claim is made.
- Spherical Gallery binding remains a follow-up.
- Overflow UI is intentionally compact and internal.
- Browser-local save remains the only persistence in this proof.
- Full E2E still has the known Windows Playwright webServer teardown hang after assertions pass.

## Scope Boundaries

- No public/default route behavior changed.
- No auth, tenant, backend, publish, commerce, payment, booking or production persistence changed.
- No component or candidate is marked admitted.
- No candidate creative acceptance or launch readiness is claimed.
- No raw GLB/GLTF source was introduced.

## Rollback

Rollback is file-scoped:

- Remove `contentBindings` / `contentArrangement` model and validation additions.
- Remove `arrangements.ts` and compiler-derived binding item generation.
- Remove the binding panel and fallback link-like action expansion.
- Revert focused binding tests and this evidence note.

No database, deploy, auth, route, publish or production-data rollback is required because none was changed.

## Acceptance Classification

Accepted as internal P0.5 spatial platform evidence: host-targeted binding and minimal deterministic arrangement contract proven for physical display hosts.

Not accepted as component admission, public self-serve, backend persistence, Mobstar creative acceptance, spherical gallery completion, audio/video playback or launch proof.
