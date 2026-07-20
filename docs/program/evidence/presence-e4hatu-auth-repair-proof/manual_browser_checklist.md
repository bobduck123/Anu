# e4hatu Hosted Browser Checklist

Date: 2026-05-23

Use a clean browser context on the hosted Presence frontend. Keep any
Playwright `storageState`, traces, HAR files, or screenshots containing auth
state under an ignored scratch path such as `.tmp/` and do not commit them.

## Target Proof

1. Sign in as `e4hatu@gmail.com`.
2. In browser devtools or a gated test trace, confirm the Supabase browser
   client has a session and `getUser()` resolves the target account without
   recording tokens.
3. Open Studio and confirm the GGM Room is listed.
4. Open GGM Studio detail for Room id `11`.
5. Hard refresh GGM Studio detail.
6. Open GGM owner analytics.
7. Hard refresh analytics.
8. Open the GGM Pass/RoomKey surface.
9. Navigate to the public GGM Room route and confirm page output does not show
   the account email, `platform_admin`, or entitlement status.
10. Navigate back to GGM Studio and confirm the session still holds.
11. Explicitly log out.
12. Re-open protected Studio, analytics, and Pass/RoomKey routes and confirm
   protected access is denied.

## Known-Good Regression Check

Repeat the core sign-in, one navigation, one hard refresh, and logout flow for
the known-good comparison account. If that account now fails, reopen the global
auth regression path instead of treating the incident as target-only.

## Evidence To Record

- timestamp and hosted frontend URL
- target/browser result for session existence as booleans only
- route status or visible state for Studio, analytics, and Pass/RoomKey
- logout denial result
- any first failing API route and status code
- whether comparison account still persists
