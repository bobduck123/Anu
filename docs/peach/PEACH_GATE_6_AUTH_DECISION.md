# PEACH Gate 6 Auth Decision

Status: accepted for private staging rehearsal

## Chosen Steward Auth

Gate 6 upgrades steward access from a cookie containing the password to a signed, expiring, HTTP-only steward session cookie.

Steward API access uses a separate bearer token:

```text
Authorization: Bearer <PEACH_STEWARD_API_TOKEN>
```

## Required Environment Variables

- `PEACH_STEWARD_PASSWORD`
- `PEACH_STEWARD_SESSION_SECRET`
- `PEACH_STEWARD_API_TOKEN`
- `DATABASE_URL`

Local fallbacks exist only for development.

## Session/Cookie Handling

- Cookie name: `peach_steward_session`
- Cookie type: signed HMAC token
- Max age: 8 hours
- `httpOnly`: true
- `sameSite`: strict
- `secure`: true in production

## Route Protection

Protected pages:

- `/steward/contributions`
- `/steward/fields/studying-ourselves`

Protected APIs:

- `GET /api/steward/contributions`
- `PATCH /api/steward/contributions/:id/review`

Server actions that mutate steward state also verify auth inside the action.

## Limitations

- No external identity provider.
- No multiple steward roles.
- No password reset.
- No account lockout.
- No production secret manager.

## Before Public Launch

Replace this with a managed identity/session system, secret rotation, role separation, stronger audit trails, and formal operational access controls.
