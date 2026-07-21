# Presence Studio V3 hosted gate evidence

Status: implementation validation complete; independent no-merge review pending
Branch: `fix/presence-studio-v3-hosted-gate`
Starting commit: `5f33f353cc8266ad13b315a423b1789f8bd3611b`
Scope: hosted owner-editor V3 enablement for BBB / `bbbvision` only

## Outcome

The hosted owner editor can open Studio V3 for the approved BBB test Room only when explicit hosted-human-test flags and room allowlists are configured.

The gate remains default-off. Production and preview do not activate V3 by environment alone.

## Root cause

Hosted editor builds fell back to Studio V2 because `shouldUsePresenceStudioV3Editor()` returned false whenever `NODE_ENV === "production"`. Vercel production and preview builds use production Next.js bundles, so the existing local/test pilot flag and localStorage opt-in could not activate V3.

The backend V3 owner endpoints were also local/test-only and read V3 gate values from Flask config, not directly from deployment environment variables.

## Changed behavior

- `/studio/<room_id>/editor` remains the only editor route.
- `PresenceStudioV3Shell` is selected only after the existing owner-node auth/session gate has returned `node`, `token`, and `subject`.
- Hosted frontend V3 requires `NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST=1`.
- Hosted frontend V3 also requires `NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS=29,bbbvision`, and the current Room must match both the allowed ID and allowed slug.
- Backend V3 owner endpoints require `PRESENCE_STUDIO_V3_BACKEND_ENABLED=true`, `PRESENCE_STUDIO_V3_BACKEND_HOSTED_HUMAN_TEST=true`, and explicit BBB pilot IDs/slugs in hosted production/preview/staging environments.
- Wildcard-like allowlist tokens are ignored.
- Public routes do not import or render the V3 shell.

## Evidence index

- `EXEC_PLAN.md`
- `HOSTED_GATE_DECISION.md`
- `ENVIRONMENT_VARIABLES.md`
- `VALIDATION_RECORD.md`
- `PUBLIC_INVARIANCE.md`
- `ROLLBACK.md`
- `NO_MERGE_REVIEW.md`

## Safety statement

No push, deploy, publish, hosted test, hosted migration, hosted data mutation, auth weakening, tenant-boundary weakening, public route change, permanent `/editor-v3` route, or GGM/private-client exposure was performed by this pass.
