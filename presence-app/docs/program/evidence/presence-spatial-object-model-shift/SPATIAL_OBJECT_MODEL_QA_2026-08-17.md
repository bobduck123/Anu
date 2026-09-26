# Presence spatial object-model QA - 2026-08-17

Status: PASS for the bounded internal Gate 3 foundation
Gate effect: No Gate 4, hosted, public-launch, self-service or publish acceptance

## Verdict

The implementation proves a Three.js-compatible component-reference model, constrained arrangement, validated browser-local save/reload, and data-driven Mobstar/BBB fixtures behind a production-disabled internal route. The protected public dispatcher is unchanged.

This verdict is architectural and functional. The procedural scene is not visually accepted and does not qualify any component for the real Presence library.

## Automated verification

| Command | Result | Coverage |
|---|---|---|
| `npm run test:spatial` | PASS - 94 tests | Aggregate shape, catalog, exact validation/budgets, placement/containment/shear/camera paths, arranger, compiler/golden evidence, cache, renderer adapter, storage rollback and gate |
| `npm run typecheck` | PASS | TypeScript application and tests |
| `npm run test:e2e:spatial` | PASS - 9 tests, zero retries | Three lane markers, all six arranger components, pointer/keyboard movement, save/reload/revert/export/reset/import equality, BBB lazy/missing media, mobile, reduced motion, WebGL failure, invalid import, dirty-discard guard, public invariance and zero writes |
| `npm run build` | PASS | Next.js production build and route/chunk isolation |
| `npm audit --json` | RISK - 4 high advisories | Existing Next.js/transitive `nanoid`, `postcss`, and `sharp` dependency graph; no automatic upgrade was authorised in this gate |

No repository lint script is configured, so no lint result is claimed.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Spatial object model exists | PASS | Strategic aggregate types plus strict runtime room/component/draft schemas |
| Mobstar represented as data | PASS | `fixtures/mobstar.ts`; renderer has no Mobstar branch |
| Operator places/moves core objects | PASS | Six addable components; pointer/keyboard/nudge movement and rotation |
| Layout saves and reloads | PASS | Fingerprinted active/previous `localStorage` generations; browser round trip |
| Public-shaped renderer consumes saved data | PASS for internal preview | Saved envelope recompiles to the same generic render plan; public route is not changed |
| Rack/table hosts Pieces | PASS | Parent anchors, capacity, assignment and reorder tests |
| Projection wall hosts media | PASS | Shared projection component plus media Piece anchors |
| BBB gallery becomes a spatial primitive | PASS | BBB media assigned to shared projection wall; no model or page-section dependency |
| Mobile preview remains operable | PASS | 390 px semantic fallback retains garment Piece and inspect Action |
| Reduced motion and WebGL failure remain operable | PASS | Static semantic lane with Action parity |
| Component extension points exist | PASS | Versioned registry, asset geometry seam, materials, anchors, cache and compiler |
| Bespoke Mobstar hardcoding is reduced | PASS | Data fixture and shared renderer; frozen standalone source untouched |
| Build/tests pass | PASS | Commands above |

## Browser and manual evidence

The focused Chromium suite exercised the operator route with the internal feature flag enabled and captured:

- [Mobstar saved Three.js preview](screenshots/01-mobstar-three-arranger-saved-preview.png)
- [BBB reusable projection wall in Three.js](screenshots/02-bbb-reusable-projection-wall-three.png)
- [Mobstar 390 px semantic fallback](screenshots/03-mobstar-mobile-semantic-fallback-390.png)

Saved-data evidence:

- [Mobstar validated draft envelope](saved-layouts/mobstar-spatial-draft-v1.json)
- [BBB validated draft envelope](saved-layouts/bbb-projection-wall-draft-v1.json)

Observed proof paths:

- Desktop mounted one WebGL canvas and the lazy Three renderer.
- A blank Mobstar layout added wall, divider, table, rack, plinth and projection wall; assigned media; moved by pointer and controls; rotated; saved twice; reverted; reloaded; matched the saved renderer fingerprint; exported; reset; and re-imported the same validated envelope.
- BBB loaded only its eager projection image initially; selecting the lazy image triggered its request. Missing eager media retained the generated texture and operable inspect Action.
- Mobile omitted Three.js and kept the Piece/Action list operable.
- Reduced-motion desktop selected the static semantic lane.
- Forced WebGL unavailability retained the semantic room.
- Invalid imported JSON was rejected without replacing the last valid room.
- Browser and mock API ledgers recorded zero non-GET product writes.
- Saving an internal BBB draft did not change the protected `/p/bbbvision` signature.
- HTTP checks recorded development without the flag as `404`, enabled development as `200`, and flagged production as `404`; the enabled browser route also asserted `noindex`.

Not performed: physical-device testing, assistive-technology testing, Firefox/WebKit focused runs, hosted testing, production deployment, or visual creative review.

## Payload evidence

Compiled fixture measurements:

| Fixture | Layout JSON | Eager compressed assets | Total compressed assets | Result |
|---|---:|---:|---:|---|
| Mobstar | 11,598 bytes | 44,000 bytes | 250,000 bytes | Under all internal budgets; 14 render items; `fnv1a-7175a324` |
| BBB projection wall | 5,236 bytes | 2,512,625 bytes | 5,956,155 bytes | Eager target passes; 6 render items; `fnv1a-e6daebb9`; total requires public optimisation |

Build inspection found the lazy Three chunk at `.next/static/chunks/1sg57cc1rtczn.js`, 546,602 bytes uncompressed. Only the internal route's React loadable manifest references that chunk; `/p` and `/presence` manifests do not. This is route-isolation evidence, not a public performance acceptance result.

The runtime validator enforces 100 KB layout, 3 MB eager, and 12 MB internal total ceilings. Fixtures reject `.glb`/`.gltf` locators and include no raw model payload. The 12 MB ceiling is a development guard, not the desired public-room transfer budget.

## Public safety and route invariance

- `/internal/spatial-object-model` requires `PRESENCE_INTERNAL_SPATIAL_OBJECT_MODEL` in non-production.
- `NODE_ENV=production` disables it even if the flag is present.
- The page is force-dynamic and noindex.
- No backend endpoint, auth rule, tenant boundary, publish function, public payload schema or production data changed.
- The public dispatch chain remains unchanged.
- Local draft operations issue no product mutations.

## Known limitations and residual risks

1. The full Presence/Space/Room aggregate is type-level only; the strict validator operates on runtime room documents and component definitions.
2. Rotated components use world-axis AABB collision. This is deliberately conservative and can reject spatially valid near-overlaps.
3. Browser `localStorage` and its rollback are best effort, non-transactional and device-local.
4. The component Asset API is an in-repo registry contract, not a hosted service. Cache reuse is process/browser-runtime reuse by `componentId@version`.
5. Original Gate 3 asset-backed geometry had a cached bounds fallback only and no GLB loader. Later 2026-08-17 Draco runtime evidence added generic, lazy optional GLB loading for internal proof components; this did not add a CDN policy or admitted production model.
6. Mobile and reduced-motion currently use semantic fallback, not reduced 3D.
7. BBB's total lazy media is 5.96 MB and must be optimised before public use.
8. The 546,602-byte Three chunk is acceptable for this internal isolated proof but has not passed a public-route performance budget.
9. Generated procedural geometry and textures are schema proof only. Silhouette, scale, material response, lighting compatibility, mobile readability and brand fit remain unreviewed.
10. No server draft, preview, publish, duplicate or restore-published workflow exists.
11. `npm audit` reports four high advisories in the existing dependency graph. Remediation needs a separate dependency-upgrade work order because the fixes include framework/transitive changes beyond this internal proof.

## Failure-condition review

- DOM/CSS-only mock: not present; a real lazy Three.js renderer is exercised by E2E.
- Raw unoptimised GLTF/GLB runtime: not present; model locators reject raw/source GLB/GLTF. Later Draco evidence ships only an optimized internal proof GLB plus lazy decoder files, not source models or admitted production assets.
- Mobstar hardcoded in renderer: not present; Mobstar is a data fixture consumed by shared compilation and rendering.
- BBB remains only a page gallery: not true for this proof; a second fixture uses the shared projection-wall primitive while the protected public gallery remains unchanged.
- Arranger cannot save/reload: not true; two-generation browser round trip is verified.
- Public renderer changed: not present; public signature invariance and source boundaries are verified.

## Exact rollback notes

1. Remove `app/internal/spatial-object-model/`, `components/presence-spatial/`, `lib/presence/spatial/`, `scripts/generate-spatial-layout-evidence.ts`, and `tests/e2e/presence-spatial-object-model.spec.ts`.
2. Remove `docs/program/presence-spatial-object-model/` and `docs/program/evidence/presence-spatial-object-model-shift/`.
3. Revert only this task's changes in `package.json`, `package-lock.json`, `playwright.config.ts`, and `tests/e2e/global-setup.ts`; remove `three`, `@types/three`, pinned `tsx`, and the spatial scripts if no other work has adopted them.
4. Revert only the dated spatial-foundation append blocks in `C:/Dev/.agent/PRESENCE_CANON.md`, `PRESENCE_GATE_TRACKER.md`, and `PROOF_LIBRARY.md`, plus the approved-spec completion/checklist changes.
5. Optionally clear the browser-local active and `:previous` keys produced by `spatialDraftStorageKey()` for `mobstar-internal-arranger-room`, `mobstar-internal-proof-room`, and `bbb-projection-wall-proof`. Room IDs are encoded as one key segment; do not delete unrelated local storage.

No backend, production data, auth, tenant, publish, public dispatcher, or protected public renderer rollback is required.

## Required next review

Before any public or Gate 4 proposal: independent no-merge review, component art-direction/admission review, BBB media optimisation, physical mobile/AT checks, cross-browser checks, and a separate public integration work order.
