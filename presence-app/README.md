# Presence App — standalone creative-portfolio platform

A standalone Next.js 16 PWA for the Presence Ecosystem. Connects directly to
the Flask backend at `flora-fauna/backend/` via Supabase JWT. Has its own
design system (warm terracotta / dark studio palette) — **no dependency on
the Manara `frontend-next` codebase**.

## Status

Alpha. Public portfolio routes use a generic profile renderer
(`components/portfolio/PortfolioRenderer.tsx`). The six distinctive creative
templates (minimal_portal, artist_gallery, editorial_portfolio,
studio_practice, practitioner_profile, venue_profile) currently live in
`frontend-next/src/components/presence/PresenceNodeRenderer.tsx`. Mirroring
those templates here is documented as a follow-up — see
`docs/presence/PRESENCE_ECOSYSTEM_APP_PWA_SPEC.md`.

For pilot launch, route public portfolio traffic to the frontend-next
deployment and use this app for the owner studio surface only.

## Local launch

The app expects the Flask backend running on `http://localhost:5000` and a
Supabase project for owner auth.

```bash
# 1. Install
cd C:\Dev\Flora_fauna\presence-app
npm install

# 2. Configure (.env.local)
# NEXT_PUBLIC_API_BASE=http://localhost:5000
# NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# 3. Dev server (port 3001 to avoid clash with frontend-next on 3000)
npm run dev -- --port 3001

# 4. Verify
npm run typecheck
npm run build
```

## Routes

Public:
- `/p/[slug]` — public portfolio (generic renderer)
- `/p/[slug]/works/[workId]` — work detail with OG metadata
- `/p/[slug]/collections/[collectionId]` — collection detail

Owner studio (Supabase JWT required):
- `/studio` — owned-node list
- `/studio/[id]` — dashboard
- `/studio/[id]/{portfolio,works,collections,enquiries,qr,analytics,settings}`

## Backend dependency

This app does NOT contain backend code. All API calls go to the Flask
backend at `flora-fauna/backend/`:

- Public: `GET /api/presence/public/<slug>`
- Owner: `GET|PATCH|POST|DELETE /api/presence/owner/*` with
  `Authorization: Bearer <supabase-jwt>`
- QR: `GET /api/presence/public/<slug>/qr` (scanner-grade SVG)

## Deployment

Recommended: deploy this app as a separate Vercel project from the same
monorepo. Root directory: `presence-app`. Framework preset: Next.js. Env
vars: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Split into a separate Git repo only after the API/template/auth contracts
have stabilised post-pilot.
