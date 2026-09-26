# Presence spatial candidate review

Batch: `initial-presence-ingestion`  
Generated: 2026-08-17T00:00:00.000Z  
Registry admission: `candidates-only`

Every row is `candidate-review-required`. Nothing here is an admitted Presence component, nothing is licence-cleared, and nothing has passed art direction.

| Metric | Value |
|---|---|
| Component candidates | 118 |
| Room-kit candidates | 8 |
| Candidates with an exported GLB | 118 |
| Manifest-only candidates | 0 |
| Within payload budget | 123 |
| Over payload budget | 3 |
| Not measurable (no export) | 0 |
| With a thumbnail | 126 |

Tooling used for this batch:

- Blender: available (5.1.1)
- gltf-transform: not available
- gltfpack: not available
- Blender extraction ran per source with a 900s timeout, Draco geometry compression and WEBP thumbnails.
- Textured exports resize images to a 1024px longest edge; sources above 80 MB get shape-only room kits.
- gltf-transform and gltfpack were not used: neither is installed in this environment, and no new dependency was introduced for this pass.

## Recommended actions vocabulary

`approve-as-component`, `approve-as-roomkit`, `rename`, `merge`, `reject`, `needs-manual-cleanup`, `needs-license-review`, `needs-texture-preservation`, `needs-art-direction-review`

## Room-kit candidates

| Room kit id | Thumbnail | Source | Category | Dimensions | Runtime size | Budget | Licence | Components | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.roomkit.boutique-0ae2` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.boutique-0ae2.webp` | `source.coffee-shop-gld-coffee-shop` | boutique (keyword-match) | 20.9151 x 5.2193 x 11.938 | 8538.7 KB | **over roomkit-eager** (3072 KB) | needs-review | 24 | needs-manual-cleanup |
| `candidate.roomkit.living-room-06d0` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.living-room-06d0.webp` | `source.living-room-interior-free` | living-room (keyword-match) | 37.8143 x 25.1166 x 55.7247 | 1475.9 KB | within roomkit-eager (3072 KB) | needs-review | 11 | needs-manual-cleanup |
| `candidate.roomkit.living-room-c197` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.living-room-c197.webp` | `source.the-great-drawing-room` | living-room (keyword-match) | 14.2918 x 5.7097 x 13.994 | 6225.3 KB | **over roomkit-eager** (3072 KB) | needs-review | 15 | needs-manual-cleanup |
| `candidate.roomkit.unknown-interior-3bc1` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-3bc1.webp` | `source.interior-7` | unknown-interior (unknown) | 26.3202 x 10.9458 x 26.0336 | 2794 KB | within roomkit-eager (3072 KB) | needs-review | 21 | approve-as-roomkit |
| `candidate.roomkit.unknown-interior-a5e1` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-a5e1.webp` | `source.urban-interior-moody-vr-room-baked-source-untitled` | unknown-interior (unknown) | 53.7249 x 12.2922 x 12.4029 | 159.3 KB | within roomkit-eager (3072 KB) | needs-review | 1 | needs-manual-cleanup |
| `candidate.roomkit.unknown-interior-b562` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-b562.webp` | `source.star-wars-the-clone-wars-venator-prefab` | unknown-interior (unknown) | 31.1588 x 2.7532 x 15.7479 | 2097.2 KB | within roomkit-eager (3072 KB) | needs-review | 23 | approve-as-roomkit |
| `candidate.roomkit.unknown-interior-ffd7` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-ffd7.webp` | `source.old-church-modeling-interior-scene` | unknown-interior (unknown) | 40.4179 x 21.445 x 23.3469 | 3819.2 KB | **over roomkit-eager** (3072 KB) | needs-review | 22 | needs-manual-cleanup |
| `candidate.roomkit.warehouse-17b3` | `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.warehouse-17b3.webp` | `source.brutalist-interior-vr-room-baked-source-untitled` | warehouse (keyword-match) | 10.7 x 4.2229 x 6.7854 | 668.2 KB | within roomkit-eager (3072 KB) | needs-review | 1 | approve-as-roomkit |

### candidate.roomkit.boutique-0ae2

- Name: Candidate Boutique Kit 002 (coffee-shop-gld-coffee-shop)
- Source asset: `source.coffee-shop-gld-coffee-shop`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.boutique-0ae2.glb` (shape-only, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.boutique-0ae2.glb` - The shape-only export doubles as the fallback representation.
- Extracted component candidates: 24
- Licence evidence: asset.generator present in the glTF header
- Interior category matched keywords: shop, coffee.
- Interior signals: source path names a space: shop; 97 meshes suggest an arranged scene; 845 mesh-bearing nodes across the scene; wide footprint (20.9151 units across); room-scale height (5.2193 units); 70 materials; architectural naming: wall, ceiling.
- Warnings: `duplicates-collapsed`, `export-cap-reached`
- Available actions: approve-as-roomkit, needs-manual-cleanup, needs-license-review, needs-art-direction-review

### candidate.roomkit.living-room-06d0

- Name: Candidate Living Room Kit 004 (living-room-interior-free)
- Source asset: `source.living-room-interior-free`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-06d0.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-06d0.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 11
- Licence evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata
- Scale: Measured height 25.1166 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1274 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.
- Interior category matched keywords: living-room, living.
- Interior signals: source path names a space: interior, room; 19 meshes suggest an arranged scene; 19 mesh-bearing nodes across the scene; wide footprint (55.7247 units across); room-scale height (25.1166 units); 12 materials.
- Warnings: `duplicates-collapsed`, `scale-check-required`
- Available actions: approve-as-roomkit, needs-manual-cleanup, needs-license-review, needs-art-direction-review

### candidate.roomkit.living-room-c197

- Name: Candidate Living Room Kit 007 (the-great-drawing-room)
- Source asset: `source.the-great-drawing-room`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-c197.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-c197.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 15
- Licence evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata
- Interior category matched keywords: drawing-room.
- Interior signals: source path names a space: room; 15 meshes suggest an arranged scene; 15 mesh-bearing nodes across the scene; wide footprint (14.2918 units across); room-scale height (5.7097 units).
- Available actions: approve-as-roomkit, needs-manual-cleanup, needs-license-review, needs-art-direction-review

### candidate.roomkit.unknown-interior-3bc1

- Name: Candidate Unknown Interior Kit 003 (interior-7)
- Source asset: `source.interior-7`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-3bc1.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-3bc1.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 21
- Licence evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata
- Interior category could not be keyword-matched; recorded as an uncertain guess.
- Interior signals: source path names a space: interior; 57 meshes suggest an arranged scene; 57 mesh-bearing nodes across the scene; wide footprint (26.3202 units across); room-scale height (10.9457 units); 24 materials.
- Warnings: `duplicates-collapsed`
- Available actions: approve-as-roomkit, needs-license-review, needs-art-direction-review

### candidate.roomkit.unknown-interior-a5e1

- Name: Candidate Unknown Interior Kit 008 (urban-interior-moody-vr-room-baked-source-untitled)
- Source asset: `source.urban-interior-moody-vr-room-baked-source-untitled`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-a5e1.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-a5e1.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 1
- Licence evidence: asset.generator present in the glTF header
- Scale: Measured height 12.2922 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.2603 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.
- Interior category could not be keyword-matched; recorded as an uncertain guess.
- Interior signals: source path names a space: interior, room; wide footprint (53.725 units across); room-scale height (12.2922 units).
- Warnings: `scale-check-required`
- Available actions: approve-as-roomkit, needs-manual-cleanup, needs-license-review, needs-art-direction-review

### candidate.roomkit.unknown-interior-b562

- Name: Candidate Unknown Interior Kit 006 (star-wars-the-clone-wars-venator-prefab)
- Source asset: `source.star-wars-the-clone-wars-venator-prefab`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-b562.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-b562.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 23
- Licence evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata
- Interior category could not be keyword-matched; recorded as an uncertain guess.
- Interior signals: 158 meshes suggest an arranged scene; 158 mesh-bearing nodes across the scene; wide footprint (31.1588 units across); room-scale height (2.7531 units); 4 materials; architectural naming: floor, wall, door.
- Warnings: `duplicates-collapsed`
- Available actions: approve-as-roomkit, needs-license-review, needs-art-direction-review

### candidate.roomkit.unknown-interior-ffd7

- Name: Candidate Unknown Interior Kit 005 (old-church-modeling-interior-scene)
- Source asset: `source.old-church-modeling-interior-scene`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-ffd7.glb` (shape-only, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-ffd7.glb` - The shape-only export doubles as the fallback representation.
- Extracted component candidates: 22
- Licence evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata
- Scale: Measured height 21.445 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1492 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.
- Interior category could not be keyword-matched; recorded as an uncertain guess.
- Interior signals: source path names a space: interior, scene, church; 41 meshes suggest an arranged scene; 41 mesh-bearing nodes across the scene; wide footprint (40.418 units across); room-scale height (21.445 units); 33 materials; architectural naming: window, door, arch.
- Warnings: `duplicates-collapsed`, `scale-check-required`
- Available actions: approve-as-roomkit, needs-manual-cleanup, needs-license-review, needs-art-direction-review

### candidate.roomkit.warehouse-17b3

- Name: Candidate Warehouse Kit 001 (brutalist-interior-vr-room-baked-source-untitled)
- Source asset: `source.brutalist-interior-vr-room-baked-source-untitled`
- Runtime asset: `assets/presence-spatial/candidates/roomkits/candidate.roomkit.warehouse-17b3.glb` (textured, draco geometry)
- Fallback: shape-only-glb -> `assets/presence-spatial/candidates/roomkits/candidate.roomkit.warehouse-17b3.shape.glb` - Shape-only room shell for constrained clients and mobile fallback.
- Extracted component candidates: 1
- Licence evidence: asset.generator present in the glTF header
- Interior category matched keywords: brutalist.
- Interior signals: source path names a space: interior, room; wide footprint (10.7 units across); room-scale height (4.223 units); 3 materials.
- Available actions: approve-as-roomkit, needs-license-review, needs-art-direction-review

## Component candidates

### From `source.brutalist-interior-vr-room-baked-source-untitled`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.room-shell.brutalist-interior-vr-room-baked-17b3-000` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.brutalist-interior-vr-room-baked-17b3-000.webp` | room-shell (dimension-heuristic) | 10.6961 x 4.2229 x 6.7854 | 11,240 | x1 | 73.3 KB | within simple (1024 KB) | needs-review | approve-as-component |

### From `source.coffee-shop-gld-coffee-shop`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-012.webp` | chair (dimension-heuristic) | 0.4458 x 1.1948 x 0.4467 | 56,897 | x5 | 137.6 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-020` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-020.webp` | chair (dimension-heuristic) | 0.3163 x 0.9896 x 0.3163 | 30,494 | x2 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.chair.coffee-shop-gld-coffee-shop-0ae2-023` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.coffee-shop-gld-coffee-shop-0ae2-023.webp` | chair (dimension-heuristic) | 0.3313 x 1.0366 x 0.3313 | 30,494 | x1 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.chair.pottery-007-0ae2-006` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.pottery-007-0ae2-006.webp` | chair (dimension-heuristic) | 0.4322 x 0.6708 x 0.3733 | 80,734 | x4 | 324.8 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.column.coffee-shop-gld-coffee-shop-0ae2-009` | `assets/presence-spatial/candidates/thumbnails/candidate.column.coffee-shop-gld-coffee-shop-0ae2-009.webp` | column (dimension-heuristic) | 0.1305 x 1.2915 x 0.1305 | 59,717 | x21 | 150.9 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.column.coffee-shop-gld-coffee-shop-0ae2-010` | `assets/presence-spatial/candidates/thumbnails/candidate.column.coffee-shop-gld-coffee-shop-0ae2-010.webp` | column (dimension-heuristic) | 0.0737 x 0.7287 x 0.0737 | 59,717 | x12 | 150.9 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.column.coffee-shop-gld-coffee-shop-0ae2-011` | `assets/presence-spatial/candidates/thumbnails/candidate.column.coffee-shop-gld-coffee-shop-0ae2-011.webp` | column (dimension-heuristic) | 0.2154 x 0.5554 x 0.2397 | 58,588 | x6 | 143.8 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.decorative-prop.coffee-shop-gld-coffee-shop-0ae2-008` | `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.coffee-shop-gld-coffee-shop-0ae2-008.webp` | decorative-prop (dimension-heuristic) | 0.2278 x 0.2393 x 0.5491 | 68,544 | x1 | 13.7 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.decorative-prop.cupcake-with-a-raspberry-0ae2-015` | `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.cupcake-with-a-raspberry-0ae2-015.webp` | decorative-prop (dimension-heuristic) | 0.3145 x 0.1261 x 0.3145 | 41,496 | x1 | 141.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.coffee-vending-machine-station-0ae2-004` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.coffee-vending-machine-station-0ae2-004.webp` | shelf (dimension-heuristic) | 0.7983 x 2.35 x 1.29 | 115,481 | x1 | 737.4 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.shelf.retopo-g-555780-0ae2-013` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.retopo-g-555780-0ae2-013.webp` | shelf (dimension-heuristic) | 0.2888 x 2.0739 x 1.1302 | 43,440 | x1 | 127 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.sofa.sofa-001-0ae2-003` | `assets/presence-spatial/candidates/thumbnails/candidate.sofa.sofa-001-0ae2-003.webp` | sofa (keyword-match) | 3.4098 x 1.2491 x 2.5932 | 319,746 | x2 | 751.2 KB | within hero (5120 KB) | needs-review | approve-as-component |
| `candidate.sofa.sofa-0ae2-002` | `assets/presence-spatial/candidates/thumbnails/candidate.sofa.sofa-0ae2-002.webp` | sofa (keyword-match) | 3.4098 x 1.2922 x 2.5932 | 319,746 | x1 | 751.2 KB | within hero (5120 KB) | needs-review | approve-as-component |
| `candidate.table.bovenkap-0ae2-001` | `assets/presence-spatial/candidates/thumbnails/candidate.table.bovenkap-0ae2-001.webp` | table (dimension-heuristic) | 0.9489 x 1.1498 x 0.9516 | 436,962 | x1 | 586.5 KB | within hero (5120 KB) | needs-review | approve-as-component |
| `candidate.table.coffee-shop-gld-coffee-shop-0ae2-000` | `assets/presence-spatial/candidates/thumbnails/candidate.table.coffee-shop-gld-coffee-shop-0ae2-000.webp` | table (dimension-heuristic) | 0.6348 x 0.6325 x 1.4059 | 606,980 | x1 | 2464.5 KB | within hero (5120 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-005` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-005.webp` | unknown-object (unknown) | 3.2236 x 1.6124 x 7.6947 | 104,704 | x1 | 449 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-007` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-007.webp` | unknown-object (unknown) | 0.0103 x 1.3342 x 1.228 | 69,526 | x1 | 359.6 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-016` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-016.webp` | unknown-object (unknown) | 0.2703 x 0.8456 x 0.2703 | 30,494 | x3 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-017` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-017.webp` | unknown-object (unknown) | 0.2754 x 0.8617 x 0.2754 | 30,494 | x1 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-018` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-018.webp` | unknown-object (unknown) | 0.2828 x 0.8848 x 0.2828 | 30,494 | x3 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-019` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-019.webp` | unknown-object (unknown) | 0.2945 x 0.9213 x 0.2945 | 30,494 | x1 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-021` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-021.webp` | unknown-object (unknown) | 0.2954 x 0.9243 x 0.2954 | 30,494 | x3 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-022` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.coffee-shop-gld-coffee-shop-0ae2-022.webp` | unknown-object (unknown) | 0.2649 x 0.8288 x 0.2649 | 30,494 | x3 | 87.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014.webp` | wall (dimension-heuristic) | 1.8345 x 2.4919 x 0.0264 | 43,228 | x1 | 263.6 KB | within simple (1024 KB) | needs-review | approve-as-component |

### From `source.interior-7`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.chair.interior-7-3bc1-000` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-000.webp` | chair (dimension-heuristic) | 0.4114 x 0.857 x 0.4266 | 50,000 | x1 | 323.8 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.chair.interior-7-3bc1-008` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-008.webp` | chair (dimension-heuristic) | 0.3702 x 0.4095 x 0.2977 | 1,900 | x1 | 47.9 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.chair.interior-7-3bc1-012` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-012.webp` | chair (dimension-heuristic) | 0.3047 x 0.4796 x 0.3315 | 1,268 | x1 | 35.2 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.chair.interior-7-3bc1-013` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-013.webp` | chair (dimension-heuristic) | 0.3508 x 0.4931 x 0.4219 | 451 | x2 | 11.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.chair.interior-7-3bc1-014` | `assets/presence-spatial/candidates/thumbnails/candidate.chair.interior-7-3bc1-014.webp` | chair (dimension-heuristic) | 0.5125 x 0.4931 x 0.4681 | 451 | x1 | 11.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.column.interior-7-3bc1-015` | `assets/presence-spatial/candidates/thumbnails/candidate.column.interior-7-3bc1-015.webp` | column (dimension-heuristic) | 0.1549 x 1.5343 x 0.1544 | 376 | x3 | 7.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.decorative-prop.interior-7-3bc1-009` | `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.interior-7-3bc1-009.webp` | decorative-prop (dimension-heuristic) | 0.3848 x 0.323 x 0.3844 | 1,824 | x1 | 51.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.decorative-prop.interior-7-3bc1-016` | `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.interior-7-3bc1-016.webp` | decorative-prop (dimension-heuristic) | 0.0494 x 0.3504 x 0.2245 | 252 | x1 | 2.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.floor.interior-7-3bc1-019` | `assets/presence-spatial/candidates/thumbnails/candidate.floor.interior-7-3bc1-019.webp` | floor (dimension-heuristic) | 6.6627 x 0.071 x 4.5742 | 28 | x1 | 2.1 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.interior-7-3bc1-001` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.interior-7-3bc1-001.webp` | room-shell (dimension-heuristic) | 8.7815 x 9.3241 x 8.6259 | 23,517 | x1 | 175.4 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.interior-7-3bc1-002` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.interior-7-3bc1-002.webp` | room-shell (dimension-heuristic) | 7.989 x 5.0722 x 3.3377 | 5,076 | x2 | 25.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.interior-7-3bc1-007` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.interior-7-3bc1-007.webp` | room-shell (dimension-heuristic) | 0.1548 x 3.4623 x 8.9859 | 1,952 | x1 | 11.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.interior-7-3bc1-011` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.interior-7-3bc1-011.webp` | room-shell (dimension-heuristic) | 6.7395 x 3.4623 x 0.1549 | 1,464 | x1 | 9.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.interior-7-3bc1-017` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.interior-7-3bc1-017.webp` | room-shell (dimension-heuristic) | 2.8988 x 7.826 x 12.2024 | 176 | x1 | 3.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.interior-7-3bc1-018` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.interior-7-3bc1-018.webp` | shelf (dimension-heuristic) | 0.5487 x 3.7078 x 0.4665 | 76 | x1 | 2.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-003` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-003.webp` | unknown-object (unknown) | 4.4232 x 5.2445 x 5.8187 | 2,844 | x1 | 13.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-004` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-004.webp` | unknown-object (unknown) | 1.3807 x 0.3599 x 1.3072 | 2,840 | x1 | 56.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-005` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-005.webp` | unknown-object (unknown) | 0.6191 x 0.3314 x 1.0299 | 2,358 | x1 | 50.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-006` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-006.webp` | unknown-object (unknown) | 0.9864 x 0.3314 x 0.4862 | 2,358 | x1 | 50.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-010` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-010.webp` | unknown-object (unknown) | 0.9591 x 0.3517 x 0.4411 | 1,752 | x1 | 39.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.interior-7-3bc1-020` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.interior-7-3bc1-020.webp` | unknown-object (unknown) | 6.4074 x 0.2888 x 0 | 28 | x1 | 1.7 KB | within simple (1024 KB) | needs-review | approve-as-component |

### From `source.living-room-interior-free`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.room-shell.living-room-interior-free-06d0-000` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-000.webp` | room-shell (dimension-heuristic) | 20.451 x 13.713 x 24.0142 | 9,498 | x1 | 173.9 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-001` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-001.webp` | room-shell (dimension-heuristic) | 24.2616 x 6.7167 x 16.2946 | 4,486 | x1 | 93.6 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-002` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-002.webp` | room-shell (dimension-heuristic) | 28.0463 x 4.0058 x 16.8482 | 3,916 | x1 | 68.5 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-003` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-003.webp` | room-shell (dimension-heuristic) | 24.0685 x 21.7773 x 49.0617 | 3,806 | x1 | 76.4 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-004` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-004.webp` | room-shell (dimension-heuristic) | 0.9888 x 4.0784 x 35.5521 | 508 | x2 | 3.5 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-007` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-007.webp` | room-shell (dimension-heuristic) | 21.6096 x 18.7428 x 3.1657 | 76 | x1 | 2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-008` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-008.webp` | room-shell (dimension-heuristic) | 12.5074 x 17.788 x 4.5184 | 64 | x1 | 2.1 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-009` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-009.webp` | room-shell (dimension-heuristic) | 28.5401 x 5.327 x 20.729 | 28 | x1 | 2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.living-room-interior-free-06d0-010` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.living-room-interior-free-06d0-010.webp` | room-shell (dimension-heuristic) | 27.3577 x 23.1959 x 21.5813 | 24 | x1 | 2.1 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.table.living-room-interior-free-06d0-005` | `assets/presence-spatial/candidates/thumbnails/candidate.table.living-room-interior-free-06d0-005.webp` | table (dimension-heuristic) | 15.4726 x 0.7587 x 0.7586 | 94 | x1 | 2.2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.table.living-room-interior-free-06d0-006` | `assets/presence-spatial/candidates/thumbnails/candidate.table.living-room-interior-free-06d0-006.webp` | table (dimension-heuristic) | 12.7798 x 0.7587 x 0.7586 | 94 | x2 | 2.2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |

### From `source.old-church-modeling-interior-scene`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.column.chain-004-ffd7-004` | `assets/presence-spatial/candidates/thumbnails/candidate.column.chain-004-ffd7-004.webp` | column (dimension-heuristic) | 0.059 x 3.9087 x 0.0515 | 38,784 | x2 | 264.9 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.decorative-prop.old-church-modeling-interior-sce-ffd7-013` | `assets/presence-spatial/candidates/thumbnails/candidate.decorative-prop.old-church-modeling-interior-sce-ffd7-013.webp` | decorative-prop (dimension-heuristic) | 0.1687 x 0.1059 x 0.2075 | 1,920 | x1 | 14.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.floor.old-church-modeling-interior-sce-ffd7-021` | `assets/presence-spatial/candidates/thumbnails/candidate.floor.old-church-modeling-interior-sce-ffd7-021.webp` | floor (dimension-heuristic) | 39.9688 x 0.0445 x 22.7299 | 30 | x1 | 2.1 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-001` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-001.webp` | room-shell (dimension-heuristic) | 38.4447 x 3.8382 x 22.9287 | 124,008 | x1 | 460.8 KB | within common (2048 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-002` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-002.webp` | room-shell (dimension-heuristic) | 33.6732 x 13.6967 x 12.6064 | 94,550 | x1 | 424.1 KB | within common (2048 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-003` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-003.webp` | room-shell (dimension-heuristic) | 37.433 x 15.1417 x 21.8116 | 43,104 | x1 | 350.4 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-005` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-005.webp` | room-shell (dimension-heuristic) | 23.1954 x 18.3784 x 2.1579 | 37,306 | x1 | 362.9 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-007` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-007.webp` | room-shell (dimension-heuristic) | 32.3932 x 5.2263 x 12.1456 | 13,090 | x1 | 121 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-008` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-008.webp` | room-shell (dimension-heuristic) | 37.2882 x 6.8679 x 22.6337 | 7,304 | x1 | 89.9 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-009` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-009.webp` | room-shell (dimension-heuristic) | 36.8711 x 15.185 x 21.3611 | 5,896 | x1 | 62.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-014` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-014.webp` | room-shell (dimension-heuristic) | 32.6514 x 5.8696 x 12.1456 | 1,540 | x1 | 22 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-015` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-015.webp` | room-shell (dimension-heuristic) | 33.4757 x 12.166 x 12.4987 | 858 | x1 | 12.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-016` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-016.webp` | room-shell (dimension-heuristic) | 4.3341 x 4.3008 x 10.868 | 768 | x1 | 7.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.room-shell.old-church-modeling-interior-sce-ffd7-019` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.old-church-modeling-interior-sce-ffd7-019.webp` | room-shell (dimension-heuristic) | 0.0444 x 20.168 x 23.3469 | 180 | x1 | 2.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.table.old-church-modeling-interior-sce-ffd7-000` | `assets/presence-spatial/candidates/thumbnails/candidate.table.old-church-modeling-interior-sce-ffd7-000.webp` | table (dimension-heuristic) | 9.8893 x 0.7556 x 9.3747 | 136,894 | x1 | 1137.8 KB | within common (2048 KB) | needs-review | needs-manual-cleanup |
| `candidate.table.old-church-modeling-interior-sce-ffd7-017` | `assets/presence-spatial/candidates/thumbnails/candidate.table.old-church-modeling-interior-sce-ffd7-017.webp` | table (dimension-heuristic) | 1.5713 x 0.7784 x 2.5598 | 430 | x1 | 7.8 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.ampoules-008-ffd7-011` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.ampoules-008-ffd7-011.webp` | unknown-object (unknown) | 1.4957 x 0.1111 x 1.4957 | 2,288 | x2 | 11.1 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.ampoules-009-ffd7-012` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.ampoules-009-ffd7-012.webp` | unknown-object (unknown) | 2.5118 x 0.1111 x 2.5118 | 2,288 | x2 | 10.9 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.old-church-modeling-interior-sce-ffd7-006` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.old-church-modeling-interior-sce-ffd7-006.webp` | unknown-object (unknown) | 34.3547 x 1.9584 x 13.1074 | 15,654 | x1 | 130.2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.old-church-modeling-interior-sce-ffd7-018` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.old-church-modeling-interior-sce-ffd7-018.webp` | unknown-object (unknown) | 7.9845 x 0.3903 x 7.127 | 374 | x1 | 8.3 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.old-church-modeling-interior-sce-ffd7-020` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.old-church-modeling-interior-sce-ffd7-020.webp` | unknown-object (unknown) | 32.836 x 0.3351 x 11.2192 | 96 | x1 | 3.6 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |
| `candidate.unknown-object.texturescom-persiancarpets0012-1-alphama-ffd7-010` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.texturescom-persiancarpets0012-1-alphama-ffd7-010.webp` | unknown-object (unknown) | 1.2266 x 0.4921 x 2.7801 | 3,872 | x1 | 21.2 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |

### From `source.star-wars-the-clone-wars-venator-prefab`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.column.venatorpipe-b562-018` | `assets/presence-spatial/candidates/thumbnails/candidate.column.venatorpipe-b562-018.webp` | column (dimension-heuristic) | 0.2072 x 2.5809 x 0.2072 | 200 | x8 | 2.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.door.l-door-part1-b562-019` | `assets/presence-spatial/candidates/thumbnails/candidate.door.l-door-part1-b562-019.webp` | door (keyword-match) | 3.4133 x 2.4203 x 0.2194 | 66 | x4 | 2.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.door.l-door-part10-b562-020` | `assets/presence-spatial/candidates/thumbnails/candidate.door.l-door-part10-b562-020.webp` | door (keyword-match) | 0.2194 x 2.4203 x 3.4133 | 66 | x6 | 2.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.door.venator-door-b562-012` | `assets/presence-spatial/candidates/thumbnails/candidate.door.venator-door-b562-012.webp` | door (keyword-match) | 0.0428 x 2.2056 x 1.5179 | 891 | x2 | 8.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.venatorlights-b562-002` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.venatorlights-b562-002.webp` | shelf (dimension-heuristic) | 0.765 x 2.5828 x 0.0209 | 8,730 | x12 | 37.1 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.venatorlights19-b562-003` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.venatorlights19-b562-003.webp` | shelf (dimension-heuristic) | 0.0209 x 2.5828 x 0.765 | 8,730 | x4 | 37.3 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel10-b562-016` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel10-b562-016.webp` | shelf (dimension-heuristic) | 0.765 x 2.5828 x 0.0361 | 366 | x8 | 4.9 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel11-b562-014` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel11-b562-014.webp` | shelf (dimension-heuristic) | 0.765 x 2.5828 x 0.0579 | 798 | x16 | 8.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel13-b562-009` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel13-b562-009.webp` | shelf (dimension-heuristic) | 0.7652 x 2.5828 x 0.0604 | 1,217 | x4 | 12.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel14-b562-006` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel14-b562-006.webp` | shelf (dimension-heuristic) | 0.8143 x 2.7532 x 0.3039 | 1,840 | x6 | 14 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel15-b562-015` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel15-b562-015.webp` | shelf (dimension-heuristic) | 0.0579 x 2.5828 x 0.765 | 798 | x6 | 8.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel16-b562-017` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel16-b562-017.webp` | shelf (dimension-heuristic) | 0.0361 x 2.5828 x 0.765 | 366 | x4 | 4.9 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel18-b562-010` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel18-b562-010.webp` | shelf (dimension-heuristic) | 0.0604 x 2.5828 x 0.7652 | 1,216 | x2 | 12.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.shelf.wallpanel54-b562-011` | `assets/presence-spatial/candidates/thumbnails/candidate.shelf.wallpanel54-b562-011.webp` | shelf (dimension-heuristic) | 0.7652 x 2.5828 x 0.0604 | 1,216 | x2 | 12.3 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.largedoorframe-b562-004` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.largedoorframe-b562-004.webp` | unknown-object (unknown) | 0.5202 x 2.5831 x 4.2539 | 3,344 | x3 | 27.3 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.largedoorframe2-b562-005` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.largedoorframe2-b562-005.webp` | unknown-object (unknown) | 4.2539 x 2.5831 x 0.5202 | 3,344 | x2 | 27.3 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.venatorlight-b562-021` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.venatorlight-b562-021.webp` | unknown-object (unknown) | 0.7676 x 0.1676 x 4.1863 | 30 | x38 | 2 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.unknown-object.venatorlight22-b562-022` | `assets/presence-spatial/candidates/thumbnails/candidate.unknown-object.venatorlight22-b562-022.webp` | unknown-object (unknown) | 4.1863 x 0.1676 x 0.7676 | 30 | x11 | 2.1 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.largedoor-end-b562-007` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.largedoor-end-b562-007.webp` | wall (dimension-heuristic) | 0.2625 x 2.5831 x 4.2539 | 1,716 | x2 | 16.5 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.largedoor-end1-b562-008` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.largedoor-end1-b562-008.webp` | wall (dimension-heuristic) | 4.2539 x 2.5831 x 0.2625 | 1,716 | x1 | 16.6 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.small-doorframe-b562-000` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.small-doorframe-b562-000.webp` | wall (dimension-heuristic) | 2.2814 x 2.5801 x 0.2748 | 9,898 | x6 | 47.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.small-doorframe2-b562-001` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.small-doorframe2-b562-001.webp` | wall (dimension-heuristic) | 0.2748 x 2.5801 x 2.2814 | 9,898 | x2 | 47.8 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.wall.venator-door1-b562-013` | `assets/presence-spatial/candidates/thumbnails/candidate.wall.venator-door1-b562-013.webp` | wall (dimension-heuristic) | 1.5179 x 2.2056 x 0.0428 | 891 | x6 | 8.5 KB | within simple (1024 KB) | needs-review | approve-as-component |

### From `source.the-great-drawing-room`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.room-shell.the-great-drawing-room-c197-000` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-000.webp` | room-shell (dimension-heuristic) | 12.4427 x 5.4063 x 11.4788 | 92,556 | x1 | 376.6 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-001` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-001.webp` | room-shell (dimension-heuristic) | 12.2287 x 5.2576 x 11.4353 | 87,630 | x1 | 382.3 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-002` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-002.webp` | room-shell (dimension-heuristic) | 14.2918 x 5.7097 x 13.994 | 87,429 | x1 | 388 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-003` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-003.webp` | room-shell (dimension-heuristic) | 12.2567 x 5.0363 x 11.2056 | 77,280 | x1 | 389.4 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-004` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-004.webp` | room-shell (dimension-heuristic) | 11.7516 x 5.3246 x 11.655 | 75,156 | x1 | 394.7 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-005` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-005.webp` | room-shell (dimension-heuristic) | 12.1848 x 5.4334 x 11.6037 | 72,621 | x1 | 396.1 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-006` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-006.webp` | room-shell (dimension-heuristic) | 11.864 x 5.043 x 11.4751 | 68,547 | x1 | 407.5 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-007` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-007.webp` | room-shell (dimension-heuristic) | 12.6467 x 5.2043 x 11.7186 | 65,066 | x1 | 402.9 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-008` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-008.webp` | room-shell (dimension-heuristic) | 10.3894 x 5.5905 x 11.0258 | 61,674 | x1 | 418.5 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-009` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-009.webp` | room-shell (dimension-heuristic) | 10.3193 x 5.0207 x 11.1346 | 61,417 | x1 | 420 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-010` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-010.webp` | room-shell (dimension-heuristic) | 11.8331 x 5.3211 x 11.5081 | 61,150 | x1 | 408.1 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-011` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-011.webp` | room-shell (dimension-heuristic) | 11.7937 x 5.1607 x 11.6808 | 60,266 | x1 | 413.2 KB | within common (2048 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-012` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-012.webp` | room-shell (dimension-heuristic) | 10.7956 x 5.2084 x 11.5963 | 47,919 | x1 | 425.7 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-013` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-013.webp` | room-shell (dimension-heuristic) | 11.7254 x 5.1008 x 11.6657 | 44,291 | x1 | 421.1 KB | within simple (1024 KB) | needs-review | approve-as-component |
| `candidate.room-shell.the-great-drawing-room-c197-014` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.the-great-drawing-room-c197-014.webp` | room-shell (dimension-heuristic) | 11.3364 x 5.0406 x 11.4926 | 36,997 | x1 | 388.2 KB | within simple (1024 KB) | needs-review | approve-as-component |

### From `source.urban-interior-moody-vr-room-baked-source-untitled`

| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| `candidate.room-shell.urban-interior-moody-vr-room-bak-a5e1-000` | `assets/presence-spatial/candidates/thumbnails/candidate.room-shell.urban-interior-moody-vr-room-bak-a5e1-000.webp` | room-shell (dimension-heuristic) | 53.7249 x 12.2922 x 12.4029 | 6,518 | x1 | 57.3 KB | within simple (1024 KB) | needs-review | needs-manual-cleanup |

## How to record a decision

1. Open the thumbnail listed for the candidate. Blender is only needed for rows recommending `needs-manual-cleanup`.
2. Edit the candidate's entry in the registry JSON, setting `status` to `human-approved-component`, `human-approved-roomkit` or `human-rejected`.
3. Licence clearance is a separate human act: set `license.status` only after checking the declared licence against its source, and record where that check happened.
4. Art-direction sign-off is recorded on `quality`; the pipeline will never set `visuallyApproved` to true.
5. Promotion into the admitted Presence component registry goes through `promoteCandidateToComponent`, which refuses unreviewed, over-budget, unscaled or unexported candidates.

Re-running the pipeline regenerates `assets/presence-spatial/candidates/manifests/CANDIDATE_REVIEW.md` from the registry, so record decisions in the registry rather than in this file.
