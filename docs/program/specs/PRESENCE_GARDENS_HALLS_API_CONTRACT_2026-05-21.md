# Presence Gardens + Halls API Contract

Date: 2026-05-21

Scope: backend contract for Presence Gardens, Observations, Echoes, Seeds, Shared Spaces, Presence Halls, Hall analytics events, Mood Board seed loops, and Hall trailhead Paths.

World exposure: the full Presence World remains hidden/forming. These endpoints expose Gardens, Halls, Paths, Rooms, Mood Boards, and explainable seed surfaces only.

## Envelope

Successful responses use the existing backend envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Frontend `apiFetch` also tolerates raw `data`, but the canonical backend response is `ok/data`.

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Observation cannot include commercial links.",
    "details": {}
  }
}
```

Common codes:

| Status | Code | Meaning |
| --- | --- | --- |
| 401 | `unauthorized` or `auth_required` | Missing/invalid public JWT |
| 403 | `forbidden` | Authenticated but not allowed |
| 404 | `not_found` | Resource missing or intentionally hidden |
| 400 | `validation_error` | Invalid payload or policy rejection |

Self-promotion upgrade prompt:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Observation cannot include commercial links, booking/contact prompts, services, or portfolio-style business positioning.",
    "details": {
      "reason": "observer_business_profile_attempt",
      "upgrade_required": true,
      "upgrade_target": "presence_room",
      "message": "Observer Masks are personal and social. To publish services, booking details, portfolios, commercial links, or business contact points, create or upgrade to a Presence Room.",
      "allowed_actions": ["create_presence_room", "link_existing_room"]
    }
  }
}
```

## Auth

| Actor | Requirement |
| --- | --- |
| Guest | May read public/unlisted Gardens and Halls; may enter public/unlisted Halls with `guest_token`; may track Hall portal/stall events |
| Observer | Public JWT; creates Observations, Echoes, Seeds, Nurtures, Prunes, Hall joins, Hall Observations |
| Room owner/studio | Public JWT tied to Room owner; manages Halls for owned Rooms |
| Admin/control | Control-plane JWT and required scopes |

Private user emails and raw user IDs are not exposed through public Hall participant or Garden surfaces.

## Gardens

Canonical frontend paths:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/garden` | Observer | Current observer Garden |
| PATCH | `/api/garden` | Observer | Update current Garden |
| GET | `/api/garden/home` | Observer | Frontend-shaped deterministic Garden home |
| GET | `/api/garden/seeds` | Observer | Current Garden Seeds |
| POST | `/api/garden/seeds/:seed_id/nurture` | Observer | Nurture Seed |
| POST | `/api/garden/seeds/:seed_id/prune` | Observer | Prune Seed |
| POST | `/api/garden/seeds/:seed_id/compost` | Observer | Compost Seed |
| POST | `/api/garden/seeds/:seed_id/block` | Observer | Block Seed |
| GET | `/api/garden/shared-spaces` | Observer | Current observer Shared Spaces |
| GET | `/api/masks/:alias` | Public | Public Mask/Garden page |

Backend-native aliases remain supported:

| Method | Path |
| --- | --- |
| GET/PATCH | `/api/observer/garden` |
| GET | `/api/observer/garden/home` |
| GET | `/api/observer/garden/seeds` |
| POST | `/api/observer/garden/recompute` |
| GET | `/api/gardens/:alias_or_slug` |
| GET | `/api/gardens/:garden_id/observations` |
| GET | `/api/gardens/:garden_id/seeds` |
| POST | `/api/observer/seeds/:seed_id/nurture` |
| POST | `/api/observer/seeds/:seed_id/prune` |

Garden home frontend response:

```json
{
  "observer": {
    "id": 1,
    "alias": "test-observer-mask",
    "mask_name": "Test Observer",
    "visibility": "public_mask",
    "self_promotion_locked": true,
    "status": "active"
  },
  "sections": [
    {
      "id": "new_growth",
      "title": "New Growth",
      "blurb": "Fresh Observations from strong Seeds.",
      "observations": []
    },
    {
      "id": "recently_watered",
      "title": "Recently Watered",
      "blurb": "Seeds you watered.",
      "seeds": []
    },
    {
      "id": "crossed_paths",
      "title": "Crossed Paths",
      "blurb": "Recent shared Presence context.",
      "shared_spaces": []
    }
  ]
}
```

Section IDs:

`new_growth`, `recently_watered`, `crossed_paths`, `from_rooms`, `from_mood_boards`, `quiet_shoots`, `wilting_seeds`, `compost`.

Seed shape includes backend and frontend names:

```json
{
  "id": 10,
  "garden_id": 1,
  "observer_id": 1,
  "seed_type": "room",
  "seed_kind": "room",
  "seed_id": 101,
  "source_id": 101,
  "source_label": "Garden Hall Room",
  "source_slug": "garden-hall-room",
  "source_type": "mood_board_overlap",
  "current_weight": 48.2,
  "strength": 0.482,
  "status": "active",
  "state": "recently_watered",
  "reason_label": "Added from your Mood Board.",
  "reason": "Added from your Mood Board.",
  "primary_action": "open",
  "href": "/r/garden-hall-room"
}
```

## Observations and Echoes

Canonical frontend paths:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/observations` | Observer | Create Observation |
| GET | `/api/observations/by-mask/:alias` | Public | Public Observations for Mask |
| GET | `/api/observations/:id` | Public | Public Observation |
| DELETE | `/api/observations/:id` | Author | Hide/remove own Observation |
| POST | `/api/observations/:id/nurture` | Observer | Nurture Observation through Seed |
| DELETE | `/api/observations/:id/nurture` | Observer | Clear local nurtured flag |
| POST | `/api/observations/:id/echoes` | Observer | Echo with optional commentary |
| POST | `/api/observations/:id/report` | Observer | Report Observation |

Backend-native aliases remain supported:

| Method | Path |
| --- | --- |
| POST/PATCH/DELETE | `/api/observer/observations[/id]` |
| POST | `/api/observer/observations/:id/echo` |

Create Observation request:

```json
{
  "observation_kind": "room",
  "body": "A note from the walk.",
  "visibility": "mask_only",
  "source_kind": "room",
  "source_id": 101,
  "image_url": null
}
```

Canonical mappings:

| Frontend | Backend |
| --- | --- |
| `observation_kind` | `observation_type` |
| `visibility: mask_only` | `visibility: garden` |
| `source_kind: room` + `source_id` | `room_id` |
| `source_kind: hall` + `source_id` | `hall_id` |
| `source_kind: path` + `source_id` | `path_id` |
| `source_kind: mood_board` + `source_id` | `mood_board_id` |

Observation response includes both names:

```json
{
  "id": 1,
  "observer_id": 1,
  "author_observer_id": 1,
  "observation_kind": "room",
  "observation_type": "room",
  "body": "A note from the walk.",
  "body_format": "plain",
  "visibility": "garden",
  "author": {
    "observer_id": 1,
    "alias": "observer-a",
    "mask_name": "observer-a",
    "avatar_key": null
  },
  "source": {
    "source_kind": "room",
    "source_id": 101,
    "source_slug": "garden-hall-room",
    "source_label": "Garden Hall Room",
    "reason_shown": "Attached to a Presence Room."
  },
  "nurture_count": 0,
  "echo_count": 0,
  "has_nurtured": false
}
```

Echo request:

```json
{
  "message": "Keeping this close."
}
```

Echo response:

```json
{
  "id": 20,
  "observer_id": 2,
  "observation_id": 1,
  "source_observation_id": 1,
  "message": "Keeping this close.",
  "commentary": "Keeping this close.",
  "source_attribution": {
    "id": 1,
    "author_observer_id": 1,
    "body": "A note from the walk."
  }
}
```

Rules:

- Echo without commentary is valid.
- Echo with `message` or `commentary` is valid.
- Hidden/removed source Observations cannot be echoed.
- Serialized Echoes hide source body if the source is hidden/removed.
- Echo commentary runs the same self-promotion upgrade guard as Observations.

## Mood Board to Seed

Canonical endpoint:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/observer/mood-boards/:board_id/items/:item_id/seed` | Observer | Create or nurture GardenSeed from Mood Board item |

Response:

```json
{
  "seed": {},
  "reason_label": "Added from your Mood Board.",
  "garden_home_update_hint": "from_mood_boards"
}
```

Supported item mappings:

| Mood Board item | Seed |
| --- | --- |
| `room` | `seed_type: room` |
| `path` | `seed_type: path` |
| `mood_board` | `seed_type: mood_board` |
| `hall` | `seed_type: hall` |
| Other item types | Board-level `seed_type: mood_board` |

Repeated calls reuse the same active Seed where possible and add a `mood_board_add` nurture.

## Halls

Canonical public paths:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/halls` | Optional | List public/unlisted Halls |
| GET | `/api/halls/:id_or_slug` | Optional | Read Hall |
| POST | `/api/halls/:id_or_slug/join` | Optional; guest allowed for public/unlisted | Join Hall |
| POST | `/api/halls/:id_or_slug/leave` | Optional | Leave Hall |
| GET | `/api/halls/:id_or_slug/participants` | Optional | Safe participant list |
| GET | `/api/halls/:id_or_slug/observations` | Optional | Hall Observations |
| POST | `/api/halls/:id_or_slug/observations` | Observer | Create Hall Observation |
| GET | `/api/halls/:id_or_slug/zones` | Optional | Hall zones |
| GET | `/api/halls/:id_or_slug/portals` | Optional | Hall portals |
| GET | `/api/halls/:id_or_slug/stalls` | Optional | Hall stalls |
| GET | `/api/halls/:id_or_slug/sessions` | Optional | Hall sessions |
| POST | `/api/halls/:id_or_slug/portals/:portal_id/click` | Optional | Track portal click |
| POST | `/api/halls/:id_or_slug/stalls/:stall_id/visit` | Optional | Track stall visit |

Backend-native management paths remain supported:

| Method | Path |
| --- | --- |
| POST | `/api/halls` |
| PATCH | `/api/halls/:id` |
| POST/PATCH | `/api/halls/:id/zones`, `/api/halls/:id/portals`, `/api/halls/:id/stalls`, `/api/halls/:id/sessions` |
| POST | `/api/halls/:id/moderation/actions` |

List response:

```json
{
  "items": [],
  "total": 2,
  "live_count": 1,
  "scheduled_count": 1
}
```

Hall response includes backend and frontend names:

```json
{
  "id": 1,
  "slug": "open-studio-friday",
  "title": "Open Studio Friday",
  "description": "A shared studio Hall.",
  "rules_text": "Be kind.",
  "rules": "Be kind.",
  "hall_type": "studio_hall",
  "status": "live",
  "visibility": "public",
  "host_room_id": 101,
  "host_room_slug": "garden-hall-room",
  "host_room_display_name": "Garden Hall Room",
  "participants_count": 6,
  "observations_count": 4,
  "zones": [],
  "sessions": [],
  "stalls": [],
  "portals": []
}
```

Join response:

```json
{
  "id": 1,
  "hall_id": 1,
  "observer_id": 1,
  "role": "participant",
  "status": "joined",
  "identity_type": "mask",
  "alias": "observer-a",
  "mask_name": "observer-a",
  "participant": {},
  "joined": true,
  "available_actions": ["post_observation", "visit_stall", "open_portal"]
}
```

Guest join:

```json
{
  "guest_token": "optional-client-token"
}
```

Guests can join only public/unlisted Halls. Persistent social actions require an Observer Mask.

## Owner/Studio Halls

Canonical frontend owner paths:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/presence/owner/halls?room_id=:room_id` | Room owner | List Room Halls |
| POST | `/api/presence/owner/halls` | Room owner | Create Hall; body requires `host_room_id` |
| GET | `/api/presence/owner/halls/:hall_id?room_id=:room_id` | Room owner | Read owned Hall |
| PATCH | `/api/presence/owner/halls/:hall_id` | Room owner | Update owned Hall |
| DELETE | `/api/presence/owner/halls/:hall_id` | Room owner | Archive Hall |
| POST | `/api/presence/owner/halls/:hall_id/zones` | Room owner | Add zone |
| PATCH | `/api/presence/owner/halls/:hall_id/zones/:zone_id` | Room owner | Update zone |
| DELETE | `/api/presence/owner/halls/:hall_id/zones/:zone_id` | Room owner | Archive zone |
| POST | `/api/presence/owner/halls/:hall_id/sessions` | Room owner | Add session |
| POST | `/api/presence/owner/halls/:hall_id/stalls` | Room owner | Add stall |
| POST | `/api/presence/owner/halls/:hall_id/portals` | Room owner | Add portal |
| GET | `/api/presence/owner/halls/:hall_id/analytics` | Room owner | Hall analytics |
| POST | `/api/presence/owner/halls/:hall_id/moderation` | Room owner | Moderate Hall |

Existing backend-native owner paths remain:

| Method | Path |
| --- | --- |
| GET/POST | `/api/presence/owner/rooms/:room_id/halls` |
| GET | `/api/presence/owner/rooms/:room_id/halls/:hall_id/analytics` |
| POST | `/api/presence/owner/rooms/:room_id/halls/:hall_id/stalls` |
| POST | `/api/presence/owner/rooms/:room_id/halls/:hall_id/portals` |

Owner input mappings:

| Frontend | Backend |
| --- | --- |
| `rules` | `rules_text` |
| `cover_image_url` | `metadata.cover_image_url` |
| `visibility: invite` | `visibility: invite_only` |
| `zone_kind` | `zone_type` |
| `blurb` | `description` |
| `destination_kind` | `target_type` |
| `destination_id` | `target_id` |
| `destination_slug` | `metadata.destination_slug` |
| `short_pitch` | `metadata.short_pitch` |
| `host_label` | `metadata.host_label` |

## Hall Analytics Events

Model: `hall_activity_event`.

Captured events:

`portal_click`, `stall_visit`, `join`, `leave`, `observation`, `path_open`, `room_enter`.

Event fields:

`hall_id`, `event_type`, `observer_id`, `guest_token`, `room_id`, `portal_id`, `stall_id`, `session_id`, `source`, `created_at`, `metadata`.

Analytics response:

```json
{
  "hall_id": 1,
  "participants_joined": 4,
  "guests": 1,
  "observers": 3,
  "observations_posted": 2,
  "observations_shared": 2,
  "rooms_entered": 5,
  "stall_visits": 3,
  "portal_clicks": 1,
  "seeds_created": 2,
  "paths_generated": 1,
  "paths_opened": 1,
  "people_gathered": 4,
  "most_visited_stall": {},
  "most_used_portal": {},
  "top_stalls": [],
  "source_breakdown": []
}
```

Analytics does not expose raw private Observer identity.

## Hall Trailhead Paths

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/paths/from-hall/:hall_id` | Public | Get or lazily generate active Path from public Hall |
| POST | `/api/paths/generate/from-hall/:hall_id` | Public | Generate Hall trailhead Path |

These routes record `path_open` Hall activity events.

## Admin

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/admin/presence/gardens` | Control `presence.node.read` |
| GET | `/api/admin/presence/halls` | Control `presence.node.read` |
| GET | `/api/admin/presence/halls/:hall_id` | Control `presence.node.read` |
| GET | `/api/admin/presence/halls/:hall_id/analytics` | Control `presence.analytics.read` |
| POST | `/api/admin/presence/halls/:hall_id/moderation/actions` | Control `presence.node.update` |
| GET | `/api/admin/presence/seeds/recompute-status` | Control `presence.analytics.read` |
| POST | `/api/admin/presence/seeds/recompute` | Control `presence.analytics.read` |

World readiness remains separate:

| Method | Path |
| --- | --- |
| GET | `/api/admin/presence/world-readiness` |
| POST | `/api/admin/presence/world-readiness/recompute` |

## Frontend Mapping

| Frontend function | Backend endpoint |
| --- | --- |
| `getGardenHome` | `GET /api/garden/home` |
| `listGardenSeeds` | `GET /api/garden/seeds` |
| `listSharedSpaces` | `GET /api/garden/shared-spaces` |
| `nurtureSeed` | `POST /api/garden/seeds/:seed_id/nurture` |
| `pruneSeed` | `POST /api/garden/seeds/:seed_id/prune` |
| `compostSeed` | `POST /api/garden/seeds/:seed_id/compost` |
| `blockSeed` | `POST /api/garden/seeds/:seed_id/block` |
| `createObservation` | `POST /api/observations` |
| `listObservationsByMask` | `GET /api/observations/by-mask/:alias` |
| `getObservation` | `GET /api/observations/:id` |
| `deleteObservation` | `DELETE /api/observations/:id` |
| `nurtureObservation` | `POST /api/observations/:id/nurture` |
| `unnurtureObservation` | `DELETE /api/observations/:id/nurture` |
| `echoObservation` | `POST /api/observations/:id/echoes` |
| `reportObservation` | `POST /api/observations/:id/report` |
| `getPublicMask` | `GET /api/masks/:alias` |
| `listHalls` | `GET /api/halls` |
| `getHall` | `GET /api/halls/:slug` |
| `getHallParticipants` | `GET /api/halls/:slug/participants` |
| `getHallObservations` | `GET /api/halls/:slug/observations` |
| `joinHall` | `POST /api/halls/:slug/join` |
| `leaveHall` | `POST /api/halls/:slug/leave` |
| `trackPortalClick` | `POST /api/halls/:slug/portals/:portal_id/click` |
| `trackStallVisit` | `POST /api/halls/:slug/stalls/:stall_id/visit` |
| `listOwnerHalls` | `GET /api/presence/owner/halls?room_id=:room_id` |
| `getOwnerHall` | `GET /api/presence/owner/halls/:hall_id?room_id=:room_id` |
| `createHall` | `POST /api/presence/owner/halls` |
| `updateHall` | `PATCH /api/presence/owner/halls/:hall_id` |
| `deleteHall` | `DELETE /api/presence/owner/halls/:hall_id` |
| `addHallZone` | `POST /api/presence/owner/halls/:hall_id/zones` |
| `updateHallZone` | `PATCH /api/presence/owner/halls/:hall_id/zones/:zone_id` |
| `removeHallZone` | `DELETE /api/presence/owner/halls/:hall_id/zones/:zone_id` |
| `addHallSession` | `POST /api/presence/owner/halls/:hall_id/sessions` |
| `addHallStall` | `POST /api/presence/owner/halls/:hall_id/stalls` |
| `addHallPortal` | `POST /api/presence/owner/halls/:hall_id/portals` |
| `getHallAnalytics` | `GET /api/presence/owner/halls/:hall_id/analytics` |
| `moderateHall` | `POST /api/presence/owner/halls/:hall_id/moderation` |

## Mock API Mapping

The current frontend mock routes map directly to the canonical frontend paths above:

| Mock route | Real backend endpoint |
| --- | --- |
| `/api/garden/home` | `/api/garden/home` |
| `/api/garden/seeds` | `/api/garden/seeds` |
| `/api/garden/seeds/:id/:action` | `/api/garden/seeds/:id/:action` |
| `/api/observations` | `/api/observations` |
| `/api/observations/:id/nurture` | `/api/observations/:id/nurture` |
| `/api/observations/:id/echoes` | `/api/observations/:id/echoes` |
| `/api/observations/:id/report` | `/api/observations/:id/report` |
| `/api/masks/:alias` | `/api/masks/:alias` |
| `/api/halls` | `/api/halls` |
| `/api/halls/:slug` | `/api/halls/:slug` |
| `/api/halls/:slug/participants` | `/api/halls/:slug/participants` |
| `/api/halls/:slug/observations` | `/api/halls/:slug/observations` |
| `/api/halls/:slug/join` | `/api/halls/:slug/join` |
| `/api/halls/:slug/leave` | `/api/halls/:slug/leave` |
| `/api/presence/owner/halls` | `/api/presence/owner/halls` |
| `/api/presence/owner/halls/:id` | `/api/presence/owner/halls/:id` |
| `/api/presence/owner/halls/:id/analytics` | `/api/presence/owner/halls/:id/analytics` |

The real backend additionally supports portal click and stall visit tracking; the mock has best-effort/no-op behavior for these in the frontend client.

## Known Limitations

- Observation unnurture clears the local `has_nurtured` flag but does not delete historical `GardenNurture` rows.
- Hall presence remains polling-ready. There is no realtime socket or spatial movement contract in V1.
- Owner delete archives Halls rather than physically deleting rows.
- Public Hall subresource reads are safe/polling-oriented; private/invite-only data remains access controlled.
- Frontend `visibility: invite` is accepted and stored as backend `invite_only`.
- The frontend evidence README referenced during reconciliation was not present in this workspace; comparison used frontend clients, types, mock API, and e2e spec files directly.
