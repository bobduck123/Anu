# Hosted Re-Smoke Steps

Run after deployment against `https://your-presence.vercel.app` using room `11`.

## Narrow Session Safety Proof

1. Open a fresh incognito browser context with network monitoring and cookie inspection enabled.
2. Log in as the assigned owner once.
3. Record the presence of the Supabase `sb-...-auth-token.*` cookies without copying their values.
4. Clear the network log.
5. Open `/studio/11/editor`.
6. Confirm Canvas renders without the owner access gate.
7. Wait ten seconds.
8. Confirm no request to `/auth/sign-out` or `/auth/sign-out?_rsc=...` occurred.
9. Confirm the Supabase auth cookies remain present and are not expired.
10. Hard refresh `/studio/11/editor`; confirm access remains.
11. Open `/studio/11/editor?debug=1`; confirm the same editor plus display-only diagnostics.
12. Open `/studio/11/editor/preview`; confirm private draft preview renders.
13. Confirm none of those navigations trigger sign-out or cookie clearing.

## Denial and Explicit Logout

1. In an anonymous context, confirm standard editor and preview remain denied.
2. Return to the authenticated context.
3. Click the visible `Sign out` button.
4. Confirm Supabase auth cookies clear only after that click.
5. Reopen `/studio/11/editor`; confirm the sign-in gate appears.

## Result Recording

Record:

- deployment identifier;
- whether any unintended `/auth/sign-out` request occurred;
- cookie presence before and after ordinary navigation;
- cookie clearing after explicit sign-out only;
- standard editor, hard refresh, and preview result.
