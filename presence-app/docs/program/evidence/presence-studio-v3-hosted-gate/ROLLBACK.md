# Rollback

## Disable hosted Studio V3

Unset:

```env
NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST
PRESENCE_STUDIO_V3_BACKEND_HOSTED_HUMAN_TEST
```

Optionally also unset:

```env
NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS
PRESENCE_STUDIO_V3_BACKEND_ENABLED
PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS
PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS
```

## Redeploy requirement

Redeploy the frontend after changing `NEXT_PUBLIC_*` variables. They are build-time variables.

Backend runtime variables require the backend host to reload/redeploy according to that host's normal env behavior.

## Result

- BBB owner editor returns to V2 fallback.
- Non-BBB rooms remain unchanged.
- Public routes remain unchanged.
- No server rollback is required for disabling the gate.
- No database rollback is required for this gate-only change.

If the P1 migration was separately applied, leave it in place unless a separately approved database rollback is requested.
