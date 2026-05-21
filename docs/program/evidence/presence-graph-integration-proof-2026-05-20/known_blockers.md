# Known Blockers

Date: 2026-05-20

## Hosted Auth-Dependent Proof

Blocked.

Hosted integration proof requires real non-production or operator-approved hosted test credentials. Missing values by name only:

- `PRESENCE_GRAPH_HOSTED_ROOM_KEY_TOKEN`
- `PRESENCE_GRAPH_HOSTED_ROOM_ID`
- `PRESENCE_GRAPH_HOSTED_MOOD_BOARD_ID`
- `PRESENCE_GRAPH_HOSTED_OBSERVER_TOKEN`
- `PRESENCE_GRAPH_HOSTED_OWNER_TOKEN`
- `PRESENCE_GRAPH_HOSTED_CONTROL_TOKEN`
- `PRESENCE_GRAPH_HOSTED_CONTROL_SECRET`

No fake hosted auth success was claimed.

## Hosted Stable Graph Seed

Blocked until the hosted environment has deterministic test-labelled graph records:

- active RoomKey token
- public Room id
- public or unlisted Mood Board id
- observer with Passport/Mood Board data
- owner/operator token scoped to the Room
- control-plane token/secret for world readiness

## Duplicate Encounter Boundary

The local backend route correctly captures encounters when asked. It does not deduplicate repeated client requests by itself. Duplicate avoidance is currently enforced by the frontend `/r/[token]` flow: when RoomKey resolve returns an encounter, the client skips the follow-up encounter POST. The mocked browser proof covers that behavior; the local backend proof confirms the backend response contains the encounter needed to make the skip safe.

## Error Envelope Difference

Missing JWT responses from Flask-JWT-Extended currently use the framework JSON shape, for example `{"msg": "Missing Authorization Header"}`, rather than the project `{"ok": false, "error": ...}` envelope. This is still structured JSON and is accepted by the integration proof as a clean auth failure. A future hardening pass can normalize JWT loader errors into the project envelope if product clients require a single error shape.

## Non-Blocking Warnings

- Existing SQLAlchemy `Query.get()` legacy warnings remain in several Presence Graph code paths.
- Pytest cache writes are blocked in this workspace for `flora-fauna/backend/.pytest_cache`; tests still execute and pass.
