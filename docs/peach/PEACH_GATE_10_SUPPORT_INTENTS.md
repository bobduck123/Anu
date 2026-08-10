# PEACH Gate 10 Support Intents

Date: 2026-07-31

## Status

Implemented as durable non-payment manual support intent persistence.

## Model

`PeachSupportIntent` persists:

- `id`
- `field_id`
- `field_slug`
- `support_type`
- `supporter_name`
- `supporter_contact`
- `amount_intent`
- `currency`
- `note`
- `payment_taken`
- `status`
- `created_at`
- `updated_at`

Support types:

- `membership`
- `one_off_support`
- `sponsor_access`
- `sponsor_field`
- `sponsor_yield`

Statuses:

- `manual_enquiry`
- `pending_follow_up`
- `closed`

## Payment hard block

`payment_taken` defaults false and has a database check constraint requiring false. The public API rejects `paymentTaken: true` with `payment_forbidden`.

No payment provider, checkout, cart, fake success state, or product grid was added.

## Public route

`POST /api/peach/fields/studying-ourselves/support-intents`

The public form is available at `/peach/support` and is linked from Field 001 support options. Its success copy confirms manual follow-up only and no payment taken.

## Steward route

`GET /api/control/peach/support-intents`

The steward UI lists support type, field relationship, contact/name where provided, amount intent, `paymentTaken: false`, note, and status.

## Audit event

`peach.support_intent.created`