# PEACH Gate 12 Staging Route And API Evidence

Date: 2026-07-31

## Route target

Local Next server:

`http://localhost:3333`

Command:

`npm run dev -- -p 3333`

## Route checks

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK`

The public routes returned `x-control-host: true` on localhost and `Cache-Control: no-store, must-revalidate`.

The control route returned:

- `x-control-host-allowed: true`
- `x-control-route: true`

## Protected control API proof

Unauthenticated request:

`curl.exe -i http://localhost:3333/api/control/core/api/control/peach/contributions`

Result:

`HTTP/1.1 401 Unauthorized`

Response:

`control_session_required`

## Public active field API proof

Route:

`curl.exe -s http://localhost:3333/api/peach/fields/active`

Important returned values:

- `ok: true`
- `orchard.publicIndexing: noindex`
- `field.contributionIntakeStatus: pilot_private`
- `field.publicContributionDisplay: false`
- `field.sensitiveMaterialCollection: false`
- `field.youthMaterialCollection: false`
- `field.noindex: true`
- all support options returned `paymentTaken: false`
- Commons entry remained a placeholder with `publicUrl: null`

No participant contribution bodies were exposed by the public active-field API.

## Public release status

No public bodies, uploads, youth material, sensitive testimony, public contribution feed, public Commons release, public Yield release, or payment flow was exposed by the route/API checks.
