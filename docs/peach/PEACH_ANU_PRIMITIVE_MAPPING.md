# PEACH ANU Primitive Mapping

Status: Gate 7 mapping
Date: 2026-07-30

## Source Primitives From Standalone PEACH

Standalone PEACH defined these core primitives:

- Field
- Seed
- Soil
- Vessel
- Gathering
- TendingPrompt
- Contribution
- ConsentRecord
- SupportRecord
- ConsentOperationRequest
- AuditLog
- Yield
- Return
- Steward

## ANU Placement

| PEACH primitive | ANU primitive or surface | Gate 7 decision |
| --- | --- | --- |
| PEACH vertical | ANU frontend vertical route /peach | Implemented as read-only route. |
| Field | Public core content object attached to node scope | Model in docs only; DB migration held. |
| Seed | Field canonical question | Store as Field metadata later. |
| Soil | Context/body content | Store as Field metadata or article-like content later. |
| Vessel | Curated source/reference item | New ANU PEACH table likely needed; do not overload store/inventory. |
| Gathering | Event-like interpretive moment | Map to ANU event where scheduled; keep PEACH purpose metadata. |
| TendingPrompt | Prompt attached to Field | New ANU PEACH table likely needed. |
| Contribution | Steward-reviewed submission | Use ANU identity, consent, moderation, audit primitives; table shape held for Gate 8. |
| ConsentRecord | Consent/audit record | Must be durable, versioned, and linked to contribution. |
| SupportRecord | Manual support intent | Map later to impact/membership/support systems; no real payments in Gate 7. |
| ConsentOperationRequest | Withdrawal/export request | Needs ANU-native workflow and status model in Gate 8. |
| AuditLog | Structured audit event | Map to ANU audit log conventions; must cover steward and public mutations. |
| Yield | Produced cultural work | Later public content/archive artifact after consent review. |
| Return | Commons preservation and reuse path | Later archive/trust surface; no public Commons release in Gate 7. |
| Steward | ANU authenticated role scoped to node/Field | Requires production auth and role separation in Gate 8. |

## Schema Boundary

PEACH should begin in ANU public/core schema territory because Fields, Vessels, Gatherings, Contributions, and ConsentRecords are node-scoped public-platform objects with private moderation states.

Falak should be used later for higher-order provenance, governance decisions, approval workflows, derived graph relationships, and Commons/Return knowledge graph edges. PEACH should not jump directly into Falak for basic intake and review persistence.

Impact-service should only enter when support paths become real ANU support or membership operations. Gate 7 keeps support as manual enquiry language only.

## Anti-Reduction Rules

- A Field is not a product listing.
- A Vessel is not inventory.
- A Contribution is not a social post.
- Support is not a cart.
- Yield/Return is not a feed recap.
- PEACH must not collect youth or sensitive material until dedicated safeguarding policy, role workflow, and review mechanics exist.

## Gate 8 Required Mapping Work

Gate 8 should finalize:

- table ownership and migration path;
- RLS policies and role claims;
- steward-scoped review queue;
- consent operation status workflow;
- distributed rate limits;
- audit event taxonomy;
- private-staging allowlist;
- support-intent boundary with impact-service.
