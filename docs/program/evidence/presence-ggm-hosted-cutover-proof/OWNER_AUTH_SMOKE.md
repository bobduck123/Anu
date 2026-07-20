# Hosted GGM Owner Auth Smoke

Date: 2026-05-23

## Current result

Owner API authorization proof passed for the current bound e4hatu Presence
account. Interactive hosted browser sign-in proof was not executed in this pass
because no authenticated Playwright `storageState` or interactive credential
handoff was available in the workspace.

This remains a launch blocker because the final gate requires the hosted browser
owner flow itself, not only the backend owner routes.

## API proof completed

`owner_auth_results.json` records a server-side subject-bound smoke for the
current hosted GGM app user:

- GGM owner Studio node route: `200`
- GGM owner Room analytics route: `200`
- GGM owner RoomKey management route: `200`
- public Room redaction: passed
- protected World readiness control path remained bounded and hidden/forming
- previous fixture owner analytics negative: `403`

`owner_analytics_results.json` separately proves GGM RoomKey and public-view
interactions increment current-owner aggregate analytics without private
identity keys.

## Browser proof still needed

Run the browser proof using a clean context for `e4hatu@gmail.com`:

1. Sign in on the hosted frontend.
2. Open `/studio/11`, refresh, and confirm the session remains.
3. Open `/studio/11/analytics`, refresh, and confirm analytics render.
4. Open `/studio/11/passes` and the RoomKey/pass surface.
5. Navigate to the public GGM Room and back to Studio.
6. Log out and confirm the protected Studio surfaces deny access.
7. Store only redacted evidence. Do not commit storage state, tokens, or reset
   links.
