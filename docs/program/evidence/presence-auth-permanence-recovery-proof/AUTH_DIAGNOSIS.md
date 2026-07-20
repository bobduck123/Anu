# Presence Auth Permanence Diagnosis

Date: 2026-05-22

## Failure Surface

The GGM owner handoff exposed a real-auth gap that prior hosted pilot smoke did
not prove: a signed-in browser session must survive normal navigation and hard
refresh while moving from public Presence routes into owner Studio routes.

Studio currently does the following on every owner route load:

1. Creates the browser Supabase SSR client.
2. Reads `supabase.auth.getSession()`.
3. Passes `session.access_token` as a bearer token to Flask owner APIs.

That means a missing or stale browser Supabase session immediately looks like a
logged-out Studio, even when the backend owner role and GGM Room ownership are
correct.

## Code Path Inspected

Frontend:

- `presence-app/lib/supabase/client.ts` uses `createBrowserClient()` from
  `@supabase/ssr`. Its package source confirms browser clients are singleton by
  default and persist cookie-backed sessions, so repeated `createClient()` calls
  are not the primary failure by themselves.
- `presence-app/lib/supabase/server.ts` uses `createServerClient()` with
  `next/headers` cookies for route handlers.
- `presence-app/app/auth/callback/route.ts` exchanges Supabase PKCE callback
  codes for a session on the server cookie client.
- `presence-app/app/auth/sign-out/route.ts` is the explicit logout path.
- `presence-app/app/(studio)/studio/page.tsx` and
  `presence-app/components/studio/useOwnerNode.ts` read the browser session
  before owner API calls.
- No `presence-app/proxy.ts`, `middleware.ts`, or Supabase session refresh
  helper exists in the app.
- Search found no unexpected production `signOut`, cookie deletion, or auth
  local-storage clearing path outside explicit sign-out and the isolated E2E
  auth mock.

Backend:

- Owner routes require bearer JWT auth. Flask maps the Supabase token to the
  app user and enforces owner or `platform_admin` authorization.
- This backend contract does not create a browser session and is not a valid
  workaround for missing Supabase session persistence in the frontend.

## Root Cause Class

Presence adopted the Supabase SSR browser/server client split without the
required Next.js proxy/session refresh path. The installed `@supabase/ssr`
package documents this omission as a cause of early session termination and
random logout behavior when server-side cookie-backed auth is used. Supabase
current Next.js SSR guidance likewise requires a proxy that refreshes auth
claims and writes refreshed cookies to both the request and the response.

The existing route-handler callback is necessary, but it is not the full
session-maintenance contract for Next.js SSR auth. The missing proxy leaves the
cookie session lifecycle incomplete while Studio re-evaluates that session on
each route transition.

## Contributing Gaps

- Existing Playwright Studio proofs either use the local E2E auth mock or only
  prove signed-out owner gating. They do not exercise a real cookie-backed
  Supabase session over navigation and refresh.
- Hosted controlled-launch proof verified sign-in configuration and backend
  owner APIs separately. It did not run an interactive GGM owner browser session.
- The auth redirect fix added on 2026-05-22 removes localhost recovery and
  signup callback targets in app code, but Supabase Dashboard redirect allow
  lists and email templates still require operator confirmation.

## Fix Direction

Add the standard minimal Supabase Next.js proxy path:

1. Create a request-scoped proxy Supabase server client with request/response
   cookie `getAll` and `setAll`.
2. Call `auth.getClaims()` in the proxy so refresh writes cookie updates before
   route rendering.
3. Exclude static/image assets from the proxy matcher.
4. Keep Flask owner authorization unchanged. The fix preserves bearer-token
   verification rather than replacing auth with frontend state.
5. Add focused regression proof for proxy cookie propagation, auth callback
   session exchange routing, sign-out behavior, and a manual-assisted real-auth
   Playwright path for hosted navigation and refresh.

## Verification Boundary

The local code diagnosis identifies the integration fault. Hosted success still
requires a deployed browser-session smoke with a real Supabase sign-in for the
GGM owner account or an approved manual-assisted storage state captured from
that sign-in.
