# Hosted Frontend Deployment

Date: 2026-05-23

## Production alias

The production frontend alias tested in this pass is
`your-presence.vercel.app`.

## Deployment chain

| Deployment | Provider ID | Source | Result |
|---|---|---|---|
| Faithful renderer Git build | `dpl_XnAHJDXuhV28WNmqq6MpuVmjDF5w` | Vercel build log cloned branch `feature/presence-ecosystem-alpha`, commit `b7b4321` | Production alias promoted and faithful renderer appeared |
| Mobile RoomKey spacing hotfix | `dpl_DQKuwDT1f4LhKDWk6JcG9MBZ3ZpP` | Local production deploy from HEAD `b7b4321` plus the scoped CSS fix in this worktree | Production alias promoted after screenshot review |

Vercel build output for the Git build and hotfix build both completed the
Next production build and generated the public GGM, RoomKey, Studio, and World
route families.

## Renderer and asset checks

The hosted browser suite proved the production frontend includes:

- GGM faithful Room route dispatch
- GGM work-detail route dispatch
- real RoomKey dispatch to the GGM faithful Room
- GGM artwork assets used by the hosted hero and card screenshots
- gallery first-pilot card treatment
- non-GGM Room regression boundary
- `/world` forming posture

The old hosted generic GGM gallery HUD appeared before the production alias
moved to the faithful build. After the alias change and metadata apply, the
hosted smoke rejects that generic text on both desktop and mobile.

## Env and auth posture

The prior controlled-launch provider inventory recorded the production
frontend Vercel env family for API base and Supabase public auth variables. The
latest hosted Playwright smoke again proved Room and RoomKey API requests go to
the hosted backend origin instead of localhost or a mock API.

`NEXT_PUBLIC_*` auth inputs are build-time variables. The auth redirect
configuration remains documented in
`docs/program/SUPABASE_AUTH_REDIRECT_CONFIGURATION_2026-05-22.md`; the deployed
build still includes the auth callback/update-password route family and the
Supabase session proxy.

## Remaining deployment limitation

The mobile RoomKey chip overlap hotfix and the backend public metadata redaction
were deployed from the local worktree during this pass. Commit and push these
patches before relying on a future Git-triggered production deployment.
