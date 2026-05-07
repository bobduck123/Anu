# Presence App - standalone creative-portfolio platform

A standalone Next.js 16 PWA for the Presence Ecosystem. It connects directly
to the Flask backend at `flora-fauna/backend/` via Supabase JWT and keeps its
own warm terracotta / dark studio design system.

`presence-app` is the deployed Presence-only app. It should not import ANU
admin/control surfaces or broader `frontend-next` product pages.

## Status

Alpha. Public portfolio routes use a generic renderer in
`components/portfolio/PortfolioRenderer.tsx`. The six distinctive creative
templates currently live in `frontend-next/src/components/presence/`.
Mirroring those templates here remains a follow-up.

For current pilots, this app provides the Presence landing page, public entry
routes, auth flows, and owner Studio.

## Local launch

The app expects the Flask backend running on `http://localhost:5000` and a
Supabase project for owner auth.

```bash
cd C:\Dev\Flora_fauna\presence-app
npm install

# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3001
# Alias support also exists for NEXT_PUBLIC_PRESENCE_API_BASE_URL
# and NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN.
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=false
NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT=mailto:hello@presence.studio

npm run dev -- --port 3001
npm run typecheck
npm run build
```

## Routes

Public:
- `/` - Presence landing page with Gallery and Studio choices
- `/gallery` - alpha public gallery entry, no private data
- `/healthz` - deployment health check
- `/p/[slug]` - public portfolio
- `/p/[slug]/works/[workId]` - public work detail
- `/p/[slug]/collections/[collectionId]` - public collection detail

Auth:
- `/auth/sign-in` - Supabase email/password sign-in
- `/auth/sign-up` - invite-first access by default
- `/auth/verify-email` - code entry and resend for signup verification
- `/auth/callback` - Supabase callback exchange
- `/auth/sign-out` - signs out and returns home
- `/auth/forgot-password` - reset email flow
- `/auth/reset-password` - new password flow

Owner Studio:
- `/studio` - auth gate or owned-node list
- `/studio/[id]` - dashboard
- `/studio/[id]/portfolio`
- `/studio/[id]/works`
- `/studio/[id]/collections`
- `/studio/[id]/enquiries`
- `/studio/[id]/qr`
- `/studio/[id]/analytics`
- `/studio/[id]/settings`

## Backend dependency

This app does not contain backend code. All API calls go to the Flask backend:

- Public: `GET /api/presence/public/<slug>`
- Owner: `GET|PATCH|POST|DELETE /api/presence/owner/*` with
  `Authorization: Bearer <supabase-jwt>`
- QR: `GET /api/presence/public/<slug>/qr`
- vCard: `GET /api/presence/public/<slug>/vcard`

## Deployment

Recommended Vercel settings:

- Root Directory: `presence-app`
- Output Directory: blank/default
- Build Command: `npm run build`
- Install Command: `npm ci`
- Production Branch: `feature/presence-ecosystem-alpha`

Required production env vars:

- `NEXT_PUBLIC_API_BASE` or `NEXT_PUBLIC_PRESENCE_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional production env vars:

- `NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS`
- `NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT`

Never expose Supabase service-role keys, database URLs, control-plane secrets,
or smoke tokens through `NEXT_PUBLIC_*` variables.

## Supabase auth configuration

Presence uses the public Supabase anon key in the browser and sends the
resulting user access token to the backend owner API. Do not use the Supabase
service-role key in this app.

Required Supabase URL settings for production:

- Site URL: `https://presence-gilt.vercel.app`
- Redirect URL: `https://presence-gilt.vercel.app/auth/callback`
- Redirect URL: `https://presence-gilt.vercel.app/auth/reset-password`
- Redirect URL: `https://presence-gilt.vercel.app/auth/verify-email`

Email confirmation:

- Enable Confirm email.
- Keep the standard confirmation link working with `{{ .ConfirmationURL }}` so
  `/auth/callback` remains valid.
- For the `/auth/verify-email` code-entry flow, update the Confirm signup email
  template to include `{{ .Token }}` as the verification code.

The verify page uses:

```ts
supabase.auth.verifyOtp({ email, token, type: "email" })
```

The resend action uses:

```ts
supabase.auth.resend({ type: "signup", email })
```

After verification, users are sent to `/studio`. If the backend has no
Presence assigned to their user, Studio shows the honest "No Presence assigned
yet" state and does not create fake ownership client-side.
