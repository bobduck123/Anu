# PEACH Gate 14 Hosted Route And API Evidence

Date: 2026-07-31

## Hosted route/API result

HELD.

No PEACH hosted private staging frontend or backend URL was available. No hosted route/API smoke was run and no hosted route/API proof is claimed.

## Missing hosted requirements

- PEACH hosted frontend URL.
- PEACH hosted backend URL.
- frontend server env `CORE_API_ORIGIN`.
- frontend server env `CONTROL_PLANE_HOSTS`.
- backend env `CONTROL_PLANE_HOSTS`.
- backend env `CONTROL_PLANE_SHARED_SECRET`.
- hosted control smoke auth header/token.

## Local route/API fallback check

Local target:

`http://localhost:3336`

Route results:

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK` on local control-allowed host

Protected control proxy:

- `/api/control/core/api/control/peach/contributions` -> `HTTP/1.1 401 Unauthorized`, `control_session_required`

## Public active Field API

`/api/peach/fields/active` returned:

- `orchard.publicIndexing: noindex`
- `field.noindex: true`
- `field.publicContributionDisplay: false`
- `field.sensitiveMaterialCollection: false`
- `field.youthMaterialCollection: false`
- support options with `paymentTaken: false`
- placeholder Commons entry with `publicUrl: null`

No participant contribution bodies were exposed.
