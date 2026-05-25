# Sign-Out Route Safety

## New Contract

`GET /auth/sign-out` is compatibility-only and non-mutating. It redirects home without calling Supabase sign-out.

This applies equally to:

- normal browser navigation;
- Next prefetch;
- RSC navigation such as `/auth/sign-out?_rsc=...`;
- stale external links.

## Visible Owner Action

Studio now renders `SignOutButton`, a real button with no logout URL to prefetch. Only its click handler invokes:

```ts
createClient().auth.signOut()
```

and navigates home after successful sign-out.

## Defense in Depth

- There is no current owner UI `Link` to `/auth/sign-out`.
- The old route remains safe even if requested.
- The explicit button reports a retry label if sign-out fails instead of pretending success.

## Scope

No backend owner authorization or session-verification logic changed. This is a frontend sign-out initiation safety fix.
