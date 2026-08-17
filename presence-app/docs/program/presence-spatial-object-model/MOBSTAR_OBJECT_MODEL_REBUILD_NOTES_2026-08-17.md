# Mobstar object-model rebuild notes

Date: 2026-08-17
Status: Internal Gate 3 architecture proof
Creative status: Not accepted; Gate 4 remains unchanged

## What was frozen

The standalone Mobstar Three.js work under `C:/Dev/.agent/reference-program/mobstar-shop-rack-prototype-2026-08-15/` remains frozen reference evidence. This pass does not import its candidate-specific product data, cameras, materials, GSAP movement, post-processing, or scene code.

The product owner's current Mobstar visual and interaction direction still matters: a coherent boutique/showroom, a hero garment rack, merchandise surfaces, campaign and archive walls, a secondary zone, subtle branding, and an outward garment-inspection moment with rack context preserved. Procedural geometry in this pass is not a substitute for that art direction.

## What was rebuilt as data

`MOBSTAR_SPATIAL_ROOM_FIXTURE` is a serialisable `SpatialRoomDefinition`. It describes:

| Requirement | Data representation |
|---|---|
| One boutique/gallery room | `presence.room-shell` plus `presence.floor-slab` |
| Hero rack | Floor-mounted `presence.retail-rack` with ordered garment anchors |
| Garments | Two `presence.piece-plane` placements on ordered rack slots |
| Merch/product table | `presence.display-table` with an assigned Piece |
| Campaign wall | `presence.projection-wall` with projection media |
| Poster/archive wall | `presence.wall-panel` with an anchored poster Piece |
| Divider/secondary zone | `presence.divider-wall` |
| Brand treatment | Generated logo media assigned to a wall-hosted Piece |
| Inspection | `inspect` Actions compiled into Three.js and semantic lanes |
| Camera moments | Overview, rack-focus and campaign-focus scene states |
| Mobile/reduced motion | Semantic items and equivalent Action controls |

The layout contains only component, material, skin, media, Action and transform references. Generated placeholders are public-safe in shape but are not real Mobstar candidate assets.

## Why this is data-driven

- The fixture compiles through the same validator and registry as BBB.
- The renderer receives only `SpatialRenderPlan`; it does not import either fixture.
- There are no Mobstar slug, room ID, or fixture-name branches in Three.js geometry creation.
- Geometry is looked up by `componentId@version` and cached by that key.
- Parent anchors resolve rack garments, table Pieces and wall media into world transforms.
- Material, skin and media variation is separate from component geometry.

Inspection is generic. Activating an inspect Action marks a Piece as selected, and the renderer moves that Piece toward the active camera. The rack is not hidden or replaced. This proves the interaction seam, not final garment animation or visual fidelity.

## Operator proof

The default-off internal arranger can:

- create a blank Mobstar shell or load the complete Mobstar fixture;
- add wall, divider, table, rack, plinth and projection-wall components;
- drag or nudge supported floor fixtures on a 0.25 m grid;
- rotate supported fixtures by 15-degree steps;
- assign and reorder media Pieces on table, plinth, rack or projection anchors;
- reject out-of-bounds, collision, capacity and camera-path failures without changing the room;
- save/reload an active browser-local draft generation;
- revert to the previous local generation;
- reset the working copy without deleting saves;
- import/export validated JSON envelopes;
- preview either current or saved compiled data through the visitor-shaped renderer.

This is a rough internal operator tool. It is not a polished client editor, collaboration product, backend draft service, or publish workflow.

## BBB projection-wall extraction

`BBB_PROJECTION_WALL_FIXTURE` uses the same `presence.projection-wall@1.0.0` and `presence.piece-plane@1.0.0` definitions as Mobstar. Public-safe BBB image media is assigned to projection anchors and controlled with generic inspect/previous/next Actions.

This is the intended primitive boundary:

```text
shared projection-wall geometry
  + projection material slot
  + ordered media Piece references
  + sequence Actions
  + semantic fallback
```

BBB is therefore represented as media on a spatial surface, not a heavy 3D model and not a page-gallery section. The existing public BBB canvas gallery remains unchanged.

## Payload result

| Fixture | Layout JSON | Eager assets | Total assets |
|---|---:|---:|---:|
| Mobstar | 11,598 bytes | 44,000 bytes | 250,000 bytes |
| BBB projection wall | 5,236 bytes | 2,512,625 bytes | 5,956,155 bytes |

Both layouts are below 100 KB and both eager loads are below 3 MB. BBB's total media is above a strict few-MB public-room target because its second PNG is large but lazy. Optimise those media assets before proposing public integration.

## Explicit non-claims

This pass does not establish:

- Mobstar creative acceptance or Gate 4 admission;
- final room geometry, lighting, material response, brand treatment, product content or campaign assets;
- arbitrary model upload or GLB loading;
- server persistence, owner collaboration or client self-service;
- publish, rollback-from-published, commerce, payments, multiplayer, avatars or events;
- public or hosted launch readiness.

## Next rebuild steps

1. Run a separate art-direction and primitive-admission review for real component candidates.
2. Normalise approved geometry into versioned, slotted, size-budgeted Presence components.
3. Replace generated fixture media only after provenance, licence and privacy review.
4. Optimise BBB projection media and test reusable projection content in a materially different room.
5. Define aggregate-to-runtime compilation before introducing backend persistence.
6. Propose public integration only through a new work order with route, payload, auth, tenant and rollback evidence.
