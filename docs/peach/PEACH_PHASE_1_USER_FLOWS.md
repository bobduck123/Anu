# PEACH Phase 1 User Flows

## Purpose

These flows define how visitors, participants, contributors, supporters, and stewards move through Phase 1. Each flow should reinforce that PEACH is a cultural cultivation system and that the Field is the central primitive.

## Core Flows

| Flow | Entry point | Steps | Required screens | Required data writes | Confirmation states | Error states | Trust/consent requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Visitor enters active Field | Home, shared Field URL, about page, Commons link. | Open Field page; read Seed; scan Soil; inspect Vessels/Gatherings/prompts; choose next action. | Home; Active Field page. | Optional analytics event only. | Visitor sees Field status and clear next actions. | Field hidden/not found; Field has no approved Seed; page reads as event/book/shop page. | Public page must show steward and Return plan; no pressure to contribute. |
| Visitor signs up as Witness/Reader | Active Field page CTA or Gathering prompt. | Choose read/follow/witness option; provide email/contact if needed; accept update preference; submit. | Field page; lightweight signup modal/page; confirmation. | Participant/contact record or external list tag; Field association; update consent. | "You will receive Field updates" or equivalent. | Missing email; duplicate; updates unavailable. | Consent to receive updates must be explicit and separate from Contribution consent. |
| Visitor RSVPs to Gathering | Field page Gathering section or Gathering detail. | Open detail; read purpose/access; provide name/contact; choose access needs; submit. | Gathering detail/RSVP surface; confirmation. | RSVP/contact record or external RSVP metadata; Field/Gathering association. | RSVP/access details shown or emailed. | Gathering full/cancelled/closed; missing contact; access details unavailable. | Explain if session may be recorded; do not collect unrelated profile data. |
| Visitor becomes member | Field page support block or `/support`. | Read what membership funds; choose tier/amount; complete external/manual payment or inquiry; receive confirmation. | Support page; payment/inquiry surface; confirmation. | SupportTransaction metadata; Patron/Supporter; acknowledgement preference. | Membership supports Fields, stewardship, access, Commons Return; no editorial influence. | Payment unavailable; missing receipt metadata; unclear acknowledgement. | Must avoid discount-perk framing; payment terms transparent. |
| Visitor sponsors access | Field support block or support page. | Read access sponsorship purpose; choose amount/quantity; provide contact and acknowledgement preference; complete payment/inquiry. | Support page; sponsor access form/payment; confirmation. | SupportTransaction; Patron/Supporter; access support quantity/use category. | Sponsor sees what access support enables. | Sponsor expects recipient identities; payment missing Field association. | Recipients remain private; sponsor has no editorial access/control. |
| Visitor supports Field/Yield | Field page, Yield block, support page. | Choose one-off, Field sponsor, or Yield sponsor; read funded categories; provide acknowledgement preference; complete payment/inquiry. | Field page support; support form/payment; confirmation. | SupportTransaction linked to Field/Yield; Patron/Supporter; editorial-independence acceptance for sponsorship. | Confirmation states support helps cultivation/Yield/Return. | Storefront drift; sponsor terms imply control; missing metadata. | Support copy must state no editorial influence and no private Contribution access. |
| Contributor submits Contribution | Tending prompt or contribution route. | Read prompt; choose type; enter body/file/link; choose visibility/consent/credit/Yield permission; flag sensitivity/youth/rights; submit. | Field page prompt; contribution form/modal; confirmation. | Contribution; Contributor; ConsentRecord; audit event. | Contribution is Pending and will be reviewed. | Missing consent; no body/file/link; Field/prompt closed; upload failure. | Plain-language consent; no unreviewed publication; withdrawal/contact process acknowledged. |
| Steward reviews Contribution | Admin review queue. | Open pending item; check Field fit/safety/rights/consent; choose status; add reason; request follow-up if needed. | Review queue; contribution detail; consent detail. | Contribution review status; decision reason; reviewer/time audit; optional new ConsentRecord. | Status saved; contributor notification queued if needed. | Consent mismatch; Level 6 unresolved; private material accidentally public. | Accepted is not public; selected for Yield requires final consent check. |
| Steward creates/updates Field | Admin Field editor. | Create Draft; define Seed; add Soil, Vessels, Gatherings, prompts, support copy, Return plan; preview; publish status. | Field editor; managers for Vessels/Gatherings/prompts; preview. | Field, Seed, Soil, Vessels, Gatherings, prompts, audit events. | Field moves to Upcoming/Open only after checklist. | Missing steward/Seed/Return plan/consent; invalid status transition. | Public changes after Open logged; Field must not become event/book/store page. |
| Steward returns Yield to Commons | Admin Return workflow after Yield release. | Open Return checklist; verify consent/credits; assemble CommonsEntry; exclude private material; publish; set Field Returned. | Yield editor; Commons Return workflow; Commons page. | CommonsEntry; Field status; Yield status; audit events; optional FieldUpdate. | CommonsEntry public and Field marked Returned. | Missing consent; missing artifact; inaccessible file; rights issue; withdrawal unresolved. | Return must honor consent, attribution, source trail, support transparency. |
| Supporter receives confirmation | After payment/inquiry/support form. | Complete support; receive confirmation page/email; see what support enables and receipt path. | Support confirmation page/email. | SupportTransaction status; receipt reference; acknowledgement preference. | Clear thanks and no-editorial-control note. | Payment failed; support recorded without receipt; wrong Field/Yield association. | Confirmation must not promise influence or access to private material. |
| Participant receives Field updates | Signup, RSVP, Contribution, membership, or steward update. | Steward publishes update; system/manual email sends to opted-in contacts; participant reads update and returns to Field. | FieldUpdate; email/update; Field page. | FieldUpdate; delivery record if available; unsubscribe/update preference. | Participant gets relevant Field progress. | Private Contribution leaked; update sent without consent; broken link. | Update consent separate from Contribution consent; private material excluded. |

## Minimum Data Writes By Flow

- Witness/Reader signup: contact/update preference and Field association, or external equivalent.
- RSVP: Gathering association, contact, access needs if provided, recording notice acknowledgement if needed.
- Contribution: Contribution, Contributor, ConsentRecord, audit event.
- Support: Patron/Supporter and SupportTransaction metadata, even if payment is external.
- Steward review: Contribution status change, reviewer, reason, audit event.
- Return: CommonsEntry, Yield status, Field status, Return audit event.

## Flow Boundaries

- No flow should require creating a public profile.
- No flow should publish user material immediately.
- No flow should frame membership as discounts.
- No flow should sell books/products as the main action.
- No flow should let sponsors influence Field interpretation, contribution selection, or Yield conclusions.

