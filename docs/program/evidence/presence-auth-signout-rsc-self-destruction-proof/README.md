# Presence Auth Sign-Out RSC Self-Destruction Proof

## Summary

This pass fixes the confirmed hosted P0 cause of owner sessions disappearing during Studio navigation. Presence rendered `Sign out` as a Next `Link` to `/auth/sign-out`, while that route mutated authentication on `GET`. Next App Router prefetch/RSC requests could therefore call `/auth/sign-out?_rsc=...` and clear Supabase cookies without an owner click.

The repair is deliberately narrow:

- `GET /auth/sign-out`, including RSC/prefetch variants, is now non-mutating;
- Studio renders an explicit `SignOutButton`, not a destructive logout link;
- the explicit button invokes browser Supabase sign-out only after user activation;
- the hosted auth/permanence test now clicks the visible button rather than navigating to a destructive URL.

No owner authorization, draft preview, Canvas, readiness, publish, public rendering, RoomKey, or backend schema rule was weakened or expanded.

## Root Cause

Before this change:

1. [StudioShell.tsx](/C:/Dev/Flora_fauna/presence-app/components/studio/StudioShell.tsx) and `app/(studio)/studio/page.tsx` rendered `<Link href="/auth/sign-out">`.
2. [route.ts](/C:/Dev/Flora_fauna/presence-app/app/auth/sign-out/route.ts) called `supabase.auth.signOut()` in its `GET` handler.
3. Next navigation/prefetch issued `/auth/sign-out?_rsc=...` after owner editor render.
4. The GET response expired `sb-...-auth-token.*` cookies.
5. Editor and private preview then correctly saw no owner session and displayed the owner access gate.

## What Changed

Application:

- Added `presence-app/components/auth/SignOutButton.tsx`.
- Replaced both visible Studio logout links with explicit buttons.
- Made the compatibility `GET /auth/sign-out` route a harmless redirect without auth mutation.
- Kept actual logout on an explicit browser button click through Supabase client sign-out.

Testing:

- Added `presence-app/tests/e2e/auth-signout-rsc-safety.spec.ts`.
- Updated hosted auth permanence proof to click the explicit button.
- Enhanced the local browser auth mock with a session-cookie marker so cookie clearing/preservation can be asserted.

## Why Prefetch/RSC Can No Longer Sign Out

- There is no rendered anchor pointing to `/auth/sign-out` in owner Studio.
- If any old browser state, external navigation, or framework GET still requests `/auth/sign-out` or `/auth/sign-out?_rsc=...`, the route performs no sign-out operation.
- Logout now occurs only in the visible button click handler.

## Local Tests

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run build` | Passed |
| Targeted client/editor/readiness/render/RoomKey contracts | Passed, `19/19` |
| Playwright sign-out, auth gate, preview/publish, Canvas and RoomKey flows | Passed, `25/25` |
| `git diff --check` | Passed |

Existing non-blocking warning: Next.js reports its known multiple-lockfile workspace-root inference warning during build and browser test startup.

## Hosted Verification Required

This source fix has not yet been deployed and tested against the hosted Supabase cookies. Kimi must re-smoke on a fresh incognito session after deployment and confirm that no `/auth/sign-out` request or cookie expiry occurs during standard editor, refresh, debug, or preview navigation.

## Pilot Recommendation

The confirmed source-level session destroyer has been removed. Pilot approval remains blocked until deployed hosted verification proves real Supabase cookies persist during ordinary owner navigation and clear only after clicking `Sign out`.
