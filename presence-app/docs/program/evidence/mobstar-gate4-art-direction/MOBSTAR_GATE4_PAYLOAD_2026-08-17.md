# Mobstar Gate 4 payload report

Compiled fixture fingerprint: `fnv1a-100d0231`

| Measure | Result | Limit | Status |
|---|---:|---:|---|
| Layout JSON | 16,736 B | 102,400 B | PASS |
| Declared eager assets | 432,000 B | 3,145,728 B | PASS |
| Declared total assets | 997,000 B | bounded internal target | PASS |
| Actual seven runtime media files | 232,740 B | below declared totals | PASS |
| GLB/GLTF files | 0 | 0 raw/unoptimised | PASS |

Geometry is procedural/component-referenced. Layout JSON does not inline model or media blobs. Client media is separate, capped and same-origin. The lazy Three application chunk is not counted as room media and remains a separate platform runtime cost.

Generated/internal-candidate media were produced with the built-in image-generation tool using the pinned showroom and logo as art-direction references, then resized and compressed to WebP. They are internal candidate evidence, not product truth or production-cleared campaign assets.

