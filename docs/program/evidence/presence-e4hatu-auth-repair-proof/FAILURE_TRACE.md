# Failure Trace

Date: 2026-05-23

## Trace Method

The verifier minted short-lived subject-shaped JWTs from the controlled backend
context using the active hosted Supabase subject internally. It did not print
those JWTs. This exercises the same Presence owner identity resolution branch
used by an external Supabase token subject while keeping the trace free of real
browser storage state.

## Before Repair

Provider/account checks:

- Supabase auth user exists, confirmed, not banned, not deleted
- one email provider identity exists
- Presence user, GGM Room owner link, role, and lifetime comp exist
- active Supabase subject fingerprint and stored Presence subject fingerprint
  differ

Subject-shaped owner route trace:

| Route surface | Before repair |
|---|---|
| owner nodes | `401` |
| GGM owner detail | `401` |
| GGM analytics | `401` |
| GGM passes | `401` |
| GGM RoomKeys | `401` |

The backend logged the intended identity conflict message for the target email.

## Classification

Root cause classification: `G. Duplicate app user/external_subject mismatch`
in the diagnostic frame, more specifically a stale Presence
`global_subject_id` on the existing privileged app user.

The active Supabase auth user was healthy. Presence owner hydration failed
before role and entitlement payloads could be causal.

## After Repair

The same subject-shaped route probes return:

| Route surface | After repair |
|---|---|
| owner nodes | `200` |
| GGM owner detail | `200` |
| GGM analytics | `200` |
| GGM passes | `200` |
| GGM RoomKeys | `200` |

The deployed backend smoke in `hosted_backend_subject_smoke.json` also passes
against the hosted backend URL.

## Browser Boundary

This trace does not replace a clean-browser Supabase sign-in for
`e4hatu@gmail.com`. A browser proof must still confirm that the repaired
binding resolves the user-observed navigation symptom.
