# PEACH Gate 11 Route And API Evidence

Date: 2026-07-31

## Local server

Command:

`npm run dev -- -p 3331`

## Route checks

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK` on local control-allowed host

## Protected control API proof

Unauthenticated control proxy request:

`curl.exe -i http://localhost:3331/api/control/core/api/control/peach/contributions`

Result: `HTTP/1.1 401 Unauthorized`, `control_session_required`.

Backend rehearsal also verified direct unauthenticated `GET /api/control/peach/contributions` returns 401.

## Public API proof

`/api/peach/fields/active` returned:

- `publicContributionDisplay: false`
- `sensitiveMaterialCollection: false`
- `youthMaterialCollection: false`
- support options with `paymentTaken: false`
- no submitted contribution bodies
- no public Commons/Yield release, only a placeholder Commons entry

## Anti-pattern scan

Implementation-path scan found only expected guardrail/test text:

- `test_peach_gate9.py` posts `reviewStatus: "published"` to prove public-approved status is rejected.
- `PeachFieldView.tsx` names real payments/checkout as a held surface.
- `PeachSupportIntentForm.tsx` says no checkout, cart, or product grid exists.

No PEACH implementation introduced cart, checkout, product grid, social feed, storefront, public contribution feed, real payment, or public contribution display.