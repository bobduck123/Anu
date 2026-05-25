# Auth Flow Map

## Standard Owner Editor Before Repair

1. Password sign-in called Supabase `signInWithPassword()`.
2. On success, the UI immediately navigated to the requested Studio route.
3. `/studio/[id]/editor` mounted `useOwnerNode()`.
4. The hook called `supabase.auth.getSession()` once.
5. A transient null result was treated as confirmed anonymous state.
6. `StudioNodeGate` rendered the owner access page and did not retry session hydration.

## Private Preview Before Repair

1. `/studio/[id]/editor/preview` mounted its own load path.
2. It also called the shared token helper once.
3. A transient null result immediately set the sign-in gate.
4. The protected draft preview endpoint was never attempted.

## Auth Transport

- Frontend session state: Supabase browser cookie/session managed by `@supabase/ssr`.
- Middleware/session refresh: Next proxy calls Supabase claims refresh and propagates updated cookies.
- Backend authorization: browser sends Supabase access token as a bearer token to owner endpoints.
- Backend ownership: owner node and owner editor endpoints both resolve the same local Presence owner and enforce the same room ownership rule.

## Standard Owner Editor After Repair

1. Sign-in waits until the browser Supabase client can read its persisted session token.
2. The editor guard resolves the same session with a bounded hydration window.
3. While resolving it shows `Checking access...`.
4. Once a session exists it shows `Confirming Room access...` while the owner read completes.
5. Safe transient owner-read recovery remains bounded and read-only.
6. Only a confirmed absent session shows sign-in.
7. Only a confirmed forbidden response shows room denial.
8. Other failures show a retryable inability to confirm access.

## Preview After Repair

Preview uses the same hydration-aware owner session resolution, then its protected draft endpoints. During that sequence it shows `Checking access...` or `Warming secure preview...`, never public draft content.

## Security Boundary

No query parameter participates in authorization. No public preview endpoint, token bypass, schema change, or weakened backend owner check was introduced.
