# Manara

Manara is a civic commons platform for mutual aid, governance, impact pools, and creator-driven cultural surfaces.

This repository currently ships the launch-ready Manara surfaces as three deployable apps:

- [frontend-next](C:/Dev/Flora_fauna/frontend-next): Next.js frontend
- [flora-fauna/backend](C:/Dev/Flora_fauna/flora-fauna/backend): Flask core API
- [services/impact-service](C:/Dev/Flora_fauna/services/impact-service): Express/Prisma impact + Manara signals API

## Deployment shape

Deploy as three separate Vercel projects from the same repository:

1. `frontend-next`
2. `flora-fauna/backend`
3. `services/impact-service`

Detailed setup:

- [DEPLOY_VERCEL_MANARA.md](C:/Dev/Flora_fauna/docs/DEPLOY_VERCEL_MANARA.md)
- [GITHUB_DESKTOP_VERCEL_HANDOFF.md](C:/Dev/Flora_fauna/docs/GITHUB_DESKTOP_VERCEL_HANDOFF.md)

## Current Manara routes

- Frontend: `/manara`
- Legacy compatibility: `/flora-fauna`
- Impact API alias: `/api/manara/*`
- Legacy impact API alias: `/api/flora-fauna/*`

## Launch notes

- Frontend requests proxy through `/_core/*` and `/_impact/*`
- Core and impact services include explicit `vercel.json` routing
- Liquidity pools are ledger-backed and auditable
- Dumb Dumb Mode and Manara Signals are included

## Known constraint

Serverless-local uploads and generated artifacts are safe for Vercel temp storage, but not durable. Add object storage before a full public launch if persistent media is required.
