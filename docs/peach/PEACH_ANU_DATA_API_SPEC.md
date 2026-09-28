# PEACH ANU Data And API Spec

Status: Gate 7 draft for Gate 8 implementation
Date: 2026-07-30

## Scope

This spec defines the ANU-native PEACH data/API target at a contract level. It intentionally does not introduce database migrations in Gate 7.

## Read Models

### Field

Minimum fields:

- id
- node_id or node_slug
- slug
- title
- status
- season
- steward_display_name
- short_description
- seed
- reason_for_now
- soil
- intended_yield
- return_plan
- contribution_intake_status
- support_status
- access_level
- safety_notes
- created_at
- updated_at

### Vessel

Minimum fields:

- id
- field_id
- type
- title
- access_path
- reason
- rights_note
- sort_order

### Gathering

Minimum fields:

- id
- field_id
- event_id nullable
- title
- format
- timing
- purpose
- steward_or_facilitator
- sort_order

### Tending Prompt

Minimum fields:

- id
- field_id
- text
- guidance
- active
- sort_order

## Mutating Models For Gate 8

### Contribution

Required constraints:

- created only against an active Field and prompt/general contribution path;
- private by default;
- never public before steward review;
- consent version recorded at submission;
- sensitive/youth/rights flags force held or follow-up-required handling;
- upload support disabled until separately approved.

### ConsentRecord

Required constraints:

- versioned;
- immutable once created except explicit replacement or withdrawal workflow;
- linked to contribution;
- records visibility preference, consent level, yield permission, credit preference, and accepted terms.

### ConsentOperationRequest

Required constraints:

- supports withdrawal and export requests;
- status flow: pending_steward_review, in_review, completed, declined;
- audit logged at each transition;
- export bundles are not generated until Gate 8+ implements identity verification and bundle rules.

### SupportRecord

Required constraints:

- manual enquiry only until impact-service/payment mapping is approved;
- no Stripe checkout, subscription, or cart behavior in Gate 7;
- no sponsor access to private Contributions.

## Public API Target

Read-only public endpoints for Gate 8 candidate implementation:

- GET /api/peach/fields
- GET /api/peach/fields/:slug

Public responses may include Field, Vessel, Gathering, Prompt, Yield, Return, and support description data. Public responses must not include private Contributions, unreviewed material, internal notes, contact methods, consent records, or steward-only status details.

## Mutating API Target

Held until Gate 8:

- POST /api/peach/fields/:slug/contributions
- POST /api/peach/fields/:slug/support-intents
- POST /api/peach/consent-operations
- PATCH /api/peach/steward/contributions/:id/review

Required controls before implementation:

- Supabase/Auth role separation;
- same-origin and CSRF controls for browser mutations;
- distributed rate limiting;
- structured request logging;
- RLS or service-side authorization;
- private-staging allowlist;
- steward audit logs;
- explicit youth/sensitive-material block or follow-up handling.

## Current Gate 7 Implementation

The only code-level data implementation in Gate 7 is a static Field 001 fixture in frontend-next/src/data/peach/field001.ts and a read-only route at /peach. This is not the production database model.
