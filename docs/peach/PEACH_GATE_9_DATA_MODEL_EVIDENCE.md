# PEACH Gate 9 Data Model Evidence

Date: 2026-07-30

## Tables added

Gate 9 adds three ANU-native durable tables:

- `peach_contribution`
- `peach_consent_record`
- `peach_contribution_review_event`

The SQLAlchemy models are in `flora-fauna/backend/app/models.py`. The SQL migration is `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`.

## PeachContribution fields

- `id`
- `field_id`
- `field_slug`
- `contribution_type`
- `contributor_chosen_credit`
- `contact_method`
- `body_text`
- `visibility_preference`
- `credit_preference`
- `permission_for_yield`
- `sensitive_material_flag`
- `youth_material_flag`
- `review_status`
- `public_display`
- `steward_note`
- `reviewed_at`
- `reviewed_by`
- `created_at`
- `updated_at`

Default review status is `pending_review`. Default public display is false.

## PeachConsentRecord fields

- `id`
- `contribution_id`
- `consent_version`
- `consent_level`
- `permission_for_yield`
- `credit_preference`
- `visibility_preference`
- `accepted_terms`
- `created_at`
- `steward_reviewed_at`
- `steward_reviewed_by`

Consent is explicit and separate from review status. A contribution cannot stand in for consent.

## PeachContributionReviewEvent fields

- `id`
- `contribution_id`
- `previous_status`
- `new_status`
- `steward_id`
- `steward_note`
- `created_at`

This table records review transitions alongside the central `AuditLog` event.

## Enum values

Contribution type:

- `text_reflection`
- `question`
- `memory`
- `research_note`
- `archive_fragment`
- `other`

Visibility preference:

- `private`
- `internal`
- `anonymous_public`
- `credited_public`
- `yield_only`
- `follow_up_required`

Credit preference:

- `full_name`
- `chosen_name`
- `organization`
- `pseudonym`
- `anonymous`
- `credit_withheld`
- `follow_up_before_crediting`

Consent level:

- `private_to_stewards`
- `internal_discussion`
- `anonymous_quote`
- `public_credit`
- `yield_inclusion`
- `follow_up_required`

Review status:

- `pending_review`
- `held`
- `accepted_private`
- `rejected`

No public-approved status exists in Gate 9.

## Public/private handling

`peach_contribution.public_display` defaults false and has a database check constraint requiring false. The steward review API also rejects attempts to set `publicDisplay: true`. Public PEACH read APIs remain catalog projections and do not include contribution bodies.

## Rollback notes

The Gate 9 migration is additive. Rollback is the reverse-order drop of indexes and these three tables:

1. `peach_contribution_review_event`
2. `peach_consent_record`
3. `peach_contribution`

No existing PEACH read tables or Presence tables are modified by the migration.
