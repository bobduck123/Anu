# PEACH Data Model V1 Specification

## Purpose

This document turns `PEACH_DATA_MODEL_DRAFT.md` into an implementation-ready Phase 1 data specification. It defines object fields, types, validations, relationships, visibility, ownership, audit requirements, and Phase 1 minimums.

This is not a migration or application code. It is the contract a later implementation should satisfy.

## Central Rule

The central PEACH object is `Field`.

Books must be represented only as one possible `Vessel.type`. Do not create a `Book` primitive, bookstore schema, product catalogue, affiliate link model, cart, or ecommerce-first data shape for Phase 1.

## Shared Enums

| Enum | Values |
| --- | --- |
| `FieldStatus` | `draft`, `upcoming`, `open`, `tending`, `making`, `yielding`, `returned`, `archived_dormant` |
| `Visibility` | `hidden`, `preview`, `public`, `internal`, `private`, `restricted`, `archived`, `anonymous_public`, `credited_public`, `community_access` |
| `ContributionType` | `text_reflection`, `question`, `memory`, `image`, `audio`, `video_link`, `file_upload`, `research_note`, `artwork`, `interview_note`, `archive_fragment`, `other` |
| `VesselType` | `book`, `film`, `song`, `artwork`, `oral_history`, `document`, `recipe`, `place`, `image`, `map`, `archive`, `letter`, `object`, `recording`, `essay`, `public_record`, `other` |
| `ContributionReviewStatus` | `pending`, `held`, `accepted`, `selected`, `rejected`, `private`, `withdrawn`, `published` |
| `ConsentLevel` | `private_to_stewards`, `internal_discussion`, `anonymous_quote`, `public_credit`, `yield_inclusion`, `follow_up_required` |
| `ConsentStatus` | `active`, `superseded`, `follow_up_required`, `withdrawn`, `disputed` |
| `SupportPath` | `membership`, `one_off_support`, `sponsor_access`, `sponsor_field`, `sponsor_yield`, `institutional_support`, `commissioned_field` |
| `SupportStatus` | `pending`, `completed`, `failed`, `refunded`, `cancelled`, `manual_recorded` |
| `YieldStatus` | `planned`, `in_progress`, `released`, `returned`, `revised`, `withdrawn`, `archived` |
| `GatheringStatus` | `draft`, `scheduled`, `open`, `completed`, `cancelled`, `archived` |
| `PromptStatus` | `draft`, `open`, `paused`, `closed`, `archived` |

## Object Specifications

### Orchard

| Requirement | Specification |
| --- | --- |
| Purpose | Represents the PEACH environment as a whole. Phase 1 has one active Orchard. |
| Required fields | `id: uuid`; `name: string`; `slug: string`; `description: text`; `status: enum(active, inactive)`; `created_at: datetime`; `updated_at: datetime`. |
| Optional fields | `public_label: string`; `default_support_copy: text`; `operating_notes: text`; `primary_contact_email: string`. |
| Validation rules | One active Orchard for Phase 1; slug unique; name required. |
| Relationships | Has many Fields, Stewards, Patrons/Supporters, CommonsEntries. |
| Status enum values | `active`, `inactive`. |
| Visibility enum values | `public`, `internal`, `hidden`. |
| Ownership/stewardship | Owned by PEACH admin. Stewards operate Fields inside it. |
| Audit requirements | Audit changes to name, public description, default support copy, active status. |
| Public read requirements | Public pages may read name, public label, description, and active Fields. |
| Admin write requirements | Admin only. Phase 1 should not expose multi-Orchard management. |
| Phase 1 minimum | One hardcoded/configured active Orchard. |
| Phase 2 expansion path | Multi-Orchard or partner workspace support if PEACH hosts institutions. |

### Field

| Requirement | Specification |
| --- | --- |
| Purpose | Core object: a cultivated area of communal attention opened around a Seed and moved through Soil, Vessels, Gatherings, Tending, Yield, and Return. |
| Required fields | `id: uuid`; `orchard_id: uuid`; `slug: string`; `title: string`; `short_description: text`; `status: FieldStatus`; `visibility: Visibility`; `primary_steward_id: uuid`; `season_label: string`; `access_level: enum(public, member, invite, private)`; `support_copy: text`; `return_plan: text`; `created_at`; `updated_at`. |
| Optional fields | `place: string`; `partner_name: string`; `language: string`; `content_notice: text`; `accessibility_notes: text`; `parent_field_id: uuid`; `launch_at: datetime`; `closed_at: datetime`; `returned_at: datetime`. |
| Validation rules | Slug unique; title required; steward required; public Field requires approved Seed, Soil summary, at least 3 Vessels unless explicitly source-gathering, Return plan, consent copy, and support state. Status transitions must follow lifecycle rules. |
| Relationships | Belongs to Orchard; has one Seed; has Soil sections; has many Vessels, Gatherings, TendingPrompts, Contributions, FieldUpdates, SupportTransactions, Yields; has zero or one primary CommonsEntry; has one or more Stewards. |
| Status enum values | `draft`, `upcoming`, `open`, `tending`, `making`, `yielding`, `returned`, `archived_dormant`. |
| Visibility enum values | `hidden`, `preview`, `public`, `restricted`, `archived`. |
| Ownership/stewardship | Primary steward accountable; admins may reassign. Sponsor support never grants write access. |
| Audit requirements | Status changes, visibility changes, steward changes, support copy, Return plan, major public text edits. |
| Public read requirements | Public can read Fields with `visibility=public` and status not `draft`, unless preview token used. |
| Admin write requirements | Steward/admin can write. Public cannot write Field records. |
| Phase 1 minimum | One active public Field plus admin editing. |
| Phase 2 expansion path | Multiple Fields, descendant Fields, richer access levels, partner-specific Fields. |

### Seed

| Requirement | Specification |
| --- | --- |
| Purpose | The central intrigue/question that opens a Field. |
| Required fields | `id: uuid`; `field_id: uuid`; `text: text`; `reason_for_now: text`; `tension_note: text`; `status: enum(draft, approved, revised, retired)`; `created_at`; `updated_at`. |
| Optional fields | `origin_note: text`; `approved_by: uuid`; `approved_at: datetime`; `revision_note: text`; `descendant_seed_id: uuid`. |
| Validation rules | Text required; must not be generic topic label; public Field requires approved Seed; major change after Tending creates revision note. |
| Relationships | Belongs to Field; may link to descendant Seed/Field. |
| Status enum values | `draft`, `approved`, `revised`, `retired`. |
| Visibility enum values | `public`, `internal`, `hidden`. |
| Ownership/stewardship | Steward drafts; admin or lead steward approves. |
| Audit requirements | Append revision history; log approver and material changes. |
| Public read requirements | Public Field exposes current approved Seed and reason-for-now. |
| Admin write requirements | Steward/admin editable; locked after Returned except correction/revision note. |
| Phase 1 minimum | One approved Seed for active Field. |
| Phase 2 expansion path | Seed lineage and proposed future Seeds. |

### Soil

| Requirement | Specification |
| --- | --- |
| Purpose | Context, history, people, place, and conditions surrounding the Seed. |
| Required fields | `id: uuid`; `field_id: uuid`; `summary: text`; `body: text`; `visibility: Visibility`; `sort_order: integer`; `created_at`; `updated_at`. |
| Optional fields | `section_title: string`; `source_notes: text`; `safety_notes: text`; `place_reference: string`; `internal_notes: text`. |
| Validation rules | Public Field requires summary; quoted or rights-sensitive material requires source/rights note; internal notes never public. |
| Relationships | Belongs to Field; may reference Vessels. |
| Status enum values | `draft`, `public`, `revised`, `archived`. |
| Visibility enum values | `public`, `internal`, `restricted`, `hidden`. |
| Ownership/stewardship | Steward owns public context and safety notes. |
| Audit requirements | Public revisions after Open; source note edits. |
| Public read requirements | Public reads `summary`, public `body`, source notes where appropriate. |
| Admin write requirements | Steward/admin can create ordered sections. |
| Phase 1 minimum | One public summary/body section. |
| Phase 2 expansion path | Timelines, maps, layered sources, archive references. |

### Vessel

| Requirement | Specification |
| --- | --- |
| Purpose | A source or entry point that helps participants enter the Field. |
| Required fields | `id: uuid`; `field_id: uuid`; `type: VesselType`; `title: string`; `access_path: string`; `why_it_belongs: text`; `rights_note: text`; `visibility: Visibility`; `sort_order: integer`; `created_at`; `updated_at`. |
| Optional fields | `creator: string`; `source_name: string`; `source_url: string`; `date_label: string`; `excerpt: text`; `media_asset_id: string`; `accessibility_note: text`; `steward_annotation: text`. |
| Validation rules | Type required and flexible; `book` is only one type; rights note required for public display; no price/cart/product fields in Phase 1. |
| Relationships | Belongs to Field; may be referenced by Gatherings, prompts, Yield, CommonsEntry. |
| Status enum values | `draft`, `public`, `removed`, `rights_restricted`, `archived`. |
| Visibility enum values | `public`, `internal`, `restricted`, `hidden`. |
| Ownership/stewardship | Steward curates and is responsible for rights/access notes. |
| Audit requirements | Add/remove/reorder, rights note changes, public visibility changes. |
| Public read requirements | Public reads public Vessels on Field and Commons pages. |
| Admin write requirements | Steward/admin can manage. |
| Phase 1 minimum | 3-5 public Vessels for active Field. |
| Phase 2 expansion path | User-suggested Vessels, annotations, richer media/source metadata. |

### Gathering

| Requirement | Specification |
| --- | --- |
| Purpose | A live, digital, recorded, or asynchronous moment of collective interpretation. |
| Required fields | `id: uuid`; `field_id: uuid`; `title: string`; `format: enum(live, digital, recorded, asynchronous, place_based, hybrid)`; `status: GatheringStatus`; `starts_at: datetime nullable`; `availability_window: string nullable`; `facilitator: string`; `purpose: text`; `access_details: text`; `created_at`; `updated_at`. |
| Optional fields | `capacity: integer`; `registration_required: boolean`; `rsvp_url: string`; `recording_url: string`; `transcript_url: string`; `notes: text`; `related_vessel_ids: uuid[]`; `related_prompt_ids: uuid[]`. |
| Validation rules | Must connect to Seed/Yield pathway; either `starts_at` or `availability_window` required; cancellation requires reason/update. |
| Relationships | Belongs to Field; may have RSVPs if implemented; may reference Vessels/prompts. |
| Status enum values | `draft`, `scheduled`, `open`, `completed`, `cancelled`, `archived`. |
| Visibility enum values | `public`, `member_only`, `private`, `unlisted`, `archived`. |
| Ownership/stewardship | Steward/facilitator accountable for access details and recording consent. |
| Audit requirements | Schedule changes, cancellation, recording/transcript publication. |
| Public read requirements | Public reads public Gatherings and status. |
| Admin write requirements | Steward/admin create/update/cancel. |
| Phase 1 minimum | Two interpretive Gatherings or equivalent surfaces. RSVP can be simple. |
| Phase 2 expansion path | Native RSVPs, attendance, reminders, recordings, transcripts. |

### TendingPrompt

| Requirement | Specification |
| --- | --- |
| Purpose | Structured invitation for safe, meaningful Contributions. |
| Required fields | `id: uuid`; `field_id: uuid`; `prompt_text: text`; `accepted_contribution_types: ContributionType[]`; `consent_note: text`; `review_note: text`; `status: PromptStatus`; `visibility: Visibility`; `sort_order: integer`; `created_at`; `updated_at`. |
| Optional fields | `opens_at: datetime`; `closes_at: datetime`; `example_response: text`; `content_notice: text`; `private_submission_allowed: boolean`; `sensitive_default: boolean`. |
| Validation rules | Must connect to Field/Seed; no coercive trauma disclosure; material edits after submissions require audit note. |
| Relationships | Belongs to Field; has many Contributions. |
| Status enum values | `draft`, `open`, `paused`, `closed`, `archived`. |
| Visibility enum values | `public`, `restricted`, `internal`, `hidden`. |
| Ownership/stewardship | Steward creates and monitors. |
| Audit requirements | Prompt text changes, open/close/pause, accepted type changes. |
| Public read requirements | Public reads open/visible prompts and consent/review notes. |
| Admin write requirements | Steward/admin can create/edit/pause/close. |
| Phase 1 minimum | 2-3 prompts for active Field. |
| Phase 2 expansion path | Prompt-specific forms, cohorts, conditional follow-ups. |

### Contribution

| Requirement | Specification |
| --- | --- |
| Purpose | A consented submission into a Field. Not a post or comment. |
| Required fields | `id: uuid`; `field_id: uuid`; `contributor_id: uuid`; `type: ContributionType`; `body: text nullable`; `file_url: string nullable`; `external_link: string nullable`; `visibility_preference: Visibility`; `consent_level: ConsentLevel`; `credit_preference: string`; `yield_permission: boolean`; `sensitive_material: boolean`; `review_status: ContributionReviewStatus`; `withdrawal_contact_ack: boolean`; `submitted_at: datetime`; `created_at`; `updated_at`. |
| Optional fields | `prompt_id: uuid`; `title: string`; `steward_notes: text`; `rights_notes: text`; `selected_excerpt: text`; `language: string`; `file_metadata: json`; `withdrawal_requested_at: datetime`; `reviewed_by: uuid`; `reviewed_at: datetime`; `decision_reason: text`. |
| Validation rules | Field required; contributor required; at least one body/file/link required; consent and credit required; no public display unless reviewed and consent allows; Level 6 blocks publication until follow-up recorded. |
| Relationships | Belongs to Field, Contributor, optional TendingPrompt; has ConsentRecords; may be selected into Yield. |
| Status enum values | `pending`, `held`, `accepted`, `selected`, `rejected`, `private`, `withdrawn`, `published`. |
| Visibility enum values | `private`, `internal`, `anonymous_public`, `credited_public`, `yield_only`, `follow_up_required`. |
| Ownership/stewardship | Contributor controls consent choices; steward controls review/publication decisions. |
| Audit requirements | Submission, review transitions, consent changes, credit changes, file access, withdrawal. |
| Public read requirements | Only `published` Contributions with public-compatible visibility and consent. |
| Admin write requirements | Steward/admin review and status changes; contributor-initiated withdrawal must be recorded. |
| Phase 1 minimum | Functional submission and review record with consent. Must not be informal/manual only. |
| Phase 2 expansion path | Contributor dashboard, saved drafts, richer media processing. |

### Contributor

| Requirement | Specification |
| --- | --- |
| Purpose | Person or group submitting material. Lightweight in Phase 1. |
| Required fields | `id: uuid`; `chosen_credit: string`; `contact_method: string`; `contact_required: boolean`; `created_at`; `updated_at`. |
| Optional fields | `legal_name: string`; `organization: string`; `email: string`; `phone: string`; `pseudonym: string`; `accessibility_contact_preference: text`; `youth_flag: boolean`; `guardian_contact_required: boolean`. |
| Validation rules | Contact required when follow-up, rights, withdrawal, or youth flag applies; do not expose contact publicly. |
| Relationships | Has Contributions and ConsentRecords. |
| Status enum values | `active`, `follow_up_required`, `blocked`, `deleted_anonymized`. |
| Visibility enum values | `private_profile`, `public_credit_only`, `anonymous`. |
| Ownership/stewardship | Contributor controls credit preference; steward manages records with care. |
| Audit requirements | Contact changes, credit changes, anonymization/deletion requests. |
| Public read requirements | Public reads only chosen credit if consent allows. |
| Admin write requirements | Steward/admin can update contact and follow-up state. |
| Phase 1 minimum | Capture chosen credit and contact where required. No public profiles. |
| Phase 2 expansion path | Accounts, contribution history, preferences dashboard. |

### Steward

| Requirement | Specification |
| --- | --- |
| Purpose | Person/team responsible for Field care, editing, review, consent, and Return. |
| Required fields | `id: uuid`; `name: string`; `email: string`; `role: enum(admin, lead_steward, steward, maker, viewer)`; `status: enum(active, inactive, suspended)`; `created_at`; `updated_at`. |
| Optional fields | `team_name: string`; `public_bio: text`; `public_contact: string`; `avatar_url: string`; `internal_notes: text`. |
| Validation rules | Every public Field requires active steward; role controls write permissions. |
| Relationships | Owns/operates Fields; reviews Contributions; authors FieldUpdates; completes Commons Return. |
| Status enum values | `active`, `inactive`, `suspended`. |
| Visibility enum values | `public`, `internal`, `hidden`. |
| Ownership/stewardship | Admin assigns. Steward actions are accountable. |
| Audit requirements | Permission changes and review/publication actions. |
| Public read requirements | Public Field shows steward name/team and contact path. |
| Admin write requirements | Admin manages roles; stewards update their public notes where allowed. |
| Phase 1 minimum | At least one admin/lead steward. |
| Phase 2 expansion path | Teams, granular permissions, partner stewards. |

### Patron / Supporter

| Requirement | Specification |
| --- | --- |
| Purpose | Person or institution supporting PEACH, access, a Field, or a Yield. |
| Required fields | `id: uuid`; `name: string`; `contact_email: string`; `type: enum(individual, institution, anonymous)`; `acknowledgement_preference: enum(public, anonymous, internal_only)`; `created_at`; `updated_at`. |
| Optional fields | `organization: string`; `public_note: text`; `restrictions: text`; `relationship_owner_id: uuid`; `invoice_contact: string`. |
| Validation rules | Sponsor restrictions cannot grant editorial control or private Contribution access. |
| Relationships | Has SupportTransactions; may be associated with Field/Yield/access support. |
| Status enum values | `active`, `inactive`, `anonymous`, `restricted`. |
| Visibility enum values | `public_acknowledgement`, `anonymous`, `internal_only`. |
| Ownership/stewardship | Admin/steward manages; supporters do not own Field decisions. |
| Audit requirements | Acknowledgement changes, restriction notes, contact changes. |
| Public read requirements | Public acknowledgement only if preference allows. |
| Admin write requirements | Steward/admin can record support details. |
| Phase 1 minimum | Manual CRM acceptable, but public sponsor notes must be accurate. |
| Phase 2 expansion path | Supporter portal, institutional pipeline, patron reporting. |

### SupportTransaction

| Requirement | Specification |
| --- | --- |
| Purpose | Records support metadata for membership, access, Field, Yield, or institutional support. |
| Required fields | `id: uuid`; `supporter_id: uuid`; `support_path: SupportPath`; `amount: decimal`; `currency: string`; `status: SupportStatus`; `transaction_date: datetime`; `receipt_reference: string`; `created_at`; `updated_at`. |
| Optional fields | `field_id: uuid`; `yield_id: uuid`; `membership_period: string`; `access_support_quantity: integer`; `use_category: enum(access, production, operations, contributors, archive, future_fields)`; `provider: string`; `provider_payment_id: string`; `acknowledgement_text: text`; `refund_reference: string`; `notes: text`. |
| Validation rules | Completed transaction needs amount, currency, receipt/reference; Field/Yield support needs associated Field/Yield; no unsupported editorial-control metadata. |
| Relationships | Belongs to Patron/Supporter; may belong to Field or Yield. |
| Status enum values | `pending`, `completed`, `failed`, `refunded`, `cancelled`, `manual_recorded`. |
| Visibility enum values | `public_aggregate`, `public_acknowledged`, `anonymous`, `internal`. |
| Ownership/stewardship | Admin/steward records; payment provider may be external. |
| Audit requirements | Status changes, refunds, metadata edits, reporting exports. |
| Public read requirements | Public reads only aggregate or acknowledged support, never private payment details. |
| Admin write requirements | Steward/admin record/view/report. |
| Phase 1 minimum | External/manual payments allowed, but metadata must be captured consistently. |
| Phase 2 expansion path | Native checkout, webhooks, receipts, supporter dashboard. |

### Yield

| Requirement | Specification |
| --- | --- |
| Purpose | Cultural work produced by a Field. |
| Required fields | `id: uuid`; `field_id: uuid`; `title: string`; `format: enum(publication, zine, source_trail, audio, video, exhibition, teaching_kit, map, report, other)`; `description: text`; `status: YieldStatus`; `maker_id: uuid nullable`; `release_target: string`; `created_at`; `updated_at`. |
| Optional fields | `artifact_url: string`; `version: string`; `accessibility_notes: text`; `selected_contribution_ids: uuid[]`; `publication_identifier: string`; `released_at: datetime`; `withdrawn_at: datetime`. |
| Validation rules | Must belong to Field; release requires consent/credit checklist; cannot be only event recap unless shaped as cultural work. |
| Relationships | Belongs to Field; may include Contributions; has CommonsEntry after Return. |
| Status enum values | `planned`, `in_progress`, `released`, `returned`, `revised`, `withdrawn`, `archived`. |
| Visibility enum values | `public`, `restricted`, `internal_draft`, `archived`. |
| Ownership/stewardship | Steward/maker responsible; sponsor has no editorial control. |
| Audit requirements | Scope changes, artifact versions, selected Contribution changes, release approval. |
| Public read requirements | Public can read released/returned Yield according to visibility. |
| Admin write requirements | Steward/admin can edit and release. |
| Phase 1 minimum | One planned/in-progress/released Yield for active Field. |
| Phase 2 expansion path | Multiple Yields, editions, sales where values-aligned, teaching kits. |

### CommonsEntry

| Requirement | Specification |
| --- | --- |
| Purpose | Public returned record of a Field/Yield in the Commons. |
| Required fields | `id: uuid`; `field_id: uuid`; `yield_id: uuid`; `summary: text`; `seed_text: text`; `soil_context: text`; `return_date: datetime`; `credits: text`; `consent_summary: text`; `artifact_url: string`; `visibility: Visibility`; `created_at`; `updated_at`. |
| Optional fields | `vessels_used: json`; `gatherings_held: json`; `selected_contributions: json`; `support_note: text`; `future_questions: text`; `teaching_links: json`; `related_field_ids: uuid[]`; `revision_note: text`. |
| Validation rules | Cannot include private/held/rejected/withdrawn Contributions; credits required; Return checklist required; public artifact must be accessible. |
| Relationships | Belongs to Field and Yield; may link descendant Fields. |
| Status enum values | `draft`, `returned`, `revised`, `archived`, `restricted`. |
| Visibility enum values | `public`, `community_access`, `restricted`, `hidden`, `archived`. |
| Ownership/stewardship | Steward completes; admin can correct. |
| Audit requirements | Return publication, revisions, takedowns, credit corrections. |
| Public read requirements | Public reads returned entries if visibility permits. |
| Admin write requirements | Steward/admin can create before marking Field Returned. |
| Phase 1 minimum | Returned Field/Yield page or entry. |
| Phase 2 expansion path | Commons index, search, lineage, teaching resources. |

### FieldUpdate

| Requirement | Specification |
| --- | --- |
| Purpose | Steward-published update about Field status, progress, decisions, corrections, or participant communications. |
| Required fields | `id: uuid`; `field_id: uuid`; `author_steward_id: uuid`; `title: string`; `body: text`; `visibility: Visibility`; `status: enum(draft, published, revised, retracted)`; `created_at`; `updated_at`; `published_at: datetime nullable`. |
| Optional fields | `related_status: FieldStatus`; `related_gathering_id: uuid`; `related_yield_id: uuid`; `correction_flag: boolean`; `retraction_reason: text`. |
| Validation rules | Public updates cannot expose private Contributions; correction/retraction reason required when applicable. |
| Relationships | Belongs to Field; authored by Steward. |
| Status enum values | `draft`, `published`, `revised`, `retracted`. |
| Visibility enum values | `public`, `participant_only`, `internal`, `hidden`. |
| Ownership/stewardship | Steward/admin publishes. |
| Audit requirements | Version history, retractions, visibility changes. |
| Public read requirements | Public reads published public updates. |
| Admin write requirements | Steward/admin can write; revisions logged. |
| Phase 1 minimum | Optional but recommended for updates and confirmations. |
| Phase 2 expansion path | Email digest, update subscriptions, participant history. |

### ConsentRecord

| Requirement | Specification |
| --- | --- |
| Purpose | Versioned permission record for a Contribution. |
| Required fields | `id: uuid`; `contribution_id: uuid`; `contributor_id: uuid`; `consent_level: ConsentLevel`; `status: ConsentStatus`; `visibility_preference: Visibility`; `credit_preference: string`; `yield_permission: boolean`; `consent_text_version: string`; `recorded_at: datetime`; `recorded_by: enum(contributor, steward, admin)`. |
| Optional fields | `follow_up_notes: text`; `guardian_required: boolean`; `guardian_status: enum(not_required, required, received, declined)`; `scope_note: text`; `evidence_url: string`; `withdrawal_note: text`; `supersedes_consent_record_id: uuid`. |
| Validation rules | Append-only where feasible; publishing requires active compatible ConsentRecord; youth/child material defaults to follow-up-required until policy clearance; withdrawn/disputed blocks new use. |
| Relationships | Belongs to Contribution and Contributor; checked by Yield and CommonsEntry. |
| Status enum values | `active`, `superseded`, `follow_up_required`, `withdrawn`, `disputed`. |
| Visibility enum values | `private`, `internal`, `public_summary_only`. |
| Ownership/stewardship | Contributor grants/changes; steward records and honors. |
| Audit requirements | Immutable history, consent text version, recorder, timestamp, withdrawals. |
| Public read requirements | Public never reads raw consent records; may read consent summary. |
| Admin write requirements | Steward/admin can record follow-up and superseding records. |
| Phase 1 minimum | Must be functional and tied to every Contribution. Must not be informal/manual only. |
| Phase 2 expansion path | Contributor consent dashboard, e-signature evidence, retention policies. |

## Public Read Contract

Public reads may include:

- active public Field content;
- approved Seed;
- public Soil;
- public Vessels;
- public Gatherings;
- open TendingPrompts;
- published FieldUpdates;
- released Yield;
- returned CommonsEntry;
- public support acknowledgements;
- published Contributions only where consent allows.

Public reads must never include:

- private Contribution content;
- pending/held/rejected/withdrawn Contributions;
- raw ConsentRecords;
- contributor contact details;
- private support/payment details;
- internal steward notes.

## Admin Write Contract

Admin/steward writes must support:

- Field creation/edit/status transitions;
- Seed approval/revision;
- Soil, Vessel, Gathering, prompt editing;
- Contribution review and status changes;
- ConsentRecord creation/supersession/withdrawal;
- Yield release checklist;
- Commons Return checklist;
- support metadata recording;
- audit event creation.

## Phase 1 Acceptance

The data model passes Phase 1 only if one Field can be opened, tended, made, yielded, returned, supported, and audited without relying on unstructured memory for consent, review, or Return.

