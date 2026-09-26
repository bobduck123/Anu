# Spatial source-asset audit

## Decision

The supplied directory `assets/presence-spatial/` is candidate/source evidence, not a runtime library for this baseline. No raw or optimized GLB is copied into a public room.

## Useful internal candidates

The concurrent internal-use clearance records identify six optimized derivatives totaling roughly 1.22 MB. The strongest are a 7,976-byte shape-only display island, a 130,068-byte shape-only drape and a 684,212-byte warehouse shell with a 77,096-byte shape fallback. These remain candidate/not-admitted; licensing and art-direction review are incomplete.

## Why they are not rendered in this baseline

The generic Three adapter currently has no GLTF/Draco loader. A registry component with `geometry.kind: "asset"` deliberately renders as a labelled cached bounds box. Wiring these candidates now would prove metadata selection, not visible reusable model geometry.

The bounded baseline therefore uses Presence-authored procedural geometry through the same registry/compiler/cache path. A later task may add a generic optimized-component resolver, Draco loader, cancellation, payload accounting and mobile fallback before any candidate geometry is considered for admission.

## Rejected source behavior

- Raw source models remain source-only; the audited raw batch is hundreds of megabytes.
- No arbitrary file path or model URL enters layout JSON.
- No source GLB/GLTF is served from `public/`.
- No component receives `admitted` status.
- No asset licence is upgraded by inference.
