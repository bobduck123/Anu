# PEACH Gate 14 Private Access Evidence

Date: 2026-07-31

## Hosted private access result

HELD.

Hosted private staging access could not be verified because no PEACH hosted staging URL or platform access configuration was available.

## Local/private posture evidence

Public active Field API returned:

- `publicIndexing: noindex`
- `noindex: true`
- `contributionIntakeStatus: pilot_private`
- `publicContributionDisplay: false`
- `sensitiveMaterialCollection: false`
- `youthMaterialCollection: false`
- support options with `paymentTaken: false`
- Commons placeholder with `publicUrl: null`

Routes returned `Cache-Control: no-store, must-revalidate`.

## Control protection

Local control page returned control-route headers on the allowed local host:

- `x-control-host-allowed: true`
- `x-control-route: true`

Unauthenticated control proxy returned:

`HTTP/1.1 401 Unauthorized`, `control_session_required`

## Non-public proof

No Gate 14 work introduced:

- public contribution display;
- public contribution feed;
- public participant body exposure;
- public Commons release;
- public Yield release;
- checkout;
- cart;
- payment provider flow;
- fake payment success;
- product grid;
- bookstore/storefront framing;
- social feed;
- uploads;
- youth collection;
- sensitive testimony collection.

## Hosted requirement for Gate 15

Before a real trusted-adult hosted pilot, platform-level private access/noindex must be proven on the actual hosted URL through headers, robots/meta behavior, deployment protection, and control-route protection.
