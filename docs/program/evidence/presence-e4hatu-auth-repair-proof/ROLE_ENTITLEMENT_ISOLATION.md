# Role And Entitlement Isolation

Date: 2026-05-23

## Isolation Result

`platform_admin` and `internal_lifetime_free` are not the failure trigger
identified in this pass.

## Evidence

1. The target Supabase user state is healthy before owner APIs run.
2. Before repair, subject-shaped owner APIs fail at identity binding with
   `401` because the active Supabase subject does not match the stored Presence
   subject.
3. The rebind changes no role or entitlement fields.
4. After rebind, the same target role and entitlement remain in place while
   owner nodes, GGM detail, analytics, passes, and RoomKeys pass.
5. The existing focused regression tests prove:
   - `platform_admin` owner Studio/analytics/passes/control behavior works
   - a normal user remains denied
   - the lifetime-free entitlement is explicit, idempotent, zero-price, and
     does not grant admin

## Mutation Decision

No temporary hosted downgrade was needed. Mutating role or entitlement would
have been noisier than the direct binding proof and would not test the failing
branch.

## Follow-Up Isolation Hook

If a future browser trace still fails after this binding repair, use the
manual checklist and network trace to separate:

- Supabase browser session existence
- browser `getUser()` result
- first owner API response code
- Studio UI error handling

Do not remove admin or comp state unless that later trace proves they are
causal.
