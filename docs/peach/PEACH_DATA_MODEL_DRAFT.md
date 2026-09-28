# PEACH Data Model Draft

## Purpose

This is a conceptual data model for PEACH Phase 1. It is not a database migration, ORM schema, API contract, or final implementation design.

The model exists so a later product/data/UI implementation agent can build the Phase 1 foundation without guessing what a Field is.

## Central Warning

Do not hard-code books as the central object.

Books may be Vessels. A Vessel may also be a film, song, artwork, oral history, document, recipe, place, image, archive fragment, map, object, recording, public record, memory, or other source material. The central object is the Field.

## Object Relationship Map

```text
Orchard
  has many Fields
  has many Stewards
  has many Patrons/Supporters
  has many CommonsEntries

Field
  has one Seed
  has one or more Soil records/sections
  has many Vessels
  has many Gatherings
  has many TendingPrompts
  has many Contributions
  has many FieldUpdates
  has many SupportTransactions
  has zero or more Yields
  has zero or one primary CommonsEntry
  has one or more Stewards
  may have parent/descendant Fields

Contribution
  belongs to Field
  may belong to TendingPrompt
  belongs to Contributor
  has one or more ConsentRecords
  may be selected into Yield

Yield
  belongs to Field
  may include selected Contributions
  may have CommonsEntry

SupportTransaction
  belongs to Patron/Supporter
  may belong to Field
  may belong to Yield
```

## Objects

| Object | Purpose | Required fields | Optional fields | Relationships | Status fields | Visibility fields | Audit needs | Phase 1 level | Future implementation notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Orchard | Represents the PEACH environment as a whole. Mostly conceptual in Phase 1. | Orchard ID/name; description. | public label; operating notes; default support copy. | Has Fields, Stewards, Patrons/Supporters, CommonsEntries. | active/inactive. | public/internal. | Changes to public description/support defaults. | Manual | May become tenant/workspace if PEACH hosts multiple organizations. |
| Field | Core object: cultivated area of communal attention. | Field ID; title; Seed ID/text; status; short description; steward; season/timeline; access level; created/updated dates. | place; partner; patron; language; accessibility notes; content warnings; parent Field; descendant Fields. | Has Seed, Soil, Vessels, Gatherings, TendingPrompts, Contributions, FieldUpdates, SupportTransactions, Yields, CommonsEntry. | Draft, Upcoming, Open, Tending, Making, Yielding, Returned, Archived/Dormant. | hidden, preview, public, restricted, archived. | Full status history; material edits; steward changes; public visibility changes. | Required | Should be the root route/object for Phase 1 public page and admin workflow. |
| Seed | Central intrigue/question that opens a Field. | Seed ID; Field ID; text; reason-for-now; tension/specificity note. | origin note; revision note; related Seed; approved by. | Belongs to Field; may seed descendant Field. | draft, approved, revised, retired. | public/internal. | Revision history; approval timestamp; material-change flag. | Required | Could be embedded in Field in Phase 1, but model it conceptually as distinct. |
| Soil | Context surrounding the Seed. | Soil ID; Field ID; summary; body/context; updated date. | timeline; map/place data; source notes; safety notes; internal research notes. | Belongs to Field; may reference Vessels. | draft, public, revised. | public, internal, restricted. | Source changes; public revisions after Open. | Required | May be one record or multiple ordered sections. |
| Vessel | Source material or entry point into a Field. | Vessel ID; Field ID; type; title/label; access path/location; why it belongs; rights/access note; sort order. | creator/source; date; excerpt; media; accessibility note; tags; steward annotation. | Belongs to Field; may connect to Gatherings, prompts, Yield, CommonsEntry. | draft, public, removed, rights-restricted. | public, internal, restricted. | Rights note changes; removals; display changes. | Required | Type must be flexible; do not create book-only schema. |
| Gathering | Interpretive moment tied to Field. | Gathering ID; Field ID; title; format; date/time or availability window; facilitator/steward; purpose; access details. | capacity; registration link; recording; transcript; notes; attendance count. | Belongs to Field; may reference Vessels, prompts, FieldUpdates. | scheduled, open, completed, cancelled, archived. | public, member-only, private, unlisted. | Schedule changes; cancellation reason; recording consent. | Required | Events are subordinate to Field, not top-level primitive. |
| TendingPrompt | Structured invitation to contribute. | Prompt ID; Field ID; prompt text; accepted contribution types; consent note; review note; status. | close date; example response; content notice; private option; sort order. | Belongs to Field; has Contributions. | draft, open, paused, closed, archived. | public, restricted, internal. | Prompt revisions; open/close timestamps; material-change flag. | Required | Prompt changes after submissions need audit to preserve contributor context. |
| Contribution | Consented submission into a Field. | Contribution ID; Field ID; Contributor ID; type; body/file/link; visibility preference; consent level; credit preference; Yield permission; sensitive flag; review status; submitted date. | Prompt ID; steward notes; rights notes; selected excerpt; language; file metadata; withdrawal requested date. | Belongs to Field, Contributor, optional Prompt; has ConsentRecords; may be selected for Yield. | pending, held, accepted, selected, rejected, private, withdrawn, published. | private, internal, anonymous public, credited public, yield-only. | Review decisions; consent changes; publication/withdrawal history; file access. | Required | Never publicly display unreviewed material. Sensitive data handling must be conservative. |
| Contributor | Person or group submitting material. | Contributor ID; chosen name/credit; contact method if required; created date. | legal name; organization; pronouns; location; age/youth flag placeholder; accessibility/contact preferences. | Has Contributions and ConsentRecords. | active, blocked, deleted/anonymized, follow-up-required. | private profile; public credit only; anonymous. | Consent/contact changes; deletion/anonymization requests. | Required | Avoid full public profiles in Phase 1. Contributor may be lightweight. |
| Steward | Person/team responsible for Field care and operation. | Steward ID; name/team; contact path; role; permissions. | bio; organization; avatar; internal notes; availability. | Owns/operates Fields, reviews Contributions, publishes updates, completes Return. | active, inactive, suspended. | public, internal. | Permission changes; review actions; public notes. | Required | Can map to admin users later. |
| Patron/Supporter | Person or institution supporting PEACH, a Field, access, or Yield. | Patron ID; name or organization; contact; acknowledgement preference. | type; public note; restrictions; relationship manager; invoice details. | Has SupportTransactions; may sponsor Field/Yield/access. | active, inactive, anonymous, restricted. | public acknowledgement, anonymous, internal-only. | Acknowledgement changes; restriction notes; contact changes. | Optional | Keep separate from contributor; sponsors must not access private Contributions. |
| SupportTransaction | Record of support or funding. | Transaction ID; support path; amount; currency; date; supporter/patron; status; receipt/reference; Field ID if applicable. | Yield ID; restriction/use category; acknowledgement text; payment provider; refund status; notes. | Belongs to Patron/Supporter; may belong to Field/Yield. | pending, completed, failed, refunded, cancelled. | public aggregate, public acknowledged, anonymous, internal. | Payment status changes; metadata changes; refunds; reporting exports. | Manual | Phase 1 may use external payment/invoice records; keep metadata consistent. |
| Yield | Cultural work produced by Field. | Yield ID; Field ID; title; format; description; status; maker/steward; release target or date. | artifact link/file; version; accessibility notes; selected Contribution IDs; publication identifier; sales/support link. | Belongs to Field; may include Contributions; may Return through CommonsEntry. | planned, in-progress, released, revised, withdrawn, archived. | public, restricted, internal draft. | Version history; release approval; consent checklist; artifact changes. | Required | One scoped Yield is enough for Phase 1. |
| CommonsEntry | Public returned record of Field/Yield. | CommonsEntry ID; Field ID; Yield ID; summary; Seed; Soil/context; Return date; credits; consent summary; public artifact link. | Vessels used; Gatherings held; selected Contributions; support note; future questions; teaching links; descendant Fields. | Belongs to Field/Yield; links to related Fields. | draft, returned, revised, archived, restricted. | public, community-access, restricted, hidden. | Return checklist; revisions; takedown actions; credit corrections. | Required | Can be a returned Field page in Phase 1 rather than separate infrastructure. |
| FieldUpdate | Steward-published update about Field status, progress, decisions, or corrections. | Update ID; Field ID; title/label; body; author/steward; visibility; published date. | status association; related Gathering/Yield; correction flag; attachments. | Belongs to Field; authored by Steward. | draft, published, revised, retracted. | public, participant-only, internal. | Version history; retraction reason; private material checks. | Optional | Useful for public trust and progress during Making/Yielding. |
| ConsentRecord | Versioned record of permission for a Contribution. | ConsentRecord ID; Contribution ID; consent level; Yield permission; visibility preference; credit preference; consent text version; timestamp. | follow-up notes; guardian/child warning flag; expiry/scope; evidence link; withdrawal note. | Belongs to Contribution and Contributor; checked by Yield and CommonsEntry. | active, superseded, follow-up-required, withdrawn, disputed. | private/internal; public consent summary only. | Immutable history of consent changes; steward/user who changed it. | Required | Treat as append-only where possible; do not overwrite historical consent. |

## Phase 1 Minimum Viable Schema

Phase 1 can be implemented with the following minimum functional records:

- Field: title, status, Seed text, Soil summary/body, steward, support copy, Return plan.
- Vessel: flexible type, title, access path, why it belongs, rights note, sort order.
- Gathering: title, format, time/window, purpose, access details.
- TendingPrompt: prompt text, accepted types, consent note, open/closed status.
- Contribution: Field, optional prompt, contributor credit/contact, type, content/file/link, consent level, visibility, credit, Yield permission, sensitive flag, review status.
- ConsentRecord: Contribution, level, visibility, credit, Yield permission, timestamp, text version.
- Yield: Field, title, format, status, description, artifact link when released.
- CommonsEntry: Field, Yield, summary, credits, Return date, public artifact/source trail.
- SupportTransaction: can be manual/external but must keep Field/support path/amount/date/supporter/acknowledgement metadata.

Objects that can remain manual in Phase 1:

- Orchard.
- Patron/Supporter CRM details.
- Rich FieldUpdate stream.
- Advanced Contributor profile.
- Complex descendant Field graph.

## Visibility Model

Minimum visibility values:

- hidden;
- preview;
- public;
- internal;
- private;
- restricted;
- archived;
- anonymous public;
- credited public.

Visibility must be enforced separately from review status. An accepted Contribution is not automatically public.

## Status Model

Minimum Field statuses:

- Draft;
- Upcoming;
- Open;
- Tending;
- Making;
- Yielding;
- Returned;
- Archived/Dormant.

Minimum Contribution review statuses:

- pending;
- held;
- accepted;
- selected;
- rejected;
- private;
- withdrawn;
- published.

Minimum Consent statuses:

- active;
- superseded;
- follow-up-required;
- withdrawn;
- disputed.

## Audit Requirements

Audit history is required for:

- Field status changes;
- Seed revisions;
- public Soil revisions after Open;
- Vessel rights notes;
- Gathering cancellation or recording publication;
- prompt edits after submissions;
- Contribution review decisions;
- ConsentRecord changes;
- credit preference changes;
- Yield release and revision;
- Commons Return publication and correction;
- support transaction metadata changes;
- data exports.

## Phase 2 Expansion Risks

- Treating Field as a CMS page instead of the root cultural object.
- Turning Vessels into products and drifting into ecommerce UX.
- Adding comments/follows/likes before contribution review and consent are mature.
- Hard-coding books because the first Field uses books as some Vessels.
- Combining Contributor and Supporter identity too early and exposing private cultural participation to patrons.
- Letting sponsors access private Contribution data.
- Making Commons a private paid library instead of a returned cultural inheritance.
- Under-modeling consent and then being unable to remove, anonymize, or restrict material later.
- Supporting many Fields before one Field has successfully Returned.

## Notes For Future Technical Specification

- ConsentRecord should be versioned and preferably append-only.
- Contribution content and files may require separate storage, scanning, retention, and access policies.
- Field status transitions should be explicit, not free text.
- Public page rendering should derive from Field status and visibility.
- Support metadata must be consistent even if payments use external tools.
- Descendant Fields should not inherit Contribution consent automatically.
- Rights and consent checks should gate Yielding and Returned statuses.

