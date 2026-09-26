# Presence spatial object-model schema v1

Date: 2026-08-17
Scope: Internal Gate 3 foundation
Canonical implementation: `lib/presence/spatial/`

## Purpose

This document explains the first usable spatial contract and its enforcement points. It is an internal implementation contract, not a public API or backend persistence schema.

## Contract layers

| Layer | Type | Purpose | Runtime validation in this slice |
|---|---|---|---|
| Product hierarchy | `PresenceSpatialAggregate` | Presence -> Space -> Room and associated domain records | No; TypeScript contract and test fixture only |
| Runtime room | `SpatialRoomDefinition` | Serializable room, component placements, assets, media, actions and fallbacks | Yes; exact-key and relationship validation |
| Component library | `SpatialComponentDefinition` | Versioned shared geometry and placement metadata | Yes; every registered component validated |
| Renderer input | `SpatialRenderPlan` | Deterministic, resolved, renderer-neutral plan | Produced only after validation |
| Local draft | `SpatialDraftEnvelope` | Fingerprinted browser-local saved generation | Yes; schema, identity and fingerprint validation |

## Product hierarchy

`PresenceSpatialAggregate` includes the required first-usable entities:

- `Presence`: client identity, slug, status, active/draft Space IDs, timestamps.
- `Space`: tier, sqm capacity, room IDs, default Room, theme and Look.
- `Room`: supported room type, dimensions, structural IDs, lighting/material preset, entry and connection data.
- `Wall`: wall type, transform, dimensions, material, hosting permissions, divider/doorway connection.
- `Surface`: surface type, transform, material, allowed Piece types, anchors and capacity.
- `SpatialObject`: placed component type, transform, material overrides, parent Surface/Wall, placement mode and layer.
- `Piece`: client-owned content metadata and Action IDs.
- `Action`: view, enquiry, playback, booking, donation, room navigation or link intent.
- `Material`: slot and preset with basic PBR values and logical texture refs.
- `CameraAnchor`: position, target, FOV, entry and future host reference.
- `PlacementRule`: allowed rooms, objects, anchors, capacity cost, collision and clearance contract.

Supported first enums are explicit in `model.ts`: eight Room types, seven Wall types, ten Surface types, fourteen object types, twelve Piece types, and eleven Action types. Future event fields are reserved for entry points, gathering/stage zones, capacity, host anchors, room state, guest-presence state, and interaction events. They do not implement live events or multiplayer.

## Runtime room document

`SpatialRoomDefinition` is the data actually saved and rendered:

```ts
interface SpatialRoomDefinition {
  schemaVersion: "presence-spatial-v1";
  id: string;
  label: string;
  fixtureKind: "mobstar-proof" | "bbb-projection-proof" | "generic-proof";
  revision: number;
  seed: string;
  bounds: SpatialDimensions;
  entryStateId: string;
  cameraPath: SpatialCameraPath;
  assets: SpatialAssetRef[];
  skins: SpatialSkinRef[];
  media: SpatialMediaRef[];
  actions: SpatialActionRef[];
  placements: SpatialPlacement[];
  states: SpatialSceneState[];
  semanticFallback: SpatialSemanticItem[];
}
```

The runtime document stores references, not model payloads. Unknown keys, unknown component versions, dangling refs, unsafe locators, unsupported material slots, invalid anchors, over-capacity assignments, boundary failures, collisions, camera-path blocks, and payload overruns are rejected before compilation.

## Placement contract

Every `SpatialPlacement` contains:

```text
id + order
componentId + version
transform { position, rotation, scale }
anchor { kind, parentPlacementId?, anchorId? }
materialSlotOverrides
skinRef? + mediaRef?
actionRefs
visible + semanticLabel
```

The compiler resolves parent, anchor, and child transforms using Three.js-compatible intrinsic XYZ Euler composition. Render code receives world transforms, never fixture-specific placement logic.

### Floor placement

- Floor fixtures use registered floor/free anchor permissions.
- Operator movement snaps x/z to 0.25 m; yaw snaps to 15 degrees.
- Room bounds include rotated/scaled extents.
- Solid fixtures cannot overlap.
- Fixtures marked `blocksCameraPath` cannot cross the declared camera clearance.
- Invalid mutations return the original room unchanged.

### Wall and projection placement

- Hosted Pieces require a registered parent anchor.
- Parent anchor kind and accepted child category must match.
- Wall/projection Pieces inherit the parent's world transform.
- Anchor capacity is enforced.
- The projection wall is shared geometry; gallery media remains a separate media/asset reference.

### Surface and rack placement

- Table and plinth Pieces attach to surface anchors.
- Rack garments attach to ordered `rack-slot-*` anchors; they are not free-positioned.
- Reordering remaps deterministic anchors and local transforms.
- Inspection moves the selected Piece toward the camera while the rack remains present.

Collision is intentionally conservative: each rotated oriented box is converted to a world-axis AABB. This can reject a near-touching rotated arrangement that a full OBB or mesh collision system might permit.

## Component Registry / Asset API contract

Registry identity is `componentId@version`. `SpatialComponentDefinition` owns:

- label, category and dimensions;
- procedural or future asset-backed geometry;
- allowed anchor kinds, collision mode, parent requirement, camera-path behaviour and floor clearance;
- named child anchors, accepted categories and capacity;
- material slots;
- licence, source, attribution and internal-only status;
- compressed/source byte metadata, eager flag and performance tier;
- mobile fallback strategy.

`SpatialComponentCatalogMetadata` adds category, metre/up-axis convention, origin, pivot, asset strategy, and an explicit `rawAssetIncluded: false` marker for the current catalog.

The current in-repo registry acts as the Asset API contract but is not a network service. `GLOBAL_SPATIAL_COMPONENT_CACHE` reuses geometry templates by component key for the browser runtime. Asset-backed definitions currently render a cached bounds placeholder; no GLB loader is present.

The proof catalog currently covers shell, floor, wall, divider, table, plinth, rack, projection surface and Piece plane. The registry structure is intended to expand, after admission review, across walls, dividers, floors, tables, racks, shelves, plinths, frames, projection surfaces, lighting fixtures, product displays, garment displays, audio/listening objects and decorative props. Unimplemented categories are not advertised as available components.

## Asset pipeline

Raw downloaded GLTF/GLB is source material only and must never be referenced directly by a room document. Before later admission, a model must be normalised into a Presence component:

1. Verify licence, source and attribution.
2. Normalize units to metres, y-up, origin and pivot.
3. Remove hidden/unneeded geometry and simplify meshes.
4. Prefer primitive, shape-only GLB, or optimised geometry with named material slots.
5. Use textured geometry only where a hero object's identity requires it.
6. Record dimensions, anchors, slots, runtime bytes, performance tier and mobile fallback.
7. Pass technical validation and separate art-direction admission.

Fixtures reject `.glb`/`.gltf` locators. Public routes must never receive raw assets, base64 models, or inline media blobs.

## Materials, skins and media

The nine curated material styles are white gallery, nocturnal black gallery, soft paper room, industrial concrete, polished charcoal tile, warm timber studio, archive paper, boutique chrome, and projection blackout.

Shared geometry exposes the slots `wall`, `floor`, `tabletop`, `rack-metal`, `fabric`, `paper`, `projection`, `poster-decal`, and `logo-accent`. Skins map slots to curated presets and add bounded colours/decal asset IDs. Media maps an opaque asset ID to an accessible label and safety classification.

This separation is deliberate: a client variation normally changes colours, materials, decals, logos, or media. It does not generate another GLB.

## Compiler and renderer contract

`compileSpatialRoom()` performs strict validation, resolves component definitions, parent transforms, materials, media and Actions, calculates budgets, sorts deterministically, and creates an FNV-1a fingerprint.

`SpatialRenderPlan` includes resolved items, component keys, eager/lazy asset IDs, scene states, semantic fallback and byte budgets. The Three.js renderer and semantic fallback consume this same plan.

Renderer lane selection is:

| Capability | Lane |
|---|---|
| Desktop, motion allowed, WebGL available | Lazy Three.js |
| Width <= 767 px | Semantic/mobile fallback |
| Reduced motion requested | Static semantic fallback |
| WebGL unavailable or runtime context fails | Semantic fallback |

The current Three path supports procedural box, plane, cylinder, rack and projection-field geometry. It uses capped DPR 1.5, no real-time shadows, limited lights, event-driven render frames, safe media locators, generated texture fallback, and explicit disposal.

## Persistence contract

The local envelope schema is `presence-spatial-draft-v1` and includes room identity, fixture revision, compiled fingerprint, timestamp and the full validated room document. Browser keys are scoped to the room ID and keep at most active and previous generations.

Save, load, revert, import and export revalidate the room and fingerprint. Storage mutation rollback is best effort; `localStorage` is not transactional and can be unavailable, full, or cleared by the browser. No server request or publish action is part of this contract.

## Budgets

| Budget | Enforced value |
|---|---:|
| Layout JSON | 102,400 bytes |
| Eager compressed component + room assets | 3,145,728 bytes |
| Internal total compressed assets | 12,582,912 bytes |
| Source bytes recorded per component | less than 35 MB |

The 12 MB total is an internal proof ceiling, not a public performance target. A public room proposal must keep initial transfer under a few MB, cap client media, lazy-load noncritical media, and prove route-level performance.

## Current extension seams

- Add an aggregate validator and aggregate-to-room compiler.
- Replace the local registry with a versioned registry service only under a separate API/security work order.
- Add a reviewed GLB loader, compression and CDN cache policy without changing layout references.
- Add reduced-3D mobile as a lane while preserving semantic parity.
- Add tier/sqm accounting using component cost metadata. The aggregate reserves sqm capacity and room/zone capacities, but this slice does not calculate wall, divider, surface, media, premium-component, private-room or traffic/rendering usage.
- Add server drafts, preview and publish only through approved auth/tenant/publish contracts.
