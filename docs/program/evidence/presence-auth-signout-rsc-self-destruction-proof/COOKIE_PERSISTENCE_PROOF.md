# Cookie Persistence Proof

## Local Automated Method

The local E2E Supabase mock now writes a non-secret test cookie, `presence_e2e_session`, when the owner signs in and removes it only when explicit sign-out occurs. This represents the real hosted Supabase session-cookie lifecycle without storing hosted tokens in evidence.

The dedicated browser test:

1. logs in once;
2. opens the standard editor;
3. asserts there is no logout anchor;
4. waits five seconds with the editor rendered;
5. records every request to `/auth/sign-out`;
6. asserts no sign-out request occurred and the test session cookie remains;
7. hard-refreshes the editor;
8. opens debug editor and private preview;
9. asserts the cookie remains and no sign-out request was generated.

## GET/RSC Test

The test then explicitly navigates to:

- `/auth/sign-out`
- `/auth/sign-out?_rsc=signout-prefetch-proof`

Both GETs preserve the session cookie, return no cookie-clearing header, and allow the owner to reopen the editor.

## Explicit Logout Test

Clicking the visible `Sign out` button removes the test session cookie and the next editor navigation renders the sign-in gate.

## Hosted Boundary

Local mock-cookie proof must be followed by a hosted check of the real `sb-...-auth-token.*` cookies after deployment.
