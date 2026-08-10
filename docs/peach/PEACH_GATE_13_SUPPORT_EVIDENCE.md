# PEACH Gate 13 Support Evidence

Date: 2026-07-31

## Pilot mode

Surrogate-only pilot against staging-equivalent PostgreSQL.

## SupportIntents submitted

| Participant | SupportIntent ID | Type | Status | Payment taken | Understood no payment |
| --- | --- | --- | --- | --- | --- |
| Participant A | 1 | `membership` | `manual_enquiry` | `false` | Yes |
| Participant B | 2 | `sponsor_yield` | `manual_enquiry` | `false` | Yes |

## Persistence evidence

- `peach_support_intent` rows: 2
- `payment_taken` values: `[false, false]`
- `peach.support_intent.created` audit events: 2

## Steward visibility

Protected steward support list returned 2 SupportIntents.

Unauthenticated steward support list returned 401.

## Payment protection

A direct `paymentTaken: true` support attempt was rejected:

- status: `400`
- code: `payment_forbidden`

## Product boundary

No checkout, cart, payment provider redirect, fake payment success, product grid, bookstore, storefront, or public payment confirmation appeared in the PEACH support flow.
