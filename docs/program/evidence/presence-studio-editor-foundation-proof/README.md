# Presence Studio Editor Foundation Proof

Date: 2026-05-23

## Summary

This pass adds the backend/data foundation for a versioned, owner-only Presence
Studio editor. It does not complete the visual Studio UI.

The new contract lets a Room owner create and update a draft editable config,
preview that draft in an authenticated owner context, publish it to the public
Room API, inspect history, and roll back to a previous published version.

## Data Model/API Changes

Added model/table:

- `PresenceEditableConfig`
- Migration: `20260523_presence_editable_config.sql`

Important fields:

- `room_id`
- `version`
- `status`: `draft`, `published`, `archived`
- `renderer_key`
- `scene_config`
- `style_dna`
- `motion_config`
- `asset_config`
- `content_config`
- `roomkey_config`
- `enquiry_config`
- `locked_fields`
- creator/updater/publisher user IDs and timestamps

Added owner endpoints:

- `GET /api/presence/owner/rooms/<room_id>/editor`
- `GET /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/draft`
- `PATCH /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/preview`
- `POST /api/presence/owner/rooms/<room_id>/editor/publish`
- `POST /api/presence/owner/rooms/<room_id>/editor/rollback`
- `GET /api/presence/owner/rooms/<room_id>/editor/history`
- `GET /api/presence/owner/rooms/<room_id>/assets`
- `POST /api/presence/owner/rooms/<room_id>/assets/attach`

Updated public serialization:

- `/api/presence/public/<slug>` now includes only the active published
  `editable_config`.
- RoomKey resolution payload now includes the same active published
  `editable_config`.

## GGM Editable Config Mapping

Created:

- `GGM_CONFIG_MAPPING.md`
- `ggm_editable_config.example.json`

The mapping covers:

- Artwork Field
- Work Wall
- Practice Studio
- Calling Card
- Palette/style DNA
- Typography tokens and safe font policy
- Liquid/dither/film/motion settings
- RoomKey/NFC presentation
- Public assets and alt text
- Locked renderer-shell reasons

## Owner-Only Permission Result

Owner APIs remain behind `alpha_jwt_required`.

Authorization:

- Room owner can read and mutate editor config.
- Public/anonymous requests are denied.
- Non-owner users are denied.
- Existing `platform_admin` support access still works through the current
  owner-room policy and writes `ControlAuditEvent` records for editor support
  access.

## Public Redaction Result

Public responses include published safe config only.

Public responses do not include:

- Draft config
- Owner/operator email values
- `platform_admin`
- `internal_lifetime_free`
- local filesystem paths
- raw secrets or tokens
- audit metadata
- auth subjects
- unpublished/private assets

## Preview/Publish/Rollback Result

Supported:

- One active draft per Room, enforced in service and migration partial index.
- One active published config per Room, enforced in service and migration
  partial index.
- Preview returns a public-shaped draft config plus short-lived owner preview
  context token; it does not overwrite published config.
- Publish archives the previous published config and promotes draft.
- Rollback clones a previous published/archived version into a new published
  version, preserving history.

## Asset Handling Result

Supported:

- Existing node/work/collection assets are listed for the owner Studio.
- New public assets can be attached to draft config slots.
- Asset URLs must be public `http(s)` URLs or safe public relative paths.
- Local filesystem paths, `file:`, `data:`, localhost/internal hosts, and
  script-like URLs are rejected.

## Tests Run

Command:

```powershell
python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_dna_persistence.py tests\test_presence_pass_paths.py -q
```

Result:

- `16 passed`
- Warnings: existing SQLAlchemy `Query.get()` deprecation warnings and a
  `.pytest_cache` permission warning.

Additional checks:

```powershell
python -m json.tool docs\program\evidence\presence-studio-editor-foundation-proof\ggm_editable_config.example.json
python -m compileall -q app\services\presence_editor_config.py app\api\presence_graph.py app\services\presence_service.py app\services\presence_pass_service.py app\models.py
```

Both passed.

## Known Limitations

- This does not build the Studio editor UI.
- The GGM frontend renderer still needs to read `node.editable_config` and
  apply these config sections instead of only using hard-coded fallback
  constants.
- The example GGM config was created as a contract artifact and test payload;
  no hosted production database seeding was run in this local pass.
- The preview token is currently an owner-context token returned by the
  authenticated preview endpoint. There is no public draft preview endpoint,
  by design.
- Migration was added as SQL; it was not applied to hosted infrastructure in
  this pass.

## Claude Frontend Handoff Prompt

You are Claude working on the Presence Studio frontend/editor. Do not redesign
the public GGM Room. Build the owner-only Studio UI on top of the new backend
contract.

Use these endpoints:

- `GET /api/presence/owner/rooms/<room_id>/editor`
- `GET /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/draft`
- `PATCH /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/preview`
- `POST /api/presence/owner/rooms/<room_id>/editor/publish`
- `POST /api/presence/owner/rooms/<room_id>/editor/rollback`
- `GET /api/presence/owner/rooms/<room_id>/editor/history`
- `GET /api/presence/owner/rooms/<room_id>/assets`
- `POST /api/presence/owner/rooms/<room_id>/assets/attach`

Use `docs/program/evidence/presence-studio-editor-foundation-proof/GGM_CONFIG_MAPPING.md`
and `ggm_editable_config.example.json` as the editor schema reference.

Build an owner-only Studio editor for Presence Rooms with tabs/sections for:
Scenes, Work Wall, Practice/About, Calling Card, Style DNA, Motion/Texture,
RoomKey, Assets, Preview/Publish, and History/Rollback.

Important constraints:

- Never expose draft config to public visitors.
- Never show private owner/operator emails in public config.
- Never expose `platform_admin`, `internal_lifetime_free`, auth subjects, audit
  metadata, local filesystem paths, or raw secrets.
- Treat `locked_fields` as visible editor affordances with reasons, not editable
  inputs.
- Preview must call the authenticated owner preview endpoint and clearly mark
  draft preview state.
- Publish must be an explicit owner action.
- Rollback must show version history and create a new published version from
  the selected prior version.
- Public GGM renderer should prefer `node.editable_config` when present and
  fall back to current GGM constants only for missing fields.

Do not claim the Studio editor is complete until the UI reads/writes all core
config sections and the GGM renderer consumes the published config.
