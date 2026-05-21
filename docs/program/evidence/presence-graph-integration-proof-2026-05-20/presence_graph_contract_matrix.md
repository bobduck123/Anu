# Presence Graph Contract Matrix

Date: 2026-05-20

This matrix covers the backend routes needed by the frontend Presence Passes / Observer / Mood Boards / Paths browser flow. It records the real Flask route contract and whether the mocked browser fixture matches the backend-critical shape.

| Flow | Method | Route | Auth | Request | Response | Implementation | Mock Match |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RoomKey resolve for `/r/[token]` | GET | `/api/presence/keys/<public_token>/resolve` | Guest allowed, optional observer JWT | Path token only | `message`, safe public `room`, `public_url`, safe `room_key`, `encounter`, `available_actions`, `observer_upgrade` | Implemented in `app/api/presence_graph.py::resolve_public_room_key`; uses `resolve_room_key`, captures one encounter, returns `room_key_entry_payload` | Critical shape tested. Intentional difference: backend does not echo `public_token` in public resolve payload. |
| Encounter capture | POST | `/api/presence/rooms/<room_id>/encounters` | Guest allowed, optional observer JWT | `room_key_token`, `source`, `context_label`, `anonymous_visitor_id` | `encounter`, `room_id`, `available_actions` | Implemented in `capture_room_encounter`; validates active room key when supplied | Critical shape tested; frontend should not send duplicate POST after resolve already returns `encounter`. |
| Observer passport | GET | `/api/observer/passport` | Public JWT required | None | `{ items: PassportStamp[] }` | Implemented in `observer_passport`; uses `list_passport` | Local auth route tested. Unauth returns JSON JWT error. |
| Observer mood boards | GET | `/api/observer/mood-boards` | Public JWT required | None | `{ items: MoodBoard[] }` | Implemented in `observer_mood_boards`; observer-scoped | Local auth route tested. |
| Add Room to Mood Board | POST | `/api/observer/mood-boards/<board_id>/items` | Public JWT required | `item_type`, `item_id`, optional `title`, `source_context`, metadata fields | `MoodBoardItem` | Implemented in `observer_add_mood_board_item`; owner scoped to observer board | Local persistence tested. |
| Path from Room | GET | `/api/paths/from-room/<room_id>` | Guest allowed | Path room id | `PresencePath` with `waypoints`, `choices`, `reason_shown` | Implemented in `path_from_room`; returns existing active path or generates deterministic path | Local read tested. |
| Path from Mood Board | GET | `/api/paths/from-mood-board/<board_id>` | Guest allowed for public/room_public/unlisted boards | Path board id | `PresencePath` with `waypoints`, `choices`, `reason_shown` | Implemented in `path_from_mood_board`; private boards are not exposed | Local read tested against public observer board. |
| Path walk | POST | `/api/observer/paths/<path_id>/walks` | Public JWT required | Optional `saved`, `metadata` | `PathWalk` | Implemented in `observer_start_path_walk` | Local persistence tested. |
| Path trace | POST | `/api/observer/paths/<path_id>/traces` | Public JWT required | `trace_type`, optional `waypoint_id`, `metadata` | `PathTrace` | Implemented in `observer_path_trace` | Local persistence tested. |
| Path choice | POST | `/api/observer/paths/<path_id>/choose` | Public JWT required | `choice_id` | `PathTrace` with `fork_chosen` | Implemented in `observer_choose_path` | Local persistence tested. |
| Studio passes | GET | `/api/presence/owner/rooms/<room_id>/passes` | Owner/admin JWT required | None | `{ items: PresencePass[] }`, keys included | Implemented in `owner_room_passes`; owner-scoped | Local auth route tested. |
| Studio keys | GET | `/api/presence/owner/rooms/<room_id>/keys` | Owner/admin JWT required | None | `{ items: RoomKey[] }` | Implemented in `owner_room_keys`; owner-scoped | Existing route suite covers create/list/update. |
| Studio analytics | GET | `/api/presence/owner/rooms/<room_id>/analytics` | Owner/admin JWT required | None | Graph analytics counts and key performance | Implemented in `owner_room_analytics`; owner-scoped | Local auth route and critical shape tested. |
| Public world page | N/A | Frontend `/world` | Guest | N/A | Hidden/forming copy only | Frontend should not call admin API for public world | Mocked browser proof covers hidden/forming state. |
| World readiness admin | GET | `/api/admin/presence/world-readiness` | Control-plane auth required | None | World readiness metrics and hidden/forming message | Implemented in `admin_world_readiness` | Local control auth tested. Hosted requires operator control token/secret. |

## Contract Drift Protection

`flora-fauna/backend/tests/test_presence_graph_integration_proof.py::test_presence_graph_frontend_mock_fixture_matches_backend_contract_shape` compares the mocked browser fixture at `presence-app/tests/fixtures/presenceGraph.json` to real backend responses for:

- RoomKey entry payload
- Encounter payload
- Path payload with waypoints and choices
- Mood Board payload with items
- Owner analytics payload

The comparison is intentionally contract-critical rather than exact-value based. The mock fixture is allowed to contain richer display data, while the public backend remains owner-safe and avoids echoing private or sensitive fields.
