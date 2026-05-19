# Presence Customisation Manifest v1

Presence Customisation Manifest v1 is the backend contract that lets the
frontend show visual, human-readable room/world/style choices before a user
submits a Presence setup request.

It replaces vague free-text choice handling with stable IDs for:

- archetypes
- room worlds
- engagement dynamics
- motion profiles
- object skin packs
- atmosphere packs

The manifest is public, read-only, versioned, and safe for frontend rendering.
Setup requests persist both the selected IDs and an immutable snapshot of the
resolved choices used at submission time.

## Schema

Manifest schema version:

`presence-customisation-manifest-v1`

RoomGraph schema version:

`presence-roomgraph-v1`

Snapshot schema version:

`presence-customisation-snapshot-v1`

Preview seed schema version:

`presence-roomgraph-preview-seed-v1`

## Endpoints

### `GET /api/presence/customisation/manifest`

Returns the complete manifest:

```json
{
  "ok": true,
  "data": {
    "schema_version": "presence-customisation-manifest-v1",
    "roomgraph_schema_version": "presence-roomgraph-v1",
    "archetypes": [],
    "room_worlds": [],
    "engagement_dynamics": [],
    "motion_profiles": [],
    "object_skin_packs": [],
    "atmosphere_packs": []
  }
}
```

### `GET /api/presence/customisation/archetypes`

Returns archetype options only.

### `GET /api/presence/customisation/room-worlds`

Returns room world options only.

### `GET /api/presence/customisation/recommendations?archetype=artist`

Returns recommended combinations for an archetype.

### `POST /api/presence/customisation/preview-seed`

Accepts selected IDs and returns a safe preview seed without persistence.

```json
{
  "archetype": "maker",
  "room_world": "rooms-material-carpenter",
  "engagement_dynamic": "chamber_walk",
  "motion_profile": "calm",
  "object_skin_pack": "material_studio_pack",
  "atmosphere_pack": "warm_material"
}
```

Unsupported combinations return structured `422 validation_error` with
correction hints.

## Manifest Options

### Archetypes

Supported archetype IDs:

- `artist`
- `dj`
- `maker`
- `practitioner`
- `consultant`
- `organisation`
- `local_business`

Each archetype includes:

- `id`
- `label`
- `description`
- `recommended_room_worlds`
- `default_room_world`
- `compatible_engagement_dynamics`
- `compatible_object_skin_packs`
- `compatible_atmosphere_packs`
- `minimum_required_intake_fields`
- `optional_recommended_fields`

### Room Worlds

Current strong room worlds:

- `rooms-gallery-painter`
- `rooms-underground-dj`
- `rooms-material-carpenter`

Each room world includes:

- `id`
- `label`
- `description`
- `best_for`
- `compatible_archetypes`
- `default_chambers`
- `preview_chamber_id`
- `supported_object_kinds`
- `supported_skin_packs`
- `compatible_motion_profiles`
- `default_*` selections
- `thumbnail` placeholder metadata
- `preview_metadata`
- `schema_version`

### Engagement Dynamics

Supported dynamics:

- `chamber_walk`
- `orbit_constellation`
- `object_tableau`
- `portal_cascade`

Each dynamic includes:

- `id`
- `label`
- `description`
- `recommended_archetypes`
- `compatible_room_worlds`
- `motion_intensity`
- `accessibility_notes`
- `fallback_behaviour`

### Motion Profiles

Supported motion profiles:

- `calm`
- `cinematic`
- `kinetic`
- `minimal`
- `ritual`
- `playful`

Each profile includes a human description, transition duration range,
reduced-motion equivalent, and compatibility notes.

### Object Skin Packs

Supported packs:

- `gallery_frame_pack`
- `signal_tile_pack`
- `material_studio_pack`

### Atmosphere Packs

Supported packs:

- `quiet_gallery`
- `nocturnal_signal`
- `warm_material`

## Setup Request Persistence

Public setup intake remains:

- `POST /api/presence/setup-requests`
- `POST /api/presence/beta/applications` as the existing alias

These routes do not require owner authentication and never publish a Presence.

Persisted customisation fields:

- `archetype`
- `room_world`
- `engagement_dynamic`
- `motion_profile`
- `object_skin_pack`
- `atmosphere_pack`
- `customisation_manifest_version`
- `customisation_snapshot`

The snapshot records:

- manifest version
- selected input IDs
- resolved backend IDs
- defaults applied with reasons
- RoomGraph schema version

This preserves exactly what the user selected at submission time, even if a
future manifest changes defaults or labels.

## Compatibility Rules

The backend validates:

- archetype exists
- selected room world exists
- room world supports the archetype
- engagement dynamic supports the room world
- motion profile is supported by the room world
- object skin pack supports the room world
- atmosphere pack supports the room world

Missing optional fields receive safe defaults and the defaults are recorded in
`customisation_snapshot.defaults_applied`.

Unsupported combinations return:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Unsupported customisation combination.",
    "details": {
      "schema_version": "presence-customisation-manifest-v1",
      "errors": [
        {
          "field": "room_world",
          "value": "rooms-underground-dj",
          "allowed": ["rooms-material-carpenter"],
          "hint": "Underground DJ is not compatible with Local Business."
        }
      ],
      "correction_hints": [
        "Underground DJ is not compatible with Local Business."
      ]
    }
  }
}
```

The backend must not silently replace an explicit incompatible selection.

## Preview Lifecycle

Setup request lifecycle states:

- `submitted`
- `reviewing`
- `needs_assets`
- `preview_ready`
- `approved`
- `published`
- `archived`

Presence state separation:

- setup request: stored intake record, no public Presence
- preview Presence: generated from stored customisation snapshot
- published Presence: explicitly published through owner/control paths

Preview seed generation uses `customisation_snapshot` first. Old setup requests
without customisation receive safe defaults:

- `local_business`
- `rooms-material-carpenter`
- `chamber_walk`
- `calm`
- `material_studio_pack`
- `warm_material`

Unsupported legacy snapshots should be marked for review rather than used to
publish a misleading preview.

## Frontend Consumption

Recommended flow:

1. Fetch `GET /api/presence/customisation/manifest` once.
2. Render visual cards from stable IDs and preview metadata.
3. Use recommendations endpoint to preselect sensible defaults after archetype
   choice.
4. Submit stable IDs to setup intake.
5. Display structured 422 correction hints when a combination is unsupported.

The frontend should not infer compatibility from display labels. IDs and
compatibility arrays are the contract.

## Migration

Migration:

`flora-fauna/backend/migrations/versions/20260520_presence_customisation_manifest_v1.sql`

It additively extends `presence_beta_application` with stable customisation IDs
and `customisation_snapshot`. Existing setup requests remain valid and receive
defaults when converted to preview seeds.

## Known Limitations

- The manifest currently includes the three strong RoomGraph worlds only.
- Preview seed generation is deterministic and safe, but does not yet create a
  persisted preview Presence automatically.
- Operator review UI for setup request lifecycle transitions remains a future
  admin pass.
