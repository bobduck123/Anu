# Presence Controlled Launch Hosted Smoke

- Generated: `2026-05-22T06:15:53Z`
- Backend: `https://anu-back-end.vercel.app`
- Frontend origin: `https://your-presence.vercel.app`
- Result: **PASS**
- Dry run: `false`

| Step | Result | Route | HTTP | Latency | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `healthz` | pass | `/healthz` | 200 | 1428 | True | Liveness endpoint returned the minimal ok payload. |
| `health` | pass | `/health` | 200 | 1417 | True | Health endpoint reports configured, ready dependencies. |
| `cors_halls` | pass | `/api/halls` | 200 | 1113 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_garden_home` | pass | `/api/garden/home` | 200 | 1141 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_observer_garden` | pass | `/api/observer/garden` | 200 | 1145 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_observations` | pass | `/api/observations` | 200 | 1137 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_owner_halls` | pass | `/api/presence/owner/halls` | 200 | 1099 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_path_from_hall` | pass | `/api/paths/from-hall/1` | 200 | 1137 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_room_key` | pass | `/api/presence/keys/<room-key-token>/resolve` | 200 | 1396 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_public_room` | pass | `/api/presence/public/<room-slug>` | 200 | 1157 | True | Approved frontend CORS preflight returned the expected allow-origin. |
| `cors_disallowed_origin` | pass | `/api/halls` | 200 | 1101 | True | Unapproved CORS origin was not reflected. |
| `safe_404` | pass | `/__presence_controlled_launch_missing__` | 404 | 1444 | True | Unknown route returned a safe 404 response. |
| `invalid_auth` | pass | `/api/garden/home` | 401 | 1407 | True | Invalid bearer auth failed safely. |
| `public_halls` | pass | `/api/halls` | 200 | 1438 | True | Public Hall list returned the canonical envelope. |
| `public_hall_detail` | pass | `/api/halls/<hall-slug>` | 200 | 1441 | True | Public Hall detail returned Hall identifiers and shape. |
| `public_hall_participants_identity_safe` | pass | `/api/halls/<hall-slug>/participants` | 200 | 1407 | True | Public Hall participants omitted raw user id and email fields. |
| `public_mask` | pass | `/api/masks/<alias>` | 200 | 1273 | True | Public Mask alias returned a Mask/Garden payload. |
| `public_garden` | pass | `/api/gardens/<alias>` | 200 | 1460 | True | Public Garden alias returned a Garden payload. |
| `private_mask_not_public` | pass | `/api/masks/<private-alias>` | 404 | 1437 | True | Private smoke Mask alias did not leak publicly. |
| `private_garden_not_public` | pass | `/api/gardens/<private-alias>` | 404 | 1402 | True | Private smoke Garden alias did not leak publicly. |
| `private_hall_not_public` | pass | `/api/halls/<private-hall-slug>` | 403 | 1147 | True | Private smoke Hall detail did not leak publicly. |
| `public_room` | pass | `/api/presence/public/<room-slug>` | 200 | 1533 | True | Public Presence Room API returned the room payload. |
| `room_key_resolve` | pass | `/api/presence/keys/<room-key-token>/resolve` | 200 | 1203 | True | Hosted RoomKey resolved and captured one fixture encounter. |
| `world_admin_not_public` | pass | `/api/admin/presence/world-readiness` | 401 | 1140 | True | World readiness/admin data is not public. |
| `observer_garden_home` | pass | `/api/garden/home` | 200 | 1304 | True | Observer Garden home returned canonical sections. |
| `observer_list_seeds` | pass | `/api/garden/seeds` | 200 | 1196 | True | Observer Seed list returned the canonical envelope. |
| `observer_observation` | pass | `/api/observations` | 201 | 1211 | True | Observer fixture created a tagged Observation. |
| `observer_echo` | pass | `/api/observations/<observation-id>/echoes` | 201 | 1215 | True | Observer fixture created an Echo with commentary. |
| `observer_report_observation` | pass | `/api/observations/<observation-id>/report` | 201 | 1193 | True | Observer fixture reported smoke content through moderation. |
| `observer_self_promotion_guard` | pass | `/api/observations` | 400 | 1456 | True | Self-promotion Observation was rejected safely. |
| `observer_nurture_seed` | pass | `/api/garden/seeds/<seed-id>/nurture` | 201 | 1199 | True | Fixture Seed nurture action succeeded. |
| `observer_prune_seed` | pass | `/api/garden/seeds/<seed-id>/prune` | 201 | 1533 | True | Fixture Seed prune action succeeded. |
| `observer_mood_board_seed` | pass | `/api/observer/mood-boards/<board-id>/items/<item-id>/seed` | 201 | 1224 | True | Mood Board fixture item planted into Garden. |
| `observer_join_hall` | pass | `/api/halls/<hall-slug>/join` | 201 | 1205 | True | Observer fixture joined the Hall. |
| `observer_hall_observation` | pass | `/api/halls/<hall-slug>/observations` | 201 | 1511 | True | Observer fixture created a Hall Observation. |
| `observer_leave_hall` | pass | `/api/halls/<hall-slug>/leave` | 200 | 1219 | True | Observer fixture left or marked away from the Hall. |
| `hall_portal_click` | pass | `/api/halls/<hall-slug>/portals/<portal-id>/click` | 201 | 1181 | True | Hall portal click recorded an activity event. |
| `hall_stall_visit` | pass | `/api/halls/<hall-slug>/stalls/<stall-id>/visit` | 201 | 1477 | True | Hall stall visit recorded an activity event. |
| `path_from_hall` | pass | `/api/paths/from-hall/<hall-id>` | 200 | 1444 | True | Path from Hall returned the Hall trailhead path. |
| `generate_path_from_hall` | pass | `/api/paths/generate/from-hall/<hall-id>` | 201 | 1524 | True | Fixture generated a Path from Hall. |
| `owner_halls` | pass | `/api/presence/owner/halls?room_id=<owner-room-id>` | 200 | 1548 | True | Owner Hall list returned owner-scoped envelope. |
| `owner_hall_detail` | pass | `/api/presence/owner/halls/<owner-hall-id>?room_id=<owner-room-id>` | 200 | 1471 | True | Owner Hall detail returned owner-scoped Hall. |
| `owner_hall_analytics` | pass | `/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>` | 200 | 1512 | True | Owner Hall analytics returned canonical metrics. |
| `hall_activity_metrics` | pass | `/api/presence/owner/halls/<owner-hall-id>/analytics?room_id=<owner-room-id>` | 200 | 1545 | True | Owner analytics exposes Hall activity metrics for event verification. |
| `owner_draft_hall_create` | pass | `/api/presence/owner/halls` | 201 | 1481 | True | Safe owner fixture created tagged draft Hall. |
| `owner_draft_hall_archive` | pass | `/api/presence/owner/halls/<hall-id>` | 200 | 1229 | True | Tagged draft Hall was archived through owner API cleanup. |
| `owner_cross_owner_denial` | pass | `/api/presence/owner/halls/<foreign-hall-id>?room_id=<foreign-room-id>` | 403 | 1463 | True | Owner token could not read another owner Hall scope. |
| `admin_halls_without_auth` | pass | `/api/admin/presence/halls` | 401 | 1150 | True | Admin Hall internals reject unauthenticated requests. |
| `admin_world_with_auth` | pass | `/api/admin/presence/world-readiness` | 200 | 1194 | True | Admin/control fixture can read World readiness internals. |

Summary: `{"pass": 49}`
