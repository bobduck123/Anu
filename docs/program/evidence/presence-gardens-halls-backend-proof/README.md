# Presence Gardens + Halls Backend Proof

Date: 2026-05-21

## Summary

Implemented the backend foundation for Presence Gardens and Presence Halls as additive infrastructure on top of the existing Presence Passes, Rooms, Observers, Mood Boards, Paths, moderation, analytics, and World-readiness backend.

This pass keeps Presence World hidden/forming and does not replace Paths with feeds or turn Observer Masks into business pages.

## Changed Files

- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/api/__init__.py`
- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/app/api/presence_gardens_halls.py`
- `flora-fauna/backend/app/services/presence_garden_service.py`
- `flora-fauna/backend/app/services/presence_observation_service.py`
- `flora-fauna/backend/app/services/presence_seed_service.py`
- `flora-fauna/backend/app/services/presence_shared_space_service.py`
- `flora-fauna/backend/app/services/presence_hall_service.py`
- `flora-fauna/backend/app/services/presence_hall_analytics_service.py`
- `flora-fauna/backend/app/services/presence_hall_moderation_service.py`
- `flora-fauna/backend/app/services/presence_upgrade_guard_service.py`
- `flora-fauna/backend/app/services/presence_path_service.py`
- `flora-fauna/backend/migrations/versions/20260521_presence_gardens_halls_backend.sql`
- `flora-fauna/backend/tests/test_presence_gardens_halls.py`

## Migration Added

- `20260521_presence_gardens_halls_backend.sql`

Additive tables:

- `presence_garden`
- `observation`
- `observation_echo`
- `garden_seed`
- `garden_nurture`
- `garden_prune`
- `shared_space`
- `presence_hall`
- `hall_session`
- `hall_participant`
- `hall_zone`
- `hall_portal`
- `hall_stall`
- `hall_moderation_action`

Indexes and uniqueness added for Garden observer/slug, Hall slug, Garden Seed target, Hall participants, status/visibility fields, target links, timestamps, and analytics-heavy lookups.

## Services Added

- `presence_garden_service.py`
- `presence_observation_service.py`
- `presence_seed_service.py`
- `presence_shared_space_service.py`
- `presence_hall_service.py`
- `presence_hall_analytics_service.py`
- `presence_hall_moderation_service.py`
- `presence_upgrade_guard_service.py`

Existing `presence_path_service.py` now supports Hall trailheads.
Existing `presence_graph.py` now records SharedSpace and Seeds from Room saves/follows, Room entries, and Path walks.

## Endpoints Added

Garden and Observation:

- `GET /api/observer/garden`
- `PATCH /api/observer/garden`
- `GET /api/gardens/<alias_or_slug>`
- `GET /api/gardens/<garden_id>/observations`
- `GET /api/gardens/<garden_id>/seeds`
- `POST /api/observer/observations`
- `PATCH /api/observer/observations/<observation_id>`
- `DELETE /api/observer/observations/<observation_id>`
- `POST /api/observer/observations/<observation_id>/echo`
- `POST /api/observer/seeds/<seed_id>/nurture`
- `POST /api/observer/seeds/<seed_id>/prune`
- `GET /api/observer/garden/home`
- `GET /api/observer/garden/seeds`
- `POST /api/observer/garden/recompute`

Halls:

- `GET /api/halls`
- `POST /api/halls`
- `GET /api/halls/<hall_id_or_slug>`
- `PATCH /api/halls/<hall_id>`
- `POST /api/halls/<hall_id>/join`
- `POST /api/halls/<hall_id>/leave`
- `GET /api/halls/<hall_id>/participants`
- `GET /api/halls/<hall_id>/observations`
- `POST /api/halls/<hall_id>/observations`
- `GET /api/halls/<hall_id>/zones`
- `POST /api/halls/<hall_id>/zones`
- `POST /api/halls/<hall_id>/portals`
- `PATCH /api/halls/<hall_id>/portals/<portal_id>`
- `POST /api/halls/<hall_id>/stalls`
- `PATCH /api/halls/<hall_id>/stalls/<stall_id>`
- `POST /api/halls/<hall_id>/sessions`
- `PATCH /api/halls/<hall_id>/sessions/<session_id>`
- `POST /api/halls/<hall_id>/moderation/actions`

Owner and admin:

- `GET /api/presence/owner/rooms/<room_id>/halls`
- `POST /api/presence/owner/rooms/<room_id>/halls`
- `GET /api/presence/owner/rooms/<room_id>/halls/<hall_id>/analytics`
- `POST /api/presence/owner/rooms/<room_id>/halls/<hall_id>/stalls`
- `POST /api/presence/owner/rooms/<room_id>/halls/<hall_id>/portals`
- `GET /api/admin/presence/gardens`
- `GET /api/admin/presence/halls`
- `GET /api/admin/presence/halls/<hall_id>`
- `GET /api/admin/presence/halls/<hall_id>/analytics`
- `POST /api/admin/presence/halls/<hall_id>/moderation/actions`
- `GET /api/admin/presence/seeds/recompute-status`
- `POST /api/admin/presence/seeds/recompute`

Path/Hall:

- `GET /api/paths/from-hall/<hall_id>`
- `POST /api/paths/generate/from-hall/<hall_id>`

## Tests Added

- `tests/test_presence_gardens_halls.py`

Coverage includes:

- Default Garden creation, public/private Garden visibility, and public masked payloads.
- Observation create/list/delete and self-promotion upgrade guard.
- Echo attribution and Echo-created/nurtured Seeds.
- Seed decay, nurture, prune/block, compost, and Garden home sections.
- SharedSpace-created Seeds from Room save, Hall join, Path walk, and Mood Board overlap.
- Hall owner creation, public/private Hall access, observer and guest joins, safe participant identity.
- Hall Observations, zones, portals, stalls, sessions, Hall trailhead Paths, analytics, and moderation.
- Owner cross-room denial and admin Hall analytics access.

## Commands Run

- `python -m py_compile app\models.py app\api\presence_graph.py app\api\presence_gardens_halls.py app\api\__init__.py app\services\presence_garden_service.py app\services\presence_observation_service.py app\services\presence_seed_service.py app\services\presence_shared_space_service.py app\services\presence_hall_service.py app\services\presence_hall_analytics_service.py app\services\presence_hall_moderation_service.py app\services\presence_upgrade_guard_service.py app\services\presence_path_service.py tests\test_presence_gardens_halls.py`
- `python -m pytest tests\test_presence_gardens_halls.py -q`
- `python -m pytest tests\test_presence_pass_paths.py -q`
- `python -m pytest tests\test_presence_graph_integration_proof.py -q`
- `python -m pytest tests\test_presence_nodes.py tests\test_presence_dna_persistence.py -q`
- `python -m pytest -q`
- In-memory schema boot check with `AUTO_CREATE_ALL=True`
- `git diff --check`

## Test Results

- Focused Gardens/Halls: `4 passed`
- Existing Presence Pass/Path regression: `5 passed`
- Presence graph integration proof: `3 passed`
- Presence Rooms + DNA persistence: `85 passed`
- Full backend suite: `258 passed`
- Schema boot: `schema boot ok`
- Diff whitespace check: passed; Git only reported line-ending normalization warnings.

## Known Limitations

- Hall V1 is polling-ready and asynchronous. It does not implement realtime chat, spatial movement, or multiplayer presence.
- Hall portal/stall click analytics are represented from metadata counters; no dedicated click-event route was added in this pass.
- Garden home ranking is deterministic V1 logic, not AI ranking.
- The SQL migration is PostgreSQL-oriented and was not applied to a live Postgres database in this local run; the SQLAlchemy model schema was verified with in-memory SQLite.
- Garden uniqueness is one Garden per Observer for V1, matching the default-Garden requirement.

## Product Confirmations

- Full Presence World remains hidden/forming. Existing World readiness status behavior was preserved and regression tested.
- Presence Pass, Room, Observer, Passport, Mood Board, Path, and public Presence Room routes remain intact.
- Observer Masks cannot publish booking/contact/service/portfolio style content through Gardens, Observations, Echo commentary, or observer-hosted Halls; the guard returns a Presence Room upgrade prompt.
- Halls create Garden Seeds through SharedSpace participation.
- Halls can act as Path trailheads.

## Recommended Frontend Pass

- Build Observer Garden home, public Garden pages, Observation composer, Echo/Nurture/Prune controls, and Seed explanations.
- Build Hall listing/detail, join/leave, participant list, Hall Observations, zones, portals, stalls, sessions, owner Hall dashboard, and host moderation controls.
- Keep World surfaces hidden/forming until density thresholds and product readiness allow a controlled reveal.
