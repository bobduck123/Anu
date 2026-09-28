# PEACH Gate 12 Staging Environment And Control Plane Evidence

Date: 2026-07-31

## Environment mode

Gate 12 used local/staging-equivalent environment values because hosted PEACH staging credentials were not present.

## Backend values used

- `DATABASE_URL`: `postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`
- `SECRET_KEY`: local rehearsal value
- `JWT_SECRET_KEY`: local rehearsal value
- `CONTROL_PLANE_SHARED_SECRET`: local rehearsal value
- `CONTROL_PLANE_ALLOWED_ROLES`: steward/admin-equivalent rehearsal roles
- `CONTROL_PLANE_JWT_AUDIENCE`: local rehearsal audience
- `CONTROL_REQUIRE_TOKEN_GRANT`: disabled for the local rehearsal client

## Frontend values used

- Local Next host: `http://localhost:3333`
- Public PEACH routes served with `Cache-Control: no-store, must-revalidate`
- Local control host accepted by the control route shell

## Control protection proof

Unauthenticated local control proxy request:

`curl.exe -i http://localhost:3333/api/control/core/api/control/peach/contributions`

Result:

`HTTP/1.1 401 Unauthorized`

Response code:

`control_session_required`

The backend PostgreSQL rehearsal also verified direct unauthenticated `GET /api/control/peach/contributions` returns 401.

## Control route proof

Local route:

`http://localhost:3333/control/peach`

Result:

`HTTP/1.1 200 OK`

Headers included:

- `x-control-host-allowed: true`
- `x-control-route: true`

## Hosted hold

Hosted PEACH staging is held until hosted environment values are supplied and the same control-plane checks can be repeated against deployed URLs.
