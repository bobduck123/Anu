# Presence Gardens + Halls Contract Hardening Proof

Date: 2026-05-21

## Summary

Performed the backend contract reconciliation pass for Presence Gardens + Presence Halls. The backend now serves the frontend-shipped Gardens/Halls API shape while preserving the backend-native Presence Room, Pass, Observer, Mood Board, Path, and earlier Garden/Hall routes.

Canonical contract:

- `docs/program/specs/PRESENCE_GARDENS_HALLS_API_CONTRACT_2026-05-21.md`

## Contract Mismatches Found

- Frontend used `/api/garden`, `/api/observations`, `/api/masks`, and `/api/presence/owner/halls`; backend used `/api/observer/garden`, `/api/observer/observations`, `/api/gardens`, and `/api/presence/owner/rooms/:room_id/halls`.
- Frontend Hall detail subroutes use slugs; backend Hall subroutes were integer-only.
- Garden home frontend expected `sections` as an array and `observer`; backend returned a keyed section object and `garden`.
- Seed fields differed: frontend expected `seed_kind`, `state`, `strength`, `reason`; backend returned `seed_type`, `status`, `current_weight`, `reason_label`.
- Observation fields differed: frontend expected `observation_kind`, `observer_id`, `author`, `source`, interaction counts; backend returned backend-native fields only.
- Echo endpoint/body differed: frontend used `/api/observations/:id/echoes` with `message`; backend used `/api/observer/observations/:id/echo` with `commentary`.
- Frontend seed actions `compost` and `block` were missing.
- Observation nurture/unnurture/report aliases were missing.
- Hall analytics portal/stall activity used placeholder metadata, not real event rows.
- Mood Board item to Garden Seed endpoint was missing.
- Frontend owner/studio routes needed add/update/remove zone and owner Hall archive aliases.
- The referenced frontend proof README was not present in this workspace; comparison used frontend clients, types, mock API, and e2e files directly.

## Contract Decisions Made

- Kept backend-native routes intact.
- Added safe frontend compatibility aliases rather than rewriting the frontend.
- Canonicalized request field aliases in the backend:
  - `observation_kind` -> `observation_type`
  - `message` -> `commentary`
  - `zone_kind` -> `zone_type`
  - `blurb` -> `description`
  - `destination_kind` -> `target_type`
  - `rules` -> `rules_text`
  - `invite` -> `invite_only`
- Serialized dual field names where useful so older backend consumers keep working.
- Kept Halls polling-ready; no realtime or spatial movement was added.
- Kept Presence World hidden/forming and separate from Garden/Hall surfaces.

## Backend Routes Added or Changed

Added frontend-compatible Garden aliases:

- `GET/PATCH /api/garden`
- `GET /api/garden/home`
- `GET /api/garden/seeds`
- `GET /api/garden/shared-spaces`
- `POST /api/garden/seeds/:seed_id/nurture`
- `POST /api/garden/seeds/:seed_id/prune`
- `POST /api/garden/seeds/:seed_id/compost`
- `POST /api/garden/seeds/:seed_id/block`

Added frontend-compatible Observation aliases:

- `POST /api/observations`
- `GET /api/observations/by-mask/:alias`
- `GET /api/observations/:id`
- `DELETE /api/observations/:id`
- `POST /api/observations/:id/nurture`
- `DELETE /api/observations/:id/nurture`
- `POST /api/observations/:id/echoes`
- `POST /api/observations/:id/report`

Added public Mask/Garden page route:

- `GET /api/masks/:alias`

Changed Hall public subroutes to accept id or slug:

- `POST /api/halls/:id_or_slug/join`
- `POST /api/halls/:id_or_slug/leave`
- `GET /api/halls/:id_or_slug/participants`
- `GET/POST /api/halls/:id_or_slug/observations`
- `GET/POST /api/halls/:id_or_slug/zones`
- `GET/POST /api/halls/:id_or_slug/portals`
- `GET/POST /api/halls/:id_or_slug/stalls`
- `GET/POST /api/halls/:id_or_slug/sessions`

Added Hall activity tracking routes:

- `POST /api/halls/:id_or_slug/portals/:portal_id/click`
- `POST /api/halls/:id_or_slug/stalls/:stall_id/visit`

Added frontend-compatible owner/studio Hall aliases:

- `GET /api/presence/owner/halls?room_id=:room_id`
- `POST /api/presence/owner/halls`
- `GET/PATCH/DELETE /api/presence/owner/halls/:hall_id`
- `POST /api/presence/owner/halls/:hall_id/zones`
- `PATCH/DELETE /api/presence/owner/halls/:hall_id/zones/:zone_id`
- `POST /api/presence/owner/halls/:hall_id/sessions`
- `POST /api/presence/owner/halls/:hall_id/stalls`
- `POST /api/presence/owner/halls/:hall_id/portals`
- `GET /api/presence/owner/halls/:hall_id/analytics`
- `POST /api/presence/owner/halls/:hall_id/moderation`

Added Mood Board seed loop:

- `POST /api/observer/mood-boards/:board_id/items/:item_id/seed`

Existing backend-native routes remain supported.

## Models and Services Changed

Models:

- Added `HallActivityEvent`.

Migration:

- Updated `backend/migrations/versions/20260521_presence_gardens_halls_backend.sql` to create `hall_activity_event` and indexes.

Services:

- Added `backend/app/services/presence_hall_activity_service.py`.
- Updated Hall analytics to use real `hall_activity_event` rows.
- Updated Garden home to surface Mood Board overlap seeds in `from_your_mood_boards`.
- Updated seed serialization with frontend-compatible fields.
- Updated Observation serialization and Echo commentary/message support.
- Updated Hall serialization for frontend-compatible fields.

## Hall Analytics Event Capture

Implemented real event capture for:

- `portal_click`
- `stall_visit`
- `join`
- `leave`
- `observation`
- `path_open`
- `room_enter` support in analytics model shape

Owner analytics now returns:

- `portal_clicks`
- `stall_visits`
- `most_visited_stall`
- `most_used_portal`
- `paths_opened`
- `seeds_created`
- `observations_shared`
- `people_gathered`
- `top_stalls`
- `source_breakdown`

Analytics does not expose private Observer identity.

## Mood Board Seed Support

Implemented:

- Observer-owned Mood Board item to Seed endpoint.
- Repeated action reuses the active Seed where possible.
- Repeated action nurtures the Seed with `mood_board_add`.
- Garden home `from_mood_boards` includes Mood Board overlap seeds, including Room seeds created from Mood Board items.

## Echo Commentary Support

Confirmed/added:

- Echo without commentary.
- Echo with `message` or `commentary`.
- Attribution to source Observation and attached Room/Hall/Path/Mood Board IDs.
- Hidden/removed source Observations cannot be echoed.
- Serialized Echo source attribution hides source body if source is not active.
- Echo commentary runs self-promotion upgrade guard.

## Postgres Migration Result

See:

- `docs/program/evidence/presence-gardens-halls-postgres-contract-proof/README.md`

Result:

- Local Postgres 16.13 verified.
- Fresh schema boot passed.
- Gardens/Halls migration SQL applied cleanly.
- Expected tables, indexes, and constraints detected.
- Rollback not run because the repo migration is additive SQL without a down migration.

## Integration Smoke Result

Script:

- `backend/scripts/smoke_presence_gardens_halls_contract.py`

Command:

```powershell
python scripts/smoke_presence_gardens_halls_contract.py
```

Result:

```json
{
  "echo_id": 1,
  "garden_id": 1,
  "hall_id": 1,
  "hall_observation_id": 2,
  "observation_id": 1,
  "participant_id": 1,
  "path_id": 1,
  "portal_clicks": 1,
  "stall_visits": 1,
  "world_status": "hidden"
}
```

## Tests Run

From `C:\Dev\Flora_fauna\flora-fauna\backend`:

```powershell
python -m py_compile app/models.py app/api/__init__.py app/api/presence_gardens_halls.py app/services/presence_garden_service.py app/services/presence_hall_activity_service.py app/services/presence_hall_analytics_service.py app/services/presence_hall_service.py app/services/presence_observation_service.py app/services/presence_seed_service.py scripts/smoke_presence_gardens_halls_contract.py
python -m pytest tests/test_presence_gardens_halls.py -q
python scripts/smoke_presence_gardens_halls_contract.py
python -m pytest tests/test_presence_pass_paths.py -q
python -m pytest tests/test_presence_nodes.py -q
python -m pytest -q
```

Results:

- `py_compile`: passed
- Gardens/Halls targeted tests: `7 passed`
- Contract smoke: passed, World status `hidden`
- Presence Pass/Paths tests: `5 passed`
- Presence Nodes tests: `79 passed`
- Full backend pytest: `261 passed`

Additional check:

```powershell
git diff --check
```

Result: passed with line-ending warnings only.

## Frontend Real-Backend Handoff Notes

The frontend Playwright config currently always starts `tests/e2e/mock-presence-api.mjs` on port `5105`, and `gardens-halls.spec.ts` calls mock-only endpoints such as `/__test__/reset` and stores the literal token `presence-e2e-token`. That token is not a backend JWT.

Because of that, a real-backend Playwright run was not executed in this pass without changing frontend test harness/auth behavior.

The backend contract smoke verified the same real endpoint paths and shapes that the frontend client calls, but it did so through Flask's test client rather than a browser-driven frontend run.

## Known Limitations

- Observation unnurture clears `has_nurtured` but keeps historical `GardenNurture` rows.
- Owner delete archives a Hall rather than hard-deleting it.
- Hall V1 remains polling-ready; no realtime transport was added.
- Postgres pytest execution is blocked by current test factories hard-coding SQLite.
- The local Postgres proof database was left in Docker for inspection.

## Recommended Claude Frontend Follow-up

Use this prompt:

```text
Reconcile the Presence Gardens + Halls frontend against docs/program/specs/PRESENCE_GARDENS_HALLS_API_CONTRACT_2026-05-21.md.

Do not rewrite the frontend. Update only the API client/tests where the contract now has canonical backend support.

Tasks:
1. Add a real-backend Playwright mode that does not start mock-presence-api.mjs.
2. Replace mock-only /__test__/reset and /__test__/state dependencies in real-backend mode with seeded backend fixture setup or pre-issued backend JWTs.
3. Verify /api/garden/home, /api/observations, /api/masks/:alias, /api/halls/:slug, /api/halls/:slug/join, portal click, stall visit, and /api/presence/owner/halls analytics against the real local backend.
4. Keep the existing mock E2E mode for offline UI regression.
5. Update docs/program/evidence/presence-gardens-halls-frontend-proof/README.md with real-backend results.
```

## Confirmation

- Existing Presence Pass, Room, Observer, Mood Board, and Path routes remained intact under regression.
- Full Presence World remains hidden/forming and was not exposed.
