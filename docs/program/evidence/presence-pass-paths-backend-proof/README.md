# Presence Pass + Paths Backend Proof

Date: 2026-05-20

## Summary

Implemented the additive backend spine for Presence Passes, Room Keys, real-world Encounters, Observer profiles, Room saves/connections, Passport memory, Mood Boards, Field Notes, Signals, deterministic Paths, moderation flags, owner analytics, and World-readiness metrics.

This pass keeps the visual Presence World locked. Public world status returns the forming message only:

> The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist.

Existing public Presence Room routes, QR, vCard, owner routes, and setup-request lifecycle tests remain green.

## Changed Files

- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/api/__init__.py`
- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/app/services/presence_pass_service.py`
- `flora-fauna/backend/app/services/presence_social_service.py`
- `flora-fauna/backend/app/services/presence_path_service.py`
- `flora-fauna/backend/app/services/presence_world_service.py`
- `flora-fauna/backend/tests/test_presence_pass_paths.py`
- `flora-fauna/backend/migrations/versions/20260520_presence_pass_paths_backend.sql`
- `docs/program/evidence/presence-pass-paths-backend-proof/README.md`

## Migration Added

`20260520_presence_pass_paths_backend.sql`

Additive tables:

- `presence_pass`
- `room_key`
- `encounter`
- `observer_profile`
- `room_connection`
- `passport_stamp`
- `mood_board`
- `mood_board_item`
- `field_note`
- `signal`
- `path`
- `path_waypoint`
- `path_choice`
- `path_walk`
- `path_trace`
- `moderation_flag`
- `world_readiness_metric`

Indexes and uniqueness constraints cover public tokens, aliases, observer-room connections, signal uniqueness, room/observer/date access paths, and moderation/world-readiness lookup paths.

## Endpoints Added

Public / guest:

- `GET /api/presence/keys/<public_token>/resolve`
- `POST /api/presence/rooms/<room_id>/encounters`
- `POST /api/presence/rooms/<room_id>/guest-enquiry`

Observer:

- `POST /api/observer/profile`
- `GET /api/observer/profile`
- `PATCH /api/observer/profile`
- `POST /api/observer/rooms/<room_id>/save`
- `POST /api/observer/rooms/<room_id>/follow`
- `GET /api/observer/passport`
- `GET /api/observer/connections`
- `POST /api/observer/mood-boards`
- `GET /api/observer/mood-boards`
- `GET /api/observer/mood-boards/<board_id>`
- `PATCH /api/observer/mood-boards/<board_id>`
- `POST /api/observer/mood-boards/<board_id>/items`
- `DELETE /api/observer/mood-boards/<board_id>/items/<item_id>`
- `POST /api/observer/field-notes`
- `GET /api/observer/field-notes`
- `POST /api/observer/field-notes/<note_id>/report`
- `POST /api/observer/signals`
- `DELETE /api/observer/signals/<signal_id>`
- `POST /api/observer/paths/<path_id>/walks`
- `POST /api/observer/paths/<path_id>/traces`
- `POST /api/observer/paths/<path_id>/choose`

Room owner:

- `POST /api/presence/owner/rooms/<room_id>/passes`
- `GET /api/presence/owner/rooms/<room_id>/passes`
- `PATCH /api/presence/owner/rooms/<room_id>/passes/<pass_id>`
- `POST /api/presence/owner/rooms/<room_id>/keys`
- `GET /api/presence/owner/rooms/<room_id>/keys`
- `PATCH /api/presence/owner/rooms/<room_id>/keys/<key_id>`
- `GET /api/presence/owner/rooms/<room_id>/analytics`
- `GET /api/presence/owner/rooms/<room_id>/encounters`
- `GET /api/presence/owner/rooms/<room_id>/connections`
- `GET /api/presence/owner/rooms/<room_id>/field-notes`
- `POST /api/presence/owner/rooms/<room_id>/field-notes/<note_id>/hide`
- `POST /api/presence/owner/rooms/<room_id>/mood-boards`
- `GET /api/presence/owner/rooms/<room_id>/mood-boards`
- `POST /api/presence/owner/rooms/<room_id>/paths/generate`
- `GET /api/presence/owner/rooms/<room_id>/paths`

Paths:

- `GET /api/paths/<path_id>`
- `GET /api/paths/from-room/<room_id>`
- `GET /api/paths/from-mood-board/<board_id>`
- `POST /api/paths/generate/from-room/<room_id>`
- `POST /api/paths/generate/from-mood-board/<board_id>`

Admin:

- `GET /api/admin/presence/world-readiness`
- `POST /api/admin/presence/world-readiness/recompute`
- `GET /api/admin/presence/moderation/flags`
- `POST /api/admin/presence/moderation/flags/<flag_id>/action`
- `GET /api/admin/presence/rooms/<room_id>/graph-summary`

## Security Notes

- Guest RoomKey resolution and encounter capture do not require login.
- RoomKey tokens are generated with non-sequential `secrets.token_urlsafe(24)`.
- Paused keys return a paused response without normal encounter capture.
- Revoked keys return a revoked response.
- Encounter IP/user-agent data is hashed; raw IP is not exposed.
- Observer profiles reject promotional links/contact details and do not expose booking/contact fields.
- Owner analytics are owner-scoped. Cross-owner access is denied.
- Admin world/moderation routes use existing control-plane auth.
- Field Notes are reportable and hideable without deleting platform records.

## Test Commands

From `flora-fauna/backend`:

```powershell
python -m py_compile app\models.py app\api\presence.py app\api\presence_owner.py app\api\presence_graph.py app\services\presence_service.py app\services\presence_pass_service.py app\services\presence_social_service.py app\services\presence_path_service.py app\services\presence_world_service.py
python -m pytest tests\test_presence_pass_paths.py -q
python -m pytest tests\test_presence_nodes.py -q
python -m pytest -q
git diff --check
```

## Results

- `python -m py_compile ...`: passed
- `python -m pytest tests\test_presence_pass_paths.py -q`: 5 passed
- `python -m pytest tests\test_presence_nodes.py -q`: 79 passed
- `python -m pytest -q`: 251 passed
- `git diff --check`: passed

Known test noise:

- SQLAlchemy `Query.get()` legacy warnings from existing and new code.
- Pytest cache permission warnings on this Windows workspace.

## Known Limitations

- Path Engine v1 is deterministic and intentionally simple. It uses room metadata, public Mood Boards, public Field Notes, and save overlap, not AI.
- World status remains hidden/forming/preview/ready in backend metrics; no public global World map is exposed.
- Observer moderation rules are conservative string checks and should be backed by a richer moderation pipeline later.
- Guest encounter capture uses existing rate limiter hooks but does not yet include a per-token abuse dashboard.
- Field Notes are reportable/hideable; full moderation queues now have the data model and admin routes but not a polished operator UI.

## Follow-Up Recommendations

- Frontend integration for NFC/QR RoomKey entry, Observer upgrade, save/follow, Passport, and Mood Boards.
- Owner dashboard UI for Presence Passes, Room Keys, source/campaign performance, and aggregate encounter analytics.
- Admin moderation UI for flags, note actioning, and observer suspension.
- Path UI pass around “Choose a direction” and fork navigation.
- Periodic job for `world_readiness_metric` recomputation.

