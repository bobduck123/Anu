# Double-Login Fix

## Reproduced Defect Class

The browser test fixture can now simulate a valid login for which the next two `getSession()` reads return no session. This models the hosted report that the first route attempt behaves unauthenticated until another interaction occurs.

Before this repair, a single empty read would render the owner access gate. The route had no hydration grace and the sign-in form did not verify session persistence before redirecting.

## Implemented Behavior

- Password sign-in completes only when the persisted session token can be read back.
- Shared session resolution waits through a bounded hydration window before declaring a user signed out.
- Owner route reads retain the existing safe transient retry protection.
- A backend/network confirmation failure is retryable instead of being presented as a sign-in requirement.

## Automated Result

With two intentionally hidden post-sign-in session reads and an initial transient owner/editor read:

- one login reaches `/studio/101/editor`;
- the Canvas renders;
- no owner access gate appears;
- hard refresh remains authenticated;
- navigating to the diagnostic URL shows the same Canvas plus diagnostics.

## Non-Claim

Local simulation proves the application no longer fails on this race pattern. It does not establish the precise hosted cookie/cold-start timing cause until the deployed re-smoke is run.
