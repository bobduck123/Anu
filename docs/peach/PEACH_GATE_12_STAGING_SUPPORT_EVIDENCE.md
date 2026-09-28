# PEACH Gate 12 Staging Support Evidence

Date: 2026-07-31

## Target

Staging-equivalent PostgreSQL database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`

## Support intents created

| ID | Intent type | Status | Payment taken |
| --- | --- | --- | --- |
| 1 | `membership` | `manual_enquiry` | `false` |
| 2 | `sponsor_access` | `manual_enquiry` | `false` |
| 3 | `sponsor_yield` | `manual_enquiry` | `false` |

## Audit evidence

Audit count:

`peach.support_intent.created`: 3

## Payment protection

All persisted support intents had `payment_taken = false`.

The database rejected a direct attempt to set `payment_taken = true`.

## Public support route

Route:

`http://localhost:3333/peach/support`

Result:

`HTTP/1.1 200 OK`

The page records manual support interest only. It does not expose checkout, cart, product grid, payment provider redirect, fake payment success, or public payment confirmation.
