# Presence Auth Permanence Recovery Proof

Date: 2026-05-22

## Summary

The GGM pilot revealed that a real owner sign-in cannot be considered ready
until it survives route navigation and hard refresh. Diagnosis found that the
frontend used the Supabase SSR browser/server clients without the Next proxy
session refresh path required for the cookie-backed session lifecycle.

## Implemented

- Added a Next proxy boundary that calls Supabase `auth.getClaims()` and
  propagates refreshed cookies and no-cache headers.
- Kept Flask bearer-token owner authorization unchanged.
- Added a real-session hosted Playwright harness for Studio, analytics, passes,
  navigation, refresh, and logout proof.
- Allowed the frontend Supabase public client config to read either the legacy
  anon public key env or the publishable key env.

## Local Verification

```text
npm.cmd run typecheck
npm.cmd run build
```

The production build reports `Proxy (Middleware)` after the auth change.

## Hosted Verification Status

Pending. This pass does not have an authenticated browser storage state or an
interactive sign-in session for `e4hatu@gmail.com` available in the workspace.
After deploying the frontend fix, sign in on the hosted frontend and run:

```text
PRESENCE_AUTH_FRONTEND_URL=https://your-presence.vercel.app
PRESENCE_AUTH_GGM_ROOM_ID=<ggm-room-id>
PRESENCE_AUTH_STORAGE_STATE=<authenticated-storage-state-json>
npx playwright test --config=playwright.auth-permanence.config.ts
```

The smoke must prove Studio, GGM analytics, GGM passes/RoomKeys, refresh,
navigate-away/back, logout, and protected-page denial.

## Gate

Current auth gate: `NO-GO` for resuming GGM pilot until the proxy change is
deployed and the hosted real-session permanence smoke passes.
