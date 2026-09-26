# Draco Runtime Gate Review

Date: 2026-08-17

## Classification

Gate: Gate 3 internal spatial object-model/runtime evidence.

Acceptance classification: internal runtime proof, not creative acceptance, not primitive admission, not public launch readiness.

This review covers the generic Draco GLB runtime path added to the Presence spatial renderer. It does not approve any candidate asset, Look, Room Style, public route, hosted launch claim or production primitive.

## What This Proves

- A Presence spatial component can declare optional renderer-only GLB geometry through the component reference contract.
- A Draco-compressed GLB can be lazy-loaded by the generic Three renderer.
- The authored procedural proxy remains available as the authoring and fallback source of truth.
- The semantic fallback remains operable when GLB, Draco or WebGL rendering is unavailable.
- Runtime payload impact can be represented separately from layout JSON and eager runtime bytes.

## What This Does Not Prove

- It does not admit `presence.candidate-display-island@1.0.0` as a production Presence component.
- It does not prove public/mobile launch readiness for GLB-heavy rooms.
- It does not prove visual quality or cultural/art-direction acceptance.
- It does not prove source-asset licensing, owner permission or client-public clearance.
- It does not add upload, publishing, backend persistence, auth, commerce, multiplayer or production behavior.

## Candidate GLB Used

- Component: `presence.candidate-display-island@1.0.0`
- Runtime URL: `/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- Runtime file: `public/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- Internal candidate source: `assets/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- Compression marker: `KHR_draco_mesh_compression`
- Status: internal candidate proof only; not admitted.

No raw `.gltf` source file is introduced. The copied `.glb` is the optimized runtime proof asset.

## Payload Measurements

Measured from `DRACO_DISPLAY_ISLAND_PROOF_FIXTURE` on 2026-08-17.

| Metric | Bytes |
| --- | ---: |
| Layout JSON | 2,940 |
| Candidate Draco GLB | 7,976 |
| Draco WASM decoder | 192,420 |
| Draco WASM wrapper | 58,456 |
| Lazy WASM decoder path | 250,876 |
| JS decoder fallback file | 512,465 |
| Eager compressed runtime impact | 0 |
| Total compressed runtime impact | 258,852 |

The JS decoder fallback file is present for Three/Draco loader compatibility. Chromium manual QA requested the WASM path: `draco_decoder.wasm` and `draco_wasm_wrapper.js`.

## Decoder Location And Caching Model

Decoder files live under:

`public/presence-spatial/draco/gltf/`

Recommended policy:

- Do not include the Draco decoder in eager public bundles.
- Load the decoder only when a rendered component declares Draco GLB render geometry.
- Cache the decoder globally once loaded by the Three/Draco loader runtime.
- Cache parsed component geometry by stable component render plan, functionally tied to `componentId@version` plus the GLB URL/decoder path.
- Clone cached component geometry per placement, then dispose placement-owned geometry/material/texture instances on renderer teardown.
- Keep procedural proxy geometry as the authoring and fallback source of truth.

## Lazy-Load Policy

- `renderGeometry.kind === "glb"` is optional renderer data, not the canonical authored geometry.
- Draco decoder bytes count toward total runtime impact and `lazyDecoderBytes`, not eager runtime impact.
- GLBs are requested only after a Three-capable rendered placement declares GLB render geometry.
- Do not duplicate GLBs per client skin. Skins/material overrides should remain metadata or lightweight material choices unless a separate admission review approves additional runtime assets.
- Additional candidate GLBs should reuse this same `renderGeometry` contract rather than adding candidate-specific renderer branches.

## Mobile Payload Policy

- Mobile, reduced-motion and WebGL-unavailable paths must remain able to choose semantic/static fallback without downloading the GLB or Draco decoder.
- A candidate GLB proof does not justify serving the decoder eagerly to mobile visitors.
- Mobile support for any future GLB-heavy Presence needs separate payload, memory and visual QA before launch-facing classification.

## Fallback Behaviour

Required fallback contract:

- If GLB loading succeeds, the renderer hides the procedural proxy and mounts the cloned GLB instance.
- If GLB loading fails, the procedural proxy stays visible and the Three room remains usable.
- If Draco loading fails, the same proxy/fallback rule applies.
- If WebGL is unavailable, the semantic fallback remains the visitor-operable surface.
- Inspect Actions must remain operable in both Three and semantic fallback paths.

Current e2e evidence covers both success and aborted-GLB failure cases.

## E2E Teardown Finding

Baseline full command:

`cmd /c npm run test:e2e:spatial`

Observed result on 2026-08-17:

- All 14 spatial e2e tests printed `ok`.
- The process did not exit after the final test.
- The run was interrupted manually after the teardown wait reproduced.

Focused Draco command:

`cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "Draco GLB"`

Observed result:

- 2/2 passed.
- Clean process exit.

Debug reproduction:

`$env:DEBUG='pw:webserver'; cmd /c npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "internal local drafts"`

Observed result:

- The single selected test printed `ok`.
- Playwright printed `pw:webserver Terminating the WebServer`.
- No further webServer shutdown completion was printed after 30 seconds.
- The run was interrupted manually.

Likely cause:

The hang is in Playwright webServer teardown on Windows for this local environment, not in the spatial assertions. The installed Playwright webServer plugin uses `taskkill /pid <pid> /T /F` on Windows and waits for the spawned process close event. External process-command inspection and `tasklist /V`/WMI diagnostics were permission-blocked in this sandbox, so the exact child process handle could not be proven safely.

No code fix was applied because the bounded evidence points to process teardown outside the Draco renderer path, and a workaround that force-exits the runner would hide the teardown problem rather than fix it.

## Current Verification

- `cmd /c npm run test:spatial`: 111/111 passed.
- `cmd /c npm run test:spatial-assets`: 30/30 passed.
- `cmd /c npx tsc --noEmit`: passed.
- `cmd /c npm run build`: passed with existing Next workspace-root warning.
- Focused Draco e2e: 2/2 passed and exited cleanly.
- Full spatial e2e: 14/14 printed `ok`, then hung during webServer teardown.

## Risks

- Windows Playwright webServer teardown remains noisy for full-suite automation in this environment.
- The Draco decoder payload is large enough that it must remain lazy and guarded by renderer capability.
- Candidate asset permission/admission must not be inferred from runtime success.
- Future GLB candidates can regress mobile payload if they bypass this contract.

## Rollback Notes

Rollback is file-scoped:

- Remove the `renderGeometry` model, compiler and validator additions.
- Remove the GLB loader helper and Three renderer GLB mount path.
- Remove `presence.candidate-display-island@1.0.0` and the Draco proof fixture.
- Remove copied files under `public/presence-spatial/candidates/` and `public/presence-spatial/draco/`.
- Remove the Draco unit/e2e tests and evidence notes.

No backend, auth, persistence, publish or production data rollback is required because none was changed.

## Recommendation

Additional candidate GLBs should reuse this same contract:

1. Candidate remains `prototype` / `not-evaluated`.
2. Runtime GLB is optimized and same-origin under `/presence-spatial/`.
3. Draco decoder remains lazy under `/presence-spatial/draco/gltf/`.
4. Component keeps procedural proxy geometry.
5. Semantic fallback remains complete.
6. Payload metrics are recorded before any broader use.
7. Admission is reviewed separately from runtime rendering success.
