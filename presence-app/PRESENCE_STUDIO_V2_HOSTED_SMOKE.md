# Presence Studio V2 Hosted Smoke

Date: 2026-06-03

## Current Status

Hosted smoke is ready to run but has not been executed against a deployed environment.

Local integration through Phase D.5 is verified, and a gated hosted lifecycle spec now exists:

```txt
tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts
```

The spec was run locally and skipped because hosted smoke environment variables are not configured in this workspace.

## Required Environment

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=
PRESENCE_E2E_API_URL=
PRESENCE_E2E_OWNER_EMAIL=
PRESENCE_E2E_OWNER_PASSWORD=
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=
```

Hosted deployment feature flags must be configured using repo conventions:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=<pilot-room-id-or-slug>
```

Server-side equivalents, where used:

```txt
PRESENCE_STUDIO_V2_ENABLED=1
PRESENCE_STUDIO_V2_PILOT_IDS=<pilot-room-id-or-slug>
```

Optional:

```txt
PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG=
PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG=
PRESENCE_E2E_CLEANUP_STRATEGY=control-delete
PRESENCE_E2E_CONTROL_TOKEN=
PRESENCE_E2E_CONTROL_SECRET=
```

## Smoke Flow Covered By Spec

1. Real hosted owner sign-in.
2. Open flagged V2 pilot editor.
3. Verify `presence-studio-v2-root` appears.
4. Verify legacy Studio Room editor is absent for the V2 pilot.
5. Add visible object.
6. Add hidden-public object.
7. Add moodboard reference.
8. Change Skin Lab value.
9. Save draft through owner draft API.
10. Reload editor and verify backend persistence.
11. Open owner draft preview.
12. Verify draft preview renders sanitized V2 public room.
13. Verify hidden-public object is absent from preview.
14. Publish through real owner publish endpoint.
15. Open anonymous `/p/[slug]`.
16. Open anonymous `/presence/[slug]`.
17. Verify V2 public renderer, visible content, moodboard content, mobile viewport.
18. Verify restricted internal/editor strings are absent.
19. Optionally verify a legacy public slug still avoids V2 rendering.
20. Verify `/room/[id]/key` remains safe.
21. Restore original published/draft config.

## Command

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

## Latest Result

```txt
1 skipped
```

Reason: hosted smoke env was not configured.

## Rollback

Disable the hosted V2 flag or remove the pilot ID/slug:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=0
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=
PRESENCE_STUDIO_V2_ENABLED=0
PRESENCE_STUDIO_V2_PILOT_IDS=
```

Legacy public rooms remain on the existing renderer path when sanitized `studioV2Room` is absent.

## Current Blocker

No hosted base URL, API URL, owner credentials, or V2 pilot room ID are available in this workspace.

Do not mark Phase E complete until the hosted lifecycle spec runs against a real hosted environment, publishes, verifies anonymous public render, and completes cleanup/restoration.
