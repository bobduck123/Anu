# PEACH Gate 8 ANU Data Model Decision

Status: Phase 1 decision
Date: 2026-07-30

## Decision Summary

PEACH Phase 1 becomes ANU-native by defining PEACH-specific primitives in ANU's node-scoped core architecture. Gate 8 implements only the public read model and API shape in `frontend-next`. Durable persistence and mutations are deferred to Gate 9 because safe implementation requires coordinated Flask models, SQL migrations, auth/RLS or service authorization, rate limits, and audit logging.

## Primitive Decisions

| Primitive | Decision | Reason | Gate 8 status |
| --- | --- | --- | --- |
| Orchard | Keep static for now; future PEACH-specific table only if multi-Orchard need emerges. | Phase 1 has one ANU PEACH orchard. Multi-Orchard adds tenancy complexity too early. | Implemented in read model. |
| Field | Create new PEACH-specific table/model in Gate 9. | Field is central and does not map cleanly to Article/Event/Action. | Implemented as typed read model, persistence deferred. |
| Seed | Extend Field metadata. | Seed is Field's canonical question and reason-for-now, not its own first-phase table. | Implemented as Field sub-object. |
| Soil | Extend Field metadata. | Soil is context/body content attached to Field. | Implemented as Field sub-object. |
| Vessel | Create PEACH-specific child table/model. | Books are Vessels only, not products; Vessels need rights/access/reason fields. | Implemented as Field child array, persistence deferred. |
| Gathering | Extend existing ANU Event later where scheduled; retain PEACH-specific purpose metadata. | Some Gatherings are events, some are async/recorded. | Implemented as Field child array, Event integration deferred. |
| TendingPrompt | Create PEACH-specific child table/model. | Prompts need consent/safety/intake status and cannot be comments/posts. | Implemented as disabled prompt array, persistence deferred. |
| Contribution | Create PEACH-specific private table/model. | Contributions are private submissions, never public posts. | Deferred; public display impossible. |
| ConsentRecord | Create PEACH-specific explicit table/model linked to Contribution. | Consent must be separate from review status and versioned. | Deferred. |
| SupportIntent | Create PEACH-specific metadata table/model or reuse future support-intent service only if payment remains false. | Support is intent/purpose metadata, not checkout. | Implemented as manual read options with `paymentTaken: false`; persistence deferred. |
| Yield | Extend Field metadata in Phase 1; future Commons artifact relation later. | The first Yield is planned, not released. | Implemented as Field sub-object. |
| CommonsEntry | Create PEACH-specific table/model or archive relation when Return exists. | Commons is Return infrastructure, not a feed. | Implemented as placeholder read object, persistence deferred. |
| Steward | Reuse ANU User/role identity; create PEACH steward assignment relation later. | Steward must be authenticated and node/Field scoped. | Static display only; auth deferred. |
| AuditLog | Reuse ANU `AuditLog` event pattern with PEACH event names. | ANU already has node_id, actor_id, event, entity_type, entity_id, metadata_json, sensitive_read. | Deferred until mutations exist. |

## Public/Private Projection Rules

Public PEACH projection may include:

- Orchard summary;
- Field metadata;
- Seed and Soil;
- Vessels with rights/access notes;
- Gatherings;
- TendingPrompt text and safety guidance only while intake disabled;
- planned Yield and Return plan;
- Commons placeholders or returned entries that contain no private contribution body;
- SupportIntent option copy with `paymentTaken: false`.

Public PEACH projection must never include:

- Contribution bodies before review and publication eligibility;
- contributor contact data;
- ConsentRecord rows;
- steward review notes;
- SupportIntent contact details;
- youth/sensitive material;
- audit metadata from private workflows.

## Phase 1 Persistence Target

Gate 9 should create PEACH-specific core tables rather than overloading Article, Comment, Event, Ticket, MembershipPlan, or Presence tables. Likely tables:

- `peach_field`
- `peach_vessel`
- `peach_gathering`
- `peach_tending_prompt`
- `peach_contribution`
- `peach_consent_record`
- `peach_support_intent`
- `peach_consent_operation_request`
- `peach_commons_entry`
- `peach_steward_assignment`

All mutable rows should be node-scoped and audit-logged. Contributions should default to `pending_review`, `public_display=false`, and `sensitive/youth` rejected or forced into a disabled state until safeguarding policy exists.

## Anti-Reduction Decision

PEACH is not a book club, ecommerce, social feed, events app, Substack clone, or generic content CMS. A book can be a Vessel, a Gathering can map to Event later, and support can map to impact/support infrastructure later, but Field remains the organizing object.
