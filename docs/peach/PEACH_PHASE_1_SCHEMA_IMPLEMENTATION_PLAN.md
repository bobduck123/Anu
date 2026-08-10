# PEACH Phase 1 Schema Implementation Plan

## Purpose

This document translates `PEACH_DATA_MODEL_V1_SPEC.md` into an implementation plan. It is not a migration. It defines what tables/collections/models Gate 4 should create and how they should be ordered.

## Required Tables / Collections / Models

| Model | Phase 1 requirement | Notes |
| --- | --- | --- |
| `orchards` | static/configured | One active Orchard only. |
| `stewards` | required | Auth-linked later; at least one lead steward. |
| `fields` | required | Root object for public and admin routes. |
| `seeds` | required | Can be one-to-one with Field; keep revision/audit path. |
| `soil_sections` | required | One or more ordered sections. |
| `vessels` | required | Flexible `type`; books are only one type. |
| `gatherings` | required | Interpretive moments, not standalone event platform. |
| `tending_prompts` | required | Structured contribution prompts. |
| `contributors` | required | Lightweight contact/credit records; no public profiles. |
| `contributions` | required | Pending by default, never public by default. |
| `consent_records` | required | Explicit, durable, versioned/append-only where possible. |
| `yields` | required | One planned/released Yield for Field 001. |
| `commons_entries` | required before Return | Can be draft until Yield returns. |
| `patrons_supporters` | optional/manual | Required once support records are captured. |
| `support_transactions` | required for support metadata | Can represent manual/external payments. |
| `field_updates` | optional/recommended | Useful for participant updates. |
| `audit_events` | required | Required for status, consent, review, Return, support edits. |

## Enums

Implement enums from `PEACH_DATA_MODEL_V1_SPEC.md`:

- `FieldStatus`
- `Visibility`
- `ContributionType`
- `VesselType`
- `ContributionReviewStatus`
- `ConsentLevel`
- `ConsentStatus`
- `SupportPath`
- `SupportStatus`
- `YieldStatus`
- `GatheringStatus`
- `PromptStatus`

## Required Indexes

| Model | Index |
| --- | --- |
| `fields` | unique `slug`; `(status, visibility)`; `primary_steward_id`; `orchard_id`. |
| `seeds` | `field_id`; `(field_id, status)`. |
| `soil_sections` | `(field_id, sort_order)`; `(field_id, visibility)`. |
| `vessels` | `(field_id, sort_order)`; `(field_id, type)`; `(field_id, visibility)`. |
| `gatherings` | `field_id`; `starts_at`; `(field_id, status)`. |
| `tending_prompts` | `(field_id, status)`; `(field_id, sort_order)`. |
| `contributors` | contact/email where stored; chosen credit search optional. |
| `contributions` | `field_id`; `prompt_id`; `contributor_id`; `(field_id, review_status)`; `(field_id, visibility_preference)`; `submitted_at`. |
| `consent_records` | `contribution_id`; `contributor_id`; `(contribution_id, status)`; `recorded_at`. |
| `yields` | `field_id`; `(field_id, status)`. |
| `commons_entries` | `field_id`; `yield_id`; `(status, visibility)`; `return_date`. |
| `support_transactions` | `field_id`; `yield_id`; `supporter_id`; `(support_path, status)`; `transaction_date`. |
| `field_updates` | `field_id`; `(field_id, status, visibility)`; `published_at`. |
| `audit_events` | `(object_type, object_id)`; `actor_id`; `created_at`; `action`. |

## Public / Private Fields

Public-safe:

- Field title, status, short description, public support copy, Return plan.
- Approved Seed text and reason-for-now.
- Public Soil sections.
- Public Vessels with rights/access notes.
- Public Gatherings.
- Public/open TendingPrompts.
- Released Yield metadata/artifact.
- Returned CommonsEntry.
- Public steward name/team/contact path.

Private/internal:

- Contributor contact.
- Raw ConsentRecords.
- Pending/held/rejected/private/withdrawn Contributions.
- Internal steward notes.
- Private support/payment details.
- Audit event detail, except internal admin views.
- Youth/child flags and guardian details.

## Role / Permission Rules

| Role | Permissions |
| --- | --- |
| Visitor | Read public Field, Commons, Gathering, support pages. Submit public Contribution only when prompt/intake open. |
| Contributor | Submit Contribution; request withdrawal/takedown; update consent only through verified process. |
| Supporter | Create support intent; view own confirmation path. |
| Steward | Manage assigned Field content; review Contributions; manage consent/credit; update Yield; Return to Commons. |
| Admin | Manage all Fields, stewards, support reporting, and system settings. |

## Consent Enforcement Rules

- Every Contribution must have at least one active or follow-up-required ConsentRecord.
- `pending`, `held`, `rejected`, `private`, and `withdrawn` Contributions are never public.
- `selected` Contributions can enter Yield only with compatible active consent.
- Consent level `follow_up_required` blocks publication and Yield use.
- Consent withdrawal/dispute blocks new public or Yield use.
- Raw ConsentRecords are admin/steward-private only.
- Accepted Contributions are not public by default.

## Audit Fields

All core models should include:

- `created_at`
- `updated_at`

Sensitive models/actions should additionally record:

- `created_by`
- `updated_by`
- `reviewed_by`
- `reviewed_at`
- `decision_reason`
- audit event rows with previous/new state summaries.

## Seed Data Needed For Field 001

Minimum seed data:

- Orchard: `peach`.
- Steward: `PEACH founding steward`.
- Field: `studying-ourselves`, status `tending`, visibility `public`.
- Seed: "What does a community learn when it studies itself as seriously as institutions study it?"
- Soil summary/body from `PEACH_FIELD_V1_SPEC.md`.
- Vessels:
  - Community self-study question set.
  - Local or organizational archive fragment.
  - Recorded conversation with a community memory-holder.
  - Public institutional representation of the community.
  - Cultural work made from self-observation.
- Gatherings:
  - Reading The Outside View.
  - Making From The Inside View.
- Tending prompts:
  - Outsider question / self-question.
  - Object/place/phrase/document/image/memory.
  - Hard-won learning to preserve.
- Yield: "Studying Ourselves: A First PEACH Field Report", status `planned`.
- CommonsEntry: draft/planned return.
- Support options: membership, one-off support, sponsor access, sponsor Field, sponsor Yield, institutional inquiry.

## Migration Order If Applicable

1. Enums.
2. `orchards`.
3. `stewards`.
4. `fields`.
5. `seeds`.
6. `soil_sections`.
7. `vessels`.
8. `gatherings`.
9. `tending_prompts`.
10. `contributors`.
11. `contributions`.
12. `consent_records`.
13. `yields`.
14. `commons_entries`.
15. `patrons_supporters`.
16. `support_transactions`.
17. `field_updates`.
18. `audit_events`.
19. Field 001 seed data.

## Can Remain Static / Manual For Now

- Orchard config.
- Initial public Field content.
- Support payment settlement.
- Sponsor agreements.
- Email sends.
- Yield production.
- Commons formatting before Return.
- Rights review notes, if stored on Vessel.

## Must Not Be Manual

- Contribution consent.
- Contribution review status.
- ConsentRecord durability/versioning.
- Public/private contribution visibility.
- Withdrawal/takedown request state.
- Field lifecycle status.
- Steward identity for review/publication actions.
- Support metadata when money or sponsor commitments exist.

## Explicit Boundaries

- No `books` table as primary product object.
- No cart, SKU, inventory, product grid, affiliate URL schema, or dropship flow.
- No public comments/feed before reviewed Contributions.
- No public Contribution display without compatible ConsentRecord.
- No sponsor access to private Contribution data.

