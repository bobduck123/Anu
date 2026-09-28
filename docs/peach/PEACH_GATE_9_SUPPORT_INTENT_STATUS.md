# PEACH Gate 9 Support Intent Status

Date: 2026-07-30

Status: Held

## Current support contract

PEACH support remains metadata-only and non-payment. Existing public PEACH read payloads keep support options as descriptive metadata with `paymentTaken: false`.

Gate 9 did not add payment capture, checkout, carts, product grids, ecommerce flows, or SupportIntent persistence.

## Why persistence was held

A durable SupportIntent table is low complexity technically, but it creates workflow commitments around contact consent, steward response, purpose classification, export, retention, spam/rate limits, and sponsor relationship handling. Those commitments should not be implied before the steward operating model exists.

## Required future shape

A later SupportIntent implementation should store:

- Purpose: membership, one-off support, sponsor access, sponsor Field, sponsor Yield
- Field/Yield relationship where applicable
- Contact method
- Optional note
- `paymentTaken: false`
- Steward handling status
- Audit event

It must still exclude real payment capture, checkout, cart, and product-grid behavior unless a later gate explicitly authorizes payments.
