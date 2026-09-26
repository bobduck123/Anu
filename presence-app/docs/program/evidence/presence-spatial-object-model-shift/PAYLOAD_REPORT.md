# Spatial object-model payload report

Measured: 2026-08-17
Scope: Internal Gate 3 fixtures and production build output

## Budgets

| Measure | Contract |
|---|---:|
| Layout JSON | <= 102,400 bytes |
| Eager compressed component + room assets | <= 3,145,728 bytes |
| Internal total compressed assets | <= 12,582,912 bytes |

The total ceiling is an internal guard. A public room should keep initial transfer under a few MB and must receive separate route-level performance review.

## Compiled fixtures

| Fixture | Layout JSON | Eager assets | Total assets |
|---|---:|---:|---:|
| `mobstar-internal-proof-room` | 11,598 bytes | 44,000 bytes | 250,000 bytes |
| `bbb-projection-wall-proof` | 5,236 bytes | 2,512,625 bytes | 5,956,155 bytes |

Both layouts and eager sets pass. BBB's total is 5.96 MB because the second public-safe PNG is lazy but large; optimise both projection images before any public-route proposal.

Deterministic validated draft envelopes are retained as [Mobstar JSON](saved-layouts/mobstar-spatial-draft-v1.json) and [BBB JSON](saved-layouts/bbb-projection-wall-draft-v1.json). They can be regenerated with `npm run evidence:spatial:mobstar` and `npm run evidence:spatial:bbb`; the spatial unit suite byte-compares both outputs at the fixed evidence timestamp.

## Build chunk

`npm run build` produced the lazy Three.js chunk:

```text
.next/static/chunks/1sg57cc1rtczn.js  546,602 bytes uncompressed
```

The chunk is referenced by the React loadable manifest for `/internal/spatial-object-model`. That route is noindex, default-off and unconditionally disabled in production. No protected public route imports the spatial arranger or Three renderer.

## Asset hygiene

- Layouts contain only opaque generated/public asset locators, never media or model blobs.
- `.glb` and `.gltf` fixture locators are rejected.
- The registry includes procedural geometry only and records `rawAssetIncluded: false`.
- Component geometry is cached by `componentId@version`; skins/materials/media remain placement-level references.
- No GLB loader, raw 35 MB model, per-client model export, or production asset host is included.
