# Presence spatial object-model final verification - 2026-08-17

Status: PASS for the bounded, default-off Gate 3 foundation
Gate effect: Gate 4 remains unaccepted; no hosted, public, self-service, persistence or launch claim

## Automated commands

| Command | Final result | Notes |
|---|---|---|
| `npm.cmd run test:spatial` | PASS - 94/94 | Includes exact payload boundaries, containment, shear, camera segments, storage rollback, cache disposal, generic media decisions and golden JSON drift tests. |
| `npm.cmd run typecheck` | PASS | Plain `npm run` is blocked by the local PowerShell execution policy; `npm.cmd` is the equivalent Windows invocation. |
| `npm.cmd run test:e2e:spatial` | PASS - 9/9, zero retries | Final run completed in 37 seconds outside the filesystem sandbox so Playwright could use Windows `taskkill` to clean its own web-server process tree. |
| `npm.cmd run build` | PASS | Next 16.2.7 production build; existing multiple-lockfile workspace-root warning retained. |
| `npm audit --json` | 4 high advisories | Existing framework/transitive dependency graph; no automatic dependency upgrade was authorised in this Gate 3 slice. |
| `npm.cmd run evidence:spatial:mobstar` | PASS | Deterministic fixed-timestamp envelope; byte-compared by unit test. |
| `npm.cmd run evidence:spatial:bbb` | PASS | Deterministic fixed-timestamp envelope; byte-compared and PNG sizes checked against disk. |

During hardening, the first expanded browser run exposed ambiguous selectors after the accessible desktop companion was added and a pointer-drag timing weakness. The selectors now target stable Action IDs and drag identity is tracked synchronously. A first build then exposed an uninitialised `useRef` type; it was corrected. The final commands above are clean.

## Request and route-boundary evidence

Real loopback requests were run against the implementation:

| Runtime | Flag | Result |
|---|---|---:|
| Development (`next dev --webpack`) | absent | `404` |
| Development (`next dev --webpack`) | `PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL=1` | `200` |
| Production (`next start`) | `PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL=1` | `404` |

The enabled browser test also asserts `<meta name="robots" content="noindex">`. The protected `/p/bbbvision` signature is captured before and after a local spatial save and remains structurally equal. Every browser scenario observes page requests, and the page/mock-API ledgers contain no non-GET/HEAD product writes.

## Payload and bundle inspection

- Mobstar compile plan: 11,598-byte layout, 44,000 eager bytes, 250,000 total bytes, 14 render items, fingerprint `fnv1a-7175a324`.
- BBB compile plan: 5,236-byte layout, 2,512,625 eager bytes, 5,956,155 total bytes, 6 render items, fingerprint `fnv1a-e6daebb9`.
- Largest spatial/Three chunk: `.next/static/chunks/1sg57cc1rtczn.js`, 546,602 bytes uncompressed.
- Only `.next/server/app/internal/spatial-object-model/page/react-loadable-manifest.json` references that chunk. Public `/p` and `/presence` manifests do not.
- No GLB/GLTF, inline model/media blob, model loader or candidate-specific renderer branch is present.

## Manual visual review

The three canonical screenshots were opened and inspected after the final browser capture:

- Desktop Mobstar shows all six operator-placeable component types, `Saved` selected, a matching local-save fingerprint, a rendered Three room and the accessible companion.
- BBB shows the shared projection wall, the selected lazy archive image, the inspection card, Action tray and accessible companion.
- The 390 px Mobstar capture shows semantic mobile fallback with rack, garment, campaign, merchandise and generated brand-mark Pieces/Actions.

This confirms functional layout and fallback legibility only. Placeholder primitives have not passed art-direction or component-admission review.

Not performed: physical-device, assistive-technology, Firefox/WebKit, hosted, production deployment or public performance QA.

## Independent read-only gate review

A final high-reasoning QA subagent independently inspected the approved spec, source, tests, route gate, fixtures, payload hygiene, evidence and rollback. It found the architecture genuinely data-driven and the remaining blockers limited to stale evidence text/checklists. Those blockers were corrected in this closeout pass. The review explicitly preserved Gate 4 as unaccepted.

## Residual risks

- BBB's 5.96 MB total media requires optimisation before any public proposal.
- The 546,602-byte Three chunk is isolated but has no public-route performance acceptance.
- Runtime validation covers room/component/draft documents; the strategic aggregate remains type-level.
- Browser storage is local, best effort and non-transactional.
- Four high dependency advisories need a separate reviewed upgrade.
- Real library components still require silhouette, scale, materials, lighting, mobile readability, brand, licence and attribution review.
