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

For current pilots and public beta, this app provides the Presence landing
page, public beta entry routes, auth flows, beta onboarding, and owner Studio.

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
NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true
NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false
NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT=mailto:hello@presence.studio

npm run dev -- --port 3001
npm run typecheck
npm run build
```

## Routes

Public:
- `/` - Presence landing page with Gallery and Studio choices
- `/beta` - public beta explanation and start CTA
- `/onboarding` - protected beta onboarding and private draft creation flow
- `/beta/onboarding` - legacy redirect to `/onboarding`
- `/gallery` - alpha public gallery entry, no private data
- `/healthz` - deployment health check
- `/p/[slug]` - public portfolio
- `/p/[slug]/works/[workId]` - public work detail
- `/p/[slug]/collections/[collectionId]` - public collection detail

Auth:
- `/auth/sign-in` - Supabase email/password sign-in
- `/auth/sign-up` - public beta account creation when signups are enabled
- `/auth/verify-email` - code entry and resend when verification is enabled
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
- `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION`
- `NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT`

Never expose Supabase service-role keys, database URLs, control-plane secrets,
or smoke tokens through `NEXT_PUBLIC_*` variables.

## Supabase auth configuration

Presence uses the public Supabase anon key in the browser and sends the
resulting user access token to the backend owner API. Do not use the Supabase
service-role key in this app.

Required Supabase URL settings for production:

- Site URL: `https://your-presence.vercel.app`
- Redirect URL: `https://your-presence.vercel.app/auth/callback`
- Redirect URL: `https://your-presence.vercel.app/auth/reset-password`
- Redirect URL: `https://your-presence.vercel.app/auth/verify-email`
- Redirect URL: `https://your-presence.vercel.app/presence-chooser`

(The legacy host `presence-gilt.vercel.app` is now remapped to
`your-presence.vercel.app` by `activePresenceOrigin()` — see
`lib/presence/url.ts`. Update Supabase to the new origin to avoid
silent redirects.)

Testing without email verification:

- Supabase Dashboard -> Authentication -> Providers -> Email.
- Disable Confirm email.
- Save.
- Redeploy `presence-app` with
  `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false`.
- After signup, Supabase should return a session and Presence routes directly
  to `/onboarding`.
- If signup succeeds but no session exists, Confirm email is still enabled or
  the Supabase auth settings are not aligned with this test mode.

Production email confirmation:

- Set `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=true`.
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

After signup or verification, users are sent to `/onboarding`. The onboarding
flow creates a real owner-bound draft through
`POST /api/presence/owner/beta/start`. If the backend has no Presence assigned
or draft creation is unavailable, Studio shows an honest next action and does
not create fake ownership client-side.

## Public beta mode

Current beta mode is hybrid:

- Public users can create a Presence Studio account when
  `NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true`.
- For local/staging testing, set
  `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false` and disable Confirm
  email in Supabase so signup immediately opens `/onboarding`.
- For production verification, set
  `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=true` and configure
  Supabase Site URL, redirect URLs, and the Confirm signup template.
- `/onboarding` collects public-world direction and creates a private draft
  Presence when the authenticated user does not already have one.
- If a backend owner Presence is already assigned, `/studio` opens normally.
- If no Presence is assigned, `/studio` links back to beta onboarding.

The app does not create fake owner records client-side. Self-service draft
creation uses the tested owner-safe backend endpoint. Any beta-created Presence
starts draft/private/unpublished and is not public by default.

For public beta deployment:

- Set `NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true`.
- Set `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false` for test mode or
  `true` for production email confirmation.
- Set `NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT` to a monitored `mailto:` address.
- Redeploy after changing `NEXT_PUBLIC_*` variables because Vercel bakes them
  into the client bundle at build time.

Self-service draft creation uses the narrow owner endpoint
`POST /api/presence/owner/beta/start`. It requires auth, creates only
draft/private/unpublished Presences, prevents duplicate slugs, and never
exposes other owners' records.
