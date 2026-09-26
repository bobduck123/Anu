# Presence Spatial Draco Runtime Support Evidence

Date: 2026-08-17

## Scope

Added generic lazy runtime support for Draco-compressed GLB render geometry behind Presence component references. The authoring/proxy geometry remains the canonical editable shape, and the GLB is an optional renderer-only upgrade.

## Candidate Proof

- Component: `presence.candidate-display-island@1.0.0`
- Runtime asset: `/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- Internal source candidate: `assets/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb`
- Runtime size: 7,976 bytes
- Draco marker: `KHR_draco_mesh_compression` present
- Admission status: internal candidate proof only; not an admitted Presence component.

## Payload

Compiled proof fixture: `DRACO_DISPLAY_ISLAND_PROOF_FIXTURE`

| Metric | Bytes |
| --- | ---: |
| Layout JSON | 2,940 |
| Eager compressed runtime assets | 0 |
| Candidate Draco GLB | 7,976 |
| Lazy Draco wasm decoder path | 250,876 |
| Total compressed runtime budget impact | 258,852 |
| Copied JS decoder fallback file | 512,465 |

The budget model counts the GLB and lazy wasm decoder path in total runtime bytes while keeping eager runtime bytes at zero. The JS decoder fallback file is copied beside the wasm decoder for Three loader compatibility, but the measured lazy path requested by Chromium was `draco_decoder.wasm` plus `draco_wasm_wrapper.js`.

## Browser Evidence

Manual browser QA used the local internal route:

`http://127.0.0.1:3101/internal/spatial-object-model`

Observed page state after loading the Draco proof:

- HTTP status: 200
- Renderer lane: `three`
- Component keys: `presence.candidate-display-island@1.0.0,presence.floor-slab@1.0.0,presence.room-shell@1.0.0`
- GLB render requested: `1`
- GLB render loaded: `1`
- GLB render failed: `0`
- Rendered items: `3`
- Candidate GLB request: 200
- Draco wasm request: 200
- Draco wasm wrapper request: 200

Screenshot:

`docs/program/evidence/presence-spatial-object-model-shift/screenshots/draco-manual-browser-qa.png`

## Fallback Evidence

The e2e fallback case aborts the GLB request and verifies:

- the Three renderer remains visible;
- `data-glb-render-failed-count="1"`;
- procedural proxy geometry still renders;
- the inspection Action remains operable;
- semantic fallback content remains present.

## Limits

This is runtime support and a renderer proof only. It does not promote the candidate, admit the asset, publish a public claim, alter production data, or change the Presence admission bar.
