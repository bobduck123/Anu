# Presence spatial source inspection

Batch: `initial-presence-ingestion`  
Generated: 2026-08-17T00:00:00.000Z  
Source root: `C:\Dev\presence pieces` (read-only; never modified by this pipeline)  
Files inspected: 8  
Total source bytes: 463.0 MB

Every row below describes **source material only**. No entry here is a Presence runtime asset.

## Overview

| Source | Size | Nodes | Separable | Meshes | Materials | Images | Triangles | Texture | Geometry | Classifications |
|---|---|---|---|---|---|---|---|---|---|---|
| `brutalist-interior-vr-room-baked/source/Untitled.glb` | 40.8 MB | 3 | 3 | 3 | 3 | 4 | 11,244 | 40.2 MB | 0.6 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |
| `coffee+shop+GLD/coffee shop.glb` | 99.9 MB | 850 | 662 | 97 | 70 | 43 | 20,318,672 | 43.0 MB | 56.5 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, geometry-heavy-source, needs-license-review |
| `interior_7.glb` | 31.2 MB | 113 | 51 | 57 | 24 | 32 | 107,554 | 24.3 MB | 6.9 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |
| `living_room_interior_free.glb` | 17.0 MB | 44 | 20 | 19 | 12 | 16 | 23,230 | 14.7 MB | 2.3 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |
| `old_church_modeling_-_interior_scene.glb` | 138.0 MB | 80 | 36 | 41 | 33 | 32 | 574,640 | 108.6 MB | 29.4 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |
| `star_wars_the_clone_wars_venator_prefab.glb` | 44.9 MB | 320 | 158 | 158 | 4 | 13 | 294,322 | 28.6 MB | 16.2 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |
| `the_great_drawing_room.glb` | 68.1 MB | 17 | 15 | 15 | 1 | 1 | 999,999 | 26.9 MB | 41.3 MB | multi-object-source, complete-interior-source, candidate-roomkit-source, geometry-heavy-source, needs-license-review |
| `urban-interior-moody-vr-room-baked/source/Untitled.glb` | 22.9 MB | 1 | 1 | 1 | 1 | 1 | 6,518 | 22.5 MB | 0.4 MB | single-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review |

## Untitled.glb

- Source asset id: `source.brutalist-interior-vr-room-baked-source-untitled`
- Path: `brutalist-interior-vr-room-baked/source/Untitled.glb`
- Format: glb (glTF 2.0), 40.8 MB
- Content hash: `e0143432c9e0e429...`
- Nodes: 3 (scene roots 3, separable objects 3)
- Meshes 3, primitives 3, materials 3, textures 5, images 4
- Animations 0, cameras 0, lights 0
- Triangles: 11,244
- Byte split: textures 40.2 MB, geometry 0.6 MB, other 0.0 MB
- Bounds (w x h x d): 10.7 x 4.223 x 6.7854
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: source path names a space: interior, room; wide footprint (10.7 units across); room-scale height (4.223 units); 3 materials
- Scale check required: no

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: unknown
- Declared title: none
- Declared author: none
- Declared licence: none
- Declared copyright: none
- Generator: Khronos glTF Blender I/O v4.4.56
- Evidence: asset.generator present in the glTF header

**Warnings:**

- `no-license-metadata`: No embedded, sidecar or filename licence signal was found.
- `over-source-budget`: Source file is 40.8 MB. It is source material only and must not be treated as a Presence runtime asset.
- `huge-texture-payload`: Embedded textures account for 40.2 MB; textured exports require resizing and recompression.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Cube` | 1 | 11,240 | 10.6961 x 4.223 x 6.7854 | Material |
| `Plane` | 1 | 2 | 2 x 0 x 2 | concrete_pavement |
| `Plane.001` | 1 | 2 | 10.7 x 0 x 5.24 | Material.001 |

## coffee shop.glb

- Source asset id: `source.coffee-shop-gld-coffee-shop`
- Path: `coffee+shop+GLD/coffee shop.glb`
- Format: glb (glTF 2.0), 99.9 MB
- Content hash: `379677c8dd2f3a63...`
- Nodes: 850 (scene roots 662, separable objects 662)
- Meshes 97, primitives 1447, materials 70, textures 53, images 43
- Animations 2, cameras 0, lights 0
- Triangles: 20,318,672
- Byte split: textures 43.0 MB, geometry 56.5 MB, other 0.0 MB
- Bounds (w x h x d): 20.9151 x 5.2193 x 11.938
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, geometry-heavy-source, needs-license-review
- Interior signals: source path names a space: shop; 97 meshes suggest an arranged scene; 845 mesh-bearing nodes across the scene; wide footprint (20.9151 units across); room-scale height (5.2193 units); 70 materials; architectural naming: wall, ceiling
- Scale check required: no

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: unknown
- Declared title: none
- Declared author: none
- Declared licence: none
- Declared copyright: none
- Generator: Khronos glTF Blender I/O v4.2.60
- Evidence: asset.generator present in the glTF header

**Warnings:**

- `animations-present`: 2 animation(s) present; shape-only exports strip them.
- `no-license-metadata`: No embedded, sidecar or filename licence signal was found.
- `over-source-budget`: Source file is 99.9 MB. It is source material only and must not be treated as a Presence runtime asset.
- `huge-texture-payload`: Embedded textures account for 43.0 MB; textured exports require resizing and recompression.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Empty` | 6 | 606,980 | 0.6347 x 0.6325 x 1.4059 | MAML_int_Plastic_Black_Flaky,  coffee bean, Carpaint Gloss Medium Grey |
| `Bovenkap` | 46 | 437,207 | 0.9489 x 1.1498 x 0.9516 | B.001, Procedural Glass Eevee, car_metallic_paint_04 |
| `Sofa` | 17 | 320,136 | 3.4097 x 1.2853 x 2.5933 | pu_leather_01, pu_leather_01.001, car_metallic_paint_01 |
| `Sofa.001` | 17 | 320,136 | 3.4098 x 1.2428 x 2.5933 | pu_leather_01, pu_leather_01.001, car_metallic_paint_01 |
| `Sofa.002` | 17 | 320,136 | 3.4098 x 1.2428 x 2.5933 | pu_leather_01, pu_leather_01.001, car_metallic_paint_01 |
| `Coffee_vending_machine_Station` | 18 | 115,481 | 0.7983 x 2.35 x 1.29 | B, vray_Trash_Logo, light.001 |
| `Plane.008` | 1 | 104,704 | 3.2236 x 1.6123 x 7.6947 | Carpaint Metallic Pure White, car_metallic_paint_04 |
| `Pottery.007` | 5 | 80,734 | 0.3403 x 0.6647 x 0.3277 | white.006, paper.001, paper-2.002 |
| `Pottery.008` | 5 | 80,734 | 0.3403 x 0.6647 x 0.3277 | white.006, paper.001, paper-2.002 |
| `Pottery.009` | 5 | 80,734 | 0.3403 x 0.6647 x 0.3277 | white.006, paper.001, paper-2.002 |
| `Pottery.010` | 5 | 80,734 | 0.3403 x 0.6647 x 0.3277 | white.006, paper.001, paper-2.002 |
| `Layer_001.001` | 1 | 69,526 | 0.0103 x 1.3341 x 1.228 | car_metallic_paint_01 |

## interior_7.glb

- Source asset id: `source.interior-7`
- Path: `interior_7.glb`
- Format: glb (glTF 2.0), 31.2 MB
- Content hash: `fadd4ce702d53bb5...`
- Nodes: 113 (scene roots 1, separable objects 51)
- Descended wrapper nodes: `Sketchfab_model` -> `5c423686e87f4aeea9775e0ade3cc1e3.fbx` -> `RootNode`
- Meshes 57, primitives 57, materials 24, textures 32, images 32
- Animations 0, cameras 0, lights 0
- Triangles: 107,554
- Byte split: textures 24.3 MB, geometry 6.9 MB, other 0.0 MB
- Bounds (w x h x d): 26.3202 x 10.9457 x 26.0336
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: source path names a space: interior; 57 meshes suggest an arranged scene; 57 mesh-bearing nodes across the scene; wide footprint (26.3202 units across); room-scale height (10.9457 units); 24 materials
- Scale check required: no

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: embedded
- Declared title: interior (7)
- Declared author: dasy444 (https://sketchfab.com/dasy444)
- Declared licence: SKETCHFAB Standard (https://sketchfab.com/licenses)
- Declared copyright: none
- Generator: Sketchfab-17.15.0
- Evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata

**Warnings:**

- `huge-texture-payload`: Embedded textures account for 24.3 MB; textured exports require resizing and recompression.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `node_0.007` | 1 | 50,000 | 0.4114 x 0.857 x 0.4265 | Material.019 |
| `Cube.019` | 2 | 23,517 | 8.7815 x 9.324 x 8.6259 | Material.028, material |
| `Cube.009` | 2 | 5,076 | 7.989 x 5.0722 x 3.3377 | Material.028, 56ef4e30bfca8ac25300c77d7c17d7bc |
| `Cube.022` | 2 | 5,076 | 7.989 x 5.0721 x 3.3377 | Material.028, 56ef4e30bfca8ac25300c77d7c17d7bc |
| `Cube.021` | 2 | 2,844 | 4.4232 x 5.2445 x 5.8188 | Material.028, da2642e543a3f06231cecae91a2562d4 |
| `node_0.008` | 1 | 2,840 | 1.3807 x 0.36 x 1.3072 | Material.025 |
| `node_0` | 1 | 2,358 | 0.6191 x 0.3314 x 1.0299 | Material.008 |
| `node_0.006` | 1 | 2,358 | 0.9864 x 0.3314 x 0.4862 | Material.008 |
| `Cube` | 2 | 1,952 | 0.1549 x 3.4623 x 8.9859 | Material.002, Material.003 |
| `node_0.001` | 1 | 1,900 | 0.3702 x 0.4094 x 0.2976 | Material.010 |
| `node_0.003` | 1 | 1,824 | 0.3848 x 0.323 x 0.3843 | Material.017 |
| `node_0.002` | 1 | 1,752 | 0.9591 x 0.3517 x 0.4411 | Material.014 |

## living_room_interior_free.glb

- Source asset id: `source.living-room-interior-free`
- Path: `living_room_interior_free.glb`
- Format: glb (glTF 2.0), 17.0 MB
- Content hash: `23cf9de143a2d9d3...`
- Nodes: 44 (scene roots 1, separable objects 20)
- Descended wrapper nodes: `Sketchfab_model` -> `3ce6ca67227f4cf0809b60b0c8d0183f.fbx` -> `RootNode`
- Meshes 19, primitives 19, materials 12, textures 16, images 16
- Animations 0, cameras 0, lights 0
- Triangles: 23,230
- Byte split: textures 14.7 MB, geometry 2.3 MB, other 0.0 MB
- Bounds (w x h x d): 37.8143 x 25.1166 x 55.7247
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: source path names a space: interior, room; 19 meshes suggest an arranged scene; 19 mesh-bearing nodes across the scene; wide footprint (55.7247 units across); room-scale height (25.1166 units); 12 materials
- Scale check required: yes - Measured height 25.1166 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1274 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: embedded
- Declared title: living room interior FREE
- Declared author: dasy444 (https://sketchfab.com/dasy444)
- Declared licence: SKETCHFAB Standard (https://sketchfab.com/licenses)
- Declared copyright: none
- Generator: Sketchfab-17.15.0
- Evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata

**Warnings:**

- `scale-check-required`: Measured height 25.1166 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1274 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `material.001` | 1 | 9,498 | 20.4511 x 13.713 x 24.0142 | Material.009 |
| `material.002` | 1 | 4,486 | 24.2616 x 6.7167 x 16.2946 | Material.011 |
| `material` | 1 | 3,916 | 28.0464 x 4.0058 x 16.8482 | Material.004 |
| `material.003` | 1 | 3,806 | 24.0685 x 21.7773 x 49.0617 | Material.012 |
| `Cylinder` | 1 | 508 | 0.9888 x 4.0784 x 35.5521 | Material.010 |
| `Cylinder.004` | 1 | 508 | 0.9888 x 4.0783 x 35.5521 | Material.010 |
| `Cylinder.001` | 1 | 94 | 15.4726 x 0.7586 x 0.7587 | Material.010 |
| `Cylinder.002` | 1 | 94 | 12.7798 x 0.7586 x 0.7587 | Material.010 |
| `Cylinder.003` | 1 | 94 | 12.7798 x 0.7586 x 0.7587 | Material.010 |
| `Cube` | 1 | 76 | 21.6096 x 18.7427 x 3.1656 | Material.003 |
| `Cube.003` | 1 | 64 | 12.5074 x 17.788 x 4.5184 | Material.002 |
| `Cube.002` | 1 | 28 | 28.5401 x 5.3269 x 20.729 | Material.008 |

## old_church_modeling_-_interior_scene.glb

- Source asset id: `source.old-church-modeling-interior-scene`
- Path: `old_church_modeling_-_interior_scene.glb`
- Format: glb (glTF 2.0), 138.0 MB
- Content hash: `47f8cead13b773aa...`
- Nodes: 80 (scene roots 1, separable objects 36)
- Descended wrapper nodes: `Sketchfab_model` -> `Root`
- Meshes 41, primitives 41, materials 33, textures 32, images 32
- Animations 0, cameras 0, lights 0
- Triangles: 574,640
- Byte split: textures 108.6 MB, geometry 29.4 MB, other 0.0 MB
- Bounds (w x h x d): 40.418 x 21.445 x 23.3469
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: source path names a space: interior, scene, church; 41 meshes suggest an arranged scene; 41 mesh-bearing nodes across the scene; wide footprint (40.418 units across); room-scale height (21.445 units); 33 materials; architectural naming: window, door, arch
- Scale check required: yes - Measured height 21.445 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1492 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: embedded
- Declared title: Old church modeling - Interior Scene
- Declared author: Aurélien Martel (https://sketchfab.com/aurelien_martel)
- Declared licence: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- Declared copyright: none
- Generator: Sketchfab-12.68.0
- Evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata

**Warnings:**

- `over-source-budget`: Source file is 138.0 MB. It is source material only and must not be treated as a Presence runtime asset.
- `huge-texture-payload`: Embedded textures account for 108.6 MB; textured exports require resizing and recompression.
- `scale-check-required`: Measured height 21.445 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.1492 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Plane.001` | 3 | 136,894 | 9.8893 x 0.7556 x 9.3747 | banc |
| `Circle.020` | 2 | 124,008 | 38.4447 x 3.8382 x 22.9287 | colonne-ext |
| `Cylinder.004` | 2 | 94,550 | 33.6731 x 13.6967 x 12.6064 | colonne |
| `Circle.055` | 1 | 43,104 | 37.433 x 15.1418 x 21.8116 | arche.002 |
| `chain.005` | 1 | 38,784 | 0.059 x 3.9088 x 0.0516 | chain |
| `chain.004` | 1 | 38,784 | 0.059 x 3.9088 x 0.0516 | chain |
| `Circle.016` | 2 | 37,306 | 23.1953 x 18.3784 x 2.158 | pied-autel, material |
| `Cylinder.002` | 1 | 15,654 | 34.3547 x 1.9585 x 13.1074 | pied-colonne |
| `Circle.000` | 1 | 13,090 | 32.3933 x 5.2263 x 12.1456 | arche.001 |
| `Circle.050` | 1 | 7,304 | 37.2883 x 6.8679 x 22.6338 | mur-bas-ext |
| `Circle.019` | 1 | 5,896 | 36.8711 x 15.1849 x 21.3612 | arche |
| `TexturesCom_PersianCarpets0012_1_alphamasked_S` | 1 | 3,872 | 1.2266 x 0.4921 x 2.7801 | drap |

## star_wars_the_clone_wars_venator_prefab.glb

- Source asset id: `source.star-wars-the-clone-wars-venator-prefab`
- Path: `star_wars_the_clone_wars_venator_prefab.glb`
- Format: glb (glTF 2.0), 44.9 MB
- Content hash: `8d0beb24b8854a1c...`
- Nodes: 320 (scene roots 1, separable objects 158)
- Descended wrapper nodes: `Sketchfab_model` -> `PreviewSet.fbx` -> `RootNode` -> `VenatorPrefabSet`
- Meshes 158, primitives 158, materials 4, textures 13, images 13
- Animations 0, cameras 0, lights 0
- Triangles: 294,322
- Byte split: textures 28.6 MB, geometry 16.2 MB, other 0.0 MB
- Bounds (w x h x d): 31.1588 x 2.7531 x 15.7478
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: 158 meshes suggest an arranged scene; 158 mesh-bearing nodes across the scene; wide footprint (31.1588 units across); room-scale height (2.7531 units); 4 materials; architectural naming: floor, wall, door
- Scale check required: no

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: embedded
- Declared title: Star Wars: The Clone Wars: Venator Prefab
- Declared author: ShineyFX (https://sketchfab.com/ShineyFX)
- Declared licence: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- Declared copyright: none
- Generator: Sketchfab-16.59.0
- Evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata

**Warnings:**

- `over-source-budget`: Source file is 44.9 MB. It is source material only and must not be treated as a Presence runtime asset.
- `huge-texture-payload`: Embedded textures account for 28.6 MB; textured exports require resizing and recompression.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Small_DoorFrame3` | 1 | 9,898 | 0.2747 x 2.5801 x 2.2814 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame2` | 1 | 9,898 | 0.2747 x 2.5801 x 2.2814 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame1` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame4` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame5` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame6` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `Small_DoorFrame7` | 1 | 9,898 | 2.2814 x 2.5801 x 0.2748 | VenatorV3_SmallDoor_WallLight |
| `VenatorLights9` | 1 | 8,730 | 0.0209 x 2.5829 x 0.765 | VenatorV3_SmallDoor_WallLight |
| `VenatorLights7` | 1 | 8,730 | 0.0209 x 2.5829 x 0.765 | VenatorV3_SmallDoor_WallLight |
| `VenatorLights11` | 1 | 8,730 | 0.765 x 2.5829 x 0.0208 | VenatorV3_SmallDoor_WallLight |
| `VenatorLights13` | 1 | 8,730 | 0.765 x 2.5829 x 0.0208 | VenatorV3_SmallDoor_WallLight |

## the_great_drawing_room.glb

- Source asset id: `source.the-great-drawing-room`
- Path: `the_great_drawing_room.glb`
- Format: glb (glTF 2.0), 68.1 MB
- Content hash: `12da174cbd5a1d3f...`
- Nodes: 17 (scene roots 1, separable objects 15)
- Descended wrapper nodes: `Sketchfab_model` -> `model.obj.cleaner.materialmerger.gles`
- Meshes 15, primitives 15, materials 1, textures 1, images 1
- Animations 0, cameras 0, lights 0
- Triangles: 999,999
- Byte split: textures 26.9 MB, geometry 41.3 MB, other 0.0 MB
- Bounds (w x h x d): 14.2918 x 5.7097 x 13.9941
- Single object: no | multi-object: yes | complete interior: yes
- Separable nodes: yes | loose-part split useful: no
- Classifications: multi-object-source, complete-interior-source, candidate-roomkit-source, geometry-heavy-source, needs-license-review
- Interior signals: source path names a space: room; 15 meshes suggest an arranged scene; 15 mesh-bearing nodes across the scene; wide footprint (14.2918 units across); room-scale height (5.7097 units)
- Scale check required: no

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: embedded
- Declared title: The Great Drawing Room
- Declared author: The Hallwyl Museum (Hallwylska museet) (https://sketchfab.com/TheHallwylMuseum)
- Declared licence: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- Declared copyright: none
- Generator: Sketchfab-16.12.0
- Evidence: asset.generator present in the glTF header; author/creator recorded in embedded metadata; title recorded in embedded metadata; licence string recorded in embedded metadata

**Warnings:**

- `over-source-budget`: Source file is 68.1 MB. It is source material only and must not be treated as a Presence runtime asset.
- `huge-texture-payload`: Embedded textures account for 26.9 MB; textured exports require resizing and recompression.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Object_3` | 1 | 92,556 | 12.4428 x 5.4063 x 11.4788 | model_Material_u1_v1 |
| `Object_4` | 1 | 87,630 | 12.2287 x 5.2576 x 11.4353 | model_Material_u1_v1 |
| `Object_2` | 1 | 87,429 | 14.2918 x 5.7097 x 13.9941 | model_Material_u1_v1 |
| `Object_5` | 1 | 77,280 | 12.2567 x 5.0363 x 11.2056 | model_Material_u1_v1 |
| `Object_6` | 1 | 75,156 | 11.7516 x 5.3246 x 11.655 | model_Material_u1_v1 |
| `Object_7` | 1 | 72,621 | 12.1848 x 5.4334 x 11.6037 | model_Material_u1_v1 |
| `Object_9` | 1 | 68,547 | 11.864 x 5.0429 x 11.4751 | model_Material_u1_v1 |
| `Object_8` | 1 | 65,066 | 12.6467 x 5.2044 x 11.7186 | model_Material_u1_v1 |
| `Object_12` | 1 | 61,674 | 10.3894 x 5.5905 x 11.0258 | model_Material_u1_v1 |
| `Object_13` | 1 | 61,417 | 10.3193 x 5.0206 x 11.1346 | model_Material_u1_v1 |
| `Object_10` | 1 | 61,150 | 11.8331 x 5.3211 x 11.5081 | model_Material_u1_v1 |
| `Object_11` | 1 | 60,266 | 11.7937 x 5.1607 x 11.6809 | model_Material_u1_v1 |

## Untitled.glb

- Source asset id: `source.urban-interior-moody-vr-room-baked-source-untitled`
- Path: `urban-interior-moody-vr-room-baked/source/Untitled.glb`
- Format: glb (glTF 2.0), 22.9 MB
- Content hash: `2f513a15b35560a3...`
- Nodes: 1 (scene roots 1, separable objects 1)
- Meshes 1, primitives 1, materials 1, textures 2, images 1
- Animations 0, cameras 0, lights 0
- Triangles: 6,518
- Byte split: textures 22.5 MB, geometry 0.4 MB, other 0.0 MB
- Bounds (w x h x d): 53.725 x 12.2922 x 12.403
- Single object: yes | multi-object: no | complete interior: yes
- Separable nodes: no | loose-part split useful: no
- Classifications: single-object-source, complete-interior-source, candidate-roomkit-source, texture-heavy-source, needs-license-review
- Interior signals: source path names a space: interior, room; wide footprint (53.725 units across); room-scale height (12.2922 units)
- Scale check required: yes - Measured height 12.2922 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.2603 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**

- Signal source: unknown
- Declared title: none
- Declared author: none
- Declared licence: none
- Declared copyright: none
- Generator: Khronos glTF Blender I/O v4.4.56
- Evidence: asset.generator present in the glTF header

**Warnings:**

- `no-license-metadata`: No embedded, sidecar or filename licence signal was found.
- `huge-texture-payload`: Embedded textures account for 22.5 MB; textured exports require resizing and recompression.
- `scale-check-required`: Measured height 12.2922 is outside the plausible 2.2-12 metre interior range. A uniform scale of 0.2603 would give a 3.2 metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.

**Largest separable objects:**

| Node | Mesh nodes | Triangles | Dimensions | Materials |
|---|---|---|---|---|
| `Plane` | 1 | 6,518 | 53.725 x 12.2922 x 12.403 | conc |

