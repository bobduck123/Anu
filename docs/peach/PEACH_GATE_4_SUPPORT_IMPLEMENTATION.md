# PEACH Gate 4 Support Implementation

Status: implemented as support intent capture, not payment

## Canonical Support Paths

Gate 4 preserves the Phase 1 support model:

- Membership
- One-off support
- Sponsor access
- Sponsor Field
- Sponsor Yield

These are represented as `SupportPath` values and Field support options. They are not products, SKUs, carts, affiliate items, subscriptions, tickets, or storefront inventory.

## Implemented Behavior

Public support is handled as manual intent capture:

- The Field page renders support options with what each option enables.
- The support form records supporter name, contact method, support path, and intended use.
- `POST /api/public/support/intents` writes a `SupportRecord`.
- The API returns `paymentTaken: false`.
- Support records are stored in `.peach-data/support-records.json` for local development.

## What Support Enables

Support copy and data stay tied to PEACH's Field economy:

- access for people who could not otherwise participate,
- production and facilitation costs,
- stewardship operations,
- contributor care and follow-up,
- archive and Commons return work,
- future Field creation.

## Deferred

- Payment provider integration.
- Receipts.
- Donor CRM sync.
- Membership account management.
- Sponsorship eligibility rules.
- Tax and charitable status language.
- Public sponsor attribution rules.

Payment must not be added as a storefront. Gate 5 should keep support connected to Field stewardship and Commons return.
